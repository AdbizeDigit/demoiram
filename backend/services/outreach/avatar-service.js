import { pool } from '../../config/database.js';
import { analyzeWithDeepSeek } from '../deepseek.js';

class AvatarService {
  async initTables() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS avatars (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255) DEFAULT 'Sales Representative',
        company VARCHAR(255) DEFAULT 'Adbize',
        email VARCHAR(255),
        phone VARCHAR(100),
        photo_url TEXT,
        signature_html TEXT,
        personality TEXT,
        tone VARCHAR(50) DEFAULT 'professional',
        language VARCHAR(50) DEFAULT 'es-AR',
        system_prompt TEXT,
        greeting_style TEXT,
        closing_style TEXT,
        emoji_usage VARCHAR(20) DEFAULT 'minimal',
        formality VARCHAR(20) DEFAULT 'formal',
        specialties TEXT[],
        bio TEXT,
        linkedin_url TEXT,
        calendar_url TEXT,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        messages_sent INTEGER DEFAULT 0,
        emails_sent INTEGER DEFAULT 0,
        whatsapp_sent INTEGER DEFAULT 0,
        response_rate DECIMAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add avatar_id to outreach_messages if not exists
    await pool.query('ALTER TABLE outreach_messages ADD COLUMN IF NOT EXISTS avatar_id UUID');

    console.log('[AvatarService] Tables initialized');
  }

  async createAvatar(data) {
    const {
      name, role, company, email, phone, photo_url, signature_html,
      personality, tone, language, system_prompt, greeting_style,
      closing_style, emoji_usage, formality, specialties, bio,
      linkedin_url, calendar_url, is_default
    } = data;

    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query('UPDATE avatars SET is_default = false');
    }

    const result = await pool.query(
      `INSERT INTO avatars (name, role, company, email, phone, photo_url, signature_html,
        personality, tone, language, system_prompt, greeting_style, closing_style,
        emoji_usage, formality, specialties, bio, linkedin_url, calendar_url, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [name, role || 'Sales Representative', company || 'Adbize', email, phone,
       photo_url, signature_html, personality, tone || 'professional', language || 'es-AR',
       system_prompt, greeting_style, closing_style, emoji_usage || 'minimal',
       formality || 'formal', specialties || [], bio, linkedin_url, calendar_url, is_default || false]
    );

    return result.rows[0];
  }

  async updateAvatar(id, data) {
    const fields = [];
    const params = [];
    let idx = 1;

    const allowed = ['name','role','company','email','phone','photo_url','signature_html',
      'personality','tone','language','system_prompt','greeting_style','closing_style',
      'emoji_usage','formality','specialties','bio','linkedin_url','calendar_url','is_default','is_active'];

    for (const [key, val] of Object.entries(data)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = $${idx++}`);
        params.push(val);
      }
    }

    if (fields.length === 0) return null;

    if (data.is_default) {
      await pool.query('UPDATE avatars SET is_default = false');
    }

    fields.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query(
      `UPDATE avatars SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return result.rows[0];
  }

  async getAvatars() {
    const result = await pool.query('SELECT * FROM avatars ORDER BY is_default DESC, created_at DESC');
    return result.rows;
  }

  async getAvatar(id) {
    const result = await pool.query('SELECT * FROM avatars WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getDefaultAvatar() {
    const result = await pool.query('SELECT * FROM avatars WHERE is_default = true LIMIT 1');
    if (result.rows.length > 0) return result.rows[0];
    // Fallback to first active
    const fallback = await pool.query('SELECT * FROM avatars WHERE is_active = true ORDER BY created_at ASC LIMIT 1');
    return fallback.rows[0] || null;
  }

  async deleteAvatar(id) {
    await pool.query('DELETE FROM avatars WHERE id = $1', [id]);
  }

  async incrementStats(avatarId, channel) {
    const col = channel === 'EMAIL' ? 'emails_sent' : 'whatsapp_sent';
    await pool.query(
      `UPDATE avatars SET ${col} = ${col} + 1, messages_sent = messages_sent + 1 WHERE id = $1`,
      [avatarId]
    );
  }

  // Generate message AS the avatar
  async generateMessageAsAvatar(avatar, lead, channel, stepType) {
    const systemPrompt = this.buildAvatarSystemPrompt(avatar, channel);
    const context = this.buildLeadContext(lead, stepType);

    try {
      const response = await analyzeWithDeepSeek(`${systemPrompt}\n\n${context}`);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error('[Avatar] AI generation failed:', err.message);
    }

    // Fallback
    return this.generateFallbackMessage(avatar, lead, channel, stepType);
  }

  buildAvatarSystemPrompt(avatar, channel) {
    const emojiGuide = {
      none: 'No uses emojis.',
      minimal: 'Usa maximo 1-2 emojis sutiles.',
      moderate: 'Usa emojis moderadamente (3-4).',
      heavy: 'Usa emojis frecuentemente para ser expresivo.',
    };

    const formalityGuide = {
      very_formal: 'Usa un tono muy formal y corporativo. Trata de usted.',
      formal: 'Usa un tono profesional pero accesible. Podes tutear o usar usted segun contexto.',
      casual: 'Usa un tono casual y cercano. Tutea siempre.',
      very_casual: 'Usa un tono muy informal, como hablando con un amigo. Usa modismos argentinos.',
    };

    return `Eres ${avatar.name}, ${avatar.role} en ${avatar.company}.

${avatar.personality || 'Eres un profesional de ventas experimentado y amigable.'}

${avatar.system_prompt || `Tu empresa ${avatar.company} ofrece soluciones de inteligencia artificial para empresas: chatbots, automatizacion, scraping inteligente, analisis de datos.`}

Estilo de comunicacion:
- Tono: ${avatar.tone || 'professional'}
- Formalidad: ${formalityGuide[avatar.formality] || formalityGuide.formal}
- Emojis: ${emojiGuide[avatar.emoji_usage] || emojiGuide.minimal}
- Idioma: Espanol argentino
${avatar.greeting_style ? `- Saludo: ${avatar.greeting_style}` : ''}
${avatar.closing_style ? `- Despedida: ${avatar.closing_style}` : ''}
${avatar.specialties?.length ? `- Especialidades: ${avatar.specialties.join(', ')}` : ''}

${channel === 'EMAIL' ? `Genera un email. Responde con JSON: {"subject": "asunto (max 60 chars)", "body": "cuerpo HTML con <p>, <br>, <b> tags. Incluye firma con tu nombre, rol y empresa."}` : ''}
${channel === 'WHATSAPP' ? `Genera un mensaje de WhatsApp. Responde con JSON: {"message": "texto corto, max 80 palabras"}` : ''}`;
  }

  buildLeadContext(lead, stepType) {
    return `Lead a contactar:
- Empresa: ${lead.name || 'Desconocida'}
- Sector: ${lead.sector || 'general'}
- Ciudad: ${lead.city || ''}, ${lead.state || ''}
- Email: ${lead.email || 'no disponible'}
- Website: ${lead.website || 'no disponible'}
- Telefono: ${lead.phone || 'no disponible'}

Tipo de mensaje: ${stepType || 'introduction'}
${stepType === 'introduction' ? 'Primer contacto. Presentate y menciona como podes ayudarles.' : ''}
${stepType === 'value' ? 'Segundo contacto. Comparte un dato de valor para su sector.' : ''}
${stepType === 'followup' ? 'Seguimiento. Pregunta si vieron tu mensaje anterior.' : ''}`;
  }

  generateFallbackMessage(avatar, lead, channel, stepType) {
    const name = avatar.name || 'Representante';
    const company = avatar.company || 'Adbize';
    const leadName = lead.name || 'su empresa';
    const sector = lead.sector || 'su industria';

    if (channel === 'WHATSAPP') {
      return {
        message: `Hola! Soy ${name} de ${company}. Vi que ${leadName} trabaja en ${sector} y me parecio interesante. Nosotros ayudamos a empresas a crecer con inteligencia artificial. ¿Les interesa saber mas?`
      };
    }

    return {
      subject: `${leadName} + IA: una idea para ${sector}`,
      body: `<p>Hola,</p>
<p>Soy <b>${name}</b>, ${avatar.role || 'representante'} de <b>${company}</b>. Encontre a ${leadName} investigando empresas de ${sector} y me parecio interesante lo que hacen.</p>
<p>En ${company} ayudamos a empresas a automatizar procesos y aumentar ventas con inteligencia artificial.</p>
<p>¿Les gustaria una consulta gratuita de 15 minutos?</p>
<p>Saludos,<br><b>${name}</b><br>${avatar.role || ''} - ${company}</p>
${avatar.signature_html || ''}`
    };
  }
}

export const avatarService = new AvatarService();
export default avatarService;
