import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Search, AlertTriangle, Users, Zap, ChevronDown, Copy, CheckCircle, MapPin, Loader } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function ScrapingIntelDemo() {
  const [companyInput, setCompanyInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    pains: true,
    tech: true,
    contacts: true,
    events: true
  })
  const [mapMode, setMapMode] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [searchRadius, setSearchRadius] = useState(50)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  // Inicializar mapa
  useEffect(() => {
    if (mapMode && mapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([20, 0], 2)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current)

      mapInstanceRef.current.on('click', (e) => {
        const { lat, lng } = e.latlng
        setSelectedLocation({ lat, lng })

        if (markerRef.current) {
          mapInstanceRef.current.removeLayer(markerRef.current)
        }

        markerRef.current = L.marker([lat, lng], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        }).addTo(mapInstanceRef.current)

        mapInstanceRef.current.setView([lat, lng], 10)
      })
    }

    return () => {
      if (mapMode === false && mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [mapMode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!companyInput.trim()) {
      setError('Ingresa el nombre o sitio web de la empresa.')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/api/scraping/intel', {
        companyName: companyInput.includes('.') ? null : companyInput,
        website: companyInput.includes('.') ? companyInput : null,
        industry: null,
        focus: {
          pains: true,
          tech: true,
          contacts: true,
          events: true
        }
      })
      setResult(response.data)
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError('Error al ejecutar el scrapping inteligente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearchByLocation = async () => {
    if (!selectedLocation) {
      setError('Selecciona una ubicación en el mapa.')
      return
    }

    setError('')
    setResult(null)
    setLoading(true)

    try {
      // Buscar empresas en la zona seleccionada
      const response = await api.post('/api/scraping/news-search', {
        query: `companies in ${selectedLocation.lat},${selectedLocation.lng} radius ${searchRadius}km`,
        limit: 30
      })

      setResult({
        ...response.data,
        location: selectedLocation,
        radius: searchRadius,
        isLocationBased: true
      })
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError('Error al buscar empresas en la zona.')
      }
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-6 transition-colors group text-sm"
          >
            <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Volver
          </Link>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Zap size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black">Scrapping Inteligente</h1>
                <p className="text-sm text-slate-400">Analiza empresas y extrae inteligencia de prospectos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMapMode(false)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              !mapMode
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Search size={16} className="inline mr-2" />
            Búsqueda por Empresa
          </button>
          <button
            onClick={() => setMapMode(true)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              mapMode
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <MapPin size={16} className="inline mr-2" />
            Búsqueda por Zona
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Input Section */}
            {!mapMode && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">Empresa a analizar</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={companyInput}
                        onChange={(e) => setCompanyInput(e.target.value)}
                        placeholder="Ej: Tesla, www.stripe.com, LogiChain..."
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={loading || !companyInput.trim()}
                        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {loading ? (
                          <Loader size={18} className="animate-spin" />
                        ) : (
                          <Search size={18} />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">Ingresa nombre de empresa o dominio web</p>
                  </div>
                </form>
              </div>
            )}

            {/* Map Section */}
            {mapMode && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="h-96 bg-slate-950" ref={mapRef} />
                <div className="p-6 space-y-4 border-t border-slate-800">
                  {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Radio de búsqueda (km)</label>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      value={searchRadius}
                      onChange={(e) => setSearchRadius(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-400 mt-1">{searchRadius} km</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSearchByLocation}
                      disabled={!selectedLocation || loading}
                      className="flex-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? (
                        <Loader size={18} className="animate-spin" />
                      ) : (
                        <>
                          <MapPin size={16} className="mr-2" />
                          Buscar en esta zona
                        </>
                      )}
                    </button>
                  </div>

                  {selectedLocation && (
                    <div className="bg-slate-950/50 rounded-lg p-3 text-xs text-slate-300">
                      <p><span className="text-slate-500">Ubicación:</span> {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>
                      <p><span className="text-slate-500">Radio:</span> {searchRadius} km</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-4">
                {/* Company Card + Lead Score */}
                {result.company && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Empresa objetivo</p>
                          <h2 className="text-2xl font-bold mb-3">{result.company?.name || 'Empresa'}</h2>
                          <div className="space-y-2 text-sm text-slate-300">
                            {result.company?.website && (
                              <p><span className="text-slate-500">Web:</span> {result.company.website}</p>
                            )}
                            {result.company?.industry && (
                              <p><span className="text-slate-500">Industria:</span> {result.company.industry}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                          className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-cyan-300"
                          title="Copiar resultado"
                        >
                          {copied ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Lead Score Card */}
                    {result.leadScore && (
                      <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-2xl p-5 flex flex-col justify-center">
                        <p className="text-xs font-semibold text-emerald-300 mb-2">LEAD SCORE</p>
                        <div className="flex items-baseline gap-1 mb-3">
                          <p className="text-4xl font-black text-emerald-400">{Math.round((result.leadScore?.score || 0.84) * 100)}</p>
                          <p className="text-sm text-emerald-300">/100</p>
                        </div>
                        <p className="text-xs text-emerald-200">{result.leadScore?.tier || 'Alta'} probabilidad</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Location Info */}
                {result.isLocationBased && result.location && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-300 mb-2">BÚSQUEDA POR ZONA</p>
                    <div className="text-sm text-slate-300 space-y-1">
                      <p><span className="text-slate-500">Ubicación:</span> {result.location.lat.toFixed(4)}, {result.location.lng.toFixed(4)}</p>
                      <p><span className="text-slate-500">Radio:</span> {result.radius} km</p>
                      <p><span className="text-slate-500">Artículos encontrados:</span> {result.total}</p>
                    </div>
                  </div>
                )}

                {/* Articles from News Search */}
                {result.articles && result.articles.length > 0 && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleSection('articles')}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Search size={16} className="text-blue-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm">Noticias y Oportunidades</p>
                          <p className="text-xs text-slate-400">{result.articles.length} artículos encontrados</p>
                        </div>
                      </div>
                      <ChevronDown size={18} className={`transition-transform ${expandedSections.articles ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.articles && (
                      <div className="px-4 pb-4 space-y-2 border-t border-slate-800 max-h-96 overflow-y-auto">
                        {result.articles.slice(0, 10).map((article, idx) => (
                          <a
                            key={idx}
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-slate-950/50 rounded-lg p-3 text-sm hover:bg-slate-950 transition-colors group"
                          >
                            <p className="font-semibold text-blue-300 group-hover:text-blue-200 mb-1">{article.title}</p>
                            <p className="text-xs text-slate-400">{article.source}</p>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Pain Signals */}
                {result.painSignals && result.painSignals.length > 0 && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleSection('pains')}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                          <AlertTriangle size={16} className="text-rose-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm">Señales de dolor</p>
                          <p className="text-xs text-slate-400">{result.painSignals.length} detectadas</p>
                        </div>
                      </div>
                      <ChevronDown size={18} className={`transition-transform ${expandedSections.pains ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.pains && (
                      <div className="px-4 pb-4 space-y-2 border-t border-slate-800">
                        {result.painSignals.map((item, idx) => (
                          <div key={idx} className="bg-slate-950/50 rounded-lg p-3 text-sm">
                            <p className="font-semibold text-rose-300 mb-1">{item.label}</p>
                            <p className="text-slate-300 text-xs">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tech Stack */}
                {result.techStack && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleSection('tech')}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                          <Zap size={16} className="text-cyan-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm">Tech Stack</p>
                          <p className="text-xs text-slate-400">Infraestructura estimada</p>
                        </div>
                      </div>
                      <ChevronDown size={18} className={`transition-transform ${expandedSections.tech ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.tech && (
                      <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
                        {result.techStack.web && (
                          <div>
                            <p className="text-xs font-semibold text-cyan-300 mb-2">Capa Web</p>
                            <ul className="space-y-1">
                              {result.techStack.web.map((t, idx) => (
                                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                  <span className="text-cyan-400 mt-1">•</span>
                                  <span>{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.techStack.data && (
                          <div>
                            <p className="text-xs font-semibold text-cyan-300 mb-2">Datos</p>
                            <ul className="space-y-1">
                              {result.techStack.data.map((t, idx) => (
                                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                  <span className="text-cyan-400 mt-1">•</span>
                                  <span>{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.techStack.ai && (
                          <div>
                            <p className="text-xs font-semibold text-cyan-300 mb-2">IA & Automatización</p>
                            <ul className="space-y-1">
                              {result.techStack.ai.map((t, idx) => (
                                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                  <span className="text-cyan-400 mt-1">•</span>
                                  <span>{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Contacts */}
                {result.contacts && result.contacts.length > 0 && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleSection('contacts')}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Users size={16} className="text-purple-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm">Contactos clave</p>
                          <p className="text-xs text-slate-400">{result.contacts.length} perfiles sugeridos</p>
                        </div>
                      </div>
                      <ChevronDown size={18} className={`transition-transform ${expandedSections.contacts ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSections.contacts && (
                      <div className="px-4 pb-4 space-y-2 border-t border-slate-800">
                        {result.contacts.map((contact, idx) => (
                          <div key={idx} className="bg-slate-950/50 rounded-lg p-3 text-sm">
                            <p className="font-semibold text-purple-300">{contact.name}</p>
                            <p className="text-xs text-slate-400 mb-1">{contact.role}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-slate-500">{contact.type}</p>
                              <p className="text-xs text-purple-300">Confianza: {Math.round((contact.confidence || 0.8) * 100)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Email Suggestions */}
                {result.emailSuggestions && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-300 mb-3">PROPUESTA DE EMAIL</p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Asunto</p>
                        <p className="text-sm font-semibold text-slate-100">{result.emailSuggestions.subject}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Apertura</p>
                        <p className="text-sm text-slate-300">{result.emailSuggestions.opener}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!result && !loading && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                  {mapMode ? <MapPin size={32} className="text-slate-600" /> : <Search size={32} className="text-slate-600" />}
                </div>
                <p className="text-slate-400 text-sm">
                  {mapMode ? 'Haz clic en el mapa para seleccionar una zona' : 'Ingresa una empresa para comenzar el análisis'}
                </p>
              </div>
            )}
          </div>

          {/* Right Panel - Info */}
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300">
              <p className="font-semibold text-slate-200 mb-2">💡 Cómo usar</p>
              <ul className="space-y-2 text-[11px]">
                <li>• <span className="text-slate-400">Búsqueda por Empresa:</span> Ingresa nombre o dominio</li>
                <li>• <span className="text-slate-400">Búsqueda por Zona:</span> Marca en el mapa y ajusta el radio</li>
                <li>• <span className="text-slate-400">Expande secciones:</span> Haz clic para ver más detalles</li>
                <li>• <span className="text-slate-400">Copia resultados:</span> Usa el botón copiar</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300">
              <p className="font-semibold text-slate-200 mb-2">🎯 Información extraída</p>
              <ul className="space-y-1 text-[11px]">
                <li>✓ Señales de dolor</li>
                <li>✓ Tech stack</li>
                <li>✓ Contactos clave</li>
                <li>✓ Eventos de compra</li>
                <li>✓ Lead score</li>
                <li>✓ Propuestas de email</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScrapingIntelDemo
