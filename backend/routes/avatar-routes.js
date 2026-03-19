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
    cb(null, fs.existsSync(UPLOADS_DIR) ? UPLOADS_DIR : UPLOADS_DEV_DIR);
  },
  filename: (req, file, cb) => {
    // Always save as .webp after conversion
    cb(null, `avatar-${Date.now()}.webp`);
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

// POST /avatars/:id/upload-photo - Upload avatar profile photo (converts to webp)
router.post('/:id/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No se envio imagen' });

    // Convert to webp using sharp
    const webpFilename = `avatar-${Date.now()}.webp`;
    const webpPath = path.join(path.dirname(req.file.path), webpFilename);

    try {
      const sharp = (await import('sharp')).default;
      await sharp(req.file.path)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(webpPath);

      // Remove original if different
      if (req.file.path !== webpPath) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
    } catch (sharpErr) {
      console.log('[Avatar] Sharp conversion failed, using original:', sharpErr.message);
    }

    const finalFilename = fs.existsSync(webpPath) ? webpFilename : req.file.filename;
    const photoUrl = `/uploads/avatars/${finalFilename}`;

    // Copy to dev public dir
    try {
      const srcPath = fs.existsSync(webpPath) ? webpPath : req.file.path;
      const devPath = path.join(UPLOADS_DEV_DIR, finalFilename);
      if (!fs.existsSync(devPath) && fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, devPath);
      }
    } catch {}

    const avatar = await avatarService.updateAvatar(req.params.id, { photo_url: photoUrl });

    res.json({ success: true, avatar, photoUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /avatars/generate-personality - Generate avatar personality with AI
router.post('/generate-personality', async (req, res) => {
  try {
    const { name, role, company, bio, tone } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Nombre requerido' });

    let generated;
    try {
      const { analyzeWithDeepSeek } = await import('../services/deepseek.js');
      const prompt = `Genera la personalidad completa para un avatar de ventas de una empresa de IA.

DATOS DEL AVATAR:
- Nombre: ${name}
- Rol: ${role || 'Sales Representative'}
- Empresa: ${company || 'Adbize'}
- Bio actual: ${bio || 'ninguna'}
- Tono preferido: ${tone || 'professional'}

La empresa ${company || 'Adbize'} es una empresa argentina de tecnologia e inteligencia artificial que ofrece chatbots, automatizacion de procesos, scraping inteligente y analisis de datos.

Genera TODOS estos campos en JSON:
{
  "personality": "descripcion de la personalidad en primera persona (2-3 oraciones, espanol argentino)",
  "system_prompt": "instruccion detallada para la IA sobre como comportarse como este avatar. Incluir: quien es, que vende, como habla, que evitar, como cerrar ventas. Minimo 200 palabras.",
  "tone": "professional|friendly|casual|authoritative|empathetic",
  "formality": "very_formal|formal|casual|very_casual",
  "emoji_usage": "none|minimal|moderate|heavy",
  "greeting_style": "saludo tipico de este avatar",
  "farewell_style": "despedida tipica de este avatar",
  "specialties": ["especialidad1", "especialidad2", "especialidad3", "especialidad4"],
  "bio": "bio profesional de 2-3 oraciones para mostrar en el perfil"
}

Responde SOLO con JSON valido.`;

      const response = await analyzeWithDeepSeek(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generated = JSON.parse(jsonMatch[0]);
      }
    } catch (aiErr) {
      console.error('[Avatar] AI personality generation failed:', aiErr.message);
    }

    // Fallback if AI fails
    if (!generated) {
      generated = {
        personality: `Soy ${name}, ${role || 'representante comercial'} de ${company || 'Adbize'}. Me apasiona ayudar a empresas a crecer con tecnologia e inteligencia artificial. Mi enfoque es consultivo - primero entiendo las necesidades del cliente y luego propongo soluciones a medida.`,
        system_prompt: `Eres ${name}, ${role || 'representante comercial'} de ${company || 'Adbize'}, una empresa argentina de tecnologia e inteligencia artificial.\n\nSOBRE LA EMPRESA:\n${company || 'Adbize'} ofrece soluciones de IA para negocios: chatbots inteligentes, automatizacion de procesos, scraping inteligente, analisis de datos e integracion de IA en sistemas existentes.\n\nTU PERSONALIDAD:\n- Sos profesional pero accesible\n- Usas espanol argentino natural\n- Tu enfoque es consultivo, no vendedor\n- Siempre personalizas segun el sector y empresa del prospecto\n- Sos directo y vas al grano\n- Ofreces valor antes de pedir algo\n\nREGLAS:\n- Maximo 120 palabras por email\n- No uses palabras spam (gratis, oferta, urgente)\n- Siempre incluye un CTA claro\n- Menciona la empresa del prospecto por nombre\n- Adapta el mensaje al sector especifico`,
        tone: tone || 'professional',
        formality: 'formal',
        emoji_usage: 'minimal',
        greeting_style: 'Hola!',
        farewell_style: 'Saludos cordiales',
        specialties: ['Inteligencia Artificial', 'Automatizacion', 'Chatbots', 'Analisis de Datos'],
        bio: `${name} es ${role || 'representante comercial'} de ${company || 'Adbize'}, especializado en ayudar a empresas a implementar soluciones de inteligencia artificial para optimizar sus operaciones y aumentar sus ventas.`,
      };
    }

    res.json({ success: true, generated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
