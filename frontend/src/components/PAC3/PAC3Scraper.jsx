import { useState } from 'react'
import { Search, Play, Square, AlertCircle, CheckCircle } from 'lucide-react'

export default function PAC3Scraper({ onProspectsFound }) {
  const [isSearching, setIsSearching] = useState(false)
  const [country, setCountry] = useState('USA')
  const [industry, setIndustry] = useState('Technology')
  const [keywords, setKeywords] = useState('')
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  const countries = ['USA', 'Canada', 'Mexico', 'UK', 'Spain', 'Germany', 'France', 'Brazil']
  const industries = [
    'Technology',
    'Finance',
    'Healthcare',
    'E-commerce',
    'Manufacturing',
    'Real Estate',
    'Education',
    'Retail'
  ]

  const handleSearch = async () => {
    if (!country || !industry) {
      setError('Por favor selecciona país e industria')
      return
    }

    setIsSearching(true)
    setError('')
    setResults([])

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/pac-3.0/search-prospects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          country,
          industry,
          keywords
        })
      })

      if (response.ok) {
        const data = await response.json()
        setResults(data.prospects)
        onProspectsFound()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Error en la búsqueda')
      }
    } catch (err) {
      setError('Error al conectar con el servidor')
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Search className="text-blue-400" />
        Módulo de Rastreo y Recolección
      </h2>

      {/* Search Controls */}
      <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Country Select */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">País</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={isSearching}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Industry Select */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Industria</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              disabled={isSearching}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              {industries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          {/* Keywords Input */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Palabras Clave</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="ej: startup, SaaS..."
              disabled={isSearching}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={isSearching}
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
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded p-3 flex items-center gap-2 text-red-300">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="text-green-400" />
            Prospectos Encontrados ({results.length})
          </h3>

          <div className="space-y-3">
            {results.map((prospect, idx) => (
              <div
                key={idx}
                className="bg-slate-600/30 border border-slate-600 rounded-lg p-4 hover:border-blue-500/50 transition"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{prospect.company_name}</h4>
                    <p className="text-slate-400 text-sm mt-1">{prospect.industry}</p>
                    <p className="text-slate-400 text-sm">📍 {prospect.location}</p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-slate-300">
                      <span className="text-slate-400">Email:</span> {prospect.email || 'N/A'}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">Teléfono:</span> {prospect.phone || 'N/A'}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">Website:</span>{' '}
                      <a
                        href={prospect.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {prospect.website || 'N/A'}
                      </a>
                    </p>
                  </div>
                </div>
                {prospect.description && (
                  <p className="text-slate-400 text-sm mt-3 italic">{prospect.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-white font-semibold mb-2">ℹ️ Sobre el Rastreador</h4>
        <ul className="text-slate-300 text-sm space-y-1">
          <li>✓ Rastreo web inteligente usando OpenStreetMap</li>
          <li>✓ Búsqueda avanzada en Google y Bing</li>
          <li>✓ Análisis de repositorios GitHub</li>
          <li>✓ Extracción de datos de contacto automática</li>
          <li>✓ Geolocalización precisa de empresas</li>
        </ul>
      </div>
    </div>
  )
}
