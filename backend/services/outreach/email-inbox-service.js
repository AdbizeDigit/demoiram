import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { pool } from '../../config/database.js';

class EmailInboxService {
  constructor() {
    this.isChecking = false;
    this.lastCheck = null;
    this.pollInterval = null;
  }

  createClient() {
    return new ImapFlow({
      host: process.env.SMTP_HOST || 'c1941596.ferozo.com',
      port: 993,
      secure: true,
      auth: {
        user: process.env.SMTP_USER || 'giankoch@adbize.com',
        pass: process.env.SMTP_PASS,
      },
      logger: false,
      tls: { rejectUnauthorized: false },
    });
  }

  async checkInbox() {
    if (this.isChecking) return { message: 'Ya verificando' };
    this.isChecking = true;

    const client = this.createClient();
    let newReplies = 0;

    try {
      await client.connect();

      const lock = await client.getMailboxLock('INBOX');
      try {
        // Get messages from last 7 days that are unseen
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const msgs = [];
        for await (const msg of client.fetch(
          { since, seen: false },
          { envelope: true, source: true, uid: true }
        )) {
          msgs.push(msg);
        }

        console.log(`[EmailInbox] Found ${msgs.length} unread messages`);

        for (const msg of msgs) {
          try {
            const parsed = await simpleParser(msg.source);
            const from = parsed.from?.value?.[0]?.address || '';
            const fromName = parsed.from?.value?.[0]?.name || from;
            const subject = parsed.subject || '';
            const textBody = parsed.text || '';
            const htmlBody = parsed.html || '';
            const date = parsed.date || new Date();

            // Check if this is a reply to one of our emails (subject contains RE:)
            const isReply = subject.toLowerCase().startsWith('re:') ||
                           subject.toLowerCase().startsWith('fwd:') ||
                           subject.toLowerCase().includes('re:');

            // Skip if already saved
            const existing = await pool.query(
              "SELECT id FROM outreach_messages WHERE subject = $1 AND body LIKE $2 AND channel = 'EMAIL' AND status = 'REPLIED' LIMIT 1",
              [subject, `%${textBody.slice(0, 50)}%`]
            );
            if (existing.rows.length > 0) continue;

            // Try to find lead by email
            const leadRes = await pool.query(
              "SELECT id, name FROM leads WHERE email = $1 LIMIT 1",
              [from]
            );
            const leadId = leadRes.rows[0]?.id || null;

            // Save as incoming message
            await pool.query(
              `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, sent_at)
               VALUES ($1, 'EMAIL', 0, $2, $3, false, 'REPLIED', $4)`,
              [leadId, subject, htmlBody || textBody || 'Sin contenido', date]
            );

            newReplies++;
            console.log(`[EmailInbox] Saved reply from ${fromName} (${from}): ${subject}`);

            // Mark as seen in IMAP
            await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);

          } catch (parseErr) {
            console.error('[EmailInbox] Error parsing message:', parseErr.message);
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err) {
      console.error('[EmailInbox] IMAP error:', err.message);
    } finally {
      this.isChecking = false;
      this.lastCheck = new Date();
    }

    return { newReplies, checkedAt: this.lastCheck };
  }

  // Start polling every N minutes
  startPolling(intervalMinutes = 2) {
    if (this.pollInterval) return;

    console.log(`[EmailInbox] Starting IMAP polling every ${intervalMinutes} min`);

    // Check immediately
    this.checkInbox().catch(err => console.error('[EmailInbox] Poll error:', err.message));

    this.pollInterval = setInterval(() => {
      this.checkInbox().catch(err => console.error('[EmailInbox] Poll error:', err.message));
    }, intervalMinutes * 60 * 1000);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[EmailInbox] Polling stopped');
    }
  }

  getStatus() {
    return {
      isChecking: this.isChecking,
      lastCheck: this.lastCheck,
      polling: !!this.pollInterval,
    };
  }
}

export const emailInboxService = new EmailInboxService();
export default emailInboxService;
