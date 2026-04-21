import { pool } from '../../config/database.js';
import { outreachParams } from './outreach-params-service.js';
import { outreachScoring } from './outreach-scoring-service.js';

/**
 * Outreach Tuning Service
 *
 * Runs periodically and — for each (channel, sector) bucket with enough
 * new scored data — proposes the next parameter version using a simple
 * epsilon-greedy strategy:
 *
 *   exploit (80%): lock in the parameter values whose neighbors
 *                  historically scored best; leave the rest unchanged.
 *   explore (20%): mutate one parameter by a small random step to
 *                  probe whether a nearby region performs better.
 *
 * After a new version has collected ROLLBACK_MIN_SAMPLES scored messages,
 * if it underperforms the parent version by more than ROLLBACK_THRESHOLD
 * percent, we roll back automatically. The parent becomes active again
 * and the bandit will pick a different mutation next time.
 */

const MIN_SAMPLES_TO_TUNE = 20;          // new messages scored since version went active
const MIN_SAMPLES_FOR_ROLLBACK = 10;     // messages scored under the new version before we judge
const ROLLBACK_MARGIN = 0.85;            // new avg < parent avg * 0.85 → rollback (15% worse)
const EXPLORE_PROB = 0.2;                // ε in ε-greedy

const TEMP_STEPS = [-0.15, -0.1, -0.05, 0.05, 0.1, 0.15];

function pickOne(list) { return list[Math.floor(Math.random() * list.length)]; }
function clampTemp(t) { return Math.max(0.2, Math.min(1.2, +t.toFixed(2))); }
function clampWords(n, min, max) { return Math.max(min, Math.min(max, Math.round(n))); }

class OutreachTuningService {
  constructor() {
    this.lastRunAt = null;
    this.lastRunSummary = null;
  }

