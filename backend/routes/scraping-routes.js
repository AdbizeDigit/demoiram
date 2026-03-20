import { Router } from 'express';
import { pool } from '../config/database.js';
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

// GET /scraping/zones - List zones (with optional city/country filter)
router.get('/zones', async (req, res) => {
  try {
    const { city, country } = req.query;
    const zones = await scraperService.getZones({ city, country });
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

// POST /scraping/zones/seed - Seed zones for a country
router.post('/zones/seed', async (req, res) => {
  try {
    const { country } = req.body;
    if (!country) return res.status(400).json({ success: false, error: 'Country requerido' });

    const COUNTRY_ZONES = {
      'Argentina': [
        { name: 'Microcentro', city: 'Buenos Aires', state: 'CABA' },
        { name: 'Palermo', city: 'Buenos Aires', state: 'CABA' },
        { name: 'Belgrano', city: 'Buenos Aires', state: 'CABA' },
        { name: 'Recoleta', city: 'Buenos Aires', state: 'CABA' },
        { name: 'Puerto Madero', city: 'Buenos Aires', state: 'CABA' },
        { name: 'Retiro', city: 'Buenos Aires', state: 'CABA' },
        { name: 'Caballito', city: 'Buenos Aires', state: 'CABA' },
        { name: 'Vicente Lopez', city: 'GBA Norte', state: 'Buenos Aires' },
        { name: 'San Isidro', city: 'GBA Norte', state: 'Buenos Aires' },
        { name: 'Tigre', city: 'GBA Norte', state: 'Buenos Aires' },
        { name: 'La Plata', city: 'La Plata', state: 'Buenos Aires' },
        { name: 'Centro', city: 'Cordoba', state: 'Cordoba' },
        { name: 'Centro', city: 'Rosario', state: 'Santa Fe' },
        { name: 'Centro', city: 'Mendoza', state: 'Mendoza' },
        { name: 'Centro', city: 'Tucuman', state: 'Tucuman' },
        { name: 'Centro', city: 'Mar del Plata', state: 'Buenos Aires' },
        { name: 'Centro', city: 'Salta', state: 'Salta' },
        { name: 'Centro', city: 'Neuquen', state: 'Neuquen' },
        { name: 'Centro', city: 'Santa Fe', state: 'Santa Fe' },
        { name: 'Centro', city: 'Bahia Blanca', state: 'Buenos Aires' },
      ],
      'Mexico': [
        { name: 'Centro', city: 'Ciudad de Mexico', state: 'CDMX' },
        { name: 'Polanco', city: 'Ciudad de Mexico', state: 'CDMX' },
        { name: 'Santa Fe', city: 'Ciudad de Mexico', state: 'CDMX' },
        { name: 'Centro', city: 'Monterrey', state: 'Nuevo Leon' },
        { name: 'San Pedro', city: 'Monterrey', state: 'Nuevo Leon' },
        { name: 'Centro', city: 'Guadalajara', state: 'Jalisco' },
        { name: 'Centro', city: 'Puebla', state: 'Puebla' },
        { name: 'Centro', city: 'Queretaro', state: 'Queretaro' },
        { name: 'Centro', city: 'Merida', state: 'Yucatan' },
        { name: 'Centro', city: 'Cancun', state: 'Quintana Roo' },
        { name: 'Centro', city: 'Tijuana', state: 'Baja California' },
        { name: 'Centro', city: 'Leon', state: 'Guanajuato' },
        { name: 'Centro', city: 'Aguascalientes', state: 'Aguascalientes' },
        { name: 'Centro', city: 'San Luis Potosi', state: 'San Luis Potosi' },
        { name: 'Centro', city: 'Chihuahua', state: 'Chihuahua' },
      ],
      'Colombia': [
        { name: 'Centro', city: 'Bogota', state: 'Cundinamarca' },
        { name: 'Chapinero', city: 'Bogota', state: 'Cundinamarca' },
        { name: 'Centro', city: 'Medellin', state: 'Antioquia' },
        { name: 'El Poblado', city: 'Medellin', state: 'Antioquia' },
        { name: 'Centro', city: 'Cali', state: 'Valle del Cauca' },
        { name: 'Centro', city: 'Barranquilla', state: 'Atlantico' },
        { name: 'Centro', city: 'Cartagena', state: 'Bolivar' },
        { name: 'Centro', city: 'Bucaramanga', state: 'Santander' },
        { name: 'Centro', city: 'Pereira', state: 'Risaralda' },
        { name: 'Centro', city: 'Santa Marta', state: 'Magdalena' },
      ],
      'Chile': [
        { name: 'Providencia', city: 'Santiago', state: 'Region Metropolitana' },
        { name: 'Las Condes', city: 'Santiago', state: 'Region Metropolitana' },
        { name: 'Centro', city: 'Santiago', state: 'Region Metropolitana' },
        { name: 'Centro', city: 'Valparaiso', state: 'Valparaiso' },
        { name: 'Centro', city: 'Concepcion', state: 'Biobio' },
        { name: 'Centro', city: 'Antofagasta', state: 'Antofagasta' },
        { name: 'Centro', city: 'Temuco', state: 'Araucania' },
        { name: 'Centro', city: 'La Serena', state: 'Coquimbo' },
      ],
      'Peru': [
        { name: 'Miraflores', city: 'Lima', state: 'Lima' },
        { name: 'San Isidro', city: 'Lima', state: 'Lima' },
        { name: 'Centro', city: 'Lima', state: 'Lima' },
        { name: 'Centro', city: 'Arequipa', state: 'Arequipa' },
        { name: 'Centro', city: 'Trujillo', state: 'La Libertad' },
        { name: 'Centro', city: 'Cusco', state: 'Cusco' },
        { name: 'Centro', city: 'Piura', state: 'Piura' },
        { name: 'Centro', city: 'Chiclayo', state: 'Lambayeque' },
      ],
      'Uruguay': [
        { name: 'Centro', city: 'Montevideo', state: 'Montevideo' },
        { name: 'Pocitos', city: 'Montevideo', state: 'Montevideo' },
        { name: 'Punta Carretas', city: 'Montevideo', state: 'Montevideo' },
        { name: 'Centro', city: 'Punta del Este', state: 'Maldonado' },
        { name: 'Centro', city: 'Colonia', state: 'Colonia' },
      ],
      'Paraguay': [
        { name: 'Centro', city: 'Asuncion', state: 'Asuncion' },
        { name: 'Centro', city: 'Ciudad del Este', state: 'Alto Parana' },
        { name: 'Centro', city: 'Encarnacion', state: 'Itapua' },
      ],
      'Ecuador': [
        { name: 'Centro', city: 'Quito', state: 'Pichincha' },
        { name: 'Norte', city: 'Quito', state: 'Pichincha' },
        { name: 'Centro', city: 'Guayaquil', state: 'Guayas' },
        { name: 'Centro', city: 'Cuenca', state: 'Azuay' },
        { name: 'Centro', city: 'Ambato', state: 'Tungurahua' },
      ],
      'Bolivia': [
        { name: 'Centro', city: 'La Paz', state: 'La Paz' },
        { name: 'Centro', city: 'Santa Cruz', state: 'Santa Cruz' },
        { name: 'Centro', city: 'Cochabamba', state: 'Cochabamba' },
      ],
      'Espana': [
        { name: 'Centro', city: 'Madrid', state: 'Comunidad de Madrid' },
        { name: 'Salamanca', city: 'Madrid', state: 'Comunidad de Madrid' },
        { name: 'Centro', city: 'Barcelona', state: 'Cataluna' },
        { name: 'Eixample', city: 'Barcelona', state: 'Cataluna' },
        { name: 'Centro', city: 'Valencia', state: 'Comunidad Valenciana' },
        { name: 'Centro', city: 'Sevilla', state: 'Andalucia' },
        { name: 'Centro', city: 'Bilbao', state: 'Pais Vasco' },
        { name: 'Centro', city: 'Malaga', state: 'Andalucia' },
      ],
      'Estados Unidos': [
        { name: 'Midtown', city: 'New York', state: 'New York' },
        { name: 'Downtown', city: 'Miami', state: 'Florida' },
        { name: 'Brickell', city: 'Miami', state: 'Florida' },
        { name: 'Downtown', city: 'Los Angeles', state: 'California' },
        { name: 'Downtown', city: 'Houston', state: 'Texas' },
        { name: 'Downtown', city: 'Chicago', state: 'Illinois' },
        { name: 'Downtown', city: 'San Francisco', state: 'California' },
        { name: 'Downtown', city: 'Austin', state: 'Texas' },
      ],
    };

    const zones = COUNTRY_ZONES[country];
    if (!zones) {
      return res.status(400).json({ success: false, error: `Pais no soportado. Disponibles: ${Object.keys(COUNTRY_ZONES).join(', ')}` });
    }

    let created = 0;
    for (const z of zones) {
      try {
        await pool.query(
          'INSERT INTO scraping_zones (name, city, state, country) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [z.name, z.city, z.state, country]
        );
        created++;
      } catch {}
    }

    const total = await pool.query('SELECT COUNT(*) FROM scraping_zones WHERE country = $1', [country]);

    res.json({ success: true, message: `${created} zonas creadas para ${country}`, total: parseInt(total.rows[0].count), country });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /scraping/countries - List available countries
router.get('/countries', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT country, COUNT(*) as zones, SUM(total_leads) as leads FROM scraping_zones GROUP BY country ORDER BY country'
    );
    const available = ['Argentina', 'Mexico', 'Colombia', 'Chile', 'Peru', 'Uruguay', 'Paraguay', 'Ecuador', 'Bolivia', 'Espana', 'Estados Unidos'];
    res.json({ success: true, active: result.rows, available });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Auto-scraping ───────────────────────────────────────────────────────────

// POST /scraping/auto/start - Start permanent scraping
router.post('/auto/start', async (req, res) => {
  try {
    const result = await scraperService.startPermanentScraping(req.body?.userId || null);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

// ─── Lead Reports ─────────────────────────────────────────────────────────────

// POST /scraping/leads/:id/report - Generate AI report
router.post('/leads/:id/report', async (req, res) => {
  try {
    const { default: leadReportService } = await import('../services/scraping/lead-report-service.js');
    const report = await leadReportService.generateReport(req.params.id);
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /scraping/leads/:id/report - Get existing report
router.get('/leads/:id/report', async (req, res) => {
  try {
    const result = await pool.query('SELECT ai_report, report_generated_at FROM leads WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Lead not found' });
    const lead = result.rows[0];
    const report = lead.ai_report ? JSON.parse(lead.ai_report) : null;
    res.json({ success: true, report, generatedAt: lead.report_generated_at });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Executives / C-Level ────────────────────────────────────────────────────

// GET /leads/:id/executives - Get executives for a lead
router.get('/leads/:id/executives', async (req, res) => {
  try {
    const { default: clevelScraper } = await import('../services/scraping/clevel-scraper.js');
    const executives = await clevelScraper.getExecutives(req.params.id);
    res.json({ success: true, executives });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /leads/:id/executives/scan - Scrape executives for a lead
router.post('/leads/:id/executives/scan', async (req, res) => {
  try {
    const { default: clevelScraper } = await import('../services/scraping/clevel-scraper.js');
    const executives = await clevelScraper.scrapeAndSave(req.params.id);
    res.json({ success: true, executives, message: `${executives.length} ejecutivos encontrados` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
