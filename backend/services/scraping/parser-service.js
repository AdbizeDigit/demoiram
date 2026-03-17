// Parser para extraer informacion de empresas de los resultados de busqueda

// Patrones que indican que el titulo NO es una empresa
const ARTICLE_PATTERNS = [
  // Listas y rankings
  'top ', 'top-', 'mejores ', 'principales ', 'ranking', 'listado',
  'lista de', 'directorio', '# de', 'las mejores', 'los mejores',
  // Preguntas
  '¿', 'cuáles son', 'cuales son', 'qué es', 'que es', 'cómo',
  'como llegar', 'dónde', 'donde queda', 'por qué', 'por que',
  // Articulos y guias
  'cosas que', 'things to', 'guia de', 'guía de', 'guide to',
  'what is', 'how to', 'que hacer', 'qué hacer',
  // Turismo y general
  'turismo', 'tourism', 'centro histórico', 'centro historico',
  'things to do', 'places to', 'lugares para', 'que visitar',
  'atractivos', 'actividades en',
  // Economia / informacion general
  'economy', 'economía', 'economia de', 'industrias en',
  'industria en ', 'sector industrial', 'panorama',
  // Wikipedia / enciclopedia
  'wikipedia', 'enciclopedia',
  // Noticias y blogs
  'tendencias', 'trends', 'noticias', 'news', 'blog',
  'artículo', 'articulo', 'article', 'review', 'reseña',
  // Empleo
  'vacantes', 'empleo', 'trabajo en', 'bolsa de trabajo',
  'indeed', 'computrabajo', 'occ mundial',
  // Educacion
  'universidad', 'curso', 'diplomado', 'maestría', 'maestria',
  // Clutch / comparadores
  'clutch.co', 'clutch -', '- clutch', 'goodfirms', 'sortlist',
  // Generico
  'february 2', 'march 2', 'january 2', 'abril 2', 'mayo 2',
  'junio 2', 'julio 2', 'agosto 2', 'septiembre 2', 'octubre 2',
  'noviembre 2', 'diciembre 2', 'enero 2', 'febrero 2',
  // Listados genericos
  'empresas destacadas', 'empresas en ', 'empresas ubicadas',
  'fábricas en ', 'fabricas en ', 'tiendas en ',
  'negocios en ', 'comercios en ', 'textiles en ',
  'industria en ', 'alimentos en ', 'servicios en ',
  // Directorios
  '- cybo', 'cylex', 'rankeando', 'allbiz', 'mexicoo',
  'guiatel', 'kompass', 'yellow pages',
  // Paginas genericas
  'menú', 'menu', 'inicio', 'home page',
];

// Dominios que NO son sitios de empresas
const BLACKLIST_DOMAINS = [
  'wikipedia', 'facebook.com', 'twitter.com', 'linkedin.com',
  'youtube.com', 'tripadvisor', 'yelp.com', 'seccionamarilla',
  'paginas-amarillas', 'instagram.com', 'tiktok.com', 'pinterest',
  'reddit.com', 'quora.com', 'indeed.com', 'computrabajo',
  'occ.com', 'glassdoor', 'clutch.co', 'goodfirms', 'sortlist',
  'crunchbase.com', 'bloomberg.com', 'forbes.com', 'reuters',
  'gobierno.', 'gob.mx', 'medium.com', 'blogger.com',
  'wordpress.com', 'blogspot.com', 'slideshare', 'scribd',
  'mapquest', 'foursquare', 'trustpilot', 'bbb.org',
  'yellowpages', 'whitepages', 'dnb.com', 'zoominfo.com',
  'amazon.com', 'mercadolibre', 'ebay', 'aliexpress',
  'datos.gob', 'inegi.org',
  'cybo.com', 'cylex.mx', 'cylex.com', 'rankeando.com',
  'allbiz.mx', 'allbiz.com', 'mexicoo.mx', 'guiatel.com',
  'kompass.com', 'europages.com', 'manta.com',
  'mexicoindustry.com', 'argal.mx',
];

// Sufijos que indican un nombre de empresa real
const BUSINESS_SUFFIXES = [
  's.a.', 'sa de cv', 's.a. de c.v.', 's. de r.l.', 'srl',
  's.c.', 'sapi', 's.a.p.i.', 'inc', 'corp', 'ltd', 'llc',
  'group', 'grupo', 'industrial', 'industrias', 'comercial',
  'comercializadora', 'distribuidora', 'constructora', 'consultores',
  'servicios', 'soluciones', 'manufactura', 'fabricación',
  'fabricacion', 'textiles', 'alimentos', 'tecnología', 'tecnologia',
  'logística', 'logistica', 'inmobiliaria', 'automotriz',
  'farmacéutica', 'farmaceutica', 'plásticos', 'plasticos',
  'químicos', 'quimicos', 'metalmecánica', 'metalmecanica',
  'maquinados', 'aceros', 'empaques', 'envases',
];

// Extraer numeros de telefono de texto
function extractPhoneNumbers(text) {
  const patterns = [
    /\+52\s*\d{2,3}\s*\d{4}\s*\d{4}/g,
    /\(\d{2,3}\)\s*\d{4}[-\s]?\d{4}/g,
    /\b\d{2,3}\s*\d{4}\s*\d{4}\b/g,
    /\b\d{2,3}-\d{4}-\d{4}\b/g,
    /\b\d{10}\b/g,
  ];

  const phones = [];
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      phones.push(...matches.map((p) => normalizePhone(p)));
    }
  }

  return [...new Set(phones)].filter((p) => p.length >= 10);
}

