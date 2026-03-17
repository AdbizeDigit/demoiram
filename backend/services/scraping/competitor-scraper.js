import DuckDuckGoScraper from './duckduckgo-scraper.js';
import * as cheerio from 'cheerio';
import { pool } from '../../config/database.js';

// All 32 states of Mexico with their capital coordinates
const MEXICO_STATES = {
  'Aguascalientes': { capital: 'Aguascalientes', lat: 21.8853, lng: -102.2916 },
  'Baja California': { capital: 'Mexicali', lat: 32.6245, lng: -115.4523 },
  'Baja California Sur': { capital: 'La Paz', lat: 24.1426, lng: -110.3128 },
  'Campeche': { capital: 'Campeche', lat: 19.8301, lng: -90.5349 },
  'Chiapas': { capital: 'Tuxtla Gutiérrez', lat: 16.7528, lng: -93.1152 },
  'Chihuahua': { capital: 'Chihuahua', lat: 28.6353, lng: -106.0889 },
  'Ciudad de México': { capital: 'CDMX', lat: 19.4326, lng: -99.1332 },
  'Coahuila': { capital: 'Saltillo', lat: 25.4232, lng: -100.9924 },
  'Colima': { capital: 'Colima', lat: 19.2433, lng: -103.7250 },
  'Durango': { capital: 'Durango', lat: 24.0277, lng: -104.6532 },
  'Estado de México': { capital: 'Toluca', lat: 19.2826, lng: -99.6557 },
  'Guanajuato': { capital: 'León', lat: 21.1221, lng: -101.6821 },
  'Guerrero': { capital: 'Chilpancingo', lat: 17.5506, lng: -99.5050 },
  'Hidalgo': { capital: 'Pachuca', lat: 20.1011, lng: -98.7591 },
  'Jalisco': { capital: 'Guadalajara', lat: 20.6597, lng: -103.3496 },
  'Michoacán': { capital: 'Morelia', lat: 19.7060, lng: -101.1950 },
  'Morelos': { capital: 'Cuernavaca', lat: 18.9242, lng: -99.2216 },
  'Nayarit': { capital: 'Tepic', lat: 21.5085, lng: -104.8950 },
  'Nuevo León': { capital: 'Monterrey', lat: 25.6866, lng: -100.3161 },
  'Oaxaca': { capital: 'Oaxaca', lat: 17.0732, lng: -96.7266 },
  'Puebla': { capital: 'Puebla', lat: 19.0414, lng: -98.2063 },
  'Querétaro': { capital: 'Querétaro', lat: 20.5888, lng: -100.3899 },
  'Quintana Roo': { capital: 'Cancún', lat: 21.1619, lng: -86.8515 },
  'San Luis Potosí': { capital: 'San Luis Potosí', lat: 22.1565, lng: -100.9855 },
  'Sinaloa': { capital: 'Culiacán', lat: 24.7994, lng: -107.3940 },
  'Sonora': { capital: 'Hermosillo', lat: 29.0729, lng: -110.9559 },
  'Tabasco': { capital: 'Villahermosa', lat: 17.9869, lng: -92.9303 },
  'Tamaulipas': { capital: 'Reynosa', lat: 26.0809, lng: -98.2883 },
  'Tlaxcala': { capital: 'Tlaxcala', lat: 19.3182, lng: -98.2375 },
  'Veracruz': { capital: 'Veracruz', lat: 19.1738, lng: -96.1342 },
  'Yucatán': { capital: 'Mérida', lat: 20.9674, lng: -89.5926 },
  'Zacatecas': { capital: 'Zacatecas', lat: 22.7709, lng: -102.5832 },
};

// 2 DDG queries per state
const SEARCH_QUERIES = [
  'muebles de oficina {state} México empresa',
  'mobiliario corporativo {state}',
];

// URLs to filter out
const IRRELEVANT_DOMAINS = [
  'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com',
  'linkedin.com', 'tiktok.com', 'pinterest.com', 'wikipedia.org',
  'mercadolibre.com', 'amazon.com', 'spiga.com', 'spiga.quantumid',
];

