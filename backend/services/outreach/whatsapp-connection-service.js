import * as baileys from '@whiskeysockets/baileys';
const makeWASocket = baileys.makeWASocket || baileys.default;
const { DisconnectReason, delay, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = baileys;
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import pino from 'pino';
import { usePgAuthState } from './whatsapp-pg-auth.js';

class WhatsAppConnectionService extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.qrCode = null;           // base64 QR image
    this.qrString = null;         // raw QR string
    this.connectionStatus = 'disconnected'; // disconnected, connecting, qr_ready, connected
    this.connectedPhone = null;   // connected phone number
    this.connectedName = null;    // connected profile name
    this.messageHistory = [];     // last 100 messages
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  async connect() {
    if (this.connectionStatus === 'connected') {
      return { status: 'already_connected', phone: this.connectedPhone };
    }

    this.connectionStatus = 'connecting';
    this.emit('status', { status: 'connecting' });

    try {
      // Use PostgreSQL auth state (persists across Dokku deploys)
      const { state, saveCreds, clearAll } = await usePgAuthState();
      this._clearAuth = clearAll;
      const logger = pino({ level: 'silent' });

      // Fetch latest version to avoid 405 errors
      let version;
      try {
        const versionInfo = await fetchLatestBaileysVersion();
        version = versionInfo.version;
        console.log('[WhatsApp] Using version:', version);
      } catch {
        version = [2, 3000, 1015901307];
        console.log('[WhatsApp] Using fallback version');
      }

      this.socket = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        logger,
        browser: ['Adbize', 'Chrome', '120.0.6099.109'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        getMessage: async () => undefined,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
      });

      // Handle connection updates
      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // Generate QR code as base64 image
          this.qrString = qr;
          try {
            this.qrCode = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
          } catch {
            this.qrCode = null;
          }
          this.connectionStatus = 'qr_ready';
          this.emit('qr', { qr: this.qrCode, qrString: qr });
          this.emit('status', { status: 'qr_ready' });
          console.log('[WhatsApp] QR code generated - scan with phone');
        }

        if (connection === 'close') {
          const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log('[WhatsApp] Connection closed. Status:', statusCode);
          this.connectionStatus = 'disconnected';
          this.connectedPhone = null;
          this.connectedName = null;
          this.qrCode = null;
          this.emit('status', { status: 'disconnected', reason: statusCode });

          if (shouldReconnect) {
            this.retryCount++;
            const waitTime = Math.min(5000 * this.retryCount, 60000); // Max 60s between retries
            console.log(`[WhatsApp] Reconnecting in ${waitTime/1000}s... attempt ${this.retryCount}`);
            setTimeout(() => this.connect(), waitTime);
          } else if (statusCode === DisconnectReason.loggedOut) {
            console.log('[WhatsApp] Logged out. Need to re-scan QR.');
            // Clear auth from DB to force new QR
            if (this._clearAuth) {
              try { await this._clearAuth(); } catch {}
            }
          }
        }

        if (connection === 'open') {
          console.log('[WhatsApp] Connected successfully!');
          this.connectionStatus = 'connected';
          this.retryCount = 0;
          this.qrCode = null;
          this.qrString = null;

          // Get connected phone info
          try {
            const user = this.socket.user;
            this.connectedPhone = user?.id?.split(':')[0] || user?.id?.split('@')[0] || 'Unknown';
            this.connectedName = user?.name || 'WhatsApp User';
          } catch {}

          this.emit('status', {
            status: 'connected',
            phone: this.connectedPhone,
            name: this.connectedName
          });
        }
      });

      // Save credentials on update
      this.socket.ev.on('creds.update', saveCreds);

      // Listen for incoming messages
      this.socket.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
          if (!msg.key.fromMe && msg.message) {
            const from = msg.key.remoteJid?.split('@')[0] || 'unknown';
            const text = msg.message?.conversation
              || msg.message?.extendedTextMessage?.text
              || msg.message?.imageMessage?.caption
              || '[media]';
            const pushName = msg.pushName || from;

            const entry = {
              id: msg.key.id,
              from,
              fromName: pushName,
              text,
              timestamp: new Date(msg.messageTimestamp * 1000).toISOString(),
              isFromMe: false,
            };

            this.messageHistory.unshift(entry);
            if (this.messageHistory.length > 100) this.messageHistory.pop();

            this.emit('message', entry);
            console.log(`[WhatsApp] Message from ${pushName} (${from}): ${text.slice(0, 50)}`);

            // Save incoming message to DB + create notification
            try {
              const { pool } = await import('../../config/database.js');
              // Find lead by phone — try multiple matching strategies
              const fromClean = from.replace(/\D/g, '');
              const last8 = fromClean.slice(-8);
              const last10 = fromClean.slice(-10);
              let leadRes = await pool.query(
                "SELECT id, name FROM leads WHERE phone LIKE $1 OR social_whatsapp LIKE $1 OR phone LIKE $2 OR social_whatsapp LIKE $2 LIMIT 1",
                [`%${last8}%`, `%${last10}%`]
              );
              // Also try matching the full from number or the remoteJid
              if (!leadRes.rows.length) {
                leadRes = await pool.query(
                  "SELECT id, name FROM leads WHERE social_whatsapp LIKE $1 OR phone LIKE $1 LIMIT 1",
                  [`%${fromClean}%`]
                );
              }
              // Try matching by last outreach message sent to this number
              if (!leadRes.rows.length) {
                const msgMatch = await pool.query(
                  "SELECT lead_id FROM outreach_messages WHERE channel = 'WHATSAPP' AND status = 'SENT' AND lead_id IS NOT NULL ORDER BY sent_at DESC LIMIT 20"
                );
                for (const row of msgMatch.rows) {
                  const leadCheck = await pool.query("SELECT id, name, phone, social_whatsapp FROM leads WHERE id = $1", [row.lead_id]);
                  const l = leadCheck.rows[0];
                  if (!l) continue;
                  const lPhone = (l.phone || '').replace(/\D/g, '');
                  const lWa = (l.social_whatsapp || '').replace(/\D/g, '');
                  if ((lPhone && fromClean.includes(lPhone.slice(-8))) || (lWa && fromClean.includes(lWa.slice(-8))) ||
                      (lPhone && lPhone.includes(last8)) || (lWa && lWa.includes(last8))) {
                    leadRes = { rows: [{ id: l.id, name: l.name }] };
                    break;
                  }
                }
              }
              const leadId = leadRes.rows[0]?.id || null;
              const leadName = leadRes.rows[0]?.name || pushName;
              await pool.query(
                `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, sent_at)
                 VALUES ($1, 'WHATSAPP', 0, $2, $3, false, 'REPLIED', NOW())`,
                [leadId, `De: ${pushName}`, text]
              );
              // Move lead to EN_CONVERSACION when they reply
              if (leadId) {
                await pool.query(
                  "UPDATE leads SET status = 'EN_CONVERSACION' WHERE id = $1 AND UPPER(status) IN ('NEW', 'NUEVO', 'CONTACTADO', 'CONTACTED', 'PENDING')",
                  [leadId]
                );
              }

              // Create notification
              await pool.query(
                `INSERT INTO notifications (type, title, body, lead_id, lead_name, phone, read, created_at)
                 VALUES ('whatsapp_reply', $1, $2, $3, $4, $5, false, NOW())`,
                [`${leadName} respondio por WhatsApp`, text.slice(0, 200), leadId, leadName, from]
              );

              // Auto-detect new contact in reply (phone or email)
              try {
                const phoneMatch = text.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g);
                const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
                const newPhone = phoneMatch?.find(p => p.replace(/\D/g, '').length >= 8 && p.replace(/\D/g, '') !== from);
                const newEmail = emailMatch?.find(e => !e.includes('example') && !e.includes('noreply'));

                if (newPhone || newEmail) {
                  // Check if this contact already exists
                  let exists = false;
                  if (newPhone) {
                    const cleanP = newPhone.replace(/\D/g, '');
                    const ex = await pool.query("SELECT id FROM leads WHERE phone LIKE $1 LIMIT 1", [`%${cleanP.slice(-8)}%`]);
                    if (ex.rows.length) exists = true;
                  }
                  if (newEmail && !exists) {
                    const ex = await pool.query("SELECT id FROM leads WHERE email = $1 LIMIT 1", [newEmail]);
                    if (ex.rows.length) exists = true;
                  }

                  if (!exists) {
                    // Extract name hint from message
                    const nameHint = text.match(/(?:(?:habla|hable|comunic|contact|llam)[a-z]*\s+(?:con|a)\s+)([A-Z][a-záéíóú]+(?:\s+[A-Z][a-záéíóú]+)*)/i)?.[1]
                      || (leadName ? `Contacto de ${leadName}` : 'Nuevo contacto');

                    // Create new lead linked to parent
                    const newLead = await pool.query(
                      `INSERT INTO leads (name, phone, email, sector, source_url, status, score, notes)
                       VALUES ($1, $2, $3, $4, $5, 'new', 60, $6) RETURNING id`,
                      [nameHint, newPhone?.replace(/[^\d+]/g, '') || null, newEmail || null,
                       'referido', leadId ? `referido:${leadId}` : 'whatsapp-referido',
                       JSON.stringify([{ text: `Referido por ${leadName} via WhatsApp: "${text.slice(0, 150)}"`, date: new Date().toISOString() }])]
                    );
                    const newLeadId = newLead.rows[0]?.id;

                    // Auto-start WhatsApp outreach to new contact
                    if (newLeadId && newPhone) {
                      try {
                        const { default: waOutreach } = await import('./whatsapp-outreach-service.js');
                        const newLeadData = { name: nameHint, sector: 'referido', city: '' };
                        const message = await waOutreach.generateMessage(newLeadData);
                        const cleanNewPhone = newPhone.replace(/[^\d+]/g, '');
                        await this.sendMessage(cleanNewPhone, message);
                        await pool.query(
                          `INSERT INTO outreach_messages (lead_id, channel, step, body, ai_generated, status, sent_at)
                           VALUES ($1, 'WHATSAPP', 1, $2, true, 'SENT', NOW())`,
                          [newLeadId, message]
                        );
                        console.log(`[WhatsApp] Auto-outreach to new contact: ${nameHint} (${cleanNewPhone})`);
                      } catch (autoErr) {
                        console.error('[WhatsApp] Auto-outreach error:', autoErr.message);
                      }
                    }

                    // Notification for new contact detected
                    await pool.query(
                      `INSERT INTO notifications (type, title, body, lead_id, lead_name, phone, read, created_at)
                       VALUES ('new_contact', $1, $2, $3, $4, $5, false, NOW())`,
                      [`Nuevo contacto detectado: ${nameHint}`,
                       `${leadName} paso el contacto ${newPhone || newEmail}. Se inicio conversacion automatica.`,
                       newLeadId, nameHint, newPhone?.replace(/[^\d+]/g, '') || null]
                    );
                  }
                }
              } catch (contactErr) {
                console.error('[WhatsApp] Contact detection error:', contactErr.message);
              }
            } catch (dbErr) {
              console.error('[WhatsApp] Error saving incoming msg:', dbErr.message);
            }
          }
        }
      });

      return { status: 'connecting' };
    } catch (error) {
      console.error('[WhatsApp] Connection error:', error.message);
      this.connectionStatus = 'disconnected';
      this.emit('status', { status: 'error', error: error.message });
      throw error;
    }
  }

  async disconnect() {
    if (this.socket) {
      await this.socket.logout();
      this.socket = null;
    }
    this.connectionStatus = 'disconnected';
    this.connectedPhone = null;
    this.connectedName = null;
    this.qrCode = null;
    this.emit('status', { status: 'disconnected' });

    // Clear auth from DB
    if (this._clearAuth) {
      try { await this._clearAuth(); } catch {}
    }

    return { status: 'disconnected' };
  }

  async sendMessage(phone, text) {
    if (!this.socket || this.connectionStatus !== 'connected') {
      throw new Error('WhatsApp no esta conectado');
    }

    // Format phone number - ensure it has @s.whatsapp.net
    let jid = phone.replace(/\D/g, '');
    if (!jid.includes('@')) {
      jid = `${jid}@s.whatsapp.net`;
    }

    const result = await this.socket.sendMessage(jid, { text });

    const entry = {
      id: result?.key?.id || Date.now().toString(),
      to: phone,
      text,
      timestamp: new Date().toISOString(),
      isFromMe: true,
      status: 'sent',
    };

    this.messageHistory.unshift(entry);
    if (this.messageHistory.length > 100) this.messageHistory.pop();

    this.emit('messageSent', entry);
    console.log(`[WhatsApp] Message sent to ${phone}: ${text.slice(0, 50)}`);

    return entry;
  }

  async sendBulkMessages(contacts, messageGenerator) {
    if (!this.socket || this.connectionStatus !== 'connected') {
      throw new Error('WhatsApp no esta conectado');
    }

    const results = [];
    for (const contact of contacts) {
      try {
        const message = typeof messageGenerator === 'function'
          ? await messageGenerator(contact)
          : messageGenerator;

        const result = await this.sendMessage(contact.phone, message);
        results.push({ ...result, contact, success: true });

        // Delay between messages (5-10 seconds to avoid ban)
        await delay(5000 + Math.random() * 5000);
      } catch (err) {
        results.push({ contact, success: false, error: err.message });
      }
    }

    return results;
  }

  getStatus() {
    return {
      status: this.connectionStatus,
      phone: this.connectedPhone,
      name: this.connectedName,
      qrCode: this.qrCode,
      messageCount: this.messageHistory.length,
    };
  }

  getMessages(limit = 50) {
    return this.messageHistory.slice(0, limit);
  }

  // Check if a phone number has WhatsApp
  async checkWhatsApp(phone) {
    if (!this.socket || this.connectionStatus !== 'connected') {
      throw new Error('WhatsApp no esta conectado');
    }
    const jid = phone.replace(/\D/g, '');
    try {
      const [result] = await this.socket.onWhatsApp(jid);
      return { phone, exists: !!result?.exists, jid: result?.jid || null };
    } catch {
      return { phone, exists: false, jid: null };
    }
  }

  // Check multiple numbers in bulk
  async checkWhatsAppBulk(phones) {
    if (!this.socket || this.connectionStatus !== 'connected') {
      throw new Error('WhatsApp no esta conectado');
    }
    const results = [];
    for (const phone of phones) {
      try {
        const result = await this.checkWhatsApp(phone);
        results.push(result);
        await delay(500); // Delay to avoid rate limiting
      } catch {
        results.push({ phone, exists: false, jid: null });
      }
    }
    return results;
  }
}

// Singleton
export const whatsappConnection = new WhatsAppConnectionService();
export default whatsappConnection;
