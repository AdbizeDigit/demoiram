import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, MapPin, Play, Square, Loader, ChevronDown, AlertTriangle, Copy, CheckCircle, Mail, Phone, Globe } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function ScrapingIntelDemo() {
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [companies, setCompanies] = useState([])
  const [error, setError] = useState('')
  const [expandedCompanies, setExpandedCompanies] = useState({})
  const [copied, setCopied] = useState(false)

  // Mapeo de países con nombres en español
  const countries = {
    'argentina': { name: 'Argentina', code: 'ar', coords: [-38.4161, -63.6167] },
    'chile': { name: 'Chile', code: 'cl', coords: [-35.6751, -71.5430] },
    'colombia': { name: 'Colombia', code: 'co', coords: [4.5709, -74.2973] },
    'méxico': { name: 'México', code: 'mx', coords: [23.6345, -102.5528] },
    'españa': { name: 'España', code: 'es', coords: [40.4637, -3.7492] },
    'brasil': { name: 'Brasil', code: 'br', coords: [-14.2350, -51.9253] },
    'perú': { name: 'Perú', code: 'pe', coords: [-9.1900, -75.0152] },
    'venezuela': { name: 'Venezuela', code: 've', coords: [6.4238, -66.5897] },
  }

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  // Inicializar mapa
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([20, 0], 2)

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

  // Actualizar marcadores en el mapa cuando hay empresas
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Limpiar marcadores anteriores
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker)
    })
    markersRef.current = []

    // Agregar nuevos marcadores
    companies.forEach((company) => {
      if (company.latitude && company.longitude) {
        const marker = L.marker([company.latitude, company.longitude], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        }).bindPopup(`<strong>${company.company_name}</strong><br>${company.industry}`)
          .addTo(mapInstanceRef.current)

        markersRef.current.push(marker)
      }
    })

    // Centrar mapa en el país seleccionado si hay empresas
    if (companies.length > 0 && selectedCountry) {
      const countryInfo = countries[selectedCountry]
      mapInstanceRef.current.setView(countryInfo.coords, 6)
    }
  }, [companies, selectedCountry])

  const handleCountrySelect = (countryKey) => {
    setSelectedCountry(countryKey)
    setCompanies([])
    setError('')
    setExpandedCompanies({})

    // Centrar mapa en el país
    const countryInfo = countries[countryKey]
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(countryInfo.coords, 5)
    }
  }

  const handlePlaySearch = async () => {
    if (!selectedCountry) {
      setError('Selecciona un país primero.')
      return
    }

    setError('')
    setCompanies([])
    setIsSearching(true)

    try {
      const response = await api.post('/api/scraping/search-companies', {
        country: selectedCountry,
        limit: 30
      })

      setCompanies(response.data.companies || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al buscar empresas.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleStop = () => {
    setIsSearching(false)
  }

  const toggleCompany = (id) => {
    setExpandedCompanies(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportToCSV = () => {
    const headers = ['Empresa', 'Industria', 'Email', 'Teléfono', 'Website', 'Ubicación']
    const rows = companies.map(c => [
      c.company_name,
      c.industry,
      c.email,
      c.phone,
      c.website,
      c.location
    ])

    let csv = headers.join(',') + '\n'
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `empresas-${selectedCountry}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
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
                <MapPin size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black">Búsqueda de Empresas</h1>
                <p className="text-sm text-slate-400">Encuentra empresas por país y visualiza en el mapa</p>
              </div>
            </div>
          </div>
        </div>

        {/* Country Selector */}
        <div className="mb-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <label className="block text-xs font-semibold text-slate-300 mb-3">Selecciona país</label>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {Object.entries(countries).map(([key, country]) => (
              <button
                key={key}
                onClick={() => handleCountrySelect(key)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedCountry === key
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {country.name}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4 mb-6">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Country Info */}
          {selectedCountry && (
            <div className="bg-slate-950/50 rounded-lg p-3 text-xs text-slate-300">
              <p><span className="text-slate-500">País seleccionado:</span> {countries[selectedCountry].name}</p>
            </div>
          )}

          {/* Play/Stop Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handlePlaySearch}
              disabled={!selectedCountry || isSearching}
              className="flex-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all gap-2"
            >
              {isSearching ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Play
                </>
              )}
            </button>
            <button
              onClick={handleStop}
              disabled={!isSearching}
              className="inline-flex items-center justify-center rounded-xl border border-red-500/60 px-6 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all gap-2"
            >
              <Square size={16} />
              Stop
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-slate-950/50 rounded-lg p-3 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">📍 Cómo usar:</p>
            <ul className="space-y-1">
              <li>1. Selecciona un país arriba</li>
              <li>2. Pulsa Play para buscar empresas</li>
              <li>3. Los puntos rojos en el mapa son las empresas</li>
              <li>4. Expande cada empresa para ver datos de contacto</li>
              <li>5. Exporta a CSV si lo necesitas</li>
            </ul>
          </div>
        </div>

        {/* Results and Map Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Results */}
          <div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full">
              {/* Header */}
              <div className="border-b border-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm">Empresas</h2>
                  <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">
                    {companies.length} encontradas
                  </span>
                </div>
              </div>

              {/* Results List */}
              <div className="flex-1 overflow-y-auto">
                {companies.length === 0 && !isSearching && (
                  <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-lg bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                      <MapPin size={24} className="text-slate-600" />
                    </div>
                    <p className="text-xs text-slate-400">Selecciona un país y pulsa Play</p>
                  </div>
                )}

                {isSearching && (
                  <div className="p-6 text-center">
                    <div className="inline-block">
                      <Loader size={24} className="text-cyan-400 animate-spin" />
                    </div>
                    <p className="text-xs text-slate-400 mt-3">Buscando empresas...</p>
                  </div>
                )}

                <div className="space-y-2 p-4">
                  {companies.map((company) => (
                    <div key={company.id} className="bg-slate-950/50 rounded-lg overflow-hidden border border-slate-800/50">
                      <button
                        onClick={() => toggleCompany(company.id)}
                        className="w-full text-left p-3 hover:bg-slate-950 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-cyan-300 line-clamp-2">{company.company_name}</p>
                            <p className="text-xs text-slate-500 mt-1">{company.industry}</p>
                          </div>
                          <ChevronDown
                            size={16}
                            className={`flex-shrink-0 mt-0.5 transition-transform ${expandedCompanies[company.id] ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </button>

                      {expandedCompanies[company.id] && (
                        <div className="border-t border-slate-800/50 p-3 space-y-2">
                          {company.description && (
                            <p className="text-xs text-slate-300">{company.description}</p>
                          )}

                          {/* Contact Info */}
                          <div className="space-y-1 pt-2 border-t border-slate-800/50">
                            {company.email && (
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Mail size={14} className="text-cyan-400" />
                                <span className="break-all">{company.email}</span>
                              </div>
                            )}
                            {company.phone && (
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Phone size={14} className="text-cyan-400" />
                                <span>{company.phone}</span>
                              </div>
                            )}
                            {company.website && (
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Globe size={14} className="text-cyan-400" />
                                <a
                                  href={`https://${company.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 hover:text-cyan-300 break-all"
                                >
                                  {company.website}
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Location */}
                          {company.location && (
                            <p className="text-xs text-slate-500 pt-2 border-t border-slate-800/50">
                              📍 {company.location}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              {companies.length > 0 && (
                <div className="border-t border-slate-800 p-3 space-y-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(companies, null, 2))}
                    className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 hover:text-cyan-300 py-2 transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckCircle size={14} className="text-green-400" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copiar datos
                      </>
                    )}
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 hover:text-cyan-300 py-2 transition-colors"
                  >
                    📥 Exportar CSV
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Map */}
          <div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden h-full">
              <div className="h-96 lg:h-full bg-slate-950" ref={mapRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScrapingIntelDemo
