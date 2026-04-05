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
    this.jidToLead = new Map();   // maps WhatsApp JID → lead_id for matching replies
    this.retryCount = 0;
    this.maxRetries = 5;
    this.accountId = 'main';
  }

  async connect(accountId = 'main') {
    if (this.connectionStatus === 'connected') {
      return { status: 'already_connected', phone: this.connectedPhone };
    }

    this.accountId = accountId;
    this.connectionStatus = 'connecting';
    this.emit('status', { status: 'connecting' });

    try {
      // Use PostgreSQL auth state (persists across Dokku deploys)
      const { state, saveCreds, clearAll } = await usePgAuthState(accountId);
      this._clearAuth = clearAll;
      const logger = pino({ level: accountId !== 'main' ? 'warn' : 'silent' });

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

      console.log(`[WhatsApp:${accountId}] Creating socket with version ${version}, hasCreds=${!!state.creds?.me}`);
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

          console.log(`[WhatsApp${this.accountId !== 'main' ? ':' + this.accountId : ''}] Connection closed. Status:`, statusCode);
          this.connectionStatus = 'disconnected';
          this.connectedPhone = null;
          this.connectedName = null;
          this.qrCode = null;
          this.emit('status', { status: 'disconnected', reason: statusCode });

          // Update DB status for non-main accounts
          if (this.accountId && this.accountId !== 'main') {
            try {
              const { pool } = await import('../../config/database.js');
              await pool.query("UPDATE whatsapp_accounts SET status = 'disconnected' WHERE id = $1", [this.accountId]);
            } catch {}
          }

          if (shouldReconnect && this.retryCount < this.maxRetries) {
            this.retryCount++;
            const waitTime = Math.min(5000 * this.retryCount, 60000); // Max 60s between retries
            console.log(`[WhatsApp:${this.accountId}] Reconnecting in ${waitTime/1000}s... attempt ${this.retryCount}/${this.maxRetries}`);
            setTimeout(() => this.connect(this.accountId), waitTime);
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

          // Update account record in DB with phone and connected status
          if (this.accountId && this.accountId !== 'main') {
            try {
              const { pool } = await import('../../config/database.js');
              await pool.query(
                "UPDATE whatsapp_accounts SET status = 'connected', phone = $1 WHERE id = $2",
                [this.connectedPhone, this.accountId]
              );
            } catch {}
          }
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
              const fromClean = from.replace(/\D/g, '');
              const last8 = fromClean.slice(-8);
              const last10 = fromClean.slice(-10);

              // Strategy 1: JID map (most reliable — we saved this when sending)
              let leadId = this.jidToLead.get(fromClean) || this.jidToLead.get(from) || null;
              let leadName = null;

              if (leadId) {
                const lr = await pool.query("SELECT name FROM leads WHERE id = $1", [leadId]);
                leadName = lr.rows[0]?.name || pushName;
              }

              // Strategy 2: DB phone match
              if (!leadId) {
                const leadRes = await pool.query(
                  "SELECT id, name FROM leads WHERE replace(replace(phone, '+', ''), ' ', '') LIKE $1 OR replace(replace(social_whatsapp, '+', ''), ' ', '') LIKE $1 LIMIT 1",
                  [`%${last8}%`]
                );
                if (leadRes.rows.length) {
                  leadId = leadRes.rows[0].id;
                  leadName = leadRes.rows[0].name;
                }
              }

              // Strategy 3: Check sent messages history in memory
              if (!leadId) {
                const sentToThis = this.messageHistory.find(m => m.isFromMe && m.jid === fromClean);
                if (sentToThis) {
                  // Find the lead by matching the phone we sent to
                  const toClean = (sentToThis.to || '').replace(/\D/g, '');
                  if (toClean) {
                    const lr = await pool.query(
                      "SELECT id, name FROM leads WHERE replace(replace(phone, '+', ''), ' ', '') LIKE $1 OR replace(replace(social_whatsapp, '+', ''), ' ', '') LIKE $1 LIMIT 1",
                      [`%${toClean.slice(-8)}%`]
                    );
                    if (lr.rows.length) {
                      leadId = lr.rows[0].id;
                      leadName = lr.rows[0].name;
                      // Save to JID map for future
                      this.jidToLead.set(fromClean, leadId);
                    }
                  }
                }
              }

              if (!leadName) leadName = pushName;
              await pool.query(
                `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, sent_at)
                 VALUES ($1, 'WHATSAPP', 0, $2, $3, false, 'REPLIED', NOW())`,
                [leadId, `De: ${pushName}`, text]
              );
              // Move lead to EN_CONVERSACION + boost score when they reply
              if (leadId) {
                await pool.query(
                  "UPDATE leads SET status = 'EN_CONVERSACION', score = LEAST(100, COALESCE(score, 50) + 15) WHERE id = $1 AND UPPER(status) IN ('NEW', 'NUEVO', 'CONTACTADO', 'CONTACTED', 'PENDING')",
                  [leadId]
                );

                // Server-side IA auto-reply if lead has auto mode active
                try {
                  const waAutoModule = await import('../../server.js?waAutoLeads');
                } catch {}
                // Use global waAutoLeads set (injected from server)
                if (global.waAutoLeads && global.waAutoLeads.has(leadId)) {
                  setTimeout(async () => {
                    try {
                      const { default: waOutreach } = await import('./whatsapp-outreach-service.js');
                      // Get conversation history
                      const histRes = await pool.query(
                        "SELECT status, body, subject FROM outreach_messages WHERE lead_id = $1 AND channel = 'WHATSAPP' ORDER BY sent_at ASC NULLS LAST LIMIT 20",
                        [leadId]
                      );
                      const history = histRes.rows.map(m => {
                        const who = m.status === 'REPLIED' ? (m.subject?.replace('De: ', '') || 'Cliente') : 'Gian Franco Koch';
                        return `${who}: ${(m.body || '').slice(0, 200)}`;
                      }).join('\n');
                      const leadRes2 = await pool.query("SELECT * FROM leads WHERE id = $1", [leadId]);
                      const reply = await waOutreach.generateFollowUp(leadRes2.rows[0], history);
                      const phone2 = leadRes2.rows[0]?.social_whatsapp || leadRes2.rows[0]?.phone;
                      if (phone2 && reply) {
                        await this.sendMessage(phone2, reply, leadId);
                        await pool.query(
                          "INSERT INTO outreach_messages (lead_id, channel, step, body, ai_generated, status, sent_at) VALUES ($1, 'WHATSAPP', 1, $2, true, 'SENT', NOW())",
                          [leadId, reply]
                        );
                        console.log(`[WhatsApp] IA Auto-reply to ${leadName}: ${reply.slice(0, 50)}`);
                      }
                    } catch (autoErr) {
                      console.error('[WhatsApp] IA auto-reply error:', autoErr.message);
                    }
                  }, 5000); // 5s delay before auto-replying
                }
              }

              // Create notification
              await pool.query(
                `INSERT INTO notifications (type, title, body, lead_id, lead_name, phone, read, created_at)
                 VALUES ('whatsapp_reply', $1, $2, $3, $4, $5, false, NOW())`,
                [`${leadName} respondio por WhatsApp`, text.slice(0, 200), leadId, leadName, from]
              );

              // Auto-detect new contact in reply (phone or email)
              try {
                // Match phone numbers: standard formats + short numbers (7-15 digits)
                const allNumbers = text.match(/\+?\d[\d\s\-().]{6,18}\d/g) || [];
                const shortNumbers = text.match(/\b\d{7,15}\b/g) || [];
                const phoneMatches = [...new Set([...allNumbers, ...shortNumbers])];
                const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
                const newPhone = phoneMatches
                  .map(p => p.replace(/\D/g, ''))
                  .filter(p => p.length >= 7 && p.length <= 15 && p !== fromClean)
                  .find(p => p !== fromClean);
                const newEmail = emailMatch?.find(e => !e.includes('example') && !e.includes('noreply'));

                if (newPhone || newEmail) {
                  // Check if this contact already exists
                  let existsId = null;
                  if (newPhone) {
                    const ex = await pool.query("SELECT id FROM leads WHERE replace(replace(phone,'+',''),' ','') LIKE $1 OR replace(replace(social_whatsapp,'+',''),' ','') LIKE $1 LIMIT 1", [`%${newPhone.slice(-8)}%`]);
                    if (ex.rows.length) existsId = ex.rows[0].id;
                  }
                  if (newEmail && !existsId) {
                    const ex = await pool.query("SELECT id FROM leads WHERE email = $1 LIMIT 1", [newEmail]);
                    if (ex.rows.length) existsId = ex.rows[0].id;
                  }

                  if (!existsId) {
                    // Get parent lead info for context
                    let parentSector = '';
                    let parentName = leadName;
                    if (leadId) {
                      const parentRes = await pool.query("SELECT name, sector FROM leads WHERE id = $1", [leadId]);
                      if (parentRes.rows[0]) {
                        parentName = parentRes.rows[0].name || leadName;
                        parentSector = parentRes.rows[0].sector || '';
                      }
                    }

                    const nameHint = text.match(/(?:(?:habla|hable|comunic|contact|llam|escribi)[a-z]*\s+(?:con|a|al?)\s+)([A-Z][a-záéíóú]+(?:\s+[A-Z][a-záéíóú]+)*)/i)?.[1]
                      || `Contacto de ${parentName}`;

                    // Create new lead linked to parent
                    const newLead = await pool.query(
                      `INSERT INTO leads (name, phone, email, sector, source_url, status, score, notes, social_whatsapp)
                       VALUES ($1, $2, $3, $4, $5, 'new', 60, $6, $7) RETURNING id`,
                      [nameHint, newPhone ? `+54${newPhone}` : null, newEmail || null,
                       parentSector || 'referido', leadId ? `referido:${leadId}` : 'whatsapp-referido',
                       JSON.stringify([{ text: `Referido por ${parentName} via WhatsApp: "${text.slice(0, 150)}"`, date: new Date().toISOString() }]),
                       newPhone ? `+54${newPhone}` : null]
                    );
                    const newLeadId = newLead.rows[0]?.id;

                    // Auto-send WhatsApp with CONTEXT from previous conversation
                    if (newLeadId && newPhone) {
                      try {
                        const { analyzeWithDeepSeek } = await import('../deepseek.js');
                        const senderName = 'Gian Franco Koch';
                        const contextMsg = await analyzeWithDeepSeek(
                          `Eres ${senderName} de Adbize. Te derivaron a este numero desde ${parentName}. El mensaje original decia: "${text.slice(0, 200)}".
Genera un mensaje de WhatsApp corto en espanol argentino. Estructura:
1. Presentate como ${senderName} de Adbize
2. Menciona que te derivaron desde ${parentName}
3. Explica brevemente que tenes un demo gratuito de IA aplicada a su rubro que es una ventaja competitiva
4. Pregunta amable si podes compartirle info
Max 50 palabras. Sin simbolos raros. Texto plano.
Responde SOLO JSON: {"message":"texto"}`
                        );
                        let message;
                        try {
                          message = JSON.parse(contextMsg.match(/\{[\s\S]*\}/)?.[0] || '{}').message;
                        } catch {}
                        if (!message) message = `Hola buen dia! Soy ${senderName} de Adbize. Me derivaron desde ${parentName}. Tenemos un demo gratuito de IA aplicada al sector que es una ventaja competitiva clave. Puedo compartirte mas info?`;

                        const fullPhone = `54${newPhone}`;
                        await this.sendMessage(fullPhone, message, newLeadId);
                        await pool.query(
                          `INSERT INTO outreach_messages (lead_id, channel, step, body, ai_generated, status, sent_at)
                           VALUES ($1, 'WHATSAPP', 1, $2, true, 'SENT', NOW())`,
                          [newLeadId, message]
                        );
                        console.log(`[WhatsApp] Auto-outreach with context to: ${nameHint} (${fullPhone})`);
                      } catch (autoErr) {
                        console.error('[WhatsApp] Auto-outreach error:', autoErr.message);
                      }
                    }

                    // Notification with new lead ID for redirect
                    await pool.query(
                      `INSERT INTO notifications (type, title, body, lead_id, lead_name, phone, read, created_at)
                       VALUES ('new_contact', $1, $2, $3, $4, $5, false, NOW())`,
                      [`Nuevo contacto: ${nameHint}`,
                       `${parentName} derivo al ${newPhone || newEmail}. Se envio mensaje con contexto.`,
                       newLeadId, nameHint, newPhone || null]
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

  async sendMessage(phone, text, leadId = null) {
    if (!this.socket || this.connectionStatus !== 'connected') {
      throw new Error('WhatsApp no esta conectado');
    }

    // Format phone number - ensure it has @s.whatsapp.net
    let jid = phone.replace(/\D/g, '');
    if (!jid.includes('@')) {
      jid = `${jid}@s.whatsapp.net`;
    }

    const result = await this.socket.sendMessage(jid, { text });

    // Track JID → lead mapping for matching replies
    const remoteJid = result?.key?.remoteJid || jid;
    const jidNumber = remoteJid.split('@')[0];
    if (leadId) {
      this.jidToLead.set(jidNumber, leadId);
    }
    // Also map the clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    if (leadId && cleanPhone) {
      this.jidToLead.set(cleanPhone, leadId);
    }

    const entry = {
      id: result?.key?.id || Date.now().toString(),
      to: phone,
      jid: jidNumber,
      text,
      timestamp: new Date().toISOString(),
      isFromMe: true,
      status: 'sent',
    };

    this.messageHistory.unshift(entry);
    if (this.messageHistory.length > 100) this.messageHistory.pop();

    this.emit('messageSent', entry);
    console.log(`[WhatsApp] Message sent to ${phone} (jid: ${jidNumber}): ${text.slice(0, 50)}`);

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

// Singleton for main account (backward compatible)
export const whatsappConnection = new WhatsAppConnectionService();

// Multi-account manager
class WhatsAppMultiAccountManager {
  constructor() {
    this.connections = new Map(); // accountId -> WhatsAppConnectionService
    // Register main connection
    this.connections.set('main', whatsappConnection);
  }

  getConnection(accountId) {
    if (!accountId || accountId === 'main') return whatsappConnection;
    return this.connections.get(accountId) || null;
  }

  getOrCreateConnection(accountId) {
    if (!accountId || accountId === 'main') return whatsappConnection;
    let conn = this.connections.get(accountId);
    if (!conn) {
      conn = new WhatsAppConnectionService();
      conn.accountId = accountId;
      this.connections.set(accountId, conn);
    }
    return conn;
  }

  async connectAccount(accountId) {
    const conn = this.getOrCreateConnection(accountId);
    conn.retryCount = 0;
    let connectError = null;
    conn.connect(accountId).catch(err => {
      console.error(`[WhatsApp:${accountId}] Connection error:`, err.message);
      connectError = err.message;
    });

    // Wait up to 20 seconds for QR to appear
    let status = conn.getStatus();
    for (let i = 0; i < 20; i++) {
      if (status.qrCode || status.status === 'connected') break;
      // If it went back to disconnected after trying, stop waiting
      if (i > 2 && status.status === 'disconnected') break;
      if (connectError) break;
      await new Promise(r => setTimeout(r, 1000));
      status = conn.getStatus();
    }
    console.log(`[WhatsApp:${accountId}] connectAccount result: status=${status.status}, hasQR=${!!status.qrCode}, error=${connectError}`);
    return { success: !connectError, accountId, error: connectError, ...status };
  }

  getStatus(accountId) {
    const conn = this.getConnection(accountId);
    if (!conn) return { status: 'disconnected', phone: null, name: null, qrCode: null, messageCount: 0 };
    return conn.getStatus();
  }

  async disconnectAccount(accountId) {
    const conn = this.getConnection(accountId);
    if (!conn) return { status: 'disconnected' };
    const result = await conn.disconnect();
    // Update DB for non-main
    if (accountId && accountId !== 'main') {
      try {
        const { pool } = await import('../../config/database.js');
        await pool.query("UPDATE whatsapp_accounts SET status = 'disconnected' WHERE id = $1", [accountId]);
      } catch {}
    }
    return result;
  }

  // Get any connected instance that can send messages
  getConnectedInstance(accountId) {
    if (accountId) {
      const conn = this.getConnection(accountId);
      if (conn && conn.connectionStatus === 'connected') return conn;
    }
    // Fallback to main
    if (whatsappConnection.connectionStatus === 'connected') return whatsappConnection;
    // Try any connected one
    for (const [, conn] of this.connections) {
      if (conn.connectionStatus === 'connected') return conn;
    }
    return null;
  }
}

export const waManager = new WhatsAppMultiAccountManager();
export default whatsappConnection;
