// Cron worker: cada minuto procesa secuencias activas y dispara mensajes según schedule
import { pool } from '../config/database.js';
import { emailOutreachService } from './outreach/email-outreach-service.js';

let running = false;

async function processSequenceRuns() {
  if (running) return;
  running = true;
  try {
    // Tomar runs activas con next_run_at vencido
    const dueRuns = (await pool.query(`
      SELECT r.*, s.steps, s.name AS sequence_name
      FROM seller_sequence_runs r
      JOIN seller_sequences s ON s.id = r.sequence_id
      WHERE r.status = 'ACTIVE'
        AND r.next_run_at <= NOW()
        AND s.active = true
      LIMIT 20
    `)).rows;

    for (const run of dueRuns) {
      try {
        // Si el lead respondió desde el último envío, parar la secuencia
        const replied = (await pool.query(`
          SELECT COUNT(*) AS c FROM outreach_messages
          WHERE lead_id = $1 AND UPPER(status) = 'REPLIED' AND replied_at > $2
        `, [run.lead_id, run.started_at])).rows[0];
        if (parseInt(replied.c) > 0) {
          await pool.query(
            `UPDATE seller_sequence_runs SET status = 'STOPPED', stopped_reason = 'lead_replied', completed_at = NOW() WHERE id = $1`,
            [run.id]
          );
          continue;
        }

        const steps = run.steps || [];
        const stepIdx = run.current_step;
        const step = steps[stepIdx];
        if (!step) {
          // Secuencia completada
          await pool.query(
            `UPDATE seller_sequence_runs SET status = 'COMPLETED', completed_at = NOW() WHERE id = $1`,
            [run.id]
          );
          continue;
        }

        // Ejecutar el step
        const lead = (await pool.query('SELECT * FROM leads WHERE id = $1', [run.lead_id])).rows[0];
        if (!lead) {
          await pool.query(
            `UPDATE seller_sequence_runs SET status = 'STOPPED', stopped_reason = 'lead_not_found', completed_at = NOW() WHERE id = $1`,
            [run.id]
          );
          continue;
        }

        // Reemplazar variables {{name}} {{first_name}} {{company}} en subject y body
        const replaceVars = (str) => (str || '')
          .replace(/\{\{name\}\}/gi, lead.name || '')
          .replace(/\{\{company\}\}/gi, lead.name || '')
          .replace(/\{\{first_name\}\}/gi, (lead.name || '').split(' ')[0])
          .replace(/\{\{sector\}\}/gi, lead.sector || '')
          .replace(/\{\{city\}\}/gi, lead.city || '');

        const subject = replaceVars(step.subject);
        const body = replaceVars(step.body);
        const channel = String(step.channel || 'EMAIL').toUpperCase();

        if (channel === 'EMAIL' && lead.email) {
          try {
            const avatar = await emailOutreachService.getActiveAvatar();
            const wrapped = await emailOutreachService.wrapInTemplate(body, avatar, null);
            await emailOutreachService.sendEmail(lead.email, subject || `Seguimiento - ${lead.name}`, wrapped);
            await pool.query(
              `INSERT INTO outreach_messages (lead_id, channel, step, subject, body, ai_generated, status, sent_at, sent_by_seller_id)
               VALUES ($1, 'EMAIL', $2, $3, $4, false, 'SENT', NOW(), $5)`,
              [run.lead_id, stepIdx + 1, subject, wrapped, run.seller_id]
            );
          } catch (e) {
            console.warn(`[SequenceRunner] Email step failed for run ${run.id}:`, e.message);
          }
        } else if (channel === 'WHATSAPP') {
          // Sólo registramos como pendiente: el envío real de WA requiere connection viva
          await pool.query(
            `INSERT INTO outreach_messages (lead_id, channel, step, body, status, sent_at, sent_by_seller_id)
             VALUES ($1, 'WHATSAPP', $2, $3, 'PENDING', NOW(), $4)`,
            [run.lead_id, stepIdx + 1, body, run.seller_id]
          );
        }

        // Avanzar al siguiente step o completar
        const nextStepIdx = stepIdx + 1;
        const nextStep = steps[nextStepIdx];
        if (!nextStep) {
          await pool.query(
            `UPDATE seller_sequence_runs SET current_step = $1, status = 'COMPLETED', completed_at = NOW() WHERE id = $2`,
            [nextStepIdx, run.id]
          );
        } else {
          const nextRunAt = new Date();
          nextRunAt.setDate(nextRunAt.getDate() + (nextStep.delay_days || 1));
          await pool.query(
            `UPDATE seller_sequence_runs SET current_step = $1, next_run_at = $2 WHERE id = $3`,
            [nextStepIdx, nextRunAt, run.id]
          );
        }
      } catch (innerErr) {
        console.error(`[SequenceRunner] Error processing run ${run.id}:`, innerErr.message);
      }
    }
  } catch (err) {
    console.error('[SequenceRunner] Loop error:', err.message);
  } finally {
    running = false;
  }
}

let intervalHandle = null;
export function startSequenceRunner() {
  if (intervalHandle) return;
  // Cada 60s
  intervalHandle = setInterval(processSequenceRuns, 60_000);
  console.log('🔁 Sequence runner iniciado (cada 60s)');
  // Primer run a los 30s para no chocar con el arranque
  setTimeout(processSequenceRuns, 30_000);
}

export function stopSequenceRunner() {
  if (intervalHandle) { clearInterval(intervalHandle); intervalHandle = null; }
}
