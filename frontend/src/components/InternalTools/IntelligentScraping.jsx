import { useState } from 'react'
import { Search, Play, Square, Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

export default function IntelligentScraping() {
  const [isSearching, setIsSearching] = useState(false)
  const [source, setSource] = useState('web')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [filters, setFilters] = useState({
    country: 'all',
    industry: 'all',
    minScore: 0.5
  })

  const sources = [
    { id: 'web', label: 'Web Scraping', icon: '🌐' },
    { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { id: 'github', label: 'GitHub', icon: '🐙' },
    { id: 'news', label: 'News & Press', icon: '📰' },
    { id: 'social', label: 'Social Media', icon: '📱' },
    { id: 'crunchbase', label: 'Crunchbase', icon: '🚀' }
  ]

  const handleSearch = async () => {
    setIsSearching(true)
    // Simular búsqueda
    setTimeout(() => {
      setResults([
        {
          id: 1,
          title: 'Tech Startup XYZ',
          source: source,
          url: 'https://example.com',
          score: 0.92,
          relevance: 'Alta',
          data: {
            founded: '2023',
            funding: '$2.5M',
            employees: '15-50',
            industry: 'SaaS'
          }
        },
        {
          id: 2,
          title: 'Digital Innovation Corp',
          source: source,
          url: 'https://example.com',
          score: 0.87,
          relevance: 'Alta',
          data: {
            founded: '2022',
            funding: '$5M',
            employees: '50-100',
            industry: 'AI/ML'
          }
        }
      ])
      setIsSearching(false)
    }, 2000)
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Search className="text-blue-400" />
        Scrapping Inteligente
      </h2>

      {/* Search Controls */}
      <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Source Selection */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Fuente de Datos</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={isSearching}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              {sources.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Query Input */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Búsqueda</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ej: startups de IA en Argentina..."
              disabled={isSearching}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">País</label>
            <select
              value={filters.country}
              onChange={(e) => setFilters({...filters, country: e.target.value})}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="AR">Argentina</option>
              <option value="MX">México</option>
              <option value="BR">Brasil</option>
              <option value="US">USA</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Industria</label>
            <select
              value={filters.industry}
              onChange={(e) => setFilters({...filters, industry: e.target.value})}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todas</option>
              <option value="tech">Tecnología</option>
              <option value="fintech">Fintech</option>
              <option value="saas">SaaS</option>
              <option value="ai">IA/ML</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Score Mínimo</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={filters.minScore}
              onChange={(e) => setFilters({...filters, minScore: parseFloat(e.target.value)})}
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-1">{(filters.minScore * 100).toFixed(0)}%</p>
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={isSearching || !query}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-2 rounded transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSearching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Buscando...
            </>
          ) : (
            <>
              <Play size={18} />
              Iniciar Búsqueda
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle className="text-green-400" />
              Resultados ({results.length})
            </h3>
            <button className="flex items-center gap-2 bg-slate-600/50 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded transition">
              <Download size={18} />
              Exportar CSV
            </button>
          </div>

          <div className="space-y-3">
            {results.map((result) => (
              <div
                key={result.id}
                className="bg-slate-600/30 border border-slate-600 rounded-lg p-4 hover:border-blue-500/50 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{result.title}</h4>
                    <p className="text-slate-400 text-sm">Fuente: {result.source}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{(result.score * 100).toFixed(0)}</span>
                      </div>
                      <span className="text-green-400 font-semibold">{result.relevance}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(result.data).map(([key, value]) => (
                    <div key={key} className="bg-slate-700/50 rounded p-2">
                      <p className="text-slate-400 text-xs capitalize">{key}</p>
                      <p className="text-white font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm mt-3 inline-block"
                >
                  Ver más →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-white font-semibold mb-2">ℹ️ Sobre Scrapping Inteligente</h4>
        <ul className="text-slate-300 text-sm space-y-1">
          <li>✓ Búsqueda multi-fuente (Web, LinkedIn, GitHub, News, Social, Crunchbase)</li>
          <li>✓ Extracción inteligente de datos estructurados</li>
          <li>✓ Scoring automático de relevancia</li>
          <li>✓ Filtrado avanzado por país, industria, score</li>
          <li>✓ Exportación a CSV/JSON</li>
          <li>✓ Actualización en tiempo real</li>
        </ul>
      </div>
    </div>
  )
}
