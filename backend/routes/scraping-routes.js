import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import scraperService from '../services/scraping/scraper-service.js';
import competitorScraper from '../services/scraping/competitor-scraper.js';
import { enrichmentService } from '../services/scraping/enrichment-service.js';

const router = Router();

// All scraping routes require authentication + admin privileges
router.use(protect, adminOnly);

// ─── Zones ───────────────────────────────────────────────────────────────────

// POST /scraping/zones - Create a new zone
router.post('/zones', async (req, res) => {
  try {
    const zone = await scraperService.createZone(req.body);
    res.status(201).json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /scraping/zones - List zones (with optional city filter)
router.get('/zones', async (req, res) => {
  try {
    const { city } = req.query;
    const zones = await scraperService.getZones({ city });
    res.json({ success: true, data: zones });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /scraping/zones/:id - Zone detail
router.get('/zones/:id', async (req, res) => {
  try {
    const zone = await scraperService.getZoneById(req.params.id);
    if (!zone) return res.status(404).json({ success: false, error: 'Zone not found' });
    res.json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /scraping/zones/:id/scan - Start scraping a zone
router.post('/zones/:id/scan', async (req, res) => {
  try {
    const job = await scraperService.scanZone(req.params.id, req.body);
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Auto-scraping ───────────────────────────────────────────────────────────

// POST /scraping/auto/start - Start auto-scraping
router.post('/auto/start', async (req, res) => {
  try {
    const result = await scraperService.startAutoScraping(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /scraping/auto/stop - Stop auto-scraping
router.post('/auto/stop', async (req, res) => {
  try {
    const result = await scraperService.stopAutoScraping();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /scraping/auto/status - Get auto-scraping status
router.get('/auto/status', async (req, res) => {
  try {
    const status = await scraperService.getAutoScrapingStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Jobs ────────────────────────────────────────────────────────────────────

// GET /scraping/jobs - List scraping jobs
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await scraperService.getJobs(req.query);
    res.json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Leads ───────────────────────────────────────────────────────────────────

// GET /scraping/leads/stats - Lead stats (must be before /leads/:id)
router.get('/leads/stats', async (req, res) => {
  try {
    const stats = await scraperService.getLeadStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /scraping/leads - List leads with filters
router.get('/leads', async (req, res) => {
  try {
    const { city, state, sector, status, search, minScore, page = 1, limit = 50 } = req.query;
    const filters = {
      city: city || undefined,
      state: state || undefined,
      sector: sector || undefined,
      status: status || undefined,
      search: search || undefined,
      minScore: minScore ? Number(minScore) : undefined,
      page: Number(page),
      limit: Math.min(Number(limit), 200),
    };
    const result = await scraperService.getLeads(filters);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /scraping/leads/:id - Lead detail
router.get('/leads/:id', async (req, res) => {
  try {
    const lead = await scraperService.getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /scraping/leads/:id - Update lead
router.patch('/leads/:id', async (req, res) => {
  try {
    const lead = await scraperService.updateLead(req.params.id, req.body);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /scraping/leads/:id/enrich - Enrich a specific lead
router.post('/leads/:id/enrich', async (req, res) => {
  try {
    const lead = await enrichmentService.enrichLead(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Competitors ─────────────────────────────────────────────────────────────

// POST /scraping/competitors/scan - Start competitor scan
router.post('/competitors/scan', async (req, res) => {
  try {
    const { states } = req.body;
    // Run scan in background, respond immediately
    const scanPromise = competitorScraper.scanCompetitors(states || null, (msg) => {
      console.log(`[CompetitorScan] ${msg}`);
    });

    // If the client wants to wait, they can; otherwise return immediately
    if (req.query.wait === 'true') {
      const results = await scanPromise;
      res.json({ success: true, data: { total: results.length, competitors: results } });
    } else {
      scanPromise.catch(err => console.error('[CompetitorScan] Error:', err.message));
      res.json({ success: true, data: { message: 'Competitor scan started', states: states || 'all' } });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /scraping/competitors/stats - Competitor stats by state (must be before /competitors/:id pattern)
router.get('/competitors/stats', async (req, res) => {
  try {
    const stats = await competitorScraper.getCompetitorStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /scraping/competitors - List competitors
router.get('/competitors', async (req, res) => {
  try {
    const competitors = await competitorScraper.getCompetitors();
    res.json({ success: true, data: competitors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
