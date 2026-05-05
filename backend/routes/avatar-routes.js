import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect, adminOnly, sellerOrAdmin } from '../middleware/auth.js';
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
router.use(protect, sellerOrAdmin);

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

// POST /avatars/:id/upload-photo - Upload avatar photo, save as base64 data URI in DB (persists across deploys)
router.post('/:id/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No se envio imagen' });

    let base64DataUri;

    try {
      const sharp = (await import('sharp')).default;
      // Convert to small webp and get as buffer
      const buffer = await sharp(req.file.path)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();
      base64DataUri = `data:image/webp;base64,${buffer.toString('base64')}`;
    } catch (sharpErr) {
      // Fallback: read original file as base64
      console.log('[Avatar] Sharp failed, using original:', sharpErr.message);
      const fileBuffer = fs.readFileSync(req.file.path);
      const ext = path.extname(req.file.originalname).replace('.', '') || 'png';
      base64DataUri = `data:image/${ext};base64,${fileBuffer.toString('base64')}`;
    }

    // Clean up temp file
    try { fs.unlinkSync(req.file.path); } catch {}

    // Save base64 data URI directly in DB - persists across Dokku deploys
    const avatar = await avatarService.updateAvatar(req.params.id, { photo_url: base64DataUri });

    res.json({ success: true, avatar, photoUrl: base64DataUri });
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

// ── LinkedIn Integration ──────────────────────────────────────────────────

// POST /avatars/:id/linkedin/generate-post - Generate LinkedIn post with AI
router.post('/:id/linkedin/generate-post', protect, adminOnly, async (req, res) => {
  try {
    const { topic, style } = req.body
    const avatar = await pool.query('SELECT * FROM avatars WHERE id = $1', [req.params.id])
    if (!avatar.rows.length) return res.status(404).json({ success: false, error: 'Avatar not found' })
    const av = avatar.rows[0]

    const { analyzeWithDeepSeek } = await import('../services/deepseek.js')
    const prompt = `Eres ${av.name}, ${av.role} en ${av.company}. Genera un post de LinkedIn en espanol.

Tema: ${topic || 'inteligencia artificial aplicada a negocios'}
Estilo: ${style || 'informativo y profesional'}

El post debe:
- Tener un hook fuerte en la primera linea que capture atencion
- Desarrollar la idea en 3-5 parrafos cortos
- Incluir un call to action al final
- Usar saltos de linea para facilitar lectura
- NO usar hashtags excesivos (max 3 al final)
- Tono profesional pero cercano
- Max 200 palabras

Responde SOLO JSON: {"post":"texto del post","hashtags":["tag1","tag2","tag3"]}`

    const response = await analyzeWithDeepSeek(prompt)
    const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}')
    res.json({ success: true, post: parsed.post, hashtags: parsed.hashtags })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /avatars/:id/linkedin/generate-message - Generate LinkedIn DM
router.post('/:id/linkedin/generate-message', protect, adminOnly, async (req, res) => {
  try {
    const { targetName, targetRole, targetCompany, purpose } = req.body
    const avatar = await pool.query('SELECT * FROM avatars WHERE id = $1', [req.params.id])
    if (!avatar.rows.length) return res.status(404).json({ success: false, error: 'Avatar not found' })
    const av = avatar.rows[0]

    const { analyzeWithDeepSeek } = await import('../services/deepseek.js')
    const prompt = `Eres ${av.name}, ${av.role} en ${av.company}. Genera un mensaje directo de LinkedIn en espanol argentino.

Destinatario: ${targetName || 'contacto'} - ${targetRole || ''} en ${targetCompany || ''}
Proposito: ${purpose || 'networking y presentacion de servicios de IA'}

El mensaje debe:
- Ser corto y directo (max 80 palabras)
- Personalizado para el destinatario
- Profesional pero amigable
- Mencionar algo especifico de su perfil o empresa
- Terminar con una pregunta abierta
- Sin simbolos raros ni emojis excesivos

Responde SOLO JSON: {"message":"texto del mensaje"}`

    const response = await analyzeWithDeepSeek(prompt)
    const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}')
    res.json({ success: true, message: parsed.message })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /avatars/:id/linkedin/save-post - Save generated post to history
router.post('/:id/linkedin/save-post', protect, adminOnly, async (req, res) => {
  try {
    const { post, hashtags, status } = req.body
    const newPost = { post, hashtags, status: status || 'draft', createdAt: new Date().toISOString() }
    await pool.query(
      "UPDATE avatars SET linkedin_posts = COALESCE(linkedin_posts, '[]'::jsonb) || $1::jsonb WHERE id = $2",
      [JSON.stringify(newPost), req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /avatars/:id/linkedin/posts - Get post history
router.get('/:id/linkedin/posts', protect, adminOnly, async (req, res) => {
  try {
    const r = await pool.query('SELECT linkedin_posts FROM avatars WHERE id = $1', [req.params.id])
    res.json({ success: true, posts: r.rows[0]?.linkedin_posts || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /avatars/:id/linkedin/content-calendar - Generate week of content
router.post('/:id/linkedin/content-calendar', protect, adminOnly, async (req, res) => {
  try {
    const avatar = await pool.query('SELECT * FROM avatars WHERE id = $1', [req.params.id])
    if (!avatar.rows.length) return res.status(404).json({ success: false, error: 'Avatar not found' })
    const av = avatar.rows[0]

    const { analyzeWithDeepSeek } = await import('../services/deepseek.js')
    const prompt = `Eres ${av.name}, ${av.role} en ${av.company} (${av.specialties?.join(', ') || 'IA, tecnologia'}).

Genera un calendario de contenido para LinkedIn de 5 dias (Lun-Vie).
Cada dia debe tener un tema diferente relacionado con IA aplicada a negocios.

Responde SOLO JSON array:
[{"day":"Lunes","topic":"tema","type":"post/articulo/encuesta/carrusel","hook":"primera linea del post"}]`

    const response = await analyzeWithDeepSeek(prompt)
    const parsed = JSON.parse(response.match(/\[[\s\S]*\]/)?.[0] || '[]')
    res.json({ success: true, calendar: parsed })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router;
