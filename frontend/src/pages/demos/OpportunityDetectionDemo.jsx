import { useState } from 'react'
import { ArrowLeft, Search, ExternalLink, Loader2, AlertCircle, Twitter, Facebook, Linkedin, MessageCircle, Instagram, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const platformIcons = {
  twitter: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
  reddit: MessageCircle,
  instagram: Instagram,
  info: Info
}

const platformColors = {
  twitter: 'from-blue-400 to-blue-600',
  facebook: 'from-blue-600 to-blue-800',
  linkedin: 'from-blue-500 to-blue-700',
  reddit: 'from-orange-500 to-red-600',
  instagram: 'from-purple-500 to-pink-600',
  info: 'from-gray-500 to-gray-700'
}

function OpportunityDetectionDemo() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const response = await axios.post('http://localhost:5001/python-api/opportunity-detection/search', {
        query: query.trim()
      })

      setResults(response.data.results)
    } catch (err) {
      console.error('Error searching:', err)
      setError('Error al buscar oportunidades. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const getPlatformIcon = (iconName) => {
    const Icon = platformIcons[iconName] || Info
    return Icon
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900 to-gray-900">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 md:p-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-orange-400 hover:text-orange-300 mb-8 transition-colors group"
        >
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold">Volver al Dashboard</span>
        </Link>

        {/* Header */}
        <div className="relative mb-12 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 p-8">
          <div className="relative z-10">
            <div className="flex items-center mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4 border border-white/30">
                <Search className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
                  DETECCIÓN DE OPORTUNIDADES
                </h1>
                <p className="text-white/90 text-lg">
                  Encuentra menciones y oportunidades en redes sociales
                </p>
              </div>
            </div>
          </div>

          {/* Decorative grid */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          {/* Search Form */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-700/50 mb-8">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  ¿Qué oportunidad estás buscando?
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ej: necesito diseñador gráfico, busco desarrollador web, etc."
                    className="flex-1 px-4 py-3 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search size={20} />
                        Buscar
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-400">
                Buscaremos menciones en Twitter/X, Facebook, LinkedIn, Reddit e Instagram
              </p>
            </form>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4 mb-8 flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0" size={24} />
              <div>
                <p className="text-red-200 font-semibold">Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-12 border border-gray-700/50 text-center">
              <Loader2 size={48} className="animate-spin text-orange-400 mx-auto mb-4" />
              <p className="text-white text-lg font-semibold mb-2">Buscando oportunidades...</p>
              <p className="text-gray-400">Analizando menciones en redes sociales</p>
            </div>
          )}

          {/* Results */}
          {!loading && searched && results.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  Resultados encontrados ({results.length})
                </h2>
              </div>

              <div className="grid gap-4">
                {results.map((result, idx) => {
                  const Icon = getPlatformIcon(result.icon)
                  const colorClass = platformColors[result.icon] || platformColors.info

                  return (
                    <div
                      key={idx}
                      className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-orange-500/50 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        {/* Platform Icon */}
                        <div className={`w-12 h-12 bg-gradient-to-br ${colorClass} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon className="text-white" size={24} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">
                              {result.title}
                            </h3>
                            <a
                              href={result.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 p-2 hover:bg-gray-700 rounded-lg transition-colors"
                              title="Abrir enlace"
                            >
                              <ExternalLink className="text-gray-400 hover:text-orange-400" size={20} />
                            </a>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r ${colorClass} text-white`}>
                              {result.platform}
                            </span>
                          </div>

                          <p className="text-gray-300 text-sm mb-3 leading-relaxed">
                            {result.snippet}
                          </p>

                          <a
                            href={result.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-orange-400 hover:text-orange-300 truncate block"
                          >
                            {result.link}
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && searched && results.length === 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-12 border border-gray-700/50 text-center">
              <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-white text-lg font-semibold mb-2">No se encontraron resultados</p>
              <p className="text-gray-400">Intenta con otra búsqueda o palabras clave diferentes</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !searched && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-12 border border-gray-700/50 text-center">
              <Search size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-white text-lg font-semibold mb-2">Comienza tu búsqueda</p>
              <p className="text-gray-400">Ingresa lo que estás buscando y presiona el botón de búsqueda</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OpportunityDetectionDemo
