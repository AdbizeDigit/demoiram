import { EventEmitter } from 'events';
import { pool } from '../../config/database.js';
import { DuckDuckGoScraper } from './duckduckgo-scraper.js';
import parser from './parser-service.js';
import { pageScraper } from './page-scraper.js';
import { enrichmentService } from './enrichment-service.js';

// Sectores de busqueda por defecto (50+ sectores orientados a Argentina)
const DEFAULT_SEARCH_TERMS = [
  'empresas',
  'fabricas',
  'industria',
  'manufactura',
  'comercio',
  'servicios',
  'tecnologia',
  'construccion',
  'alimentos',
  'textil',
  'inmobiliaria',
  'automotriz',
  'metalurgica',
  'quimica',
  'farmaceutica',
  'logistica',
  'transporte',
  'consultora',
  'estudio contable',
  'estudio juridico',
  'agencia publicidad',
  'agencia marketing',
  'clinica',
  'laboratorio',
  'imprenta',
  'grafica',
  'packaging',
  'software',
  'fintech',
  'agtech',
  'edtech',
  'seguros',
  'corredora',
  'distribuidora',
  'mayorista',
  'importadora',
  'exportadora',
  'frigorifico',
  'bodega',
  'hotel',
  'restaurante',
  'catering',
  'limpieza industrial',
  'seguridad privada',
  'recursos humanos',
  'coworking',
  'call center',
  'datacenter',
  'ecommerce',
  'retail',
  'metalmecanica',
  'plasticos',
  'consultoria',
];

/**
 * Initialize scraping-related tables if they don't exist.
 */
async function initScrapingTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS scraping_zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        city VARCHAR(255),
        state VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING',
        total_leads INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS scraping_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        zone_id UUID REFERENCES scraping_zones(id) ON DELETE CASCADE,
        user_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'QUEUED',
        search_terms JSONB DEFAULT '[]',
        current_search VARCHAR(255),
        total_searches INTEGER DEFAULT 0,
        completed_searches INTEGER DEFAULT 0,
        leads_found INTEGER DEFAULT 0,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(500),
        phone VARCHAR(100),
        email VARCHAR(255),
        website VARCHAR(500),
        address TEXT,
        city VARCHAR(255),
        state VARCHAR(255),
        zone_id UUID REFERENCES scraping_zones(id) ON DELETE SET NULL,
        sector VARCHAR(255),
        score INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'NEW',
        social_facebook VARCHAR(500),
        social_instagram VARCHAR(500),
        social_linkedin VARCHAR(500),
        social_twitter VARCHAR(500),
        social_whatsapp VARCHAR(100),
        enrichment_status VARCHAR(50) DEFAULT 'PENDING',
        enrichment_attempts INTEGER DEFAULT 0,
        source_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[ScraperService] Scraping tables initialized');
  } catch (err) {
    console.error('[ScraperService] Error initializing tables:', err);
  } finally {
    client.release();
  }
}

