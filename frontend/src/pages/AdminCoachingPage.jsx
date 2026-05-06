import { useState, useEffect, useCallback } from 'react'
import { Brain, Loader2, AlertTriangle, TrendingDown, Users } from 'lucide-react'
import api from '../services/api'

export default function AdminCoachingPage() {
  const [sellers, setSellers] = useState([])
  const [selected, setSelected] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    api.get('/api/seller/admin/sellers').then(r => { setSellers(r.data?.sellers || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const analyze = useCallback(async (sellerId) => {
    setSelected(sellerId)
    setAnalyzing(true)
    try {
      const { data } = await api.get(`/api/seller/admin/coaching/${sellerId}`)
      setAnalysis(data)
    } catch (err) {
      alert(err?.response?.data?.message || 'Error')
    } finally {
      setAnalyzing(false)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Brain className="w-6 h-6 text-violet-600" /> Coaching automático
        </h1>
        <p className="text-sm text-gray-500 mt-1">Análisis IA por vendedor: dónde pierde, qué mejorar</p>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-violet-600 animate-spin" /></div> :
       sellers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center ring-1 ring-gray-200">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No hay vendedores creados todavía</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 bg-white rounded-2xl p-4 ring-1 ring-gray-200 h-fit">
            <p className="text-xs font-bold text-gray-700 mb-3 uppercase">Equipo</p>
            <div className="space-y-1.5">
              {sellers.map(s => (
                <button key={s.id} onClick={() => analyze(s.id)}
                  className={`w-full text-left p-2 rounded-lg ring-1 transition ${
                    selected === s.id ? 'ring-violet-400 bg-violet-50' : 'ring-gray-200 hover:bg-gray-50'
                  }`}>
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{s.leads_assigned} leads · {s.won} ganados</p>
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            {!selected ? (
              <div className="bg-white rounded-2xl p-12 text-center ring-1 ring-gray-200">
                <Brain className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Elegí un vendedor para ver el análisis</p>
              </div>
            ) : analyzing ? (
              <div className="bg-white rounded-2xl p-12 ring-1 ring-gray-200 flex justify-center"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
            ) : analysis ? (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">{analysis.seller.name}</h2>
                  <p className="text-xs text-gray-500">{analysis.seller.email}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <p className="text-[10px] text-emerald-700 font-bold">CONVERSIÓN</p>
                      <p className="text-base font-bold text-emerald-900">{analysis.conversion_rate ?? '—'}{analysis.conversion_rate !== null && '%'}</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <p className="text-[10px] text-blue-700 font-bold">RESPUESTA 30d</p>
                      <p className="text-base font-bold text-blue-900">{analysis.response_rate}%</p>
                    </div>
                    <div className="p-2 bg-violet-50 rounded-lg">
                      <p className="text-[10px] text-violet-700 font-bold">CONTACTOS</p>
                      <p className="text-base font-bold text-violet-900">{analysis.stats_30d?.sent || 0}</p>
                    </div>
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <p className="text-[10px] text-amber-700 font-bold">DÍAS A PERDIDO</p>
                      <p className="text-base font-bold text-amber-900">{analysis.avg_days_to_lost ?? '—'}</p>
                    </div>
                  </div>
                </div>

                {analysis.insights?.length > 0 && (
                  <div className="bg-amber-50 ring-1 ring-amber-200 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Insights de la IA
                    </h3>
                    <div className="space-y-2">
                      {analysis.insights.map((i, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl ring-1 ring-amber-100">
                          <p className="text-xs text-gray-800">{i.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Distribución por etapa</h3>
                  <div className="space-y-1.5">
                    {analysis.stages.map(s => {
                      const total = analysis.stages.reduce((sum, x) => sum + parseInt(x.c), 0)
                      const pct = total > 0 ? (parseInt(s.c) / total) * 100 : 0
                      return (
                        <div key={s.stage} className="flex items-center gap-3">
                          <span className="w-32 text-xs text-gray-700 truncate">{s.stage}</span>
                          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                            <div className="h-full bg-violet-500" style={{ width: `${pct}%` }} />
                            <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white mix-blend-plus-lighter">{s.c}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
