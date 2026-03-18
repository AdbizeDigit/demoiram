import * as baileys from '@whiskeysockets/baileys';
const makeWASocket = baileys.makeWASocket || baileys.default;
const { DisconnectReason, useMultiFileAuthState, delay, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = baileys;
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pino from 'pino';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '..', '..', 'whatsapp-auth');

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
      // Ensure auth directory exists
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
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

          if (shouldReconnect && this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`[WhatsApp] Reconnecting... attempt ${this.retryCount}`);
            setTimeout(() => this.connect(), 5000);
          } else if (statusCode === DisconnectReason.loggedOut) {
            console.log('[WhatsApp] Logged out. Need to re-scan QR.');
            // Clean auth to force new QR
            const fs = await import('fs');
            try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
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
      this.socket.ev.on('messages.upsert', ({ messages }) => {
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

    // Clean auth
    const fs = await import('fs');
    try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}

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
}

// Singleton
export const whatsappConnection = new WhatsAppConnectionService();
export default whatsappConnection;
