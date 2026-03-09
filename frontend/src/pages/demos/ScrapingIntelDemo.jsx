import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Search, Play, Loader, Mail, Phone, Building2, Globe, MapPin, Download, ChevronDown, ChevronUp, ExternalLink, Users, Briefcase, Newspaper, TrendingUp, X, Filter, Flame, Sparkles, Snowflake, Star, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix para los iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

function ScrapingIntelDemo() {
  const [location, setLocation] = useState('Madrid')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState([])
  const [filteredResults, setFilteredResults] = useState([])
  const [error, setError] = useState('')
  const [expandedResults, setExpandedResults] = useState({})
  const [stats, setStats] = useState(null)
  const [selectedResult, setSelectedResult] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [qualityFilter, setQualityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('score') // score, date, name

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  // Inicializar mapa
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([40.4637, -3.7492], 6)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Aplicar filtros y búsqueda
  useEffect(() => {
    let filtered = [...results]

    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.type === filterType)
    }

    // Filtro por calidad
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(r => r.leadQuality === qualityFilter)
    }

    // Búsqueda por texto
    if (searchText.trim()) {
      const search = searchText.toLowerCase()
      filtered = filtered.filter(r => {
        return (
          (r.name && r.name.toLowerCase().includes(search)) ||
          (r.author && r.author.toLowerCase().includes(search)) ||
          (r.company && r.company.toLowerCase().includes(search)) ||
          (r.email && r.email.toLowerCase().includes(search)) ||
          (r.industry && r.industry.toLowerCase().includes(search)) ||
          (r.content && r.content.toLowerCase().includes(search)) ||
          (r.description && r.description.toLowerCase().includes(search))
        )
      })
    }

    // Ordenamiento
    if (sortBy === 'score') {
      filtered.sort((a, b) => (b.leadScore || 0) - (a.leadScore || 0))
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => {
        if (!a.publishedDate) return 1
        if (!b.publishedDate) return -1
        return new Date(b.publishedDate) - new Date(a.publishedDate)
      })
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => {
        const nameA = a.name || a.author || a.company || ''
        const nameB = b.name || b.author || b.company || ''
        return nameA.localeCompare(nameB)
      })
    }

    setFilteredResults(filtered)
  }, [filterType, qualityFilter, searchText, sortBy, results])

  // Actualizar marcadores en el mapa
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Limpiar marcadores anteriores
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker)
    })
    markersRef.current = []

    // Agregar nuevos marcadores (usar filteredResults en lugar de results)
    filteredResults.forEach((result) => {
      if (result.lat && result.lng) {
        // Definir color del marcador según el tipo
        let iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'

        if (result.type === 'potential_client') {
          iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png'
        } else if (result.type === 'business_directory') {
          iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'
        } else if (result.type === 'news_mention') {
          iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png'
        } else if (result.type === 'google_enriched') {
          iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png'
        }

        const marker = L.marker([result.lat, result.lng], {
          icon: L.icon({
            iconUrl: iconUrl,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        })
        .bindPopup(`
          <div style="min-width: 200px;">
            <strong style="font-size: 14px; color: #0ea5e9;">
              ${result.name || result.author || result.company || 'Resultado'}
            </strong>
            <p style="margin: 4px 0; font-size: 12px; color: #64748b;">
              ${getResultTypeLabel(result.type)}
            </p>
            ${result.email ? `<p style="margin: 2px 0; font-size: 11px;">📧 ${result.email}</p>` : ''}
            ${result.phone ? `<p style="margin: 2px 0; font-size: 11px;">📞 ${result.phone}</p>` : ''}
          </div>
        `)
        .addTo(mapInstanceRef.current)

        // Click en marcador para seleccionar resultado
        marker.on('click', () => {
          setSelectedResult(result.id)
          setExpandedResults({ [result.id]: true })
          // Scroll al resultado en la lista
          const element = document.getElementById(`result-${result.id}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        })

        markersRef.current.push(marker)
      }
    })

    // Ajustar vista del mapa
    if (filteredResults.length > 0 && stats?.mapCenter) {
      mapInstanceRef.current.setView([stats.mapCenter.lat, stats.mapCenter.lng], stats.mapCenter.zoom)
    }
  }, [filteredResults, stats])

  const getResultTypeLabel = (type) => {
    const labels = {
      'potential_client': 'Potencial Negocio',
      'business_directory': 'Empresa',
      'news_mention': 'Noticia',
      'google_enriched': 'Enriquecido'
    }
    return labels[type] || type
  }

  const getResultTypeColor = (type) => {
    const colors = {
      'potential_client': { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300' },
      'business_directory': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300' },
      'news_mention': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-300' },
      'google_enriched': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-300' }
    }
    return colors[type] || { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-300' }
  }

  const getResultTypeIcon = (type) => {
    const icons = {
      'potential_client': Users,
      'business_directory': Briefcase,
      'news_mention': Newspaper,
      'google_enriched': Globe
    }
    return icons[type] || Building2
  }

  const getQualityBadge = (quality, score) => {
    const qualities = {
      'hot': { icon: Flame, color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Hot Lead' },
      'warm': { icon: Sparkles, color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', label: 'Warm' },
      'cold': { icon: Snowflake, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Cold' },
      'low': { icon: Star, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', label: 'Low' }
    }
    return qualities[quality] || qualities.low
  }

  const handleSearch = async () => {
    if (!location.trim()) {
      setError('Por favor ingresa una ubicación')
      return
    }

    setError('')
    setResults([])
    setStats(null)
    setIsSearching(true)
    setExpandedResults({})
    setSelectedResult(null)

    try {
      const response = await api.post('/api/multi-scraping/auto-search', {
        location: location,
        limit: 30
      })

      if (response.data.success) {
        setResults(response.data.results || [])
        setStats({
          mapCenter: response.data.mapCenter,
          total: response.data.totalResults,
          sources: response.data.sourcesProcessed
        })

        // Registrar territorio scrapeado
        const qd = response.data.qualityDistribution || {}
        const mc = response.data.mapCenter || {}
        api.post('/api/scraping/territories', {
          location_name: location,
          lat: mc.lat || 0,
          lng: mc.lng || 0,
          zoom: mc.zoom || 10,
          scrape_type: 'auto-search',
          results_count: response.data.totalResults || 0,
          hot_leads: qd.hot || 0,
          warm_leads: qd.warm || 0,
          cold_leads: qd.cold || 0,
          metadata: { sources: response.data.sourcesProcessed }
        }).catch(() => {})
      } else {
        setError(response.data.error || 'Error en la búsqueda')
      }
    } catch (err) {
      console.error('Search error:', err)
      setError(err.response?.data?.error || 'Error al realizar la búsqueda automática')
    } finally {
      setIsSearching(false)
    }
  }

  const toggleExpand = (id) => {
    setExpandedResults(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const exportToCSV = () => {
    if (results.length === 0) return

    const headers = ['Tipo', 'Nombre/Autor', 'Email', 'Teléfono', 'Website', 'Ubicación', 'Industria', 'Descripción']
    const rows = results.map(r => [
      getResultTypeLabel(r.type),
      r.name || r.author || r.company || '',
      r.email || '',
      r.phone || '',
      r.website || '',
      r.location || r.address || '',
      r.industry || '',
      r.description || r.content || ''
    ])

    let csv = headers.join(',') + '\n'
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scraping-${location}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const renderResultCard = (result) => {
    const isExpanded = expandedResults[result.id]
    const isSelected = selectedResult === result.id
    const colors = getResultTypeColor(result.type)
    const Icon = getResultTypeIcon(result.type)
    const quality = getQualityBadge(result.leadQuality, result.leadScore)
    const QualityIcon = quality.icon

    return (
      <div
        id={`result-${result.id}`}
        key={result.id}
        className={`bg-slate-900/50 border rounded-xl overflow-hidden transition-all ${
          isSelected ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        <button
          onClick={() => toggleExpand(result.id)}
          className="w-full p-4 text-left hover:bg-slate-900/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Icon size={14} className={colors.text} />
                <span className={`text-xs px-2 py-0.5 ${colors.bg} ${colors.text} rounded font-medium`}>
                  {getResultTypeLabel(result.type)}
                </span>
                {result.leadScore && (
                  <span className={`text-xs px-2 py-0.5 border rounded font-medium flex items-center gap-1 ${quality.color}`}>
                    <QualityIcon size={10} />
                    {quality.label} ({result.leadScore})
                  </span>
                )}
                {result.urgency === 'high' && (
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded flex items-center gap-1">
                    <TrendingUp size={10} />
                    Urgente
                  </span>
                )}
              </div>

              <h3 className="font-semibold text-sm text-white mb-1 line-clamp-2">
                {result.name || result.author || result.company || result.newsTitle || 'Sin nombre'}
              </h3>

              {result.title && <p className="text-xs text-slate-400 mb-1">{result.title}</p>}
              {result.industry && <p className="text-xs text-slate-500">{result.industry}</p>}
              {result.newsSource && <p className="text-xs text-slate-500">{result.newsSource}</p>}
            </div>

            <div className="flex items-center gap-2">
              {result.lat && result.lng && (
                <MapPin size={14} className="text-cyan-400" />
              )}
              {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-slate-800 p-4 space-y-3 bg-slate-950/30">
            {/* Contenido según tipo */}
            {result.content && (
              <p className="text-sm text-slate-300 leading-relaxed">{result.content}</p>
            )}

            {result.description && (
              <p className="text-sm text-slate-300 leading-relaxed">{result.description}</p>
            )}

            {result.newsTitle && result.context && (
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Contexto:</p>
                <p className="text-sm text-slate-300">{result.context}</p>
              </div>
            )}

            {/* Información de contacto */}
            <div className="space-y-2 pt-2 border-t border-slate-800/50">
              {result.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-cyan-400 flex-shrink-0" />
                  <span className="text-cyan-300 break-all">{result.email}</span>
                </div>
              )}

              {result.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-cyan-400 flex-shrink-0" />
                  <span className="text-cyan-300">{result.phone}</span>
                </div>
              )}

              {result.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe size={14} className="text-cyan-400 flex-shrink-0" />
                  <a
                    href={`https://${result.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-300 hover:text-cyan-200 break-all flex items-center gap-1"
                  >
                    {result.website}
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}

              {(result.location || result.address) && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 size={14} className="text-cyan-400 flex-shrink-0" />
                  <span className="text-slate-400">{result.location || result.address}</span>
                </div>
              )}
            </div>

            {/* Señales de Compra */}
            {result.buyingSignals && result.buyingSignals.length > 0 && (
              <div className="pt-3 border-t border-slate-800/50">
                <p className="text-xs font-semibold text-cyan-400 mb-2 flex items-center gap-1">
                  <TrendingUp size={12} />
                  Señales de Compra Detectadas
                </p>
                <div className="space-y-2">
                  {result.buyingSignals.map((signal, idx) => (
                    <div key={idx} className="bg-slate-900/50 rounded-lg p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          signal.urgency === 'high' ? 'bg-red-500/20 text-red-300' : 'bg-orange-500/20 text-orange-300'
                        }`}>
                          {signal.signal}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-1">{signal.description}</p>
                      <p className="text-xs text-cyan-300">💡 {signal.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score Breakdown */}
            {result.scoreBreakdown && (
              <div className="pt-3 border-t border-slate-800/50">
                <p className="text-xs font-semibold text-cyan-400 mb-2">Desglose de Puntuación</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/30 rounded p-2">
                    <p className="text-slate-500">Intención</p>
                    <p className="text-white font-semibold">{result.scoreBreakdown.intent}/35</p>
                  </div>
                  <div className="bg-slate-900/30 rounded p-2">
                    <p className="text-slate-500">Recencia</p>
                    <p className="text-white font-semibold">{result.scoreBreakdown.recency}/20</p>
                  </div>
                  <div className="bg-slate-900/30 rounded p-2">
                    <p className="text-slate-500">Contacto</p>
                    <p className="text-white font-semibold">{result.scoreBreakdown.contact}/25</p>
                  </div>
                  <div className="bg-slate-900/30 rounded p-2">
                    <p className="text-slate-500">Calidad</p>
                    <p className="text-white font-semibold">{result.scoreBreakdown.quality}/15</p>
                  </div>
                  <div className="bg-slate-900/30 rounded p-2">
                    <p className="text-slate-500">Fit Mercado</p>
                    <p className="text-white font-semibold">{result.scoreBreakdown.fit}/10</p>
                  </div>
                  <div className="bg-slate-900/30 rounded p-2">
                    <p className="text-slate-500">Presupuesto</p>
                    <p className="text-white font-semibold">{result.scoreBreakdown.budget}/10</p>
                  </div>
                </div>
              </div>
            )}

            {/* Factores de Score */}
            {result.scoreFactors && result.scoreFactors.length > 0 && (
              <div className="pt-3 border-t border-slate-800/50">
                <p className="text-xs font-semibold text-cyan-400 mb-2">Factores de Calificación</p>
                <div className="space-y-1">
                  {result.scoreFactors.slice(0, 5).map((factor, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{factor.factor}</span>
                      <span className="text-cyan-400 font-semibold">+{factor.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emails Probables */}
            {result.probableEmails && result.probableEmails.length > 0 && (
              <div className="pt-3 border-t border-slate-800/50">
                <p className="text-xs font-semibold text-cyan-400 mb-2">📧 Emails Probables</p>
                <div className="space-y-1">
                  {result.probableEmails.slice(0, 3).map((email, idx) => (
                    <div key={idx} className="text-xs text-slate-400 font-mono bg-slate-900/30 rounded px-2 py-1">
                      {email}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decisores */}
            {result.decisionMakers && result.decisionMakers.length > 0 && (
              <div className="pt-3 border-t border-slate-800/50">
                <p className="text-xs font-semibold text-cyan-400 mb-2">👔 Decisores Identificados</p>
                <div className="space-y-1">
                  {result.decisionMakers.map((dm, idx) => (
                    <div key={idx} className="text-xs bg-slate-900/30 rounded px-2 py-1">
                      <span className="text-white font-semibold">{dm.name}</span>
                      <span className="text-slate-400"> - {dm.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prioridad */}
            {result.priority && (
              <div className="pt-3 border-t border-slate-800/50">
                <p className="text-xs font-semibold text-cyan-400 mb-1">🎯 Prioridad de Contacto</p>
                <p className={`text-xs font-semibold ${
                  result.priority.startsWith('P0') ? 'text-red-300' :
                  result.priority.startsWith('P1') ? 'text-orange-300' :
                  result.priority.startsWith('P2') ? 'text-blue-300' :
                  'text-slate-400'
                }`}>
                  {result.priority}
                </p>
              </div>
            )}

            {/* Metadata adicional */}
            {(result.employees || result.founded || result.source || result.publishedDate) && (
              <div className="pt-2 border-t border-slate-800/50 flex flex-wrap gap-3 text-xs text-slate-500">
                {result.employees && <span>👥 {result.employees} empleados</span>}
                {result.founded && <span>📅 Fundada: {result.founded}</span>}
                {result.source && <span>📍 Fuente: {result.source}</span>}
                {result.publishedDate && <span>🗓️ {new Date(result.publishedDate).toLocaleDateString()}</span>}
              </div>
            )}

            {/* Redes sociales */}
            {(result.linkedin || result.twitter) && (
              <div className="pt-2 border-t border-slate-800/50 space-y-1">
                {result.linkedin && (
                  <a
                    href={`https://${result.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    LinkedIn <ExternalLink size={10} />
                  </a>
                )}
                {result.twitter && (
                  <a
                    href={`https://${result.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    Twitter <ExternalLink size={10} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-4 transition-colors group text-sm"
          >
            <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Volver
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Search size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black">Scraping Automático Multi-Fuente</h1>
                <p className="text-sm text-slate-400">Búsqueda automática en redes sociales, directorios, noticias y Google</p>
              </div>
            </div>
            <Link
              to="/dashboard/scraping-map"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold text-cyan-300 hover:bg-slate-700 transition-all"
            >
              <Globe size={16} />
              Ver Mapa Global
            </Link>
          </div>

          {/* Search Bar */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Ingresa ubicación (ej: Madrid, España, Barcelona...)"
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSearching ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    Buscar
                  </>
                )}
              </button>
            </div>

            {/* Search in Results */}
            {results.length > 0 && (
              <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Buscar en resultados (nombre, email, industria...)"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                    showAdvancedFilters
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <SlidersHorizontal size={16} />
                  Filtros
                </button>
              </div>
            )}

            {/* Advanced Filters */}
            {showAdvancedFilters && results.length > 0 && (
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Quality Filter */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Calidad de Lead</label>
                    <select
                      value={qualityFilter}
                      onChange={(e) => setQualityFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="all">Todas las calidades</option>
                      <option value="hot">🔥 Hot Leads (85-100)</option>
                      <option value="warm">✨ Warm (70-84)</option>
                      <option value="cold">❄️ Cold (50-69)</option>
                      <option value="low">⭐ Low (&lt;50)</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Ordenar por</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="score">Score de calidad (mayor a menor)</option>
                      <option value="date">Fecha (más reciente)</option>
                      <option value="name">Nombre (A-Z)</option>
                    </select>
                  </div>
                </div>

                {/* Active Filters Summary */}
                {(qualityFilter !== 'all' || searchText.trim()) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500">Filtros activos:</span>
                    {qualityFilter !== 'all' && (
                      <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded text-xs flex items-center gap-1">
                        Calidad: {qualityFilter}
                        <button onClick={() => setQualityFilter('all')} className="hover:text-cyan-200">
                          <X size={12} />
                        </button>
                      </span>
                    )}
                    {searchText.trim() && (
                      <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded text-xs flex items-center gap-1">
                        Búsqueda: "{searchText}"
                        <button onClick={() => setSearchText('')} className="hover:text-cyan-200">
                          <X size={12} />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-200">
                <X size={16} />
                {error}
              </div>
            )}
          </div>

          {/* Stats with Filters */}
          {stats && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
              <button
                onClick={() => setFilterType('all')}
                className={`rounded-xl p-3 transition-all text-left ${
                  filterType === 'all'
                    ? 'bg-slate-700 border-2 border-cyan-500'
                    : 'bg-slate-900/50 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className="text-xs text-slate-400 mb-1">Total Resultados</p>
                <p className="text-xl font-bold text-white">{stats.total}</p>
              </button>
              <button
                onClick={() => setFilterType('potential_client')}
                className={`rounded-xl p-3 transition-all text-left ${
                  filterType === 'potential_client'
                    ? 'bg-purple-500/30 border-2 border-purple-400'
                    : 'bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20'
                }`}
              >
                <p className="text-xs text-purple-300 mb-1">Pot. Negocios</p>
                <p className="text-xl font-bold text-purple-200">{stats.sources.potentialClients}</p>
              </button>
              <button
                onClick={() => setFilterType('business_directory')}
                className={`rounded-xl p-3 transition-all text-left ${
                  filterType === 'business_directory'
                    ? 'bg-blue-500/30 border-2 border-blue-400'
                    : 'bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20'
                }`}
              >
                <p className="text-xs text-blue-300 mb-1">Empresas</p>
                <p className="text-xl font-bold text-blue-200">{stats.sources.businessDirectories}</p>
              </button>
              <button
                onClick={() => setFilterType('news_mention')}
                className={`rounded-xl p-3 transition-all text-left ${
                  filterType === 'news_mention'
                    ? 'bg-orange-500/30 border-2 border-orange-400'
                    : 'bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20'
                }`}
              >
                <p className="text-xs text-orange-300 mb-1">Noticias</p>
                <p className="text-xl font-bold text-orange-200">{stats.sources.news}</p>
              </button>
              <button
                onClick={() => setFilterType('google_enriched')}
                className={`rounded-xl p-3 transition-all text-left ${
                  filterType === 'google_enriched'
                    ? 'bg-green-500/30 border-2 border-green-400'
                    : 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20'
                }`}
              >
                <p className="text-xs text-green-300 mb-1">Enriquecidos</p>
                <p className="text-xl font-bold text-green-200">{stats.sources.enriched}</p>
              </button>
            </div>
          )}
        </div>

        {/* Main Content: Map + Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Results List */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="border-b border-slate-800 p-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-sm">Resultados</h2>
                  {filteredResults.length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {filteredResults.length} {filterType !== 'all' ? 'filtrados' : 'encontrados'}
                      {results.length !== filteredResults.length && ` de ${results.length}`}
                    </p>
                  )}
                </div>
                {results.length > 0 && (
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-semibold hover:bg-cyan-500/20 transition-colors"
                  >
                    <Download size={14} />
                    CSV
                  </button>
                )}
              </div>

              <div className="overflow-y-auto max-h-[calc(100vh-300px)] p-3 space-y-3">
                {isSearching && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader size={32} className="text-cyan-400 animate-spin mb-4" />
                    <p className="text-sm text-slate-400">Buscando en todas las fuentes...</p>
                    <p className="text-xs text-slate-500 mt-2">Potenciales negocios, empresas, noticias y más...</p>
                  </div>
                )}

                {!isSearching && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Search size={32} className="text-slate-600 mb-4" />
                    <p className="text-sm text-slate-400">No hay resultados</p>
                    <p className="text-xs text-slate-500 mt-1">Ingresa una ubicación y busca</p>
                  </div>
                )}

                {!isSearching && filteredResults.length === 0 && results.length > 0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Search size={32} className="text-slate-600 mb-4" />
                    <p className="text-sm text-slate-400">No hay resultados con este filtro</p>
                    <p className="text-xs text-slate-500 mt-1">Prueba con otro filtro</p>
                  </div>
                )}

                {filteredResults.map(result => renderResultCard(result))}
              </div>
            </div>
          </div>

          {/* Right: Map */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="border-b border-slate-800 p-4">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <MapPin size={16} className="text-cyan-400" />
                  Mapa de Resultados
                </h2>
              </div>
              <div className="relative" style={{ height: 'calc(100vh - 300px)' }}>
                <div ref={mapRef} className="w-full h-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScrapingIntelDemo
