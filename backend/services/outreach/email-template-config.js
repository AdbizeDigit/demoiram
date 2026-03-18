import { pool } from '../../config/database.js';

class EmailTemplateConfig {
  async initTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_config (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) DEFAULT 'default',
        system_prompt TEXT NOT NULL,
        company_name VARCHAR(255) DEFAULT 'Adbize',
        company_description TEXT,
        company_services TEXT,
        company_website VARCHAR(255) DEFAULT 'adbize.com',
        company_value_proposition TEXT,
        email_style TEXT DEFAULT 'professional',
        html_template TEXT,
        tone VARCHAR(50) DEFAULT 'consultivo',
        max_words INTEGER DEFAULT 150,
        cta_type VARCHAR(50) DEFAULT 'call',
        include_avatar_photo BOOLEAN DEFAULT true,
        include_calendar_link BOOLEAN DEFAULT true,
        anti_spam_mode BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed default config if none exists
    const existing = await pool.query('SELECT id FROM email_config LIMIT 1');
    if (existing.rows.length === 0) {
      await this.createDefault();
    }
  }

  async createDefault() {
    const defaultPrompt = `Eres un representante comercial de Adbize, una empresa argentina de tecnologia e inteligencia artificial.

SOBRE ADBIZE:
- Empresa de soluciones de IA para negocios
- Servicios: Chatbots inteligentes, automatizacion de procesos con IA, scraping inteligente, analisis de datos, integracion de IA en sistemas existentes
- Propuesta de valor: Ayudamos a empresas a automatizar procesos, aumentar ventas y optimizar operaciones con inteligencia artificial
- Website: adbize.com
- Ubicacion: Argentina

REGLAS PARA EL EMAIL:
- Maximo 120 palabras en el body (sin contar firma)
- Tono consultivo, NO vendedor. Somos asesores, no vendedores
- Personalizar segun sector y empresa del lead
- Incluir 1 dato o estadistica relevante para su sector
- CTA claro: agendar una llamada de 15 minutos
- NO usar emojis en el asunto
- NO usar palabras spam (gratis, oferta, descuento, urgente, click aqui)
- Ser directo, ir al grano en el primer parrafo
- Mencionar la empresa del lead por nombre
- Usar espanol argentino natural (vos/ustedes)

FORMATO DE RESPUESTA (JSON):
{
  "subject": "asunto corto y profesional (max 50 chars)",
  "body_html": "HTML del email usando SOLO estas tags: <p>, <br>, <b>, <a>, <ul>, <li>. Estilo inline minimo. NO incluir firma, se agrega automaticamente."
}`;

    const defaultHtmlWrapper = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#333333;background-color:#f9fafb;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
<tr><td style="padding:32px 28px 0;">
{{BODY}}
</td></tr>
<tr><td style="padding:16px 28px 32px;">
{{SIGNATURE}}
</td></tr>
</table>
</body>
</html>`;

    await pool.query(
      `INSERT INTO email_config (name, system_prompt, company_name, company_description, company_services, company_website, company_value_proposition, html_template, tone, max_words, cta_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        'default',
        defaultPrompt,
        'Adbize',
        'Empresa argentina de tecnologia e inteligencia artificial',
        'Chatbots inteligentes, automatizacion de procesos con IA, scraping inteligente, analisis de datos, integracion de IA',
        'adbize.com',
        'Ayudamos a empresas a automatizar procesos, aumentar ventas y optimizar operaciones con IA',
        defaultHtmlWrapper,
        'consultivo',
        150,
        'call',
      ]
    );
  }

  async getActiveConfig() {
    const res = await pool.query('SELECT * FROM email_config WHERE is_active = true ORDER BY updated_at DESC LIMIT 1');
    return res.rows[0] || null;
  }

  async saveConfig(data) {
    const existing = await this.getActiveConfig();
    if (existing) {
      const fields = [];
      const params = [];
      let idx = 1;
      const allowed = ['system_prompt','company_name','company_description','company_services',
        'company_website','company_value_proposition','email_style','html_template','tone',
        'max_words','cta_type','include_avatar_photo','include_calendar_link','anti_spam_mode'];

      for (const [key, val] of Object.entries(data)) {
        if (allowed.includes(key)) {
          fields.push(`${key} = $${idx++}`);
          params.push(val);
        }
      }
      if (fields.length === 0) return existing;
      fields.push('updated_at = NOW()');
      params.push(existing.id);
      const res = await pool.query(
        `UPDATE email_config SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );
      return res.rows[0];
    } else {
      return this.createDefault();
    }
  }
}

export const emailTemplateConfig = new EmailTemplateConfig();
export default emailTemplateConfig;
