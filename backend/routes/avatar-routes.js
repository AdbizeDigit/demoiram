import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { avatarService } from '../services/outreach/avatar-service.js';
import { pool } from '../config/database.js';

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

export default router;
