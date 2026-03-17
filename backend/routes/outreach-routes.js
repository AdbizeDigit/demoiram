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

export default router;
