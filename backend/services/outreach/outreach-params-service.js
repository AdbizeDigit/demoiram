import { pool } from '../../config/database.js';

/**
 * Outreach Params Service
 *
 * Versioned registry of generation parameters per (channel, sector).
 * Every outreach message that gets sent records which params version drove
 * it (outreach_messages.params_version_id) so the tuning loop can attribute
 * outcomes back to specific configurations.
 *
 * The lookup fallback is (channel, sector) -> (channel, 'default') -> hardcoded.
 */

const DEFAULT_BY_CHANNEL = {
  EMAIL: {
    temperature: 0.7,
    max_words: 120,
    tone_keywords: ['consultivo', 'profesional', 'claro'],
    cta_intensity: 'soft',
    opening_style: 'observation',
  },
  WHATSAPP: {
    temperature: 0.7,
    max_words: 55,
    tone_keywords: ['amable', 'persuasivo', 'natural'],
    cta_intensity: 'soft',
    opening_style: 'observation',
  },
};

// Valid values — mutations must stay inside these domains so we never generate nonsense.
const TONE_POOL = ['consultivo', 'profesional', 'claro', 'amable', 'persuasivo', 'natural', 'directo', 'curioso', 'tecnico', 'cercano'];
const CTA_POOL = ['soft', 'medium', 'strong'];
const OPENING_POOL = ['observation', 'question', 'compliment', 'data', 'referral'];

// in-process cache so hot paths (message generation) don't hammer the DB
const paramsCache = new Map();
const CACHE_TTL_MS = 30_000;

function cacheKey(channel, sector) { return `${channel}::${sector || 'default'}`; }

