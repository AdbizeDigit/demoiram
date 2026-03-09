import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, MapPin, Play, Square, Loader, ChevronDown, AlertTriangle, Users, Zap, Copy, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function ScrapingIntelDemo() {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [searchRadius, setSearchRadius] = useState(50)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [error, setError] = useState('')
  const [expandedResults, setExpandedResults] = useState({})
  const [copied, setCopied] = useState(false)
  
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)

  // Inicializar mapa
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([20, 0], 2)
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current)

      mapInstanceRef.current.on('click', (e) => {
        const { lat, lng } = e.latlng
        setSelectedLocation({ lat, lng })
        setError('')

        // Remover marcador anterior
        if (markerRef.current) {
          mapInstanceRef.current.removeLayer(markerRef.current)
        }

        // Remover círculo anterior
        if (circleRef.current) {
          mapInstanceRef.current.removeLayer(circleRef.current)
        }

        // Agregar nuevo marcador
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

        // Agregar círculo con el radio
        circleRef.current = L.circle([lat, lng], {
          color: '#06b6d4',
          fillColor: '#06b6d4',
          fillOpacity: 0.1,
          weight: 2,
          radius: searchRadius * 1000 // convertir km a metros
        }).addTo(mapInstanceRef.current)

        mapInstanceRef.current.setView([lat, lng], 10)
      })
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Actualizar círculo cuando cambia el radio
  useEffect(() => {
    if (circleRef.current && selectedLocation) {
      mapInstanceRef.current.removeLayer(circleRef.current)
      circleRef.current = L.circle([selectedLocation.lat, selectedLocation.lng], {
        color: '#06b6d4',
        fillColor: '#06b6d4',
        fillOpacity: 0.1,
        weight: 2,
        radius: searchRadius * 1000
      }).addTo(mapInstanceRef.current)
    }
  }, [searchRadius, selectedLocation])

  const handlePlaySearch = async () => {
    if (!selectedLocation) {
      setError('Selecciona una ubicación en el mapa.')
      return
    }

    setError('')
    setSearchResults([])
    setIsSearching(true)

    try {
      // Buscar noticias en la zona
      const response = await api.post('/api/scraping/news-search', {
        query: `companies opportunities events ${selectedLocation.lat},${selectedLocation.lng}`,
        limit: 50
      })

      // Procesar resultados
      const processedResults = response.data.articles.map((article, idx) => ({
        id: idx,
        title: article.title,
        source: article.source,
        url: article.url,
        description: article.description,
        published_at: article.published_at,
        image: article.image
      }))

      setSearchResults(processedResults)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al buscar en la zona.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleStop = () => {
    setIsSearching(false)
    setSearchResults([])
  }

  const toggleResult = (id) => {
    setExpandedResults(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
                <h1 className="text-3xl font-black">Scrapping por Zona</h1>
                <p className="text-sm text-slate-400">Marca un área en el mapa y busca oportunidades automáticamente</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Map + Controls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Map Container */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="h-96 bg-slate-950" ref={mapRef} />
            </div>

            {/* Controls */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Radio Control */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-slate-300">Radio de búsqueda</label>
                  <span className="text-sm font-bold text-cyan-400">{searchRadius} km</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>10 km</span>
                  <span>500 km</span>
                </div>
              </div>

              {/* Location Info */}
              {selectedLocation && (
                <div className="bg-slate-950/50 rounded-lg p-3 text-xs text-slate-300 space-y-1">
                  <p><span className="text-slate-500">Ubicación:</span> {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>
                  <p><span className="text-slate-500">Radio:</span> {searchRadius} km</p>
                </div>
              )}

              {/* Play/Stop Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handlePlaySearch}
                  disabled={!selectedLocation || isSearching}
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
                  <li>1. Haz clic en el mapa para marcar la ubicación</li>
                  <li>2. Ajusta el radio de búsqueda con el slider</li>
                  <li>3. Pulsa Play para comenzar la búsqueda</li>
                  <li>4. Los resultados aparecerán a la derecha</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full">
              {/* Header */}
              <div className="border-b border-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm">Resultados</h2>
                  <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">
                    {searchResults.length} encontrados
                  </span>
                </div>
              </div>

              {/* Results List */}
              <div className="flex-1 overflow-y-auto">
                {searchResults.length === 0 && !isSearching && (
                  <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-lg bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                      <MapPin size={24} className="text-slate-600" />
                    </div>
                    <p className="text-xs text-slate-400">Marca una zona y pulsa Play para ver resultados</p>
                  </div>
                )}

                {isSearching && (
                  <div className="p-6 text-center">
                    <div className="inline-block">
                      <Loader size={24} className="text-cyan-400 animate-spin" />
                    </div>
                    <p className="text-xs text-slate-400 mt-3">Buscando oportunidades...</p>
                  </div>
                )}

                <div className="space-y-2 p-4">
                  {searchResults.map((result) => (
                    <div key={result.id} className="bg-slate-950/50 rounded-lg overflow-hidden border border-slate-800/50">
                      <button
                        onClick={() => toggleResult(result.id)}
                        className="w-full text-left p-3 hover:bg-slate-950 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-cyan-300 line-clamp-2">{result.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{result.source}</p>
                          </div>
                          <ChevronDown
                            size={16}
                            className={`flex-shrink-0 mt-0.5 transition-transform ${expandedResults[result.id] ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </button>

                      {expandedResults[result.id] && (
                        <div className="border-t border-slate-800/50 p-3 space-y-2">
                          {result.description && (
                            <p className="text-xs text-slate-300">{result.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-500">
                              {new Date(result.published_at).toLocaleDateString('es-ES')}
                            </p>
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                              Leer →
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              {searchResults.length > 0 && (
                <div className="border-t border-slate-800 p-3">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(searchResults, null, 2))}
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
                        Copiar resultados
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScrapingIntelDemo
