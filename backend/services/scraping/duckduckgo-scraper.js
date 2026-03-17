import axios from 'axios';
import * as cheerio from 'cheerio';

// User agents rotativos para evitar bloqueos
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

class DuckDuckGoScraper {
  constructor() {
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.minDelay = 2000; // Minimo 2 segundos entre requests
  }

  _getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Asegurar que haya suficiente tiempo entre requests
  async _throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelay) {
      await this._delay(this.minDelay - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  // Buscar en DuckDuckGo usando la version HTML
  async search(query, maxResults = 20) {
    await this._throttle();

    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this._getRandomUserAgent(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
        },
        timeout: 15000,
      });

      return this._parseResults(response.data, maxResults);
    } catch (error) {
      console.error('DuckDuckGo search error:', error.message || error);
      return [];
    }
  }

  // Parsear resultados de busqueda del HTML
  _parseResults(html, maxResults) {
    const $ = cheerio.load(html);
    const results = [];

    // Los resultados estan en divs con clase 'result'
    $('.result').each((index, element) => {
      if (results.length >= maxResults) return false;

      const $result = $(element);

      // Titulo y URL
      const $titleLink = $result.find('.result__a');
      const title = $titleLink.text().trim();
      let url = $titleLink.attr('href') || '';

      // DuckDuckGo usa URLs de redireccion, extraer la URL real
      if (url.includes('uddg=')) {
        const match = url.match(/uddg=([^&]+)/);
        if (match) {
          url = decodeURIComponent(match[1]);
        }
      }

      // Snippet/descripcion
      const snippet = $result.find('.result__snippet').text().trim();

      if (title && url && !url.includes('duckduckgo.com')) {
        results.push({ title, url, snippet });
      }
    });

    return results;
  }

  // Busqueda especifica de negocios en una zona
  async searchBusinessesInZone(sector, zoneName, cityName, stateName, maxResults = 20) {
    // Construir query de busqueda
    const queries = [
      `"${sector}" empresa ${zoneName} ${cityName} telefono`,
      `empresas de ${sector} en ${zoneName} ${cityName} ${stateName} contacto`,
      `fabrica ${sector} ${cityName} sitio web`,
      `${sector} ${zoneName} ${cityName} Argentina contacto telefono`,
      `directorio ${sector} ${zoneName} ${cityName} ${stateName}`,
      `${sector} cerca de ${zoneName} ${cityName} whatsapp`,
      `listado ${sector} ${cityName} ${stateName} Argentina`,
    ];

    const allResults = [];
    const seenUrls = new Set();

    // Ejecutar multiples queries para obtener mas resultados
    for (const query of queries) {
      if (allResults.length >= maxResults) break;

      const results = await this.search(query, Math.ceil(maxResults / queries.length));

      for (const result of results) {
        // Evitar duplicados por URL
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          allResults.push(result);
        }

        if (allResults.length >= maxResults) break;
      }

      // Pequeno delay entre queries
      await this._delay(1500);
    }

    return allResults;
  }

  // Obtener estadisticas del scraper
  getStats() {
    return {
      totalRequests: this.requestCount,
      lastRequestTime: this.lastRequestTime,
    };
  }

  // Resetear estadisticas
  resetStats() {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }
}

export { DuckDuckGoScraper }
export default DuckDuckGoScraper
