import nodemailer from 'nodemailer';
import { pool } from '../../config/database.js';

// SMTP transporter
function createTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

// Email sequence templates (5 emails over 21 days)
const SEQUENCE_STEPS = [
  { day: 0, type: 'introduction', subject_hint: 'Presentacion personalizada' },
  { day: 3, type: 'value', subject_hint: 'Propuesta de valor especifica' },
  { day: 7, type: 'case_study', subject_hint: 'Caso de exito relevante' },
  { day: 14, type: 'urgency', subject_hint: 'Oportunidad limitada' },
  { day: 21, type: 'last_chance', subject_hint: 'Ultimo seguimiento' },
];

class EmailOutreachService {
  constructor() {
    this.transporter = null;
    this.isProcessing = false;
  }

  getTransporter() {
    if (!this.transporter) {
      this.transporter = createTransporter();
    }
    return this.transporter;
  }

  // Initialize outreach tables
  async initTables() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS outreach_campaigns (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'DRAFT',
        channel VARCHAR(50) DEFAULT 'EMAIL',
        total_leads INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        opened_count INTEGER DEFAULT 0,
        replied_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS outreach_messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        lead_id UUID REFERENCES leads(id),
        campaign_id UUID REFERENCES outreach_campaigns(id),
        channel VARCHAR(50) NOT NULL,
        step INTEGER DEFAULT 1,
        subject TEXT,
        body TEXT,
        ai_generated BOOLEAN DEFAULT true,
        status VARCHAR(50) DEFAULT 'PENDING',
        sent_at TIMESTAMP,
        opened_at TIMESTAMP,
        replied_at TIMESTAMP,
        error_message TEXT,
        scheduled_for TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS outreach_templates (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255),
        channel VARCHAR(50),
        step_type VARCHAR(50),
        sector VARCHAR(100),
        subject_template TEXT,
        body_template TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('[EmailOutreach] Tables initialized');
  }

  // Generate personalized email with AI
  async generateEmail(lead, stepType, stepNumber) {
    // Load active config and avatar
    const { default: emailTemplateConfig } = await import('./email-template-config.js');
    const config = await emailTemplateConfig.getActiveConfig();
    const avatar = await this.getActiveAvatar();

    const systemPrompt = config?.system_prompt || this.getDefaultSystemPrompt();
    const senderName = avatar?.name || process.env.SMTP_FROM_NAME?.replace(/_/g, ' ') || 'Adbize';

    const stepContext = {
      introduction: 'Primer contacto. Presentate brevemente y menciona como podes ayudar a esta empresa especifica.',
      value: 'Segundo contacto. Comparte un dato de valor relevante para su sector. Ofrece una consulta gratuita.',
      case_study: 'Tercer contacto. Menciona un caso de exito breve de una empresa similar. Muestra resultados concretos.',
      urgency: 'Cuarto contacto. Mencion suave de disponibilidad limitada este mes. No ser agresivo.',
      last_chance: 'Ultimo contacto. Breve y respetuoso. Preguntar si hay interes o si prefieren que no los contactes mas.',
    };

    const leadContext = `LEAD A CONTACTAR:
- Empresa: ${lead.name || 'Desconocida'}
- Sector: ${lead.sector || 'general'}
- Ciudad: ${lead.city || 'Argentina'}, ${lead.state || ''}
- Email: ${lead.email || 'no disponible'}
- Website: ${lead.website || 'no disponible'}
- Score: ${lead.score || 0}/100

TIPO DE EMAIL: ${stepType} (paso ${stepNumber || 1} de 5)
INSTRUCCION: ${stepContext[stepType] || stepContext.introduction}

Tu nombre es: ${senderName}
Firma se agrega automaticamente, NO la incluyas en el body.`;

    try {
      const { analyzeWithDeepSeek } = await import('../deepseek.js');
      const response = await analyzeWithDeepSeek(`${systemPrompt}\n\n${leadContext}`);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const bodyHtml = parsed.body_html || parsed.body || parsed.html || '';
        const subject = parsed.subject || `${lead.name} - ${senderName} de Adbize`;

        // Wrap in HTML template
        const finalHtml = this.wrapInTemplate(bodyHtml, avatar, config);
        return { subject, body: finalHtml };
      }
    } catch (err) {
      console.error('[EmailOutreach] AI generation failed:', err.message);
    }