/**
 * Ensure the competitors table exists in the database.
 */
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS competitors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      website TEXT,
      state VARCHAR(100),
      phone VARCHAR(50),
      email VARCHAR(255),
      address TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      social_facebook TEXT,
      social_linkedin TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

/**
 * Check if a search result URL is irrelevant (social media, marketplaces, etc.)
 */
function isIrrelevant(result) {
  const url = result.url.toLowerCase();
  return IRRELEVANT_DOMAINS.some(d => url.includes(d));
}

/**
 * Parse a search result into a competitor data object.
 * Applies random jitter to coordinates so markers don't stack.
 */
function parseCompetitor(result, state, stateInfo) {
  let name = result.title || '';
  // Remove trailing site name after dash/pipe
  name = name.replace(/\s*[-|–—]\s*.+$/, '').trim();
  if (name.length > 80) name = name.substring(0, 80);

  return {
    name,
    website: result.url,
    state,
    city: stateInfo.capital,
    latitude: stateInfo.lat + (Math.random() - 0.5) * 0.15,
    longitude: stateInfo.lng + (Math.random() - 0.5) * 0.15,
    snippet: result.snippet,
    source: 'duckduckgo',
    sourceUrl: result.url,
  };
}

/**
 * Extract a phone number from HTML content.
 */
function extractPhone(html) {
  const phoneRegex = /(?:\+?52\s?)?(?:\(?\d{2,3}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}/g;
  const matches = html.match(phoneRegex);
  if (matches && matches.length > 0) {
    const cleaned = matches[0].replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 8) return cleaned;
  }
  return null;
}

/**
 * Extract an email address from HTML content.
 */
function extractEmail(html) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(emailRegex);
  if (matches) {
    const valid = matches.find(e =>
      !e.includes('example.com') && !e.includes('wixpress') && !e.includes('sentry')
    );
    return valid || null;
  }
  return null;
}

/**
 * Extract a physical address from the page DOM.
 */
function extractAddress($) {
  const selectors = [
    '[itemprop="address"]', '.address', '.direccion',
    '[class*="address"]', '[class*="ubicacion"]',
  ];
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    if (text && text.length > 10 && text.length < 200) return text;
  }
  return null;
}

/**
 * Extract a social media link for a given platform from the page.
 */
function extractSocial(html, platform) {
  const regex = new RegExp(`https?://(?:www\\.)?${platform}\\.com/[\\w.-]+`, 'i');
  const match = html.match(regex);
  return match ? match[0] : null;
}

/**
 * Visit a competitor website and extract contact details and social links.
 */