class ScraperService extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, {jobId: string, zoneId: string, abortController: AbortController, isPaused: boolean}>} */
    this.activeJobs = new Map();
    this.ddgScraper = new DuckDuckGoScraper();
    this.config = {
      delayBetweenRequests: 2000,
      maxConcurrentJobs: 1,
    };

    // Auto-scraping state
    this.autoScrapingActive = false;
    this.autoScrapingAbortController = null;
    this.autoScrapingUserId = null;
    this.autoScrapingStats = {
      totalZones: 0,
      completedZones: 0,
      currentZone: '',
      totalLeadsFound: 0,
      startedAt: null,
      cycle: 1,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** @param {number} ms */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate lead score (0-100)
   * base 20 + phone 20 + email 25 + website 15 + address 10 + social 10
   */
  _calculateLeadScore(lead) {
    let score = 20; // base
    if (lead.phone) score += 20;
    if (lead.email) score += 25;
    if (lead.website) score += 15;
    if (lead.address) score += 10;
    if (lead.facebook || lead.instagram || lead.linkedin || lead.twitter) score += 10;
    return Math.min(score, 100);
  }

  // ---------------------------------------------------------------------------
  // startZoneScraping
  // ---------------------------------------------------------------------------

  /**
   * Start scraping a zone.
   * @param {string} zoneId
   * @param {string} userId
   * @param {string[]} [searchTerms]
   * @param {string} [sector]
   * @returns {Promise<string>} jobId
   */
  async startZoneScraping(zoneId, userId, searchTerms, sector) {
    // Verify concurrent job limit
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
      throw new Error('Maximo de trabajos concurrentes alcanzado');
    }

    // Fetch zone
    const zoneRes = await pool.query(
      'SELECT id, name, city, state, status, total_leads FROM scraping_zones WHERE id = $1',
      [zoneId]
    );
    const zone = zoneRes.rows[0];
    if (!zone) {
      throw new Error('Zona no encontrada');
    }

    // Determine search terms
    const terms = searchTerms || (sector ? [sector] : DEFAULT_SEARCH_TERMS.slice(0, 15));

    // Create ScrapingJob in DB
    const jobRes = await pool.query(
      `INSERT INTO scraping_jobs (zone_id, user_id, status, search_terms, total_searches, completed_searches, leads_found, started_at)
       VALUES ($1, $2, 'RUNNING', $3, $4, 0, 0, NOW())
       RETURNING id`,
      [zoneId, userId, JSON.stringify(terms), terms.length]
    );
    const jobId = jobRes.rows[0].id;

    // Update zone status
    await pool.query(
      "UPDATE scraping_zones SET status = 'IN_PROGRESS' WHERE id = $1",
      [zoneId]
    );

    // Emit event
    this.emit('scraping:started', { zoneId, jobId, zoneName: zone.name });

    // Create abort controller & track
    const abortController = new AbortController();
    this.activeJobs.set(jobId, {
      jobId,
      zoneId,
      abortController,
      isPaused: false,
    });

    // Run scraping in background
    this._runScraping(jobId, zone, terms).catch((error) => {
      console.error(`[ScraperService] Scraping job ${jobId} failed:`, error);
    });

    return jobId;
  }

  // ---------------------------------------------------------------------------
  // runScraping (core loop)
  // ---------------------------------------------------------------------------

  /**
   * @param {string} jobId
   * @param {{id: string, name: string, city: string, state: string}} zone
   * @param {string[]} searchTerms
   */
  async _runScraping(jobId, zone, searchTerms) {
    const activeJob = this.activeJobs.get(jobId);
    if (!activeJob) return;

    let completedSearches = 0;
    let totalLeadsFound = 0;
    /** @type {Set<string>} */
    const seenCompanies = new Set();

    try {
      for (const term of searchTerms) {
        // Check cancellation
        if (activeJob.abortController.signal.aborted) break;

        // Wait while paused
        while (activeJob.isPaused) {
          await this._delay(1000);
          if (activeJob.abortController.signal.aborted) break;
        }
        if (activeJob.abortController.signal.aborted) break;

        // Update current search in DB
        await pool.query(
          'UPDATE scraping_jobs SET current_search = $1 WHERE id = $2',
          [term, jobId]
        );

        // Emit progress
        const progress = Math.round((completedSearches / searchTerms.length) * 100);
        this.emit('scraping:progress', {
          zoneId: zone.id,
          jobId,
          progress,
          totalLeadsFound,
          completedSearches,
          totalSearches: searchTerms.length,
          currentTerm: term,
        });

        // Search DDG via searchBusinessesInZone with 3 query patterns
        const results = await this.ddgScraper.searchBusinessesInZone(
          term,
          zone.name,
          zone.city,
          zone.state,
          25
        );

        // Process each result
        for (const result of results) {
          if (activeJob.abortController.signal.aborted) break;

          // Filter with parser.isRelevantResult()
          if (!parser.isRelevantResult(result.title, result.url)) {
            continue;
          }

          // Parse with parser.parseSearchResult()
          const parsedLead = parser.parseSearchResult(
            result.title,
            result.snippet,
            result.url,
            term,
            zone.city,
            zone.name
          );
          if (!parsedLead) continue;

          // In-memory deduplication by normalized company name
          const companyKey = parsedLead.company.toLowerCase().replace(/\s+/g, '');
          if (seenCompanies.has(companyKey)) continue;
          seenCompanies.add(companyKey);

          // Visit real page with pageScraper.scrapeWithRetry()
          let pageData = {};
          try {
            if (result.url && !result.url.includes('duckduckgo.com')) {
              pageData = await pageScraper.scrapeWithRetry(result.url, parsedLead.company);
            }
          } catch (err) {
            console.log(`[ScraperService] PageScraper error for ${parsedLead.company}:`, err);
          }

          // Merge data (page data has priority)
          const finalEmail = pageData.email || parsedLead.email || null;
          const finalPhone = pageData.phone || parsedLead.phone || null;
          const finalWebsite = pageData.website || parsedLead.website || null;
          const finalContact = pageData.contactName || parsedLead.contact || null;

          // Calculate lead score
          const score = this._calculateLeadScore({
            phone: finalPhone,
            email: finalEmail,
            website: finalWebsite,
            address: parsedLead.address,
            facebook: pageData.facebook,
            instagram: pageData.instagram,
            linkedin: pageData.linkedin,
            twitter: pageData.twitter,
          });

          const needsEnrichment = !finalPhone || !finalEmail || !finalWebsite;
          const enrichmentStatus = needsEnrichment ? 'PENDING' : 'NOT_NEEDED';

          // Save as Lead in DB
          try {
            const leadRes = await pool.query(
              `INSERT INTO leads
                (name, phone, email, website, address, city, state, zone_id, sector, score, status,
                 social_facebook, social_instagram, social_linkedin, social_twitter, social_whatsapp,
                 enrichment_status, source_url, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'NEW',
                       $11,$12,$13,$14,$15,
                       $16,$17,NOW(),NOW())
               RETURNING id, name, phone, email, website, sector, address`,
              [
                parsedLead.company,
                finalPhone,
                finalEmail,
                finalWebsite,
                parsedLead.address || null,
                zone.city || null,
                zone.state || null,
                zone.id,
                parsedLead.sector || term,
                score,
                pageData.facebook || null,
                pageData.instagram || null,
                pageData.linkedin || null,
                pageData.twitter || null,
                pageData.whatsapp || null,
                enrichmentStatus,
                result.url || null,
              ]
            );

            const savedLead = leadRes.rows[0];
            totalLeadsFound++;

            // Emit new lead found
            this.emit('lead:found', {
              zoneId: zone.id,
              lead: {
                id: savedLead.id,
                company: savedLead.name,
                contact: finalContact,
                email: savedLead.email || undefined,
                phone: savedLead.phone || undefined,
                website: savedLead.website || undefined,
                sector: savedLead.sector,
                address: savedLead.address || undefined,
              },
            });

            // Queue for enrichment if data incomplete
            if (needsEnrichment && enrichmentService && typeof enrichmentService.queueLeadForEnrichment === 'function') {
              enrichmentService.queueLeadForEnrichment(savedLead.id).catch((err) => {
                console.log(`[ScraperService] Error queuing enrichment for ${parsedLead.company}:`, err);
              });
            }
          } catch (error) {
            // Could be a duplicate constraint or other DB error
            console.log(`[ScraperService] Lead duplicate or error: ${parsedLead.company}`, error.message);
          }

          // Delay 1s between page visits
          await this._delay(1000);
        }

        completedSearches++;

        // Update progress in DB
        await pool.query(
          'UPDATE scraping_jobs SET completed_searches = $1, leads_found = $2 WHERE id = $3',
          [completedSearches, totalLeadsFound, jobId]
        );

        // Delay 3s between DDG searches
        await this._delay(this.config.delayBetweenRequests);
      }

      // Scraping completed successfully
      if (!activeJob.abortController.signal.aborted) {
        await this._completeJob(jobId, zone.id, totalLeadsFound, 'COMPLETED');
        this.emit('scraping:completed', { zoneId: zone.id, jobId, totalLeadsFound });
      }
    } catch (error) {
      console.error(`[ScraperService] Scraping error for job ${jobId}:`, error);
      await this._completeJob(
        jobId,
        zone.id,
        totalLeadsFound,
        'FAILED',
        error instanceof Error ? error.message : 'Error desconocido'
      );
      this.emit('scraping:failed', {
        zoneId: zone.id,
        jobId,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  // ---------------------------------------------------------------------------
  // completeJob
  // ---------------------------------------------------------------------------

  /**
   * @param {string} jobId
   * @param {string} zoneId
   * @param {number} leadsFound
   * @param {'COMPLETED'|'FAILED'|'CANCELLED'} status
   * @param {string} [errorMessage]
   */
  async _completeJob(jobId, zoneId, leadsFound, status, errorMessage) {
    await pool.query(
      `UPDATE scraping_jobs
       SET status = $1, completed_at = NOW(), error_message = $2, current_search = NULL
       WHERE id = $3`,
      [status, errorMessage || null, jobId]
    );

    const zoneStatus = status === 'COMPLETED' ? 'COMPLETED' : status === 'FAILED' ? 'FAILED' : 'PENDING';

    if (status === 'COMPLETED') {
      await pool.query(
        `UPDATE scraping_zones
         SET status = $1, total_leads = total_leads + $2
         WHERE id = $3`,
        [zoneStatus, leadsFound, zoneId]
      );
    } else {
      await pool.query(
        `UPDATE scraping_zones SET status = $1, total_leads = total_leads + $2 WHERE id = $3`,
        [zoneStatus, leadsFound, zoneId]
      );
    }

    this.emit('zone:statusChanged', { zoneId, status: zoneStatus });
  }

  // ---------------------------------------------------------------------------
  // pauseJob / resumeJob / cancelJob
  // ---------------------------------------------------------------------------

  async pauseJob(jobId) {
    const activeJob = this.activeJobs.get(jobId);
    if (!activeJob) throw new Error('Job no encontrado o no activo');
    activeJob.isPaused = true;
    await pool.query("UPDATE scraping_jobs SET status = 'PAUSED' WHERE id = $1", [jobId]);
  }

  async resumeJob(jobId) {
    const activeJob = this.activeJobs.get(jobId);
    if (!activeJob) throw new Error('Job no encontrado o no activo');
    activeJob.isPaused = false;
    await pool.query("UPDATE scraping_jobs SET status = 'RUNNING' WHERE id = $1", [jobId]);
  }

  async cancelJob(jobId) {
    const activeJob = this.activeJobs.get(jobId);
    if (!activeJob) throw new Error('Job no encontrado o no activo');
    activeJob.abortController.abort();

    const jobRes = await pool.query(
      'SELECT zone_id, leads_found FROM scraping_jobs WHERE id = $1',
      [jobId]
    );
    const job = jobRes.rows[0];
    if (job) {
      await this._completeJob(jobId, job.zone_id, job.leads_found, 'CANCELLED');
    }
  }

  // ---------------------------------------------------------------------------
  // rescanZone
  // ---------------------------------------------------------------------------

  async rescanZone(zoneId, userId) {
    await pool.query("UPDATE scraping_zones SET status = 'PENDING' WHERE id = $1", [zoneId]);
    return this.startZoneScraping(zoneId, userId);
  }

  // ---------------------------------------------------------------------------
  // getActiveJobs / hasActiveJob
  // ---------------------------------------------------------------------------

  getActiveJobs() {
    return Array.from(this.activeJobs.values()).map((job) => ({
      jobId: job.jobId,
      zoneId: job.zoneId,
      isPaused: job.isPaused,
    }));
  }

  hasActiveJob(zoneId) {
    return Array.from(this.activeJobs.values()).some((job) => job.zoneId === zoneId);
  }

  // ===========================================================================
  // AUTO-SCRAPING
  // ===========================================================================

  /**
   * Start auto-scraping: process all pending/failed zones one by one.
   * @param {string} userId
   * @param {string} [cityId]
   * @returns {Promise<{totalZones: number}>}
   */
  async startAutoScraping(userId, cityId) {
    if (this.autoScrapingActive) {
      throw new Error('El scraping automatico ya esta en ejecucion');
    }

    // Find pending/failed zones
    let query = `SELECT id, name, city, state, status FROM scraping_zones
                 WHERE status IN ('PENDING', 'FAILED')`;
    const params = [];
    if (cityId) {
      query += ' AND city = (SELECT city FROM scraping_zones WHERE id = $1 LIMIT 1)';
      params.push(cityId);
    }
    query += ' ORDER BY name ASC';

    let zonesRes = await pool.query(query, params);
    let pendingZones = zonesRes.rows;

    // If none pending, re-scrape all zones (except IN_PROGRESS)
    if (pendingZones.length === 0) {
      let fallbackQuery = "SELECT id, name, city, state, status FROM scraping_zones WHERE status != 'IN_PROGRESS'";
      const fbParams = [];
      if (cityId) {
        fallbackQuery += ' AND city = (SELECT city FROM scraping_zones WHERE id = $1 LIMIT 1)';
        fbParams.push(cityId);
      }
      fallbackQuery += ' ORDER BY name ASC';
      zonesRes = await pool.query(fallbackQuery, fbParams);
      pendingZones = zonesRes.rows;
    }

    if (pendingZones.length === 0) {
      throw new Error('No hay zonas configuradas. Agrega ciudades y zonas primero.');
    }

    // Reset all selected zones to PENDING
    const zoneIds = pendingZones.map((z) => z.id);
    await pool.query(
      `UPDATE scraping_zones SET status = 'PENDING' WHERE id = ANY($1::uuid[])`,
      [zoneIds]
    );

    this.autoScrapingActive = true;
    this.autoScrapingAbortController = new AbortController();
    this.autoScrapingUserId = userId;
    this.autoScrapingStats = {
      totalZones: pendingZones.length,
      completedZones: 0,
      currentZone: '',
      totalLeadsFound: 0,
      startedAt: new Date(),
      cycle: 1,
    };

    this.emit('auto-scraping:status', { status: 'started', ...this.autoScrapingStats });

    // Run in background
    this._runAutoScraping(pendingZones, userId).catch((error) => {
      console.error('[ScraperService] Auto-scraping error:', error);
    });

    return { totalZones: pendingZones.length };
  }

  /**
   * Core auto-scraping loop.
   * @param {Array<{id: string, name: string, city: string, state: string}>} zones
   * @param {string} userId
   */
  async _runAutoScraping(zones, userId) {
    try {
      for (const zone of zones) {
        if (this.autoScrapingAbortController?.signal.aborted) break;

        // Update current zone
        this.autoScrapingStats.currentZone = `${zone.name}, ${zone.city}`;
        this.emit('auto-scraping:status', { status: 'progress', ...this.autoScrapingStats });

        try {
          // Check zone is still PENDING
          const zoneRes = await pool.query(
            'SELECT status FROM scraping_zones WHERE id = $1',
            [zone.id]
          );
          const currentZone = zoneRes.rows[0];
          if (currentZone?.status !== 'PENDING') {
            console.log(`[ScraperService] Zone ${zone.name} no longer PENDING, skipping...`);
            this.autoScrapingStats.completedZones++;
            continue;
          }

          console.log(`[ScraperService] Auto-scraping: Starting ${zone.name}, ${zone.city}`);

          const jobId = await this.startZoneScraping(zone.id, userId);

          // Wait for job completion (max 10 min per zone)
          await this._waitForJobCompletion(jobId);

          // Get leads found
          const jobRes = await pool.query(
            'SELECT leads_found FROM scraping_jobs WHERE id = $1',
            [jobId]
          );
          const job = jobRes.rows[0];
          if (job) {
            this.autoScrapingStats.totalLeadsFound += job.leads_found;
          }

          this.autoScrapingStats.completedZones++;
          this.emit('auto-scraping:status', { status: 'progress', ...this.autoScrapingStats });

          // Small delay between zones
          await this._delay(2000);
        } catch (error) {
          console.error(`[ScraperService] Error scraping zone ${zone.name}:`, error);
          this.autoScrapingStats.completedZones++;
          // Continue with next zone
        }
      }

      // Cycle completed -- wait 30s then restart
      if (!this.autoScrapingAbortController?.signal.aborted) {
        this.emit('auto-scraping:status', { status: 'completed', ...this.autoScrapingStats });
        console.log(`[ScraperService] Auto-scraping cycle ${this.autoScrapingStats.cycle} completed. Restarting in 30s...`);
        await this._delay(30000);

        if (this.autoScrapingAbortController?.signal.aborted) return;

        // Find next batch
        let nextRes = await pool.query(
          "SELECT id, name, city, state, status FROM scraping_zones WHERE status IN ('PENDING','FAILED') ORDER BY name ASC"
        );
        let nextZones = nextRes.rows;

        if (nextZones.length === 0) {
          // Reset all to PENDING for next full cycle
          await pool.query(
            "UPDATE scraping_zones SET status = 'PENDING' WHERE status != 'IN_PROGRESS'"
          );
          nextRes = await pool.query(
            "SELECT id, name, city, state, status FROM scraping_zones WHERE status = 'PENDING' ORDER BY name ASC"
          );
          nextZones = nextRes.rows;
        }

        if (nextZones.length > 0 && !this.autoScrapingAbortController?.signal.aborted) {
          this.autoScrapingStats.cycle++;
          this.autoScrapingStats.totalZones = nextZones.length;
          this.autoScrapingStats.completedZones = 0;
          this.autoScrapingStats.currentZone = '';
          console.log(`[ScraperService] Auto-scraping cycle ${this.autoScrapingStats.cycle}: ${nextZones.length} zones`);
          this.emit('auto-scraping:status', { status: 'started', ...this.autoScrapingStats });
          return this._runAutoScraping(nextZones, userId);
        }
      }
    } catch (error) {
      console.error('[ScraperService] Auto-scraping failed:', error);
      this.emit('auto-scraping:status', { status: 'failed', ...this.autoScrapingStats });

      // Auto-restart after failure (wait 60s)
      if (!this.autoScrapingAbortController?.signal.aborted && this.autoScrapingUserId) {
        console.log('[ScraperService] Auto-scraping will restart after failure in 60s...');
        await this._delay(60000);
        if (!this.autoScrapingAbortController?.signal.aborted) {
          this.autoScrapingActive = false;
          try {
            await this.startAutoScraping(this.autoScrapingUserId);
          } catch {
            // give up
          }
          return;
        }
      }
    } finally {
      if (this.autoScrapingAbortController?.signal.aborted || !this.autoScrapingActive) {
        this.autoScrapingActive = false;
        this.autoScrapingAbortController = null;
      }
    }
  }

  /**
   * Wait for a job to complete with 10 minute timeout.
   * @param {string} jobId
   */
  async _waitForJobCompletion(jobId) {
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes
    const startTime = Date.now();

    while (true) {
      if (this.autoScrapingAbortController?.signal.aborted) {
        try { await this.cancelJob(jobId); } catch { /* job may have finished */ }
        break;
      }

      const isActive = this.activeJobs.has(jobId);
      if (!isActive) break;

      if (Date.now() - startTime > maxWaitTime) {
        console.log(`[ScraperService] Job ${jobId} timeout, cancelling...`);
        try { await this.cancelJob(jobId); } catch { /* job may have finished */ }
        break;
      }

      await this._delay(1000);
    }
  }

  // ---------------------------------------------------------------------------
  // stopAutoScraping / getAutoStatus
  // ---------------------------------------------------------------------------

  /**
   * Stop auto-scraping mode.
   */
  async stopAutoScraping() {
    if (!this.autoScrapingActive) {
      throw new Error('El scraping automatico no esta en ejecucion');
    }
    this.autoScrapingAbortController?.abort();
    this.emit('auto-scraping:status', { status: 'stopped', ...this.autoScrapingStats });
  }

  /**
   * Return auto-scraping progress info.
   */
  getAutoStatus() {
    return {
      isActive: this.autoScrapingActive,
      ...this.autoScrapingStats,
    };
  }

  /**
   * Alias kept for compatibility.
   */
  getAutoScrapingStatus() {
    return this.getAutoStatus();
  }

  isAutoScrapingActive() {
    return this.autoScrapingActive;
  }

  // ── CRUD methods for routes ──

  async createZone(data) {
    const { name, city, state } = data
    const result = await pool.query(
      `INSERT INTO scraping_zones (name, city, state) VALUES ($1, $2, $3) RETURNING *`,
      [name, city || '', state || '']
    )
    return result.rows[0]
  }

  async getZones({ city } = {}) {
    let query = 'SELECT * FROM scraping_zones ORDER BY created_at DESC'
    const params = []
    if (city) {
      query = 'SELECT * FROM scraping_zones WHERE city ILIKE $1 ORDER BY created_at DESC'
      params.push(`%${city}%`)
    }
    const result = await pool.query(query, params)
    return result.rows
  }

  async getZoneById(id) {
    const result = await pool.query('SELECT * FROM scraping_zones WHERE id = $1', [id])
    return result.rows[0] || null
  }

  async scanZone(zoneId, body = {}) {
    const { searchTerms, sector } = body
    return this.startZoneScraping(zoneId, null, searchTerms, sector)
  }

  async getJobs(query = {}) {
    const { limit = 50 } = query
    const result = await pool.query(
      'SELECT * FROM scraping_jobs ORDER BY started_at DESC NULLS LAST, created_at DESC LIMIT $1',
      [parseInt(limit)]
    )
    return result.rows
  }

  async getLeadStats() {
    const [totalRes, emailRes, phoneRes, webRes, byCityRes, bySectorRes] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM leads'),
      pool.query("SELECT COUNT(*) as count FROM leads WHERE email IS NOT NULL AND email != ''"),
      pool.query("SELECT COUNT(*) as count FROM leads WHERE phone IS NOT NULL AND phone != ''"),
      pool.query("SELECT COUNT(*) as count FROM leads WHERE website IS NOT NULL AND website != ''"),
      pool.query('SELECT city, COUNT(*) as count FROM leads GROUP BY city ORDER BY count DESC LIMIT 10'),
      pool.query('SELECT sector, COUNT(*) as count FROM leads GROUP BY sector ORDER BY count DESC LIMIT 10'),
    ])
    return {
      total: parseInt(totalRes.rows[0].total),
      withEmail: parseInt(emailRes.rows[0].count),
      withPhone: parseInt(phoneRes.rows[0].count),
      withWebsite: parseInt(webRes.rows[0].count),
      byCity: byCityRes.rows,
      bySector: bySectorRes.rows,
    }
  }

  async getLeads(filters = {}) {
    const { city, state, sector, status, search, minScore, page = 1, limit = 20 } = filters
    const conditions = []
    const params = []
    let idx = 1

    if (city) { conditions.push(`city ILIKE $${idx++}`); params.push(`%${city}%`) }
    if (state) { conditions.push(`state ILIKE $${idx++}`); params.push(`%${state}%`) }
    if (sector) { conditions.push(`sector = $${idx++}`); params.push(sector) }
    if (status) { conditions.push(`status = $${idx++}`); params.push(status) }
    if (search) { conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx})`); params.push(`%${search}%`); idx++ }
    if (minScore) { conditions.push(`score >= $${idx++}`); params.push(parseInt(minScore)) }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const offset = (parseInt(page) - 1) * parseInt(limit)

    const countRes = await pool.query(`SELECT COUNT(*) FROM leads ${where}`, params)
    const total = parseInt(countRes.rows[0].count)

    params.push(parseInt(limit))
    params.push(offset)
    const result = await pool.query(
      `SELECT * FROM leads ${where} ORDER BY score DESC, created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      params
    )

    return { leads: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) }
  }

  async getLeadById(id) {
    const result = await pool.query('SELECT * FROM leads WHERE id = $1', [id])
    return result.rows[0] || null
  }

  async updateLead(id, data) {
    const updates = []
    const params = []
    let idx = 1
    for (const [key, val] of Object.entries(data)) {
      if (['name', 'phone', 'email', 'website', 'address', 'status', 'sector', 'score'].includes(key)) {
        updates.push(`${key} = $${idx++}`)
        params.push(val)
      }
    }
    if (updates.length === 0) return null
    updates.push(`updated_at = NOW()`)
    params.push(id)
    const result = await pool.query(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    )
    return result.rows[0] || null
  }
}

// Singleton
const scraperService = new ScraperService();

export { scraperService, initScrapingTables, DEFAULT_SEARCH_TERMS };
export default scraperService;
