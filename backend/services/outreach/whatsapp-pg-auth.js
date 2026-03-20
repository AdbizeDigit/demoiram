import { pool } from '../../config/database.js';
import * as baileys from '@whiskeysockets/baileys';
const { proto, initAuthCreds } = baileys;

/**
 * PostgreSQL-based auth state for Baileys.
 * Persists WhatsApp session across Dokku deploys.
 */
export async function usePgAuthState() {
  // Create table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_auth (
      key VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const writeData = async (key, data) => {
    const value = JSON.stringify(data, baileys.BufferJSON?.replacer || ((k, v) => {
      if (v instanceof Uint8Array || Buffer.isBuffer(v)) return { type: 'Buffer', data: Array.from(v) };
      return v;
    }));
    await pool.query(
      'INSERT INTO whatsapp_auth (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
      [key, value]
    );
  };

  const readData = async (key) => {
    const res = await pool.query('SELECT value FROM whatsapp_auth WHERE key = $1', [key]);
    if (res.rows.length === 0) return null;
    try {
      return JSON.parse(res.rows[0].value, baileys.BufferJSON?.reviver || ((k, v) => {
        if (v && typeof v === 'object' && v.type === 'Buffer' && Array.isArray(v.data)) return Buffer.from(v.data);
        return v;
      }));
    } catch {
      return null;
    }
  };

  const removeData = async (key) => {
    await pool.query('DELETE FROM whatsapp_auth WHERE key = $1', [key]);
  };

  const clearAll = async () => {
    await pool.query('DELETE FROM whatsapp_auth');
  };

  // Load or create creds
  let creds = await readData('creds');
  if (!creds) {
    creds = initAuthCreds();
    await writeData('creds', creds);
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          for (const id of ids) {
            const value = await readData(`${type}-${id}`);
            if (value) {
              if (type === 'app-state-sync-key') {
                data[id] = proto.Message.AppStateSyncKeyData.fromObject(value);
              } else {
                data[id] = value;
              }
            }
          }
          return data;
        },
        set: async (data) => {
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              if (value) {
                await writeData(`${category}-${id}`, value);
              } else {
                await removeData(`${category}-${id}`);
              }
            }
          }
        },
      },
    },
    saveCreds: async () => {
      await writeData('creds', creds);
    },
    clearAll,
  };
}

export default usePgAuthState;