async function enrichCompetitor(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return {};

    const html = await response.text();
    const $ = cheerio.load(html);

    const phone = extractPhone(html);
    const email = extractEmail(html);
    const address = extractAddress($);
    const socialFacebook = extractSocial(html, 'facebook');
    const socialLinkedin = extractSocial(html, 'linkedin');
    const description = $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') || '';

    return {
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      social_facebook: socialFacebook || undefined,
      social_linkedin: socialLinkedin || undefined,
      description: description || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Save a competitor record to the database, upserting by website URL.
 */
async function saveCompetitor(competitor) {
  const result = await pool.query(
    `INSERT INTO competitors (name, website, state, phone, email, address, latitude, longitude, social_facebook, social_linkedin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (website) DO UPDATE SET
       name = COALESCE(EXCLUDED.name, competitors.name),
       phone = COALESCE(EXCLUDED.phone, competitors.phone),
       email = COALESCE(EXCLUDED.email, competitors.email),
       address = COALESCE(EXCLUDED.address, competitors.address),
       social_facebook = COALESCE(EXCLUDED.social_facebook, competitors.social_facebook),
       social_linkedin = COALESCE(EXCLUDED.social_linkedin, competitors.social_linkedin)
     RETURNING *`,
    [
      competitor.name,
      competitor.website,
      competitor.state,
      competitor.phone || null,
      competitor.email || null,
      competitor.address || null,
      competitor.latitude || null,
      competitor.longitude || null,
      competitor.social_facebook || null,
      competitor.social_linkedin || null,
    ]
  );
  return result.rows[0];
}

/**
 * Scan for competitors across Mexican states using DuckDuckGo searches.
 * @param {string[]|null} states - Optional list of states to scan (defaults to all 32)
 * @param {function|null} onProgress - Optional progress callback
 * @returns {Promise<object[]>} Array of competitor data objects
 */
async function scanCompetitors(states = null, onProgress = null) {
  await ensureTable();

  // Add unique index on website if it doesn't exist (for upsert)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_competitors_website ON competitors (website)
  `).catch(() => {});

  const ddg = new DuckDuckGoScraper();
  const targetStates = states && states.length > 0
    ? states
    : Object.keys(MEXICO_STATES);

  const allResults = [];
  const seenUrls = new Set();
  const log = (msg) => { if (onProgress) onProgress(msg); };

  log(`Iniciando escaneo en ${targetStates.length} estados...`);

  for (const state of targetStates) {
    const stateInfo = MEXICO_STATES[state];
    if (!stateInfo) {
      log(`Estado desconocido: ${state}, saltando...`);
      continue;
    }

    log(`Buscando competidores en ${state}...`);

    // 2 queries per state
    const queries = SEARCH_QUERIES.map(q => q.replace('{state}', state));

    for (const query of queries) {
      try {
        const results = await ddg.search(query, 10);
        log(`  "${query}" -> ${results.length} resultados`);

        for (const result of results) {
          if (seenUrls.has(result.url)) continue;
          if (isIrrelevant(result)) continue;

          seenUrls.add(result.url);
          const competitor = parseCompetitor(result, state, stateInfo);
          allResults.push(competitor);

          // Save to database
          try {
            await saveCompetitor(competitor);
          } catch (dbErr) {
            log(`  Error guardando ${competitor.name}: ${dbErr.message}`);
          }
        }
      } catch (err) {
        log(`  Error en query: ${err.message}`);
      }

      // Delay between queries to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  log(`Escaneo completado: ${allResults.length} competidores encontrados en ${targetStates.length} estados`);
  return allResults;
}

/**
 * Get all competitors from the database.
 */
async function getCompetitors() {
  await ensureTable();
  const result = await pool.query('SELECT * FROM competitors ORDER BY created_at DESC');
  return result.rows;
}

/**
 * Get competitor stats grouped by state.
 */
async function getCompetitorStats() {
  await ensureTable();
  const result = await pool.query(`
    SELECT
      state,
      COUNT(*) as total,
      COUNT(email) as with_email,
      COUNT(phone) as with_phone,
      COUNT(social_facebook) as with_facebook,
      COUNT(social_linkedin) as with_linkedin
    FROM competitors
    GROUP BY state
    ORDER BY total DESC
  `);
  return result.rows;
}

/**
 * Enrich a single competitor by ID - fetches their website for contact info.
 */
async function enrichCompetitorById(id) {
  await ensureTable();
  const { rows } = await pool.query('SELECT * FROM competitors WHERE id = $1', [id]);
  if (rows.length === 0) return null;

  const competitor = rows[0];
  if (!competitor.website) return competitor;

  const enriched = await enrichCompetitor(competitor.website);

  if (Object.keys(enriched).length > 0) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(enriched)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length > 0) {
      values.push(id);
      await pool.query(
        `UPDATE competitors SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
    }
  }

  const updated = await pool.query('SELECT * FROM competitors WHERE id = $1', [id]);
  return updated.rows[0];
}

const competitorScraper = {
  scanCompetitors,
  enrichCompetitor,
  enrichCompetitorById,
  getCompetitors,
  getCompetitorStats,
  saveCompetitor,
  ensureTable,
  MEXICO_STATES,
};

export default competitorScraper;
export {
  scanCompetitors,
  enrichCompetitor,
  enrichCompetitorById,
  getCompetitors,
  getCompetitorStats,
  saveCompetitor,
  ensureTable,
  MEXICO_STATES,
};
