import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect, adminOnly } from '../middleware/auth.js';
import { avatarService } from '../services/outreach/avatar-service.js';
import { pool } from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'frontend', 'dist', 'uploads', 'avatars');
const UPLOADS_DEV_DIR = path.join(__dirname, '..', '..', 'frontend', 'public', 'uploads', 'avatars');

// Ensure upload dirs exist
[UPLOADS_DIR, UPLOADS_DEV_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to both dist (production) and public (dev)
    cb(null, fs.existsSync(UPLOADS_DIR) ? UPLOADS_DIR : UPLOADS_DEV_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `avatar-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Solo se permiten imagenes (jpg, png, gif, webp, svg)'));
  },
});

const router = Router();
router.use(protect, adminOnly);

// GET /avatars - List all avatars
router.get('/', async (req, res) => {
  try {
    const avatars = await avatarService.getAvatars();
    res.json({ success: true, avatars });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /avatars/:id - Get avatar detail
router.get('/:id', async (req, res) => {
  try {
    const avatar = await avatarService.getAvatar(req.params.id);
    if (!avatar) return res.status(404).json({ success: false, error: 'Avatar no encontrado' });
    res.json({ success: true, avatar });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /avatars - Create avatar
router.post('/', async (req, res) => {
  try {
    const avatar = await avatarService.createAvatar(req.body);
    res.json({ success: true, avatar });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /avatars/:id - Update avatar
router.put('/:id', async (req, res) => {
  try {
    const avatar = await avatarService.updateAvatar(req.params.id, req.body);
    if (!avatar) return res.status(404).json({ success: false, error: 'Avatar no encontrado' });
    res.json({ success: true, avatar });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /avatars/:id - Delete avatar
router.delete('/:id', async (req, res) => {
  try {
    await avatarService.deleteAvatar(req.params.id);
    res.json({ success: true, message: 'Avatar eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /avatars/:id/generate-email - Generate email as avatar for a lead
router.post('/:id/generate-email', async (req, res) => {
  try {
    const avatar = await avatarService.getAvatar(req.params.id);
    if (!avatar) return res.status(404).json({ success: false, error: 'Avatar no encontrado' });

    const { leadId, stepType } = req.body;
    let lead;
    if (leadId) {
      const r = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
      lead = r.rows[0];
    }
    lead = lead || { name: req.body.companyName || 'Empresa Test', sector: req.body.sector || 'general', city: req.body.city || '', email: req.body.email || '' };

    const email = await avatarService.generateMessageAsAvatar(avatar, lead, 'EMAIL', stepType || 'introduction');
    res.json({ success: true, email });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /avatars/:id/generate-whatsapp - Generate WhatsApp message as avatar
router.post('/:id/generate-whatsapp', async (req, res) => {
  try {
    const avatar = await avatarService.getAvatar(req.params.id);
    if (!avatar) return res.status(404).json({ success: false, error: 'Avatar no encontrado' });

    const { leadId, stepType } = req.body;
    let lead;
    if (leadId) {
      const r = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
      lead = r.rows[0];
    }
    lead = lead || { name: req.body.companyName || 'Empresa Test', sector: req.body.sector || 'general', city: req.body.city || '', phone: req.body.phone || '' };

    const msg = await avatarService.generateMessageAsAvatar(avatar, lead, 'WHATSAPP', stepType || 'introduction');
    res.json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /avatars/:id/set-default - Set as default avatar
router.post('/:id/set-default', async (req, res) => {
  try {
    const avatar = await avatarService.updateAvatar(req.params.id, { is_default: true });
    res.json({ success: true, avatar });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /avatars/:id/stats - Get avatar performance stats
router.get('/:id/stats', async (req, res) => {
  try {
    const avatar = await avatarService.getAvatar(req.params.id);
    if (!avatar) return res.status(404).json({ success: false, error: 'Avatar no encontrado' });

    const messagesRes = await pool.query(
      'SELECT channel, status, COUNT(*) as count FROM outreach_messages WHERE avatar_id = $1 GROUP BY channel, status',
      [req.params.id]
    );

    res.json({ success: true, avatar, breakdown: messagesRes.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /avatars/:id/upload-photo - Upload avatar profile photo
router.post('/:id/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No se envio imagen' });

    const photoUrl = `/uploads/avatars/${req.file.filename}`;

    // Also copy to dev public dir
    try {
      const devPath = path.join(UPLOADS_DEV_DIR, req.file.filename);
      if (!fs.existsSync(devPath) && fs.existsSync(req.file.path)) {
        fs.copyFileSync(req.file.path, devPath);
      }
    } catch {}

    const avatar = await avatarService.updateAvatar(req.params.id, { photo_url: photoUrl });

    res.json({ success: true, avatar, photoUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