  /**
   * For one bucket: if eligible, either rollback or mutate+activate a new version.
   * Returns a short summary describing what happened.
   */
  async tuneBucket(channel, sector) {
    const CHANNEL = channel.toUpperCase();
    const SECTOR = (sector || 'default').toLowerCase();

    const active = await outreachParams.getActive(CHANNEL, SECTOR);
    if (!active?.id) return { channel: CHANNEL, sector: SECTOR, action: 'skip', reason: 'no-active-version' };
    if (active.frozen) return { channel: CHANNEL, sector: SECTOR, action: 'skip', reason: 'frozen' };

    // Count scored messages belonging to the currently-active version.
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS n, AVG(outcome_score) AS avg
       FROM outreach_messages
       WHERE params_version_id = $1 AND outcome_score IS NOT NULL`,
      [active.id]
    ).catch(() => ({ rows: [{ n: 0, avg: null }] }));
    const n = parseInt(countRows[0]?.n) || 0;
    const avg = countRows[0]?.avg != null ? parseFloat(countRows[0].avg) : null;

    // Rollback check: compare this version against its parent (if we have enough data).
    if (active.parent_version_id && n >= MIN_SAMPLES_FOR_ROLLBACK && avg != null) {
      const { rows: parentRows } = await pool.query(
        `SELECT AVG(outcome_score) AS avg, COUNT(*) AS n
         FROM outreach_messages
         WHERE params_version_id = $1 AND outcome_score IS NOT NULL`,
        [active.parent_version_id]
      ).catch(() => ({ rows: [{ avg: null, n: 0 }] }));
      const parentAvg = parentRows[0]?.avg != null ? parseFloat(parentRows[0].avg) : null;
      const parentN = parseInt(parentRows[0]?.n) || 0;
      if (parentAvg != null && parentN >= MIN_SAMPLES_FOR_ROLLBACK && avg < parentAvg * ROLLBACK_MARGIN) {
        await outreachParams.rollbackTo(active.parent_version_id);
        return {
          channel: CHANNEL, sector: SECTOR, action: 'rollback',
          from_version: active.version,
          to_version_id: active.parent_version_id,
          new_avg: +avg.toFixed(2),
          parent_avg: +parentAvg.toFixed(2),
        };
      }
    }

    if (n < MIN_SAMPLES_TO_TUNE) {
      return { channel: CHANNEL, sector: SECTOR, action: 'skip', reason: `not-enough-data (${n}/${MIN_SAMPLES_TO_TUNE})` };
    }

    // Decide exploit vs explore.
    const explore = Math.random() < EXPLORE_PROB;
    const proposal = explore
      ? this.mutateExplore(active, CHANNEL)
      : await this.mutateExploit(active, CHANNEL, SECTOR);

    // If exploit produced no meaningful change (because there isn't enough
    // neighbor history yet), fall back to a conservative explore.
    const noChange =
      proposal.temperature === active.temperature &&
      proposal.max_words === active.max_words &&
      proposal.cta_intensity === active.cta_intensity &&
      proposal.opening_style === active.opening_style &&
      JSON.stringify((proposal.tone_keywords || []).slice().sort()) ===
        JSON.stringify((active.tone_keywords || []).slice().sort());
    if (noChange) {
      const fallback = this.mutateExplore(active, CHANNEL);
      Object.assign(proposal, fallback, { note: (proposal.note || '') + ' (fallback-explore)' });
    }

    const newRow = await outreachParams.createVersion({
      channel: CHANNEL,
      sector: SECTOR,
      temperature: proposal.temperature,
      max_words: proposal.max_words,
      tone_keywords: proposal.tone_keywords,
      cta_intensity: proposal.cta_intensity,
      opening_style: proposal.opening_style,
      playbook_id: active.playbook_id || null,
      parent_version_id: active.id,
      origin: explore ? 'explore' : 'exploit',
      notes: proposal.note || null,
    });

    return {
      channel: CHANNEL, sector: SECTOR, action: explore ? 'explore' : 'exploit',
      from_version: active.version, to_version: newRow.version,
      parent_avg: avg != null ? +avg.toFixed(2) : null, samples: n,
      note: proposal.note,
    };
  }

  /**
   * Exploit: pick the historical parameter configuration for this bucket
   * (including ancestor versions) that has the best avg score and at least
   * MIN_SAMPLES_FOR_ROLLBACK samples. If the winner is already active, fall
   * through (caller switches to explore).
   */
  async mutateExploit(active, channel, sector) {
    const { rows } = await pool.query(`
      SELECT p.id, p.version, p.temperature, p.max_words, p.tone_keywords, p.cta_intensity, p.opening_style,
             AVG(om.outcome_score) AS avg_score,
             COUNT(om.id) AS n
      FROM outreach_params p
      LEFT JOIN outreach_messages om ON om.params_version_id = p.id AND om.outcome_score IS NOT NULL
      WHERE p.channel = $1 AND p.sector = $2
      GROUP BY p.id
      HAVING COUNT(om.id) >= $3
      ORDER BY AVG(om.outcome_score) DESC NULLS LAST
      LIMIT 1
    `, [channel, sector, MIN_SAMPLES_FOR_ROLLBACK]).catch(() => ({ rows: [] }));

    const winner = rows[0];
    if (!winner || winner.id === active.id) {
      // No clear winner with enough data; small conservative nudge toward the mean.
      const nudge = pickOne([-0.05, 0.05]);
      return {
        temperature: clampTemp(active.temperature + nudge),
        max_words: active.max_words,
        tone_keywords: active.tone_keywords,
        cta_intensity: active.cta_intensity,
        opening_style: active.opening_style,
        note: `exploit: no clear winner yet, nudge temp ${nudge > 0 ? '+' : ''}${nudge}`,
      };
    }
    return {
      temperature: parseFloat(winner.temperature),
      max_words: parseInt(winner.max_words),
      tone_keywords: winner.tone_keywords,
      cta_intensity: winner.cta_intensity,
      opening_style: winner.opening_style,
      note: `exploit: copy v${winner.version} (avg ${(+winner.avg_score).toFixed(2)}, n=${winner.n})`,
    };
  }

  /**
   * Explore: mutate exactly ONE parameter by a small step. Keeps the rest
   * stable so we can tell which change moved the needle.
   */
  mutateExplore(active, channel) {
    const knobs = ['temperature', 'max_words', 'cta_intensity', 'opening_style', 'tone_keywords'];
    const pick = pickOne(knobs);
    const out = {
      temperature: active.temperature,
      max_words: active.max_words,
      tone_keywords: (active.tone_keywords || []).slice(),
      cta_intensity: active.cta_intensity,
      opening_style: active.opening_style,
      note: `explore: mutate ${pick}`,
    };

    if (pick === 'temperature') {
      out.temperature = clampTemp(active.temperature + pickOne(TEMP_STEPS));
      out.note = `explore: temp ${active.temperature} -> ${out.temperature}`;
    } else if (pick === 'max_words') {
      const step = pickOne([-20, -10, -5, 5, 10, 20]);
      const bounds = channel === 'WHATSAPP' ? [30, 110] : [70, 220];
      out.max_words = clampWords(active.max_words + step, bounds[0], bounds[1]);
      out.note = `explore: max_words ${active.max_words} -> ${out.max_words}`;
    } else if (pick === 'cta_intensity') {
      const pool = outreachParams.DOMAINS.cta.filter(x => x !== active.cta_intensity);
      out.cta_intensity = pickOne(pool);
      out.note = `explore: cta ${active.cta_intensity} -> ${out.cta_intensity}`;
    } else if (pick === 'opening_style') {
      const pool = outreachParams.DOMAINS.opening.filter(x => x !== active.opening_style);
      out.opening_style = pickOne(pool);
      out.note = `explore: opening ${active.opening_style} -> ${out.opening_style}`;
    } else if (pick === 'tone_keywords') {
      const current = new Set(active.tone_keywords || []);
      const extra = outreachParams.DOMAINS.tone.filter(x => !current.has(x));
      // Either swap a word or add one.
      if (Math.random() < 0.5 && current.size > 1) {
        const removed = pickOne([...current]);
        current.delete(removed);
        const added = pickOne(extra) || removed;
        current.add(added);
        out.tone_keywords = [...current];
        out.note = `explore: tone ${removed} -> ${added}`;
      } else if (extra.length > 0 && current.size < 5) {
        const added = pickOne(extra);
        current.add(added);
        out.tone_keywords = [...current];
        out.note = `explore: tone +${added}`;
      } else {
        out.temperature = clampTemp(active.temperature + pickOne(TEMP_STEPS));
        out.note = `explore: tone saturated, temp ${active.temperature} -> ${out.temperature}`;
      }
    }

    return out;
  }

  /**
   * Find all (channel, sector) buckets that have at least one scored message.
   * We skip buckets that have never been used — they would just reuse the default.
   */
  async listBuckets() {
    const { rows } = await pool.query(`
      SELECT DISTINCT
        UPPER(om.channel) AS channel,
        COALESCE(NULLIF(LOWER(l.sector), ''), 'default') AS sector
      FROM outreach_messages om
      LEFT JOIN leads l ON l.id = om.lead_id
      WHERE om.channel IS NOT NULL AND om.outcome_score IS NOT NULL
    `).catch(() => ({ rows: [] }));
    // Also always include the channel defaults so we tune those too.
    const seen = new Set(rows.map(r => `${r.channel}::${r.sector}`));
    const extras = [];
    for (const ch of ['EMAIL', 'WHATSAPP']) {
      if (!seen.has(`${ch}::default`)) extras.push({ channel: ch, sector: 'default' });
    }
    return [...rows.map(r => ({ channel: r.channel, sector: r.sector })), ...extras];
  }

  /**
   * Run one full pass of the tuner across every bucket. Safe to call on a cron.
   * Also scores pending messages before tuning, so the latest outcomes are reflected.
   */
  async runCycle({ scoreBatchLimit = 50 } = {}) {
    const startedAt = Date.now();
    const scoringResult = await outreachScoring.scoreBatch({ limit: scoreBatchLimit }).catch(err => {
      console.error('[OutreachTuning] scoreBatch failed:', err.message);
      return { scored: 0, skipped: 0, considered: 0, error: err.message };
    });

    const buckets = await this.listBuckets();
    const bucketResults = [];
    for (const b of buckets) {
      try {
        const res = await this.tuneBucket(b.channel, b.sector);
        bucketResults.push(res);
      } catch (err) {
        console.error('[OutreachTuning] bucket error', b, err.message);
        bucketResults.push({ channel: b.channel, sector: b.sector, action: 'error', reason: err.message });
      }
    }

    this.lastRunAt = new Date().toISOString();
    this.lastRunSummary = {
      at: this.lastRunAt,
      duration_ms: Date.now() - startedAt,
      scoring: scoringResult,
      buckets: bucketResults,
    };

    const acted = bucketResults.filter(r => ['explore','exploit','rollback'].includes(r.action)).length;
    console.log(`[OutreachTuning] cycle done in ${Date.now()-startedAt}ms — scored ${scoringResult.scored}, acted on ${acted}/${bucketResults.length} buckets`);
    return this.lastRunSummary;
  }

  getLastRun() {
    return this.lastRunSummary;
  }
}

export const outreachTuning = new OutreachTuningService();
export default outreachTuning;
