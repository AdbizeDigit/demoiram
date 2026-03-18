import { DuckDuckGoScraper } from './duckduckgo-scraper.js';
import { pool } from '../../config/database.js';

class CLevelScraper {
  constructor() {
    this.ddg = new DuckDuckGoScraper();
  }

  async findExecutives(companyName, city, state) {
    const executives = [];
    const seenNames = new Set();

    // Search queries to find executives
    const queries = [
      `"${companyName}" director site:linkedin.com/in`,
      `"${companyName}" gerente site:linkedin.com/in`,
      `"${companyName}" CEO site:linkedin.com/in`,
      `"${companyName}" fundador site:linkedin.com/in`,
      `"${companyName}" owner site:linkedin.com/in`,
      `"${companyName}" ${city || 'Argentina'} linkedin director gerente`,
      `"${companyName}" socio gerente linkedin`,
    ];

    for (const query of queries) {
      try {
        const results = await this.ddg.search(query, 10);

        for (const result of results) {
          const exec = this.parseExecutive(result, companyName);
          if (exec && !seenNames.has(exec.name.toLowerCase())) {
            seenNames.add(exec.name.toLowerCase());
            executives.push(exec);
          }
        }

        // Delay between searches
        await new Promise(r => setTimeout(r, 2500));
      } catch (err) {
        console.log(`[CLevelScraper] Error searching: ${err.message}`);
      }

      if (executives.length >= 10) break;
    }

    return executives;
  }

  parseExecutive(result, companyName) {
    const url = result.url || '';
    const title = result.title || '';
    const snippet = result.snippet || '';

    // Only LinkedIn profiles
    if (!url.includes('linkedin.com/in/')) return null;

    // Extract name from LinkedIn URL or title
    let name = '';

    // Try to get name from title (usually "Name - Title - Company | LinkedIn")
    const titleParts = title.split(/\s*[-–|]\s*/);
    if (titleParts.length > 0) {
      name = titleParts[0].replace(/\s*\(.*?\)\s*/g, '').trim();
    }

    // Clean up name
    name = name.replace(/^(Dr\.|Ing\.|Lic\.|Cr\.)\s*/i, '').trim();
    if (!name || name.length < 3 || name.length > 60) return null;
    if (name.toLowerCase().includes('linkedin') || name.toLowerCase().includes('sign up')) return null;

    // Extract role/title from the rest
    let role = '';
    const roleKeywords = ['CEO', 'COO', 'CFO', 'CTO', 'CMO', 'Director', 'Gerente',
      'Fundador', 'Presidente', 'Socio', 'Owner', 'Jefe', 'Responsable', 'Manager',
      'Head', 'VP', 'Vice', 'Coordinador', 'Supervisor', 'Lead', 'Partner',
      'Directora', 'Gerenta', 'Fundadora', 'Presidenta', 'Jefa', 'Coordinadora'];

    const fullText = `${title} ${snippet}`;
    for (const keyword of roleKeywords) {
      const regex = new RegExp(`(${keyword}[\\w\\s]{0,30})`, 'i');
      const match = fullText.match(regex);
      if (match) {
        role = match[1].trim();
        // Clean up role - take just relevant part
        role = role.replace(/\s*[-–|]\s*.*$/, '').trim();
        if (role.length > 50) role = role.substring(0, 50);
        break;
      }
    }

    if (!role) {
      // Try to get from title parts
      if (titleParts.length > 1) {
        role = titleParts[1].trim();
        if (role.length > 50) role = role.substring(0, 50);
      }
    }

    return {
      name,
      role: role || 'Ejecutivo',
      linkedinUrl: url,
      source: 'linkedin',
      snippet: snippet.substring(0, 200),
    };
  }

  // Save executives to DB
  async saveExecutives(leadId, executives) {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_executives (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        lead_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255),
        linkedin_url TEXT,
        email VARCHAR(255),
        phone VARCHAR(100),
        source VARCHAR(50) DEFAULT 'linkedin',
        snippet TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Clear old executives for this lead
    await pool.query('DELETE FROM lead_executives WHERE lead_id = $1', [leadId]);

    // Insert new ones
    for (const exec of executives) {
      await pool.query(
        `INSERT INTO lead_executives (lead_id, name, role, linkedin_url, source, snippet)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [leadId, exec.name, exec.role, exec.linkedinUrl, exec.source, exec.snippet]
      );
    }

    return executives;
  }

  // Get executives for a lead
  async getExecutives(leadId) {
    try {
      const result = await pool.query(
        'SELECT * FROM lead_executives WHERE lead_id = $1 ORDER BY created_at ASC',
        [leadId]
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  // Full flow: find and save
  async scrapeAndSave(leadId) {
    const leadRes = await pool.query('SELECT name, city, state FROM leads WHERE id = $1', [leadId]);
    if (leadRes.rows.length === 0) throw new Error('Lead not found');
    const lead = leadRes.rows[0];

    console.log(`[CLevelScraper] Searching executives for: ${lead.name}`);
    const executives = await this.findExecutives(lead.name, lead.city, lead.state);
    console.log(`[CLevelScraper] Found ${executives.length} executives for ${lead.name}`);

    if (executives.length > 0) {
      await this.saveExecutives(leadId, executives);
    }

    return executives;
  }
}

export const clevelScraper = new CLevelScraper();
export default clevelScraper;