function normalizePhone(phone) {
  let normalized = phone.replace(/[^\d+]/g, '');
  if (!normalized.startsWith('+52') && normalized.length === 10) {
    normalized = '+52' + normalized;
  }
  return normalized;
}

// Extraer emails de texto
function extractEmails(text) {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailPattern);
  if (!matches) return [];

  return [...new Set(matches)].filter(
    (email) =>
      !email.includes('example') &&
      !email.includes('test@') &&
      !email.includes('usuario@') &&
      !email.includes('noreply') &&
      !email.includes('no-reply') &&
      !email.includes('sentry') &&
      !email.endsWith('.png') &&
      !email.endsWith('.jpg') &&
      !email.endsWith('.svg')
  );
}

// Extraer URL del sitio web
function extractWebsite(text, url) {
  if (url) {
    try {
      const urlObj = new URL(url);
      const host = urlObj.hostname.toLowerCase();
      if (!BLACKLIST_DOMAINS.some((d) => host.includes(d))) {
        return `${urlObj.protocol}//${urlObj.hostname}`;
      }
    } catch (e) {
      // URL invalida
    }
  }

  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  const matches = text.match(urlPattern);

  if (matches) {
    for (const match of matches) {
      try {
        const urlObj = new URL(match);
        const host = urlObj.hostname.toLowerCase();
        if (!BLACKLIST_DOMAINS.some((d) => host.includes(d))) {
          return `${urlObj.protocol}//${urlObj.hostname}`;
        }
      } catch (e) {
        continue;
      }
    }
  }

  return undefined;
}

// Extraer direccion de texto
function extractAddress(text, cityName, zoneName) {
  const patterns = [
    /(?:calle|av\.?|avenida|blvd\.?|boulevard)\s+[^,.\n]+(?:,\s*(?:col\.?|colonia)\s*[^,.\n]+)?/gi,
    new RegExp(`(?:col\\.?|colonia)\\s*${zoneName}[^,.\n]*`, 'gi'),
    /C\.?P\.?\s*\d{5}/gi,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return undefined;
}

// Detectar si un titulo de busqueda parece una empresa real
function isLikelyBusinessName(title) {
  const lower = title.toLowerCase().trim();

  // Rechazar si es muy corto (< 3 chars) o muy largo (> 80 chars = articulo)
  if (lower.length < 3 || lower.length > 80) return false;

  // Rechazar si empieza con numero (listas: "23 cosas", "5 Things", "Top 10")
  if (/^\d+\s/.test(lower)) return false;

  // Rechazar si contiene patrones de articulos
  for (const pattern of ARTICLE_PATTERNS) {
    if (lower.includes(pattern)) return false;
  }

  // Rechazar si tiene demasiadas palabras (> 10 = probablemente un titulo de articulo)
  const wordCount = lower.split(/\s+/).length;
  if (wordCount > 10) return false;

  // Bonus: aceptar inmediatamente si tiene sufijos de empresa
  const hasBusinessSuffix = BUSINESS_SUFFIXES.some((s) => lower.includes(s));
  if (hasBusinessSuffix) return true;

  // Rechazar si parece un titulo generico de ciudad/region sin empresa
  if (/^[a-záéíóúñü\s]+:\s/i.test(lower)) return false; // "Guadalajara: Economy"

  return true;
}

// Normalizar nombre de empresa - extraer el nombre real del titulo
function normalizeCompanyName(title) {
  let name = title;

  // Remover sufijos comunes de titulos web: " - Sitio Web", " | Inicio"
  name = name.replace(/\s*[\|–—]\s*.*$/, '');
  // Remover " - Ciudad" patterns
  name = name.replace(/\s*-\s*(?:inicio|home|nosotros|about|contacto|productos|servicios).*$/i, '');

  // Limpiar espacios
  name = name.replace(/\s+/g, ' ').trim();

  // Si despues de limpiar queda muy largo, tomar solo la primera parte antes del primer "."
  if (name.length > 60) {
    const dotIdx = name.indexOf('.');
    if (dotIdx > 5 && dotIdx < 60) {
      name = name.substring(0, dotIdx).trim();
    }
  }

  return name.substring(0, 100);
}

// Filtro de relevancia
function isRelevantResult(title, url) {
  const lowerUrl = url.toLowerCase();

  // Rechazar dominios en blacklist
  if (BLACKLIST_DOMAINS.some((d) => lowerUrl.includes(d))) return false;

  // Rechazar si el titulo no parece una empresa
  if (!isLikelyBusinessName(title)) return false;

  return true;
}

// Parsear resultado de busqueda
function parseSearchResult(title, snippet, url, sector, cityName, zoneName) {
  const fullText = `${title} ${snippet}`;

  // Extraer datos de contacto
  const phones = extractPhoneNumbers(fullText);
  const emails = extractEmails(fullText);
  const website = extractWebsite(fullText, url);
  const address = extractAddress(fullText, cityName, zoneName);

  // Nombre de empresa del titulo
  const company = normalizeCompanyName(title);

  // Validar que tenemos un nombre de empresa valido
  if (!company || company.length < 3) return null;

  // Segunda validacion: el nombre normalizado tambien debe pasar
  if (!isLikelyBusinessName(company)) return null;

  return {
    company,
    contact: 'Información General',
    phone: phones[0],
    email: emails[0],
    website,
    address,
    sector,
    source: 'WEB_SCRAPER',
    scrapedFrom: url,
  };
}

const parserService = {
  extractPhoneNumbers,
  normalizePhone,
  extractEmails,
  extractWebsite,
  extractAddress,
  isLikelyBusinessName,
  normalizeCompanyName,
  isRelevantResult,
  parseSearchResult,
};

export default parserService;