class OutreachParamsService {
  async initSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS outreach_params (
        id SERIAL PRIMARY KEY,
        channel VARCHAR(20) NOT NULL,
        sector VARCHAR(100) NOT NULL DEFAULT 'default',
        version INTEGER NOT NULL DEFAULT 1,
        temperature NUMERIC(3,2) NOT NULL DEFAULT 0.7,
        max_words INTEGER NOT NULL DEFAULT 120,
        tone_keywords TEXT[] NOT NULL DEFAULT ARRAY['consultivo','profesional','claro']::TEXT[],
        cta_intensity VARCHAR(20) NOT NULL DEFAULT 'soft',
        opening_style VARCHAR(20) NOT NULL DEFAULT 'observation',
        playbook_id INTEGER,
        parent_version_id INTEGER,
        is_active BOOLEAN NOT NULL DEFAULT true,
        frozen BOOLEAN NOT NULL DEFAULT false,
        origin VARCHAR(20) NOT NULL DEFAULT 'seed',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        deprecated_at TIMESTAMPTZ
      )
    `).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_outreach_params_active ON outreach_params(channel, sector, is_active)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_outreach_params_sector ON outreach_params(sector)`).catch(() => {});

    // Seed default row per channel if missing
    for (const channel of Object.keys(DEFAULT_BY_CHANNEL)) {
      const { rows } = await pool.query(
        `SELECT id FROM outreach_params WHERE channel = $1 AND sector = 'default' AND is_active = true LIMIT 1`,
        [channel]
      ).catch(() => ({ rows: [] }));
      if (rows.length === 0) {
        const d = DEFAULT_BY_CHANNEL[channel];
        await pool.query(
          `INSERT INTO outreach_params (channel, sector, version, temperature, max_words, tone_keywords, cta_intensity, opening_style, is_active, origin)
           VALUES ($1, 'default', 1, $2, $3, $4, $5, $6, true, 'seed')`,
          [channel, d.temperature, d.max_words, d.tone_keywords, d.cta_intensity, d.opening_style]
        ).catch(err => console.error('[OutreachParams] Seed failed:', err.message));
      }
    }
  }

  /**
   * Get the active params row for (channel, sector), falling back to the
   * channel default, then to the hardcoded DEFAULT_BY_CHANNEL shape.
   * Always returns an object with the full set of fields.
   */
  async getActive(channel, sector) {
    const CHANNEL = (channel || 'EMAIL').toUpperCase();
    const SECTOR = (sector || 'default').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 100) || 'default';
    const cached = paramsCache.get(cacheKey(CHANNEL, SECTOR));
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

    let { rows } = await pool.query(
      `SELECT * FROM outreach_params WHERE channel = $1 AND sector = $2 AND is_active = true ORDER BY version DESC LIMIT 1`,
      [CHANNEL, SECTOR]
    ).catch(() => ({ rows: [] }));

    if (rows.length === 0) {
      ({ rows } = await pool.query(
        `SELECT * FROM outreach_params WHERE channel = $1 AND sector = 'default' AND is_active = true ORDER BY version DESC LIMIT 1`,
        [CHANNEL]
      ).catch(() => ({ rows: [] })));
    }

    const fallback = DEFAULT_BY_CHANNEL[CHANNEL] || DEFAULT_BY_CHANNEL.EMAIL;
    const value = rows[0]
      ? {
          id: rows[0].id,
          channel: rows[0].channel,
          sector: rows[0].sector,
          version: rows[0].version,
          temperature: parseFloat(rows[0].temperature),
          max_words: parseInt(rows[0].max_words),
          tone_keywords: rows[0].tone_keywords || fallback.tone_keywords,
          cta_intensity: rows[0].cta_intensity,
          opening_style: rows[0].opening_style,
          playbook_id: rows[0].playbook_id,
          parent_version_id: rows[0].parent_version_id,
          frozen: !!rows[0].frozen,
          origin: rows[0].origin,
        }
      : {
          id: null,
          channel: CHANNEL,
          sector: SECTOR,
          version: 0,
          ...fallback,
          playbook_id: null,
          parent_version_id: null,
          frozen: false,
          origin: 'hardcoded',
        };

    paramsCache.set(cacheKey(CHANNEL, SECTOR), { value, at: Date.now() });
    return value;
  }

  /**
   * Render the params as a short block to inject into a system prompt.
   * The message generator calls this instead of hardcoding tone / length / CTA.
   */
  renderPromptBlock(params) {
    const tone = (params.tone_keywords || []).slice(0, 4).join(', ');
    const ctaMap = {
      soft: 'invitacion abierta (ej: "si les interesa, puedo pasar info"). Sin presion.',
      medium: 'propuesta clara (ej: "agendamos 15 min esta semana?"). Directa pero amable.',
      strong: 'pedido concreto de accion (ej: "te envio el link para agendar, elegi el horario"). Asume interes.',
    };
    const openingMap = {
      observation: 'abrir mencionando algo observable de la empresa o del sector (dato, noticia, detalle de su web)',
      question: 'abrir con una pregunta relevante al negocio del lead',
      compliment: 'abrir con un comentario especifico y sincero sobre algo que hacen bien',
      data: 'abrir con un dato o estadistica relevante de su industria',
      referral: 'abrir mencionando una conexion comun, cliente similar o referente del rubro',
    };
    return [
      'PARAMETROS DE GENERACION (config activa, ajustados por aprendizaje automatico):',
      `- Tono: ${tone || 'profesional'}`,
      `- Longitud maxima: ${params.max_words} palabras`,
      `- Intensidad del CTA: ${ctaMap[params.cta_intensity] || ctaMap.soft}`,
      `- Estilo de apertura: ${openingMap[params.opening_style] || openingMap.observation}`,
    ].join('\n');
  }

  /**
   * Create a new version of params, deprecating the previous active row
   * for the same (channel, sector). Used by the tuning loop.
   *
   * Returns the newly created row.
   */
  async createVersion({
    channel, sector, temperature, max_words, tone_keywords, cta_intensity,
    opening_style, playbook_id, parent_version_id, origin = 'tune', notes
  }) {
    const CHANNEL = channel.toUpperCase();
    const SECTOR = (sector || 'default').toLowerCase();

    const { rows: currentRows } = await pool.query(
      `SELECT id, version FROM outreach_params WHERE channel = $1 AND sector = $2 AND is_active = true LIMIT 1`,
      [CHANNEL, SECTOR]
    ).catch(() => ({ rows: [] }));

    const prev = currentRows[0];
    const nextVersion = (prev?.version || 0) + 1;
    const parentId = parent_version_id || prev?.id || null;

    await pool.query(
      `UPDATE outreach_params SET is_active = false, deprecated_at = NOW() WHERE channel = $1 AND sector = $2 AND is_active = true`,
      [CHANNEL, SECTOR]
    ).catch(() => {});

    const { rows } = await pool.query(
      `INSERT INTO outreach_params
       (channel, sector, version, temperature, max_words, tone_keywords, cta_intensity, opening_style, playbook_id, parent_version_id, is_active, origin, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12)
       RETURNING *`,
      [CHANNEL, SECTOR, nextVersion, temperature, max_words, tone_keywords, cta_intensity, opening_style, playbook_id || null, parentId, origin, notes || null]
    );

    paramsCache.delete(cacheKey(CHANNEL, SECTOR));
    return rows[0];
  }

  /**
   * Reactivate a previous version (rollback). Deprecates the current active row.
   */
  async rollbackTo(versionId) {
    const { rows } = await pool.query(`SELECT * FROM outreach_params WHERE id = $1`, [versionId]);
    if (rows.length === 0) throw new Error('Version not found');
    const v = rows[0];

    await pool.query(
      `UPDATE outreach_params SET is_active = false, deprecated_at = NOW()
       WHERE channel = $1 AND sector = $2 AND is_active = true AND id != $3`,
      [v.channel, v.sector, versionId]
    ).catch(() => {});

    await pool.query(
      `UPDATE outreach_params SET is_active = true, deprecated_at = NULL WHERE id = $1`,
      [versionId]
    );

    paramsCache.delete(cacheKey(v.channel, v.sector));
    return v;
  }

  async setFrozen(versionId, frozen) {
    const { rows } = await pool.query(
      `UPDATE outreach_params SET frozen = $1 WHERE id = $2 RETURNING *`,
      [!!frozen, versionId]
    );
    if (rows[0]) paramsCache.delete(cacheKey(rows[0].channel, rows[0].sector));
    return rows[0];
  }

  /**
   * List all active params (one per bucket) for the frontend.
   */
  async listActive() {
    const { rows } = await pool.query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM outreach_messages om WHERE om.params_version_id = p.id AND om.outcome_score IS NOT NULL) AS scored_count,
        (SELECT AVG(om.outcome_score) FROM outreach_messages om WHERE om.params_version_id = p.id AND om.outcome_score IS NOT NULL) AS avg_score
      FROM outreach_params p
      WHERE p.is_active = true
      ORDER BY p.channel, p.sector
    `).catch(() => ({ rows: [] }));
    return rows.map(r => ({
      id: r.id,
      channel: r.channel,
      sector: r.sector,
      version: r.version,
      temperature: parseFloat(r.temperature),
      max_words: parseInt(r.max_words),
      tone_keywords: r.tone_keywords,
      cta_intensity: r.cta_intensity,
      opening_style: r.opening_style,
      playbook_id: r.playbook_id,
      parent_version_id: r.parent_version_id,
      origin: r.origin,
      frozen: !!r.frozen,
      notes: r.notes,
      scored_count: parseInt(r.scored_count) || 0,
      avg_score: r.avg_score != null ? +parseFloat(r.avg_score).toFixed(2) : null,
      created_at: r.created_at,
    }));
  }

  /**
   * Full history (timeline) for a (channel, sector).
   */
  async history(channel, sector) {
    const { rows } = await pool.query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM outreach_messages om WHERE om.params_version_id = p.id AND om.outcome_score IS NOT NULL) AS scored_count,
        (SELECT AVG(om.outcome_score) FROM outreach_messages om WHERE om.params_version_id = p.id AND om.outcome_score IS NOT NULL) AS avg_score
      FROM outreach_params p
      WHERE p.channel = $1 AND p.sector = $2
      ORDER BY p.version DESC
      LIMIT 50
    `, [channel.toUpperCase(), (sector || 'default').toLowerCase()]).catch(() => ({ rows: [] }));
    return rows.map(r => ({
      id: r.id,
      version: r.version,
      temperature: parseFloat(r.temperature),
      max_words: parseInt(r.max_words),
      tone_keywords: r.tone_keywords,
      cta_intensity: r.cta_intensity,
      opening_style: r.opening_style,
      origin: r.origin,
      notes: r.notes,
      is_active: !!r.is_active,
      frozen: !!r.frozen,
      scored_count: parseInt(r.scored_count) || 0,
      avg_score: r.avg_score != null ? +parseFloat(r.avg_score).toFixed(2) : null,
      created_at: r.created_at,
      deprecated_at: r.deprecated_at,
    }));
  }

  /** Domain pools so the tuner stays inside valid mutations. */
  get DOMAINS() {
    return {
      tone: TONE_POOL,
      cta: CTA_POOL,
      opening: OPENING_POOL,
    };
  }
}

export const outreachParams = new OutreachParamsService();
export default outreachParams;