    // Fallback to template (also wrap in HTML template with avatar signature)
    const fallback = this.getTemplateEmail(lead, stepType, stepNumber);
    fallback.body = this.wrapInTemplate(fallback.body, avatar, config);
    return fallback;
  }

  getDefaultSystemPrompt() {
    return `Eres un representante comercial de Adbize, una empresa argentina de tecnologia e inteligencia artificial.
Genera un email de prospeccion en espanol argentino profesional. Maximo 120 palabras. Tono consultivo.
Responde SOLO con JSON: { "subject": "asunto", "body_html": "HTML del email" }`;
  }

  wrapInTemplate(bodyHtml, avatar, config) {
    const signature = this.buildSignatureWithPhoto(avatar);
    const avatarName = avatar?.name || 'Adbize';
    const avatarRole = avatar?.role || '';
    const avatarEmail = avatar?.email || process.env.SMTP_FROM || 'hola@adbize.com';
    const avatarPhone = avatar?.phone || '';
    const avatarLinkedin = avatar?.linkedin_url || '';
    const avatarCalendar = avatar?.calendar_url || '';
    const baseUrl = process.env.APP_URL || 'https://adbize.com';
    // Support both data URIs (base64) and regular URLs
    const rawPhoto = avatar?.photo_url || '';
    const avatarPhotoUrl = rawPhoto.startsWith('data:') ? rawPhoto : (rawPhoto ? `${baseUrl}${rawPhoto}` : '');

    // Only use custom template if it's a real custom template (not the default placeholder)
    if (config?.html_template && config.html_template.length > 500 && !config.html_template.includes('{{BODY}}')) {
      return config.html_template
        .replace('{{BODY}}', bodyHtml)
        .replace('{{SIGNATURE}}', signature);
    }
    // Otherwise always use the Adbize branded template below

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#333333;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:30px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;border:1px solid #e4e4e7;">

  <!-- Body -->
  <tr>
    <td style="padding:36px 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#333333;">
      ${bodyHtml}
    </td>
  </tr>

  <!-- Signature -->
  <tr>
    <td style="padding:0 32px 28px;">
      <table cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e4e4e7;padding-top:20px;width:100%;">
        <tr>
          <td style="vertical-align:top;font-family:Arial,Helvetica,sans-serif;padding-top:20px;">
            <p style="margin:0;font-size:14px;font-weight:bold;color:#111827;">${avatarName}</p>
            ${avatarRole ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${avatarRole}</p>` : ''}
            <p style="margin:2px 0 0;font-size:13px;"><a href="https://adbize.com" style="color:#7c3aed;text-decoration:none;font-weight:bold;">adbize.com</a></p>
            ${avatarPhone ? `<p style="margin:6px 0 0;font-size:12px;color:#374151;"><a href="https://wa.me/${avatarPhone.replace(/[^0-9]/g, '')}" style="color:#374151;text-decoration:none;">Tel: ${avatarPhone}</a></p>` : ''}
            ${avatarEmail ? `<p style="margin:2px 0 0;font-size:12px;color:#374151;"><a href="mailto:${avatarEmail}" style="color:#374151;text-decoration:none;">${avatarEmail}</a></p>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:16px 32px;background-color:#fafafa;border-top:1px solid #e4e4e7;border-radius:0 0 8px 8px;text-align:center;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9ca3af;">
        Adbize - Inteligencia Artificial para Empresas | Argentina
      </p>
      <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;">
        <a href="https://www.linkedin.com/company/adbizedigital" style="color:#6b7280;text-decoration:none;">LinkedIn</a>
        &nbsp;&middot;&nbsp;
        <a href="https://www.instagram.com/adbize.ia/" style="color:#6b7280;text-decoration:none;">Instagram</a>
        &nbsp;&middot;&nbsp;
        <a href="https://adbize.com/" style="color:#6b7280;text-decoration:none;">Web</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`;
  }

  getTemplateEmail(lead, stepType, stepNumber) {
    const senderName = process.env.SMTP_FROM_NAME?.replace(/_/g, ' ') || 'Gian Koch';
    const companyName = lead.name || 'su empresa';
    const sector = lead.sector || 'su industria';

    const templates = {
      introduction: {
        subject: `${companyName} + IA: Una idea para ${sector}`,
        body: `<p>Hola,</p>
<p>Soy ${senderName} de <b>Adbize</b>. Encontre a <b>${companyName}</b> investigando empresas del sector ${sector} en ${lead.city || 'Argentina'} y me parecio interesante lo que hacen.</p>
<p>En Adbize ayudamos a empresas como la suya a <b>automatizar procesos y aumentar ventas usando inteligencia artificial</b>. Desde chatbots hasta sistemas de prospeccion automatizada.</p>
<p>¿Les interesaria una consulta gratuita de 15 minutos para explorar como la IA puede ayudarles?</p>
<p>Saludos,<br><b>${senderName}</b><br>Adbize - Inteligencia Artificial para Empresas<br>adbize.com</p>`
      },
      value: {
        subject: `Dato interesante sobre IA en ${sector}`,
        body: `<p>Hola de nuevo,</p>
<p>Queria compartirles un dato: las empresas de ${sector} que implementan IA reportan en promedio un <b>35% de mejora en eficiencia operativa</b> en los primeros 6 meses.</p>
<p>En Adbize trabajamos con empresas similares a ${companyName} implementando soluciones como:</p>
<p>• Chatbots que atienden clientes 24/7<br>• Automatizacion de tareas repetitivas<br>• Analisis predictivo de datos</p>
<p>¿Tienen 15 minutos esta semana para una llamada rapida?</p>
<p>Saludos,<br><b>${senderName}</b><br>Adbize</p>`
      },
      case_study: {
        subject: `Como una empresa de ${sector} aumento sus ventas con IA`,
        body: `<p>Hola,</p>
<p>Les comparto un caso reciente: una empresa de ${sector} en Argentina implemento con nosotros un <b>sistema de prospeccion automatizada con IA</b>. En 3 meses lograron:</p>
<p>• <b>+200 leads calificados</b> por mes (antes tenian 30)<br>• <b>40% menos tiempo</b> en tareas administrativas<br>• <b>3x mas reuniones</b> con clientes potenciales</p>
<p>Podriamos hacer algo similar para ${companyName}. ¿Les interesa saber mas?</p>
<p>Saludos,<br><b>${senderName}</b><br>Adbize</p>`
      },
      urgency: {
        subject: `Disponibilidad limitada - proyecto IA para ${companyName}`,
        body: `<p>Hola,</p>
<p>Les escribo brevemente porque este mes tenemos <b>disponibilidad para 2 proyectos nuevos</b> de implementacion de IA.</p>
<p>Si ${companyName} esta considerando incorporar inteligencia artificial para optimizar procesos, este seria un buen momento para arrancar.</p>
<p>¿Podemos coordinar una llamada de 15 minutos?</p>
<p>Saludos,<br><b>${senderName}</b><br>Adbize</p>`
      },
      last_chance: {
        subject: `Ultimo mensaje - ${senderName} de Adbize`,
        body: `<p>Hola,</p>
<p>Este es mi ultimo mensaje. Entiendo que pueden estar ocupados o que no es el momento.</p>
<p>Si en algun momento ${companyName} necesita ayuda con <b>inteligencia artificial, automatizacion o chatbots</b>, no duden en escribirme.</p>
<p>Les deseo mucho exito.</p>
<p>Saludos,<br><b>${senderName}</b><br>Adbize<br>adbize.com</p>`
      },
    };

    return templates[stepType] || templates.introduction;
  }

  // Get avatar info for email branding
  async getActiveAvatar() {
    try {
      const res = await pool.query('SELECT * FROM avatars WHERE is_default = true AND is_active = true LIMIT 1');
      if (res.rows.length > 0) return res.rows[0];
      const fallback = await pool.query('SELECT * FROM avatars WHERE is_active = true ORDER BY created_at ASC LIMIT 1');
      return fallback.rows[0] || null;
    } catch {
      return null;
    }
  }

  // Build email signature with avatar photo
  buildSignatureWithPhoto(avatar) {
    if (!avatar) return '';

    const name = avatar.name || 'Adbize';
    const role = avatar.role || '';
    const company = avatar.company || 'Adbize';
    const phone = avatar.phone || '';
    const email = avatar.email || '';
    const linkedin = avatar.linkedin_url || '';
    const calendar = avatar.calendar_url || '';

    // If avatar has custom signature HTML, use it
    if (avatar.signature_html) return avatar.signature_html;

    // Build signature with photo
    const baseUrl = process.env.APP_URL || 'https://adbize.com';
    const photoHtml = avatar.photo_url
      ? `<img src="${baseUrl}${avatar.photo_url}" alt="${name}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;margin-right:12px;" />`
      : `<div style="width:60px;height:60px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:24px;margin-right:12px;">${name.charAt(0)}</div>`;

    return `
<table cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:16px;">
  <tr>
    <td style="vertical-align:top;padding-right:12px;">
      ${photoHtml}
    </td>
    <td style="vertical-align:top;font-family:Arial,sans-serif;">
      <strong style="font-size:14px;color:#1f2937;">${name}</strong><br/>
      ${role ? `<span style="font-size:12px;color:#6b7280;">${role}</span><br/>` : ''}
      <span style="font-size:12px;color:#10b981;font-weight:600;">${company}</span><br/>
      ${phone ? `<span style="font-size:11px;color:#6b7280;">📱 ${phone}</span><br/>` : ''}
      ${email ? `<span style="font-size:11px;color:#6b7280;">✉️ ${email}</span><br/>` : ''}
      ${linkedin ? `<a href="${linkedin}" style="font-size:11px;color:#0077b5;text-decoration:none;">LinkedIn</a> ` : ''}
      ${calendar ? `<a href="${calendar}" style="font-size:11px;color:#10b981;text-decoration:none;">📅 Agendar reunion</a>` : ''}
    </td>
  </tr>
</table>`;
  }

  // Send email via Brevo API (primary) or SMTP (fallback)
  async sendEmail(to, subject, htmlBody) {
    const avatar = await this.getActiveAvatar();
    const fromName = avatar?.name || process.env.SMTP_FROM_NAME?.replace(/_/g, ' ') || 'Adbize';
    const fromEmail = avatar?.email || process.env.SMTP_FROM || process.env.SMTP_USER || 'giankoch@adbize.com';

    let result;

    // Try Brevo API first (works even when SMTP ports are blocked)
    if (process.env.BREVO_API_KEY) {
      try {
        result = await this.sendViaBrevo(to, subject, htmlBody, fromName, fromEmail);
        console.log(`[EmailOutreach] Email sent via Brevo to ${to} as ${fromName}`);
      } catch (brevoErr) {
        console.error('[EmailOutreach] Brevo failed:', brevoErr.message);
        // Fall through to SMTP
      }
    }

    // Fallback to SMTP
    if (!result) {
      try {
        const transporter = this.getTransporter();
        result = await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to,
          subject,
          html: htmlBody,
        });
        console.log(`[EmailOutreach] Email sent via SMTP to ${to}: ${result.messageId}`);
      } catch (smtpErr) {
        console.error('[EmailOutreach] SMTP also failed:', smtpErr.message);
        throw new Error(`No se pudo enviar el email. Brevo: ${process.env.BREVO_API_KEY ? 'configurado' : 'no configurado'}. SMTP: ${smtpErr.message}`);
      }
    }

    // Track avatar stats
    if (avatar) {
      pool.query('UPDATE avatars SET emails_sent = emails_sent + 1, messages_sent = messages_sent + 1 WHERE id = $1', [avatar.id]).catch(() => {});
    }

    return result;
  }

  // Send via Brevo (Sendinblue) API
  async sendViaBrevo(to, subject, htmlBody, fromName, fromEmail) {
    const axios = (await import('axios')).default;

    const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: htmlBody,
    }, {
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      timeout: 15000,
    });

    return { messageId: response.data?.messageId || 'brevo-' + Date.now(), provider: 'brevo' };
  }

  // Create email sequence for a lead
  async createSequenceForLead(leadId, campaignId) {
    const leadRes = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (leadRes.rows.length === 0) throw new Error('Lead not found');
    const lead = leadRes.rows[0];

    if (!lead.email) throw new Error('Lead has no email');

    const messages = [];
    for (const step of SEQUENCE_STEPS) {
      const email = await this.generateEmail(lead, step.type, step.day === 0 ? 1 : SEQUENCE_STEPS.indexOf(step) + 1);

      const scheduledFor = new Date(Date.now() + step.day * 24 * 60 * 60 * 1000);

      const res = await pool.query(
        `INSERT INTO outreach_messages (lead_id, campaign_id, channel, step, subject, body, ai_generated, status, scheduled_for)
         VALUES ($1, $2, 'EMAIL', $3, $4, $5, true, 'SCHEDULED', $6) RETURNING *`,
        [leadId, campaignId, SEQUENCE_STEPS.indexOf(step) + 1, email.subject, email.body, scheduledFor]
      );
      messages.push(res.rows[0]);
    }

    return messages;
  }

  // Send first email immediately
  async sendFirstEmail(leadId, campaignId) {
    const leadRes = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (leadRes.rows.length === 0) throw new Error('Lead not found');
    const lead = leadRes.rows[0];

    if (!lead.email) throw new Error('Lead has no email');

    // Generate and send
    const email = await this.generateEmail(lead, 'introduction', 1);
    await this.sendEmail(lead.email, email.subject, email.body);

    // Save to DB
    await pool.query(
      `INSERT INTO outreach_messages (lead_id, campaign_id, channel, step, subject, body, ai_generated, status, sent_at)
       VALUES ($1, $2, 'EMAIL', 1, $3, $4, true, 'SENT', NOW())`,
      [leadId, campaignId, email.subject, email.body]
    );

    return email;
  }

  // Process scheduled emails (run periodically)
  async processScheduledEmails() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const result = await pool.query(
        `SELECT om.*, l.email, l.name as lead_name FROM outreach_messages om
         JOIN leads l ON l.id = om.lead_id
         WHERE om.status = 'SCHEDULED' AND om.scheduled_for <= NOW() AND om.channel = 'EMAIL'
         ORDER BY om.scheduled_for ASC LIMIT 10`
      );

      for (const msg of result.rows) {
        try {
          await this.sendEmail(msg.email, msg.subject, msg.body);
          await pool.query(
            "UPDATE outreach_messages SET status = 'SENT', sent_at = NOW() WHERE id = $1",
            [msg.id]
          );
          console.log(`[EmailOutreach] Scheduled email sent to ${msg.email}`);
          // Delay between sends
          await new Promise(r => setTimeout(r, 3000));
        } catch (err) {
          await pool.query(
            "UPDATE outreach_messages SET status = 'FAILED', error_message = $1 WHERE id = $2",
            [err.message, msg.id]
          );
          console.error(`[EmailOutreach] Failed to send to ${msg.email}:`, err.message);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Get outreach stats
  async getStats() {
    const [total, sent, scheduled, failed] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM outreach_messages WHERE channel = 'EMAIL'"),
      pool.query("SELECT COUNT(*) FROM outreach_messages WHERE status = 'SENT'"),
      pool.query("SELECT COUNT(*) FROM outreach_messages WHERE status = 'SCHEDULED'"),
      pool.query("SELECT COUNT(*) FROM outreach_messages WHERE status = 'FAILED'"),
    ]);
    return {
      total: parseInt(total.rows[0].count),
      sent: parseInt(sent.rows[0].count),
      scheduled: parseInt(scheduled.rows[0].count),
      failed: parseInt(failed.rows[0].count),
    };
  }

  // Get messages for a lead
  async getLeadMessages(leadId) {
    const result = await pool.query(
      'SELECT * FROM outreach_messages WHERE lead_id = $1 ORDER BY step ASC',
      [leadId]
    );
    return result.rows;
  }
}

export const emailOutreachService = new EmailOutreachService();
export default emailOutreachService;
