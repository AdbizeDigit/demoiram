// Enrichment Service - Automatically searches for missing data (phone, email, website) for incomplete leads
// Converted from Spiga's enrichment.service.ts to plain JavaScript ESM

import { pool } from '../../config/database.js';
import { DuckDuckGoScraper } from './duckduckgo-scraper.js';
import { pageScraper } from './page-scraper.js';

const MAX_ENRICHMENT_ATTEMPTS = 3;
const DELAY_BETWEEN_SEARCHES = 2500;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class EnrichmentService {
  constructor() {
    this.ddgScraper = new DuckDuckGoScraper();
    this.isRunning = false;
    this.currentLeadId = null;
    this.queue = [];
  }

  // Detect missing fields in a lead
  getMissingFields(lead) {
    const missing = [];
    if (!lead.phone) missing.push('phone');
    if (!lead.email) missing.push('email');
    if (!lead.website) missing.push('website');
    return missing;
  }

  // Check if a lead needs enrichment
  needsEnrichment(lead) {
    // If it already has all data, no need
    const missingFields = this.getMissingFields(lead);
    if (missingFields.length === 0) return false;

    // If max attempts reached, don't try again
    if ((lead.enrichment_attempts || 0) >= MAX_ENRICHMENT_ATTEMPTS) return false;

    // If already completed or partial, don't try again
    if (
      lead.enrichment_status === 'COMPLETED' ||
      lead.enrichment_status === 'PARTIAL' ||
      lead.enrichment_status === 'NOT_NEEDED'
    ) {
      return false;
    }

    return true;
  }

  // Add lead to enrichment queue (FIFO)
  async queueLeadForEnrichment(leadId) {
    if (this.queue.includes(leadId)) return;

    this.queue.push(leadId);

    // Mark as pending enrichment
    await pool.query(
      'UPDATE leads SET enrichment_status = $1 WHERE id = $2',
      ['PENDING', leadId]
    );

    // Start processing if not already running
    if (!this.isRunning) {
      this.processQueue();
    }
  }

  // Process enrichment queue one by one with 1.5s delay
  async processQueue() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('Starting enrichment queue processing...');

    while (this.queue.length > 0) {
      const leadId = this.queue.shift();
      if (!leadId) continue;

      try {
        await this.enrichLead(leadId);
      } catch (error) {
        console.error(`Error enriching lead ${leadId}:`, error);
      }

      // Delay between leads
      await delay(1500);
    }

    this.isRunning = false;
    console.log('Enrichment queue processed');
  }

  // Enrich a specific lead
  async enrichLead(leadId) {
    this.currentLeadId = leadId;

    // Fetch the lead from database
    const leadResult = await pool.query(
      `SELECT l.*, z.name as zone_name, z.city_name, z.state
       FROM leads l
       LEFT JOIN zones z ON l.zone_id = z.id
       WHERE l.id = $1`,
      [leadId]
    );

    if (leadResult.rows.length === 0) {
      throw new Error(`Lead ${leadId} not found`);
    }

    const lead = leadResult.rows[0];

    console.log(`Enriching lead: ${lead.company}`);

    // Mark as in progress
    await pool.query(
      'UPDATE leads SET enrichment_status = $1 WHERE id = $2',
      ['IN_PROGRESS', leadId]
    );

    const missingFields = this.getMissingFields(lead);
    const fieldsFound = [];
    const fieldsMissing = [];
    const updatedData = {};

    // Step 1: If lead has a website, visit it with PageScraper first
    if (lead.website) {
      try {
        console.log(`   Visiting website: ${lead.website}`);
        const pageData = await pageScraper.scrapeWithRetry(lead.website, lead.company);

        if (pageData.email && !lead.email) {
          updatedData.email = pageData.email;
          fieldsFound.push('email');
        }
        if (pageData.phone && !lead.phone) {
          updatedData.phone = pageData.phone;
          fieldsFound.push('phone');
        }
        if (pageData.facebook && !lead.facebook) updatedData.facebook = pageData.facebook;
        if (pageData.instagram && !lead.instagram) updatedData.instagram = pageData.instagram;
        if (pageData.linkedin && !lead.linkedin) updatedData.linkedin = pageData.linkedin;
        if (pageData.twitter && !lead.twitter) updatedData.twitter = pageData.twitter;
        if (pageData.whatsapp && !lead.whatsapp) updatedData.whatsapp = pageData.whatsapp;
        if (pageData.contactName && lead.contact === 'Información General') {
          updatedData.contact = pageData.contactName;
        }
      } catch (err) {
        console.log(`   Error visiting website: ${err}`);
      }
    }

    // Step 2: For fields still missing, fall back to DDG search
    const stillMissing = missingFields.filter(f => !fieldsFound.includes(f));

    if (stillMissing.length > 0) {
      const locationContext = lead.zone_name
        ? `${lead.zone_name} ${lead.city_name || ''} ${lead.state || ''}`
        : lead.location || '';

      for (const field of stillMissing) {
        console.log(`   Searching ${field} for ${lead.company}...`);

        const result = await this._searchForField(lead.company, field, locationContext);

        if (result) {
          fieldsFound.push(field);
          updatedData[field] = result;
          console.log(`   Found ${field}: ${result}`);
        } else {
          fieldsMissing.push(field);
          console.log(`   Not found: ${field}`);
        }

        await delay(DELAY_BETWEEN_SEARCHES);
      }
    }

    // Determine final status
    const attempts = (lead.enrichment_attempts || 0) + 1;
    let enrichmentStatus;

    if (fieldsMissing.length === 0) {
      enrichmentStatus = 'COMPLETED';
    } else if (fieldsFound.length > 0) {
      enrichmentStatus = 'PARTIAL';
    } else if (attempts >= MAX_ENRICHMENT_ATTEMPTS) {
      enrichmentStatus = 'PARTIAL';
    } else {
      enrichmentStatus = 'PENDING';
    }

    // Recalculate score
    const newScore = this._calculateNewScore(lead.score || 0, fieldsFound);

    // Build dynamic UPDATE query
    const setClauses = [
      'enrichment_status = $1',
      'enrichment_attempts = $2',
      'last_enrichment_at = NOW()',
      'score = $3',
    ];
    const values = [enrichmentStatus, attempts, newScore];
    let paramIndex = 4;

    // Add missing_fields if max attempts reached
    if (attempts >= MAX_ENRICHMENT_ATTEMPTS) {
      setClauses.push(`missing_fields = $${paramIndex}`);
      values.push(JSON.stringify(fieldsMissing));
      paramIndex++;
    }

    // Add all found data fields
    for (const [key, value] of Object.entries(updatedData)) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    values.push(leadId);
    const updateQuery = `UPDATE leads SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`;

    await pool.query(updateQuery, values);

    this.currentLeadId = null;

    const enrichmentResult = {
      leadId,
      fieldsFound,
      fieldsMissing,
      attempts,
      success: fieldsFound.length > 0 || enrichmentStatus === 'COMPLETED',
    };

    console.log(`   Enrichment result for ${lead.company}: ${JSON.stringify(enrichmentResult)}`);

    return enrichmentResult;
  }

  // Search for a specific field for a company via DDG
  async _searchForField(companyName, field, locationContext) {
    // Generate specific queries for each field
    const queries = this._generateSearchQueries(companyName, field, locationContext);

    for (const query of queries) {
      try {
        const results = await this.ddgScraper.search(query, 10);

        for (const result of results) {
          const fullText = `${result.title} ${result.snippet} ${result.url}`;

          switch (field) {
            case 'phone': {
              const phones = this._extractPhoneNumbers(fullText);
              if (phones.length > 0) {
                // Verify the result is relevant to the company
                if (this._isResultRelevant(result.title, result.url, companyName)) {
                  return phones[0];
                }
              }
              break;
            }
            case 'email': {
              const emails = this._extractEmails(fullText);
              if (emails.length > 0) {
                // Filter generic emails
                const validEmail = emails.find(
                  (e) =>
                    !e.includes('info@example') &&
                    !e.includes('noreply') &&
                    !e.includes('support@')
                );
                if (validEmail && this._isResultRelevant(result.title, result.url, companyName)) {
                  return validEmail;
                }
              }
              break;
            }
            case 'website': {
              const website = this._extractWebsite(fullText, result.url);
              if (website && this._isResultRelevant(result.title, result.url, companyName)) {
                // Verify it's a valid website and not a directory
                if (
                  !website.includes('facebook') &&
                  !website.includes('linkedin') &&
                  !website.includes('yelp') &&
                  !website.includes('paginas-amarillas') &&
                  !website.includes('seccionamarilla')
                ) {
                  return website;
                }
              }
              break;
            }
          }
        }

        // Delay between queries
        await delay(1500);
      } catch (error) {
        console.error(`Error searching ${field}:`, error);
      }
    }

    return null;
  }

  // Generate search queries specific to each field
  _generateSearchQueries(companyName, field, locationContext) {
    const cleanName = companyName.replace(/[^\w\s]/g, '').trim();

    switch (field) {
      case 'phone':
        return [
          `"${cleanName}" telefono Mexico`,
          `"${cleanName}" contacto ${locationContext}`,
          `"${cleanName}" numero telefono`,
          `${cleanName} tel celular ${locationContext}`,
        ];
      case 'email':
        return [
          `"${cleanName}" email contacto`,
          `"${cleanName}" correo electronico Mexico`,
          `"${cleanName}" @gmail.com OR @hotmail.com OR @outlook.com`,
          `site:${cleanName.replace(/\s+/g, '').toLowerCase()}.com email`,
        ];
      case 'website':
        return [
          `"${cleanName}" sitio web oficial`,
          `"${cleanName}" pagina web Mexico`,
          `${cleanName.replace(/\s+/g, '').toLowerCase()}.com`,
          `${cleanName.replace(/\s+/g, '').toLowerCase()}.mx`,
        ];
      default:
        return [`"${cleanName}" ${field}`];
    }
  }

  // Verify if a result is relevant to the company
  _isResultRelevant(title, url, companyName) {
    const lowerTitle = title.toLowerCase();
    const lowerUrl = url.toLowerCase();
    const companyWords = companyName.toLowerCase().split(/\s+/);

    // Check that at least one keyword from the name is in the title or URL
    const hasRelevantWord = companyWords.some(
      (word) =>
        word.length > 3 && (lowerTitle.includes(word) || lowerUrl.includes(word))
    );

    // Filter generic directories
    const isNotDirectory =
      !lowerUrl.includes('yelp') &&
      !lowerUrl.includes('tripadvisor') &&
      !lowerUrl.includes('paginas-amarillas') &&
      !lowerUrl.includes('seccionamarilla') &&
      !lowerUrl.includes('cylex');

    return hasRelevantWord && isNotDirectory;
  }

  // Calculate new score after enrichment (+20 phone, +25 email, +15 website)
  _calculateNewScore(currentScore, fieldsFound) {
    let newScore = currentScore;

    for (const field of fieldsFound) {
      switch (field) {
        case 'phone':
          newScore += 20;
          break;
        case 'email':
          newScore += 25;
          break;
        case 'website':
          newScore += 15;
          break;
      }
    }

    return Math.min(newScore, 100);
  }

  // Extract phone numbers from text (Mexican format)
  _extractPhoneNumbers(text) {
    const patterns = [
      /\+52\s*\(?\d{2,3}\)?\s*\d{4}\s*[-.]?\s*\d{4}/g,
      /\(?\d{2,3}\)?\s*\d{4}\s*[-.]?\s*\d{4}/g,
      /\b\d{2,3}[-.\s]\d{4}[-.\s]\d{4}\b/g,
    ];

    const phones = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern) || [];
      phones.push(...matches);
    }

    // Normalize and deduplicate
    return [...new Set(
      phones.map(p => {
        let normalized = p.replace(/[^\d+]/g, '');
        if (!normalized.startsWith('+52') && normalized.length === 10) {
          normalized = '+52' + normalized;
        }
        return normalized;
      })
    )].filter(p => p.length >= 10 && p.length <= 15);
  }

  // Extract emails from text
  _extractEmails(text) {
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];
    return [...new Set(matches.map(e => e.toLowerCase()))].filter(email =>
      !email.includes('example') &&
      !email.includes('test@') &&
      !email.includes('wixpress') &&
      !email.includes('wordpress') &&
      !email.includes('sentry')
    );
  }

  // Extract website URL from text
  _extractWebsite(text, resultUrl) {
    // Try to find a URL in the text
    const urlRegex = /https?:\/\/[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(urlRegex) || [];

    if (matches.length > 0) {
      // Prefer the result URL if it looks like a company website
      try {
        const urlObj = new URL(resultUrl);
        const hostname = urlObj.hostname.replace('www.', '');
        // Skip social media and directories
        if (
          !hostname.includes('duckduckgo') &&
          !hostname.includes('google') &&
          !hostname.includes('facebook') &&
          !hostname.includes('linkedin') &&
          !hostname.includes('twitter') &&
          !hostname.includes('yelp') &&
          !hostname.includes('tripadvisor')
        ) {
          return `${urlObj.protocol}//${urlObj.hostname}`;
        }
      } catch {
        // ignore
      }

      // Fall back to first matched URL
      for (const match of matches) {
        try {
          const urlObj = new URL(match);
          const hostname = urlObj.hostname.replace('www.', '');
          if (
            !hostname.includes('duckduckgo') &&
            !hostname.includes('google') &&
            !hostname.includes('facebook') &&
            !hostname.includes('linkedin')
          ) {
            return `${urlObj.protocol}//${urlObj.hostname}`;
          }
        } catch {
          // ignore
        }
      }
    }

    return null;
  }

  // Enrich all pending leads (batch mode)
  async enrichPendingLeads() {
    const result = await pool.query(
      `SELECT id FROM leads
       WHERE enrichment_status = 'PENDING'
          OR (
            enrichment_attempts < $1
            AND (phone IS NULL OR email IS NULL OR website IS NULL)
          )
       LIMIT 50`,
      [MAX_ENRICHMENT_ATTEMPTS]
    );

    const pendingLeads = result.rows;
    console.log(`${pendingLeads.length} leads pending enrichment`);

    let enriched = 0;
    let failed = 0;

    for (const lead of pendingLeads) {
      try {
        const enrichResult = await this.enrichLead(lead.id);
        if (enrichResult.success) {
          enriched++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        console.error(`Error enriching ${lead.id}:`, error);
      }

      // Delay between leads to avoid overloading
      await delay(2000);
    }

    return {
      total: pendingLeads.length,
      enriched,
      failed,
    };
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentLeadId: this.currentLeadId,
      queueLength: this.queue.length,
    };
  }
}

// Singleton instance
let instance = null;

export function getEnrichmentService() {
  if (!instance) {
    instance = new EnrichmentService();
  }
  return instance;
}

export const enrichmentService = getEnrichmentService();
export { EnrichmentService };
