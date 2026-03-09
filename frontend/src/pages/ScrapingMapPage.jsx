import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowLeft, MapPin, Globe, Flame, Sparkles, Snowflake, Loader, Trash2, RefreshCw, Layers, BarChart3, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix iconos Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

function createCircleIcon(color, size) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: ${size}px; height: ${size}px;
      background: ${color};
      border: 3px solid rgba(255,255,255,0.9);
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 ${size}px ${color}40;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  })
}

function getIntensityColor(totalResults) {
  if (totalResults >= 50) return '#ef4444'
  if (totalResults >= 30) return '#f97316'
  if (totalResults >= 15) return '#eab308'
  if (totalResults >= 5) return '#22c55e'
  return '#06b6d4'
}

function getIntensitySize(totalScrapes) {
  return Math.min(50, Math.max(20, 16 + totalScrapes * 6))
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function ScrapingMapPage() {
  const [territories, setTerritories] = useState([])
  const [grouped, setGrouped] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedTerritory, setSelectedTerritory] = useState(null)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showList, setShowList] = useState(true)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)
  const circlesLayerRef = useRef(null)

  const fetchTerritories = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/scraping/territories')
      if (data.success) {
        setTerritories(data.territories)
        setGrouped(data.grouped)
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Error fetching territories:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      zoomControl: false
    }).setView([20, -10], 3)

    L.control.zoom({ position: 'topright' }).addTo(map)

    // Capa base oscura
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)
    circlesLayerRef.current = L.layerGroup().addTo(map)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Cargar datos
  useEffect(() => {
    fetchTerritories()
  }, [fetchTerritories])

  // Actualizar marcadores cuando cambian los datos
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return

    markersLayerRef.current.clearLayers()
    circlesLayerRef.current.clearLayers()

    if (grouped.length === 0) return

    const bounds = L.latLngBounds()

    grouped.forEach((g) => {
      const color = getIntensityColor(g.total_results)
      const size = getIntensitySize(g.total_scrapes)

      // Circulo de radio (heatmap visual)
      if (showHeatmap) {
        const radius = Math.min(80000, Math.max(20000, g.total_results * 2000))
        L.circle([g.lat, g.lng], {
          radius,
          color: color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 1,
          opacity: 0.4
        }).addTo(circlesLayerRef.current)
      }

      // Marcador principal
      const marker = L.marker([g.lat, g.lng], {
        icon: createCircleIcon(color, size)
      })

      marker.bindPopup(`
        <div style="min-width: 220px; font-family: system-ui, sans-serif;">
          <div style="font-size: 15px; font-weight: 700; color: #0ea5e9; margin-bottom: 8px;">
            ${g.location_name}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <div style="background: #1e293b; padding: 6px 8px; border-radius: 6px;">
              <div style="font-size: 10px; color: #94a3b8;">Scrapes</div>
              <div style="font-size: 16px; font-weight: 700; color: #e2e8f0;">${g.total_scrapes}</div>
            </div>
            <div style="background: #1e293b; padding: 6px 8px; border-radius: 6px;">
              <div style="font-size: 10px; color: #94a3b8;">Resultados</div>
              <div style="font-size: 16px; font-weight: 700; color: #e2e8f0;">${g.total_results}</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; font-size: 11px;">
            <span style="color: #ef4444;">Hot: ${g.total_hot}</span>
            <span style="color: #f97316;">Warm: ${g.total_warm}</span>
            <span style="color: #3b82f6;">Cold: ${g.total_cold}</span>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 6px; border-top: 1px solid #334155; padding-top: 6px;">
            Ultimo: ${formatDate(g.last_scrape)}
          </div>
        </div>
      `, { className: 'dark-popup' })

      marker.on('click', () => {
        setSelectedTerritory(g)
      })

      marker.addTo(markersLayerRef.current)
      bounds.extend([g.lat, g.lng])
    })

    if (grouped.length > 0 && bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 })
    }
  }, [grouped, showHeatmap])

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/scraping/territories/${id}`)
      fetchTerritories()
      setSelectedTerritory(null)
    } catch (err) {
      console.error('Error deleting territory:', err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm z-10 px-6 py-4">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Globe size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Mapa de Territorios Scrapeados</h1>
                <p className="text-xs text-slate-400">Visualiza todas las zonas donde se ha ejecutado scraping</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                showHeatmap ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Layers size={14} />
              Heatmap
            </button>
            <button
              onClick={() => setShowList(!showList)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                showList ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <BarChart3 size={14} />
              Panel
            </button>
            <button
              onClick={fetchTerritories}
              disabled={loading}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-3">
          <div className="max-w-[1800px] mx-auto flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-cyan-400" />
              <span className="text-slate-400">Ubicaciones:</span>
              <span className="font-bold text-white">{stats.unique_locations}</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-blue-400" />
              <span className="text-slate-400">Total scrapes:</span>
              <span className="font-bold text-white">{stats.total_territories}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-green-400" />
              <span className="text-slate-400">Resultados:</span>
              <span className="font-bold text-white">{stats.total_results}</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-red-400" />
              <span className="text-slate-400">Hot leads:</span>
              <span className="font-bold text-red-300">{stats.total_hot}</span>
            </div>

            {/* Leyenda */}
            <div className="ml-auto flex items-center gap-3 text-[11px]">
              <span className="text-slate-500">Intensidad:</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Bajo</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Medio</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Alto</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Muy alto</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Intenso</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex relative">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="absolute inset-0" />

          {loading && territories.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
              <div className="text-center">
                <Loader size={32} className="text-cyan-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Cargando territorios...</p>
              </div>
            </div>
          )}

          {!loading && territories.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="text-center bg-slate-900/90 border border-slate-800 rounded-2xl p-8 pointer-events-auto">
                <MapPin size={48} className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">Sin territorios scrapeados</h3>
                <p className="text-sm text-slate-400 mb-4">Los territorios aparecen aqui cuando ejecutas busquedas de scraping.</p>
                <Link
                  to="/dashboard/demo/scraping-intel"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
                >
                  <Globe size={16} />
                  Ir al Scraping
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        {showList && (
          <div className="w-80 border-l border-slate-800 bg-slate-950 flex flex-col">
            <div className="border-b border-slate-800 p-4">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Clock size={14} className="text-cyan-400" />
                Historial de Territorios
              </h2>
              {grouped.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">{grouped.length} ubicaciones unicas</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Selected Territory Detail */}
              {selectedTerritory && (
                <div className="border-b border-slate-800 bg-cyan-500/5 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-cyan-400 font-semibold">SELECCIONADO</p>
                      <h3 className="font-bold text-sm">{selectedTerritory.location_name}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedTerritory(null)}
                      className="text-slate-500 hover:text-slate-300 text-xs"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-900/80 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-slate-500">Scrapes</p>
                      <p className="text-lg font-bold">{selectedTerritory.total_scrapes}</p>
                    </div>
                    <div className="bg-slate-900/80 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-slate-500">Resultados</p>
                      <p className="text-lg font-bold">{selectedTerritory.total_results}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-3 text-xs">
                    <span className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-300 rounded">
                      <Flame size={10} /> {selectedTerritory.total_hot} hot
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-300 rounded">
                      <Sparkles size={10} /> {selectedTerritory.total_warm} warm
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-300 rounded">
                      <Snowflake size={10} /> {selectedTerritory.total_cold} cold
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 font-semibold">SCRAPES RECIENTES</p>
                    {selectedTerritory.scrapes.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs bg-slate-900/50 rounded p-2">
                        <div>
                          <span className="text-slate-300">{s.type}</span>
                          <span className="text-slate-500 ml-2">{s.results} res.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[10px]">{formatDate(s.date)}</span>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="text-slate-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Territory List */}
              <div className="p-3 space-y-2">
                {grouped.map((g, idx) => {
                  const color = getIntensityColor(g.total_results)
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedTerritory(g)
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.setView([g.lat, g.lng], 8, { animate: true })
                        }
                      }}
                      className={`w-full text-left rounded-xl p-3 transition-all border ${
                        selectedTerritory?.location_name === g.location_name
                          ? 'bg-cyan-500/10 border-cyan-500/30'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold text-xs truncate">{g.location_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span>{g.total_scrapes} scrapes</span>
                        <span>{g.total_results} resultados</span>
                        {g.total_hot > 0 && (
                          <span className="text-red-400">{g.total_hot} hot</span>
                        )}
                      </div>
                    </button>
                  )
                })}

                {!loading && grouped.length === 0 && (
                  <div className="text-center py-8">
                    <MapPin size={24} className="text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No hay territorios registrados</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS para popups oscuros */}
      <style>{`
        .dark-popup .leaflet-popup-content-wrapper {
          background: #0f172a;
          color: #e2e8f0;
          border: 1px solid #1e293b;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .dark-popup .leaflet-popup-tip {
          background: #0f172a;
          border: 1px solid #1e293b;
        }
        .dark-popup .leaflet-popup-close-button {
          color: #64748b;
        }
        .dark-popup .leaflet-popup-close-button:hover {
          color: #e2e8f0;
        }
      `}</style>
    </div>
  )
}
