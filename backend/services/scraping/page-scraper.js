// Page Scraper - Extracts contact info from business websites
// Converted from Spiga's page.scraper.ts to plain JavaScript ESM

import * as cheerio from 'cheerio';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

// Emails that are not from real businesses
const GARBAGE_EMAIL_PATTERNS = [
  'example', 'test@', 'noreply', 'no-reply', 'sentry',
  'wixpress', 'wordpress', 'squarespace', 'godaddy',
  'hostgator', 'cpanel', 'webmaster@', 'postmaster@',
  'admin@localhost', 'root@', 'mailer-daemon',
  'usuario@', 'email@', 'correo@', 'tu@', 'your@',
  '.png', '.jpg', '.svg', '.gif', '.webp',
  'sentry.io', 'cloudflare', 'amazonaws', 'googleusercontent',
  'placeholder', 'dummy', 'fake@', 'demo@', 'sample@',
  'info@example', 'user@', 'name@', 'nombre@',
  'tucorreo@', 'youremail@', 'mail@example',
  'contact@example', 'domain.com', 'tudominio',
  'yourdomain', 'mysite', 'website@', 'sitio@',
  'prueba@', 'changeme', 'update@', 'billing@wix',
  'support@wix', 'support@squarespace', 'wordpress.com',
  'blogger.com', 'tumblr.com', 'weebly.com',
  'jimdo.com', 'strikingly.com', 'shopify.com',
  'bigcommerce.com', 'wix.com', 'duda.co',
  'ionos.com', 'bluehost.com', 'namecheap.com',
  '@sentry', '@bugsnag', '@rollbar', '@datadog',
  '@newrelic', '@segment.com', '@mixpanel',
  '@intercom', '@zendesk', '@freshdesk',
  '@mailchimp', '@sendgrid', '@mailgun',
  'unsubscribe', 'donotreply', 'noanswer',
];

// Generic email domains (accepted but lower priority)
const GENERIC_EMAIL_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com',
  'live.com', 'protonmail.com', 'icloud.com', 'aol.com',
];

class PageScraper {
  _getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  // Fetch a URL with timeout
  async _fetchPage(url, timeoutMs = 8000) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this._getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeout);

      if (!response.ok) return null;

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        return null;
      }

      const html = await response.text();
      // Limit HTML size to avoid processing huge pages (500KB)
      return html.substring(0, 500_000);
    } catch {
      return null;
    }
  }

  // Extract data from a single page
  scrapePage(html, baseUrl) {
    const $ = cheerio.load(html);
    const data = {
      emails: [],
      phones: [],
      contactPages: [],
      facebook: undefined,
      instagram: undefined,
      linkedin: undefined,
      twitter: undefined,
      whatsapp: undefined,
      contactName: undefined,
    };

    const fullText = $('body').text();
    const fullHtml = html;

    // 1. Extract emails from mailto: links + regex
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const email = href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
      if (email && email.includes('@')) {
        data.emails.push(email);
      }
    });

    // Also extract from visible text and HTML attributes
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const textEmails = fullText.match(emailRegex) || [];
    const htmlEmails = fullHtml.match(emailRegex) || [];
    data.emails.push(...textEmails.map(e => e.toLowerCase()));
    data.emails.push(...htmlEmails.map(e => e.toLowerCase()));

    // Deduplicate and filter garbage emails
    data.emails = [...new Set(data.emails)].filter(email =>
      !GARBAGE_EMAIL_PATTERNS.some(p => email.includes(p))
    );

    // Sort: corporate emails first, generic (gmail, etc) last
    data.emails.sort((a, b) => {
      const aGeneric = GENERIC_EMAIL_DOMAINS.some(d => a.endsWith(`@${d}`));
      const bGeneric = GENERIC_EMAIL_DOMAINS.some(d => b.endsWith(`@${d}`));
      if (aGeneric && !bGeneric) return 1;
      if (!aGeneric && bGeneric) return -1;
      return 0;
    });

    // 2. Extract phones from tel: links + regex
    $('a[href^="tel:"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const phone = href.replace('tel:', '').replace(/\s/g, '').trim();
      if (phone.length >= 10) {
        data.phones.push(phone);
      }
    });

    // Phone regex for Mexican numbers
    const phonePatterns = [
      /\+52\s*\(?\d{2,3}\)?\s*\d{4}\s*[-.]?\s*\d{4}/g,
      /\(?\d{2,3}\)?\s*\d{4}\s*[-.]?\s*\d{4}/g,
      /\b\d{2,3}[-.\s]\d{4}[-.\s]\d{4}\b/g,
    ];

    for (const pattern of phonePatterns) {
      const matches = fullText.match(pattern) || [];
      data.phones.push(...matches);
    }

    // Normalize and deduplicate phones
    data.phones = [...new Set(
      data.phones.map(p => p.replace(/[^\d+]/g, ''))
    )].filter(p => p.length >= 10 && p.length <= 15);

    // 3. Extract social media links
    $('a[href]').each((_, el) => {
      const href = ($(el).attr('href') || '').toLowerCase();

      if (href.includes('facebook.com/') && !href.includes('facebook.com/sharer') && !href.includes('facebook.com/share')) {
        if (!data.facebook) data.facebook = this._cleanSocialUrl(href);
      }
      if (href.includes('instagram.com/') && !href.includes('instagram.com/p/')) {
        if (!data.instagram) data.instagram = this._cleanSocialUrl(href);
      }
      if (href.includes('linkedin.com/') && !href.includes('linkedin.com/share')) {
        if (!data.linkedin) data.linkedin = this._cleanSocialUrl(href);
      }
      if ((href.includes('twitter.com/') || href.includes('x.com/')) && !href.includes('/share') && !href.includes('/intent')) {
        if (!data.twitter) data.twitter = this._cleanSocialUrl(href);
      }
      // WhatsApp links: wa.me/NUMBER, api.whatsapp.com/send?phone=NUMBER, web.whatsapp.com
      if (href.includes('wa.me/') || href.includes('whatsapp.com/send') || href.includes('whatsapp.com/catalog')) {
        if (!data.whatsapp) {
          const waNumber = this._extractWhatsAppNumber(href);
          if (waNumber) data.whatsapp = waNumber;
        }
      }
    });

    // Also check for WhatsApp links in the full HTML (some sites use onclick or data attributes)
    if (!data.whatsapp) {
      const waPatterns = [
        /wa\.me\/(\+?\d{10,15})/gi,
        /api\.whatsapp\.com\/send\?phone=(\+?\d{10,15})/gi,
        /whatsapp[^"']*?(\+?52\d{10})/gi,
      ];
      for (const pattern of waPatterns) {
        const match = pattern.exec(fullHtml);
        if (match && match[1]) {
          data.whatsapp = match[1].startsWith('+') ? match[1] : `+${match[1]}`;
          break;
        }
      }
    }

    // 4. Extract contact name from meta tags or structured data
    const metaAuthor = $('meta[name="author"]').attr('content');
    if (metaAuthor && metaAuthor.length > 3 && metaAuthor.length < 60) {
      data.contactName = metaAuthor;
    }

    // 5. Detect contact/about page links
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase().trim();
      const lowerHref = href.toLowerCase();

      const isContactPage = (
        /\b(contacto|contact|contactenos|contactanos)\b/.test(lowerHref) ||
        /\b(contacto|contact|contactenos|contactanos)\b/.test(text)
      );

      const isAboutPage = (
        /\b(nosotros|about|quienes-somos|acerca)\b/.test(lowerHref) ||
        /\b(nosotros|about|quienes somos|acerca)\b/.test(text)
      );

      if (isContactPage || isAboutPage) {
        try {
          const resolved = new URL(href, baseUrl).href;
          if (!data.contactPages.includes(resolved)) {
            data.contactPages.push(resolved);
          }
        } catch {
          // invalid URL
        }
      }
    });

    return data;
  }

  // Extract WhatsApp number from URL
  _extractWhatsAppNumber(url) {
    try {
      // wa.me/5215512345678
      const waMe = url.match(/wa\.me\/(\+?\d{10,15})/);
      if (waMe) return waMe[1].startsWith('+') ? waMe[1] : `+${waMe[1]}`;

      // api.whatsapp.com/send?phone=5215512345678
      const apiWa = url.match(/phone=(\+?\d{10,15})/);
      if (apiWa) return apiWa[1].startsWith('+') ? apiWa[1] : `+${apiWa[1]}`;

      return null;
    } catch {
      return null;
    }
  }

  // Clean social media URL
  _cleanSocialUrl(url) {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      // Remove query params and trailing slashes
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`.replace(/\/$/, '');
    } catch {
      return url;
    }
  }

  // Merge two PageData objects
  _mergePageData(base, extra) {
    return {
      emails: [...new Set([...base.emails, ...extra.emails])].filter(email =>
        !GARBAGE_EMAIL_PATTERNS.some(p => email.includes(p))
      ),
      phones: [...new Set([...base.phones, ...extra.phones])],
      facebook: base.facebook || extra.facebook,
      instagram: base.instagram || extra.instagram,
      linkedin: base.linkedin || extra.linkedin,
      twitter: base.twitter || extra.twitter,
      whatsapp: base.whatsapp || extra.whatsapp,
      contactName: base.contactName || extra.contactName,
      contactPages: [...new Set([...base.contactPages, ...extra.contactPages])],
    };
  }

  // Scrape a URL with retry - visit subpages if missing data
  async scrapeWithRetry(url, companyName) {
    const result = {};

    // Step 1: Fetch and parse main page
    const mainHtml = await this._fetchPage(url);
    if (!mainHtml) return result;

    let pageData = this.scrapePage(mainHtml, url);

    // Step 2: If missing email, try contact/about subpages found on main page
    const needsMore = pageData.emails.length === 0;

    if (needsMore && pageData.contactPages.length > 0) {
      // Visit up to 2 contact pages
      for (const contactUrl of pageData.contactPages.slice(0, 2)) {
        const contactHtml = await this._fetchPage(contactUrl);
        if (contactHtml) {
          const contactData = this.scrapePage(contactHtml, contactUrl);
          pageData = this._mergePageData(pageData, contactData);
        }
        if (pageData.emails.length > 0) break;
      }
    }

    // Step 3: If still missing email, try common contact paths
    if (pageData.emails.length === 0) {
      const commonPaths = ['/contacto', '/contact', '/contactenos', '/about', '/nosotros'];
      for (const path of commonPaths) {
        try {
          const subUrl = new URL(path, url).href;
          // Skip if we already visited this
          if (pageData.contactPages.includes(subUrl)) continue;

          const subHtml = await this._fetchPage(subUrl, 6000);
          if (subHtml) {
            const subData = this.scrapePage(subHtml, subUrl);
            pageData = this._mergePageData(pageData, subData);
          }
          if (pageData.emails.length > 0) break;
        } catch {
          // invalid URL construction
        }
      }
    }

    // Build result
    if (pageData.emails.length > 0) result.email = pageData.emails[0];
    if (pageData.phones.length > 0) result.phone = this._normalizePhone(pageData.phones[0]);
    result.website = this._normalizeWebsite(url);
    if (pageData.facebook) result.facebook = pageData.facebook;
    if (pageData.instagram) result.instagram = pageData.instagram;
    if (pageData.linkedin) result.linkedin = pageData.linkedin;
    if (pageData.twitter) result.twitter = pageData.twitter;
    if (pageData.whatsapp) result.whatsapp = pageData.whatsapp;
    if (pageData.contactName) result.contactName = pageData.contactName;

    return result;
  }

  _normalizePhone(phone) {
    let normalized = phone.replace(/[^\d+]/g, '');
    if (!normalized.startsWith('+52') && normalized.length === 10) {
      normalized = '+52' + normalized;
    }
    return normalized;
  }

  _normalizeWebsite(url) {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}`;
    } catch {
      return url;
    }
  }
}

export const pageScraper = new PageScraper();
export { PageScraper };
