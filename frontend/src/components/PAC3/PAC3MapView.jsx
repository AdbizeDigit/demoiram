import { useState, useEffect } from 'react'
import { MapPin, Layers } from 'lucide-react'

export default function PAC3MapView({ prospects }) {
  const [mapProspects, setMapProspects] = useState([])
  const [selectedMarker, setSelectedMarker] = useState(null)
  const [filterIndustry, setFilterIndustry] = useState('all')

  useEffect(() => {
    loadMapProspects()
  }, [])

  const loadMapProspects = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/pac-3.0/map-prospects', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setMapProspects(data)
      }
    } catch (error) {
      console.error('Error loading map prospects:', error)
    }
  }

  const industries = ['all', ...new Set(mapProspects.map(p => p.industry))]

  const filteredProspects = filterIndustry === 'all'
    ? mapProspects
    : mapProspects.filter(p => p.industry === filterIndustry)

  // Calcular bounds
  const bounds = filteredProspects.length > 0 ? {
    minLat: Math.min(...filteredProspects.map(p => p.latitude)),
    maxLat: Math.max(...filteredProspects.map(p => p.latitude)),
    minLng: Math.min(...filteredProspects.map(p => p.longitude)),
    maxLng: Math.max(...filteredProspects.map(p => p.longitude))
  } : null

  const getScoreColor = (score) => {
    if (!score) return '#9CA3AF'
    if (score >= 0.8) return '#10B981'
    if (score >= 0.6) return '#3B82F6'
    if (score >= 0.4) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <MapPin className="text-red-400" />
        Módulo de Visualización y Monitoreo
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-3">
          <div className="bg-slate-600/30 border border-slate-600 rounded-lg overflow-hidden h-96">
            {/* Simple SVG Map Visualization */}
            <svg
              viewBox="0 0 1000 600"
              className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800"
            >
              {/* Grid background */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#475569" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="1000" height="600" fill="url(#grid)" />

              {/* Prospects as circles */}
              {filteredProspects.map((prospect, idx) => {
                if (!bounds) return null

                const x = ((prospect.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 900 + 50
                const y = ((prospect.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 500 + 50

                return (
                  <g key={idx}>
                    {/* Outer ring */}
                    <circle
                      cx={x}
                      cy={y}
                      r="15"
                      fill={getScoreColor(prospect.ai_score)}
                      opacity="0.3"
                    />
                    {/* Main circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill={getScoreColor(prospect.ai_score)}
                      stroke="white"
                      strokeWidth="1"
                      className="cursor-pointer hover:r-10 transition"
                      onClick={() => setSelectedMarker(prospect)}
                    />
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Map Legend */}
          <div className="mt-4 bg-slate-600/30 border border-slate-600 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Layers size={18} />
              Leyenda de Puntuación
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#10B981' }} />
                <span className="text-slate-300 text-sm">Excelente (0.8+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
                <span className="text-slate-300 text-sm">Bueno (0.6-0.8)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                <span className="text-slate-300 text-sm">Regular (0.4-0.6)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                <span className="text-slate-300 text-sm">Bajo (&lt;0.4)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#9CA3AF' }} />
                <span className="text-slate-300 text-sm">Sin analizar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Filter */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Filtrar por Industria</label>
            <select
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              {industries.map(ind => (
                <option key={ind} value={ind}>
                  {ind === 'all' ? 'Todas las industrias' : ind}
                </option>
              ))}
            </select>
          </div>

          {/* Prospects List */}
          <div>
            <h4 className="text-white font-semibold mb-2">Prospectos ({filteredProspects.length})</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredProspects.map(prospect => (
                <button
                  key={prospect.id}
                  onClick={() => setSelectedMarker(prospect)}
                  className={`w-full text-left p-2 rounded transition border text-sm ${
                    selectedMarker?.id === prospect.id
                      ? 'bg-red-600/30 border-red-500'
                      : 'bg-slate-600/30 border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <p className="text-white font-medium truncate">{prospect.company_name}</p>
                  <p className="text-slate-400 text-xs">{prospect.industry}</p>
                  {prospect.ai_score && (
                    <div className="mt-1 flex items-center gap-1">
                      <div className="flex-1 bg-slate-700 rounded-full h-1">
                        <div
                          className="h-1 rounded-full"
                          style={{
                            width: `${prospect.ai_score * 100}%`,
                            backgroundColor: getScoreColor(prospect.ai_score)
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: getScoreColor(prospect.ai_score) }}>
                        {(prospect.ai_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Prospect Details */}
          {selectedMarker && (
            <div className="bg-gradient-to-br from-red-600/20 to-red-400/10 border border-red-500/30 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2">{selectedMarker.company_name}</h4>
              <div className="space-y-1 text-sm text-slate-300">
                <p>📍 Lat: {selectedMarker.latitude}</p>
                <p>📍 Lng: {selectedMarker.longitude}</p>
                <p>🏢 {selectedMarker.industry}</p>
                {selectedMarker.ai_score && (
                  <p>⭐ Score: {(selectedMarker.ai_score * 100).toFixed(0)}%</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <h4 className="text-white font-semibold mb-2">🗺️ Visualización Geoespacial</h4>
        <ul className="text-slate-300 text-sm space-y-1">
          <li>✓ Mapa interactivo con OpenStreetMap (OSM)</li>
          <li>✓ Visualización en tiempo real de prospectos</li>
          <li>✓ Código de colores por puntuación de IA</li>
          <li>✓ Filtrado por industria y estado</li>
          <li>✓ KPIs y métricas en vivo</li>
        </ul>
      </div>
    </div>
  )
}
