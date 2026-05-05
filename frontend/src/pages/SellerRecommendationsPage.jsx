import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Loader2, RefreshCw, ChevronRight, MapPin, Globe, Linkedin, Mail, Phone } from 'lucide-react'
import api from '../services/api'

function initials(name) {
  if (!name) return '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function SellerRecommendationsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [claiming, setClaiming] = useState({})
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/seller/recommendations?limit=30')
      setItems(data?.recommendations || [])
    } catch (err) {
      console.error('Error cargando recomendaciones:', err)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function handleClaim(leadId) {
    setClaiming(p => ({ ...p, [leadId]: true }))
    try {
      await api.post(`/api/seller/leads/${leadId}/claim`)
      navigate(`/vendedor/lead/${leadId}`)
    } catch (err) {
      alert(err?.response?.data?.message || 'No se pudo reclamar')
    } finally {
      setClaiming(p => ({ ...p, [leadId]: false }))
    }
  }

  const filtered = items.filter(r => {
    if (!filter) return true
    const f = filter.toLowerCase()
    return r.name?.toLowerCase().includes(f) || r.sector?.toLowerCase().includes(f) || r.city?.toLowerCase().includes(f)
  })

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" /> Recomendados por IA
          </h1>
          <p className="text-sm text-gray-500 mt-1">Leads sin asignar ordenados por probabilidad de cerrar</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Buscar empresa, sector, ciudad..."
            className="px-3 py-2 ring-1 ring-gray-200 rounded-lg text-sm focus:ring-blue-400 focus:outline-none w-64" />
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 ring-1 ring-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center ring-1 ring-gray-200">
          <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No hay leads recomendados disponibles ahora mismo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r, idx) => (
            <div key={r.id} className="bg-white rounded-2xl p-5 ring-1 ring-gray-200 hover:shadow-lg transition relative">
              {idx < 3 && (
                <span className="absolute top-3 right-3 bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  TOP {idx + 1}
                </span>
              )}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center text-sm font-bold text-violet-700">
                  {initials(r.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                  <p className="text-[11px] text-gray-500 truncate capitalize flex items-center gap-1">
                    {r.city && <MapPin className="w-3 h-3" />} {r.sector || 'sin sector'} {r.city && `· ${r.city}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3 p-2 bg-blue-50 rounded-lg">
                <span className="text-[10px] text-blue-700 font-semibold">Score IA</span>
                <span className="text-base font-bold text-blue-700">{Math.round(r.recommendation_score || 0)}</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {r.email && <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Mail className="w-2.5 h-2.5" />email</span>}
                {r.phone && <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Phone className="w-2.5 h-2.5" />tel</span>}
                {r.social_linkedin && <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Linkedin className="w-2.5 h-2.5" />in</span>}
                {r.website && <span className="text-[9px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Globe className="w-2.5 h-2.5" />web</span>}
                {r.sector_win_rate > 0 && (
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
                    sector {Math.round(r.sector_win_rate * 100)}% conv
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleClaim(r.id)} disabled={claiming[r.id]}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1">
                  {claiming[r.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Tomar lead
                </button>
                <button onClick={() => navigate(`/vendedor/lead/${r.id}`)}
                  className="text-xs font-semibold px-3 py-2 rounded-lg ring-1 ring-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1">
                  Ver <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
