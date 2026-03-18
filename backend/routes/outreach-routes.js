import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { pool } from '../config/database.js';
import { emailOutreachService } from '../services/outreach/email-outreach-service.js';
import { whatsappOutreachService } from '../services/outreach/whatsapp-outreach-service.js';
import { callScriptService } from '../services/outreach/call-script-service.js';

const router = Router();
router.use(protect, adminOnly);

// ── Campaigns ──

// POST /campaigns - Create campaign
router.post('/campaigns', async (req, res) => {
  try {
    const { name, channel } = req.body;
    const result = await pool.query(
      'INSERT INTO outreach_campaigns (name, channel) VALUES ($1, $2) RETURNING *',
      [name || 'Nueva Campana', channel || 'EMAIL']
    );
    res.json({ success: true, campaign: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /campaigns - List campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM outreach_campaigns ORDER BY created_at DESC');
    res.json({ success: true, campaigns: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /campaigns/:id - Campaign detail
router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await pool.query('SELECT * FROM outreach_campaigns WHERE id = $1', [req.params.id]);
    if (campaign.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });

    const messages = await pool.query(
      `SELECT om.*, l.name as lead_name, l.email as lead_email, l.phone as lead_phone
       FROM outreach_messages om JOIN leads l ON l.id = om.lead_id
       WHERE om.campaign_id = $1 ORDER BY om.created_at DESC`,
      [req.params.id]
    );

    res.json({ success: true, campaign: campaign.rows[0], messages: messages.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Email Outreach ──

// POST /email/send - Send email to a lead
router.post('/email/send', async (req, res) => {
  try {
    const { leadId, campaignId } = req.body;

    // Create default campaign if none
    let cid = campaignId;
    if (!cid) {
      const c = await pool.query(
        "INSERT INTO outreach_campaigns (name, channel) VALUES ('Outreach Directo', 'EMAIL') RETURNING id"
      );
      cid = c.rows[0].id;
    }

    const email = await emailOutreachService.sendFirstEmail(leadId, cid);

    // Update campaign stats
    await pool.query(
      'UPDATE outreach_campaigns SET sent_count = sent_count + 1, total_leads = total_leads + 1 WHERE id = $1',
      [cid]
    );

    // Auto-regenerate AI report after outreach
    import('../services/scraping/lead-report-service.js')
      .then(m => m.default.generateReport(leadId))
      .catch(() => {});

    res.json({ success: true, email, message: 'Email enviado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /email/sequence - Create full email sequence for a lead
router.post('/email/sequence', async (req, res) => {
  try {
    const { leadId, campaignId } = req.body;

    let cid = campaignId;
    if (!cid) {
      const c = await pool.query(
        "INSERT INTO outreach_campaigns (name, channel) VALUES ('Secuencia Email IA', 'EMAIL') RETURNING id"
      );
      cid = c.rows[0].id;
    }

    const messages = await emailOutreachService.createSequenceForLead(leadId, cid);

    // Send first email immediately
    const first = messages[0];
    if (first) {
      const leadRes = await pool.query('SELECT email FROM leads WHERE id = $1', [leadId]);
      if (leadRes.rows[0]?.email) {
        await emailOutreachService.sendEmail(leadRes.rows[0].email, first.subject, first.body);
        await pool.query("UPDATE outreach_messages SET status = 'SENT', sent_at = NOW() WHERE id = $1", [first.id]);
      }
    }

    await pool.query(
      'UPDATE outreach_campaigns SET total_leads = total_leads + 1, sent_count = sent_count + 1 WHERE id = $1',
      [cid]
    );

    res.json({ success: true, messages, message: `Secuencia creada: ${messages.length} emails programados` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /email/preview - Preview email without sending
router.post('/email/preview', async (req, res) => {
  try {
    const { leadId, stepType } = req.body;
    const leadRes = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (leadRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Lead not found' });

    const email = await emailOutreachService.generateEmail(leadRes.rows[0], stepType || 'introduction', 1);
    res.json({ success: true, preview: email });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /email/stats - Email outreach stats
router.get('/email/stats', async (req, res) => {
  try {
    const stats = await emailOutreachService.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── WhatsApp ──

// POST /whatsapp/generate - Generate WhatsApp message for lead
router.post('/whatsapp/generate', async (req, res) => {
  try {
    const { leadId } = req.body;
    const leadRes = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (leadRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Lead not found' });
    const lead = leadRes.rows[0];

    if (!lead.phone && !lead.social_whatsapp) {
      return res.status(400).json({ success: false, error: 'Lead no tiene telefono ni WhatsApp' });
    }

    const message = await whatsappOutreachService.generateMessage(lead);
    const phone = lead.social_whatsapp || lead.phone;
    const link = whatsappOutreachService.getWhatsAppLink(phone, message);

    // Save to DB
    await whatsappOutreachService.saveMessage(leadId, message, null);

    res.json({ success: true, message, link, phone });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Call Scripts ──

// POST /call/script - Generate call script for lead
router.post('/call/script', async (req, res) => {
  try {
    const { leadId } = req.body;
    const leadRes = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (leadRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Lead not found' });

    const script = await callScriptService.generateCallScript(leadRes.rows[0]);
    await callScriptService.saveScript(leadId, script);

    res.json({ success: true, script });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Messages ──

// GET /messages - List all messages
router.get('/messages', async (req, res) => {
  try {
    const { leadId, channel, status, limit = 50 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (leadId) { conditions.push(`om.lead_id = $${idx++}`); params.push(leadId); }
    if (channel) { conditions.push(`om.channel = $${idx++}`); params.push(channel); }
    if (status) { conditions.push(`om.status = $${idx++}`); params.push(status); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit));

    const result = await pool.query(
      `SELECT om.*, l.name as lead_name, l.email as lead_email, l.phone as lead_phone
       FROM outreach_messages om LEFT JOIN leads l ON l.id = om.lead_id
       ${where} ORDER BY om.created_at DESC LIMIT $${idx}`,
      params
    );

    res.json({ success: true, messages: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /lead/:id/messages - Messages for a specific lead
router.get('/lead/:id/messages', async (req, res) => {
  try {
    const messages = await emailOutreachService.getLeadMessages(req.params.id);
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /email/test - Send a test email to any address (playground)
router.post('/email/test', async (req, res) => {
  try {
    const { email, subject, body, companyName, sector, city, stepType } = req.body;

    if (!email) return res.status(400).json({ success: false, error: 'Email requerido' });

    // Generate email with AI using fake lead data
    const fakeLead = {
      name: companyName || 'Empresa Test',
      sector: sector || 'tecnologia',
      city: city || 'Buenos Aires',
      state: '',
      email: email,
      website: req.body.website || '',
      score: 75,
    };

    let emailContent;
    if (subject && body) {
      // Use provided content
      emailContent = { subject, body };
    } else {
      // Generate with AI
      emailContent = await emailOutreachService.generateEmail(fakeLead, stepType || 'introduction', 1);
    }

    // Send the test email
    await emailOutreachService.sendEmail(email, emailContent.subject, emailContent.body);

    res.json({ success: true, message: `Email de prueba enviado a ${email}`, email: emailContent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /whatsapp/test - Generate WhatsApp message with fake data (playground)
router.post('/whatsapp/test', async (req, res) => {
  try {
    const { phone, companyName, sector, city, website } = req.body;

    const fakeLead = {
      name: companyName || 'Empresa Test',
      sector: sector || 'tecnologia',
      city: city || 'Buenos Aires',
      phone: phone || '+5491112345678',
      website: website || '',
    };

    const message = await whatsappOutreachService.generateMessage(fakeLead);
    const link = whatsappOutreachService.getWhatsAppLink(phone || fakeLead.phone, message);

    res.json({ success: true, message, link, phone: phone || fakeLead.phone });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── WhatsApp Direct Connection (QR-based) ──

// POST /whatsapp/connect - Start WhatsApp connection (generates QR)
router.post('/whatsapp/connect', async (req, res) => {
  try {
    const { default: whatsappConnection } = await import('../services/outreach/whatsapp-connection-service.js');

    // Reset retry count for fresh connection
    whatsappConnection.retryCount = 0;

    // Start connection (async, don't await full connection)
    whatsappConnection.connect().catch(err => {
      console.error('[WhatsApp Route] Connection error:', err.message);
    });

    // Wait up to 15 seconds for QR to appear
    let status = whatsappConnection.getStatus();
    for (let i = 0; i < 15; i++) {
      if (status.qrCode || status.status === 'connected') break;
      await new Promise(r => setTimeout(r, 1000));
      status = whatsappConnection.getStatus();
    }

    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /whatsapp/disconnect - Disconnect and clear session
router.post('/whatsapp/disconnect', async (req, res) => {
  try {
    const { default: whatsappConnection } = await import('../services/outreach/whatsapp-connection-service.js');
    const result = await whatsappConnection.disconnect();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /whatsapp/status - Get connection status + QR
router.get('/whatsapp/status', async (req, res) => {
  try {
    const { default: whatsappConnection } = await import('../services/outreach/whatsapp-connection-service.js');
    const status = whatsappConnection.getStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /whatsapp/qr - Get QR code image
router.get('/whatsapp/qr', async (req, res) => {
  try {
    const { default: whatsappConnection } = await import('../services/outreach/whatsapp-connection-service.js');
    const status = whatsappConnection.getStatus();
    if (status.qrCode) {
      res.json({ success: true, qrCode: status.qrCode });
    } else if (status.status === 'connected') {
      res.json({ success: true, status: 'connected', phone: status.phone });
    } else {
      res.json({ success: false, status: status.status, message: 'QR no disponible. Inicie la conexion primero.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /whatsapp/send-direct - Send message via connected WhatsApp
router.post('/whatsapp/send-direct', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'phone y message son requeridos' });
    }

    const { default: whatsappConnection } = await import('../services/outreach/whatsapp-connection-service.js');
    const result = await whatsappConnection.sendMessage(phone, message);
    res.json({ success: true, message: 'Mensaje enviado por WhatsApp', result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /whatsapp/send-to-lead - Generate AI message and send to lead via connected WhatsApp
router.post('/whatsapp/send-to-lead', async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) return res.status(400).json({ success: false, error: 'leadId requerido' });

    const leadRes = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (leadRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Lead no encontrado' });
    const lead = leadRes.rows[0];

    const phone = lead.social_whatsapp || lead.phone;
    if (!phone) return res.status(400).json({ success: false, error: 'Lead no tiene telefono/WhatsApp' });

    // Generate AI message
    const message = await whatsappOutreachService.generateMessage(lead);

    // Send via connected WhatsApp
    const { default: whatsappConnection } = await import('../services/outreach/whatsapp-connection-service.js');
    const result = await whatsappConnection.sendMessage(phone, message);

    // Save to outreach messages
    await whatsappOutreachService.saveMessage(leadId, message, null);

    // Auto-regenerate AI report after outreach
    import('../services/scraping/lead-report-service.js')
      .then(m => m.default.generateReport(leadId))
      .catch(() => {});

    res.json({ success: true, message: 'Mensaje enviado por WhatsApp', sentMessage: message, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /whatsapp/messages - Get message history
router.get('/whatsapp/messages', async (req, res) => {
  try {
    const { default: whatsappConnection } = await import('../services/outreach/whatsapp-connection-service.js');
    const messages = whatsappConnection.getMessages(parseInt(req.query.limit || '50'));
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /whatsapp/send-bulk - Send AI messages to multiple leads
router.post('/whatsapp/send-bulk', async (req, res) => {
  try {
    const { leadIds } = req.body;
    const { default: whatsappConnection } = await import('../services/outreach/whatsapp-connection-service.js');

    if (whatsappConnection.connectionStatus !== 'connected') {
      return res.status(400).json({ success: false, error: 'WhatsApp no esta conectado' });
    }

    // Get leads
    let leads;
    if (leadIds && leadIds.length > 0) {
      const placeholders = leadIds.map((_, i) => `$${i + 1}`).join(',');
      const result = await pool.query(`SELECT * FROM leads WHERE id IN (${placeholders})`, leadIds);
      leads = result.rows;
    } else {
      const result = await pool.query("SELECT * FROM leads WHERE (phone IS NOT NULL OR social_whatsapp IS NOT NULL) AND phone != '' LIMIT 50");
      leads = result.rows;
    }

    // Send in background
    const contacts = leads.map(l => ({ ...l, phone: l.social_whatsapp || l.phone })).filter(l => l.phone);

    whatsappConnection.sendBulkMessages(contacts, async (contact) => {
      return await whatsappOutreachService.generateMessage(contact);
    }).then(results => {
      console.log(`[WhatsApp Bulk] Sent ${results.filter(r => r.success).length}/${results.length} messages`);
    }).catch(err => {
      console.error('[WhatsApp Bulk] Error:', err.message);
    });

    res.json({ success: true, message: `Enviando mensajes a ${contacts.length} leads en segundo plano` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
