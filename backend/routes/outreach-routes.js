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

    // Anti-spam: don't send email if already sent without reply
    if (leadId) {
      const emailCheck = await pool.query(
        "SELECT count(*) as sent FROM outreach_messages WHERE lead_id = $1 AND channel = 'EMAIL' AND status = 'SENT'", [leadId]
      );
      if (parseInt(emailCheck.rows[0].sent) > 0) {
        return res.json({ success: true, message: 'Email ya enviado, esperando respuesta', skipped: true });
      }
    }

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

// POST /email/send-direct - Send email to any address and save in outreach history
router.post('/email/send-direct', async (req, res) => {
  try {
    const { email, subject, body, leadId } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email requerido' });
    if (!subject || !body) return res.status(400).json({ success: false, error: 'Subject y body requeridos' });

    // Wrap in template
    const avatar = await emailOutreachService.getActiveAvatar();
    const wrappedBody = await emailOutreachService.wrapInTemplate(body, avatar, null);

    // Send
    await emailOutreachService.sendEmail(email, subject, wrappedBody);

    // Save to outreach_messages for history
    await pool.query(
      `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, sent_at)
       VALUES ($1, 'EMAIL', 1, $2, $3, false, 'SENT', NOW())`,
      [leadId || null, subject, wrappedBody]
    );

    // Move lead to CONTACTADO if it was NUEVO/NEW (don't override later stages)
    if (leadId) {
      await pool.query(
        "UPDATE leads SET status = 'CONTACTADO' WHERE id = $1 AND UPPER(COALESCE(status, 'NUEVO')) IN ('NUEVO', 'NEW', 'PENDING')",
        [leadId]
      ).catch(() => {})
    }

    res.json({ success: true, message: `Email enviado a ${email}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /email/test - Generate preview or send test email
router.post('/email/test', async (req, res) => {
  // Set response timeout to 90s
  req.setTimeout(90000);
  res.setTimeout(90000);

  try {
    const { email, subject, body, companyName, sector, city, stepType, sendEmail: shouldSend } = req.body;

    if (!email) return res.status(400).json({ success: false, error: 'Email requerido' });

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
      // Already have content - wrap in template if not already wrapped
      if (body.includes('linear-gradient') || body.includes('<!DOCTYPE')) {
        emailContent = { subject, body };
      } else {
        const avatar = await emailOutreachService.getActiveAvatar();
        const wrappedBody = await emailOutreachService.wrapInTemplate(body, avatar, null);
        emailContent = { subject, body: wrappedBody };
      }
    } else {
      // Generate with AI - try with 45s timeout, fallback to template
      try {
        emailContent = await Promise.race([
          emailOutreachService.generateEmail(fakeLead, stepType || 'introduction', 1),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), 45000)),
        ]);
      } catch (aiErr) {
        console.log('[EmailTest] AI error/timeout, using fallback:', aiErr.message);
        emailContent = emailOutreachService.getTemplateEmail(fakeLead, stepType || 'introduction', 1);
        const avatar = await emailOutreachService.getActiveAvatar();
        emailContent.body = emailOutreachService.wrapInTemplate(emailContent.body, avatar, null);
        emailContent._fallback = true;
      }
    }

    if (shouldSend) {
      await emailOutreachService.sendEmail(email, emailContent.subject, emailContent.body);
      res.json({ success: true, message: `Email enviado a ${email}`, email: emailContent, sent: true });
    } else {
      res.json({ success: true, message: 'Preview generado', email: emailContent, sent: false, fallback: !!emailContent._fallback });
    }
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
    const { accountId } = req.body || {};
    const { waManager } = await import('../services/outreach/whatsapp-connection-service.js');

    const result = await waManager.connectAccount(accountId || 'main');
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /whatsapp/disconnect - Disconnect and clear session
router.post('/whatsapp/disconnect', async (req, res) => {
  try {
    const { accountId } = req.body || {};
    const { waManager } = await import('../services/outreach/whatsapp-connection-service.js');
    const result = await waManager.disconnectAccount(accountId || 'main');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /whatsapp/status - Get connection status + QR
router.get('/whatsapp/status', async (req, res) => {
  try {
    const accountId = req.query.accountId || 'main';
    const { waManager } = await import('../services/outreach/whatsapp-connection-service.js');
    const status = waManager.getStatus(accountId);
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('[WhatsApp Status] Error:', error.message);
    // Return disconnected instead of 500 so frontend doesn't break
    res.json({ success: true, status: 'disconnected', phone: null, name: null, qrCode: null, messageCount: 0 });
  }
});

// GET /whatsapp/qr - Get QR code image
router.get('/whatsapp/qr', async (req, res) => {
  try {
    const accountId = req.query.accountId || 'main';
    const { waManager } = await import('../services/outreach/whatsapp-connection-service.js');
    const status = waManager.getStatus(accountId);
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
    const { phone, message, leadId } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'phone y message son requeridos' });
    }

    const { waManager } = await import('../services/outreach/whatsapp-connection-service.js');
    // Resolve leadId before sending so we can pass it
    let resolvedLeadId = leadId;
    if (!resolvedLeadId) {
      const cleanPhone = phone.replace(/\D/g, '');
      const leadRes = await pool.query(
        "SELECT id FROM leads WHERE phone LIKE $1 OR social_whatsapp LIKE $1 LIMIT 1",
        [`%${cleanPhone.slice(-8)}%`]
      );
      resolvedLeadId = leadRes.rows[0]?.id || null;
    }

    // If this is a reply inside an active conversation (lead already replied to us, or
    // we already exchanged any WhatsApp message with them), bypass the daily cold-outreach
    // limit. Daily caps are meant to throttle NEW prospecting, not replies in-flight.
    let allowOverLimit = false;
    if (resolvedLeadId) {
      const convoCheck = await pool.query(
        `SELECT 1 FROM outreach_messages
         WHERE lead_id = $1 AND UPPER(channel) = 'WHATSAPP'
         LIMIT 1`,
        [resolvedLeadId]
      ).catch(() => ({ rows: [] }));
      if (convoCheck.rows.length > 0) allowOverLimit = true;
    }

    let result;
    try {
      result = await waManager.sendMessageRotating(phone, message, resolvedLeadId, { allowOverLimit });
    } catch (sendErr) {
      // Surface daily-limit errors as 429 with a human message instead of generic 500
      if (/limite diario/i.test(sendErr.message)) {
        return res.status(429).json({
          success: false,
          error: 'Las cuentas de WhatsApp llegaron al limite diario. Intenta manana o conecta otra cuenta.',
          code: 'DAILY_LIMIT_REACHED',
        });
      }
      throw sendErr;
    }

    if (resolvedLeadId) {
      await pool.query(
        `INSERT INTO outreach_messages (lead_id, channel, step, body, ai_generated, status, sent_at, wa_account_id)
         VALUES ($1, 'WHATSAPP', 1, $2, false, 'SENT', NOW(), $3)`,
        [resolvedLeadId, message, result.wa_account_id]
      );
      // Move lead to CONTACTADO if it was NUEVO
      await pool.query(
        "UPDATE leads SET status = 'CONTACTADO' WHERE id = $1 AND UPPER(COALESCE(status, 'NUEVO')) IN ('NUEVO', 'NEW', 'PENDING')",
        [resolvedLeadId]
      ).catch(() => {})
    }

    res.json({ success: true, message: 'Mensaje enviado por WhatsApp', result });
  } catch (error) {
    console.error('[WhatsApp Send] Error:', error.message);
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

    // Anti-spam: don't send if we already sent and got no reply
    const spamCheck = await pool.query(
      `SELECT
        (SELECT count(*) FROM outreach_messages WHERE lead_id = $1 AND channel = 'WHATSAPP' AND status = 'SENT') as sent,
        (SELECT count(*) FROM outreach_messages WHERE lead_id = $1 AND channel = 'WHATSAPP' AND status = 'REPLIED') as replied`,
      [leadId]
    );
    const { sent, replied } = spamCheck.rows[0];
    if (parseInt(sent) > 0 && parseInt(replied) === 0) {
      return res.json({ success: true, message: 'Ya se envio mensaje, esperando respuesta', skipped: true });
    }
    // Don't send more than 2 messages without reply
    if (parseInt(sent) - parseInt(replied) >= 2) {
      return res.json({ success: true, message: 'Demasiados mensajes sin respuesta', skipped: true });
    }

    // Check if there's existing conversation history
    const historyRes = await pool.query(
      "SELECT status, body, subject, sent_at FROM outreach_messages WHERE lead_id = $1 AND channel = 'WHATSAPP' ORDER BY sent_at ASC NULLS LAST LIMIT 20",
      [leadId]
    );
    const hasHistory = historyRes.rows.length > 0;

    let message;
    if (hasHistory) {
      // Build conversation history string
      const history = historyRes.rows.map(m => {
        const who = m.status === 'REPLIED' ? (m.subject?.replace('De: ', '') || 'Cliente') : 'Gian Franco Koch';
        return `${who}: ${(m.body || '').slice(0, 200)}`;
      }).join('\n');
      message = await whatsappOutreachService.generateFollowUp(lead, history);
    } else {
      message = await whatsappOutreachService.generateMessage(lead);
    }

    // Send via waManager with account rotation
    const { waManager } = await import('../services/outreach/whatsapp-connection-service.js');
    const result = await waManager.sendMessageRotating(phone, message, leadId);

    // Save to outreach messages as SENT
    await pool.query(
      "INSERT INTO outreach_messages (lead_id, channel, step, body, ai_generated, status, sent_at, wa_account_id) VALUES ($1, 'WHATSAPP', 1, $2, true, 'SENT', NOW(), $3)",
      [leadId, message, result.wa_account_id]
    );
    // Move lead to CONTACTADO if it was NUEVO
    await pool.query(
      "UPDATE leads SET status = 'CONTACTADO' WHERE id = $1 AND UPPER(COALESCE(status, 'NUEVO')) IN ('NUEVO', 'NEW', 'PENDING')",
      [leadId]
    ).catch(() => {})

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

// ── Email Webhook (receives replies from Brevo) ──

// POST /email/webhook - Brevo webhook for email events (replies, opens, clicks)
// This endpoint does NOT require auth (Brevo calls it directly)
router.post('/email/webhook', async (req, res) => {
  try {
    const event = req.body
    console.log('[Email Webhook] Event:', JSON.stringify(event).slice(0, 300))

    const eventType = event.event || event.type
    const email = event.email || event['message-id']
    const subject = event.subject || ''
    const content = event.content || event.text || event['stripped-text'] || ''
    const from = event.sender || event.from || email

    if (eventType === 'reply' || eventType === 'inbound' || content) {
      // Save reply as incoming message
      // Try to find the lead by email
      const leadRes = await pool.query(
        "SELECT id, name FROM leads WHERE email = $1 LIMIT 1",
        [from]
      )
      const leadId = leadRes.rows[0]?.id || null

      await pool.query(
        `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, sent_at)
         VALUES ($1, 'EMAIL', 0, $2, $3, false, 'REPLIED', NOW())`,
        [leadId, subject ? `RE: ${subject}` : 'Respuesta', content || 'Respuesta recibida']
      )

      console.log(`[Email Webhook] Reply saved from ${from}, lead: ${leadId}`)
    }

    if (eventType === 'opened' || eventType === 'open') {
      // Update message status to OPENED
      if (event['message-id']) {
        await pool.query(
          "UPDATE outreach_messages SET status = 'OPENED', opened_at = NOW() WHERE id::text LIKE $1 OR subject LIKE $2",
          [`%${event['message-id']}%`, `%${subject}%`]
        ).catch(() => {})
      }
    }

    res.json({ success: true })
  } catch (error) {
    console.error('[Email Webhook] Error:', error.message)
    res.json({ success: true }) // Always return 200 to Brevo
  }
});

// ── Email Inbox (IMAP) ──

// POST /email/check-inbox - Check for new replies via IMAP
router.post('/email/check-inbox', async (req, res) => {
  try {
    const { default: emailInboxService } = await import('../services/outreach/email-inbox-service.js');
    const result = await emailInboxService.checkInbox();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /email/inbox-status - Get inbox polling status
router.get('/email/inbox-status', async (req, res) => {
  try {
    const { default: emailInboxService } = await import('../services/outreach/email-inbox-service.js');
    const status = emailInboxService.getStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Email Config ──

// GET /email/config - Get active email config
router.get('/email/config', async (req, res) => {
  try {
    const { default: emailTemplateConfig } = await import('../services/outreach/email-template-config.js');
    const config = await emailTemplateConfig.getActiveConfig();
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /email/config - Save email config
router.put('/email/config', async (req, res) => {
  try {
    const { default: emailTemplateConfig } = await import('../services/outreach/email-template-config.js');
    const config = await emailTemplateConfig.saveConfig(req.body);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── WhatsApp Verification ──

// POST /whatsapp/verify-leads - Verify all leads with phone numbers for WhatsApp
router.post('/whatsapp/verify-leads', async (req, res) => {
  try {
    const { default: whatsappConnection } = await import('../services/outreach/whatsapp-connection-service.js');

    if (whatsappConnection.connectionStatus !== 'connected') {
      return res.status(400).json({ success: false, error: 'WhatsApp no esta conectado. Conecta primero.' });
    }

    // Add has_whatsapp column if not exists
    await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_whatsapp BOOLEAN DEFAULT NULL');
    await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_verified_at TIMESTAMP');

    // Get leads with phone that haven't been verified yet
    const leadsRes = await pool.query(
      "SELECT id, name, phone, social_whatsapp FROM leads WHERE (phone IS NOT NULL AND phone != '') AND has_whatsapp IS NULL LIMIT 500"
    );

    const total = leadsRes.rows.length;
    if (total === 0) {
      return res.json({ success: true, message: 'Todos los leads ya fueron verificados', verified: 0, withWhatsApp: 0, withoutWhatsApp: 0 });
    }

    // Run verification in background
    res.json({ success: true, message: `Verificando ${total} leads en segundo plano`, total });

    let withWA = 0, withoutWA = 0;

    for (const lead of leadsRes.rows) {
      const phone = lead.social_whatsapp || lead.phone;
      if (!phone) continue;

      try {
        const result = await whatsappConnection.checkWhatsApp(phone);

        await pool.query(
          'UPDATE leads SET has_whatsapp = $1, whatsapp_verified_at = NOW() WHERE id = $2',
          [result.exists, lead.id]
        );

        if (result.exists) {
          withWA++;
          // If has WhatsApp but no social_whatsapp, update it
          if (!lead.social_whatsapp && result.jid) {
            const waNumber = result.jid.split('@')[0];
            await pool.query('UPDATE leads SET social_whatsapp = $1 WHERE id = $2', [waNumber, lead.id]);
          }
        } else {
          withoutWA++;
        }
      } catch (err) {
        console.log(`[WA Verify] Error checking ${lead.name}: ${err.message}`);
      }

      // Delay between checks
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`[WA Verify] Done: ${withWA} with WhatsApp, ${withoutWA} without, of ${total} checked`);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// GET /whatsapp/verify-stats - Get verification stats
router.get('/whatsapp/verify-stats', async (req, res) => {
  try {
    const [total, verified, withWA, withoutWA, pending] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM leads WHERE phone IS NOT NULL AND phone != ''"),
      pool.query("SELECT COUNT(*) FROM leads WHERE has_whatsapp IS NOT NULL"),
      pool.query("SELECT COUNT(*) FROM leads WHERE has_whatsapp = true"),
      pool.query("SELECT COUNT(*) FROM leads WHERE has_whatsapp = false"),
      pool.query("SELECT COUNT(*) FROM leads WHERE has_whatsapp IS NULL AND phone IS NOT NULL AND phone != ''"),
    ]);

    res.json({
      success: true,
      stats: {
        totalWithPhone: parseInt(total.rows[0].count),
        verified: parseInt(verified.rows[0].count),
        withWhatsApp: parseInt(withWA.rows[0].count),
        withoutWhatsApp: parseInt(withoutWA.rows[0].count),
        pending: parseInt(pending.rows[0].count),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /whatsapp/check-number - Check a single number
router.post('/whatsapp/check-number', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'phone requerido' });

    const { default: whatsappConnection } = await import('../services/outreach/whatsapp-connection-service.js');
    const result = await whatsappConnection.checkWhatsApp(phone);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
