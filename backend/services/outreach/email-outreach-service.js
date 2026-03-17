import nodemailer from 'nodemailer';
import { pool } from '../../config/database.js';
import { analyzeWithDeepSeek } from '../deepseek.js';

// SMTP transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
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
    const senderName = process.env.SMTP_FROM_NAME?.replace(/_/g, ' ') || 'Gian Koch';

    const systemPrompt = `Eres ${senderName} de Adbize, una empresa de tecnologia e inteligencia artificial que ayuda a empresas a automatizar procesos, aumentar ventas y optimizar operaciones con IA.

Servicios de Adbize:
- Chatbots inteligentes personalizados
- Automatizacion de procesos con IA
- Scraping inteligente y prospeccion automatizada
- Analisis de datos con IA
- Integracion de IA en sistemas existentes

Genera un email de prospeccion en espanol argentino profesional. El email debe ser:
- Corto (max 150 palabras en el body)
- Personalizado para la empresa y sector del lead
- Con un CTA claro
- Sin ser spam ni agresivo
- Tono consultivo, no vendedor

Responde SOLO con JSON valido:
{
  "subject": "asunto del email (max 60 chars, sin emojis)",
  "body": "cuerpo del email en HTML simple (p, br, b, a tags). Incluir saludo, 2-3 parrafos cortos, CTA, firma de ${senderName} - Adbize"
}`;

    const context = `Empresa: ${lead.name}
Sector: ${lead.sector || 'general'}
Ciudad: ${lead.city || ''}, ${lead.state || ''}
Website: ${lead.website || 'no disponible'}
Contacto: ${lead.email}
Score: ${lead.score}/100

Tipo de email: ${stepType}
Numero en secuencia: ${stepNumber}/5

${stepType === 'introduction' ? 'Email de presentacion inicial. Mencionar que detectaste su empresa y como Adbize puede ayudarles.' : ''}
${stepType === 'value' ? 'Email de valor. Compartir un dato o insight relevante para su sector. Ofrecer una consulta gratuita.' : ''}
${stepType === 'case_study' ? 'Email con caso de exito. Inventar un caso breve de una empresa similar que uso IA para mejorar resultados.' : ''}
${stepType === 'urgency' ? 'Email con urgencia suave. Mencionar que tenes disponibilidad limitada este mes para nuevos proyectos.' : ''}
${stepType === 'last_chance' ? 'Ultimo email. Breve, respetuoso. Preguntar si hay interes o si prefieren que no los contactes mas.' : ''}`;

    try {
      const response = await analyzeWithDeepSeek(`${systemPrompt}\n\n${context}`);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.error('[EmailOutreach] AI generation failed:', err.message);
    }

    // Fallback template
    return this.getTemplateEmail(lead, stepType, stepNumber);
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

  // Send a single email
  async sendEmail(to, subject, htmlBody) {
    const transporter = this.getTransporter();
    const fromName = process.env.SMTP_FROM_NAME?.replace(/_/g, ' ') || 'Adbize';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlBody,
    });

    console.log(`[EmailOutreach] Email sent to ${to}: ${info.messageId}`);
    return info;
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
