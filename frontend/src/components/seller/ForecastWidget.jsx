import { useState, useEffect } from 'react'
import { TrendingUp, Loader2, Target } from 'lucide-react'
import api from '../../services/api'

function formatARS(n) {
  if (!n) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${Number(n).toLocaleString('es-AR')}`
}

export default function ForecastWidget() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/seller/me/forecast').then(r => { setData(r.data?.forecast); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="bg-white rounded-2xl p-4 ring-1 ring-gray-200 h-32 flex items-center justify-center"><Loader2 className="w-5 h-5 text-blue-500 animate-spin" /></div>
  if (!data) return null

  const onTrack = data.on_track === true
  const offTrack = data.on_track === false

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-violet-50 rounded-2xl p-4 ring-1 ring-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">Forecast del mes</p>
            <p className="text-[10px] text-gray-500">{data.days_left_in_month} días restantes</p>
          </div>
        </div>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
          onTrack ? 'bg-emerald-100 text-emerald-700' : offTrack ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {onTrack ? 'EN RUMBO' : offTrack ? 'BAJO PROMEDIO' : 'CONFIANZA ' + (data.confidence || '').toUpperCase()}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-[10px] text-gray-500">Ganado este mes</p>
          <p className="text-lg font-bold text-emerald-700">{formatARS(data.won_so_far)}</p>
          <p className="text-[10px] text-gray-400">{data.won_count} deal{data.won_count !== 1 ? 's' : ''}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">Pipeline ponderado</p>
          <p className="text-lg font-bold text-blue-700">{formatARS(data.weighted_pipeline)}</p>
          <p className="text-[10px] text-gray-400">{data.deals_in_pipeline} en gestión</p>
        </div>
        <div className="col-span-2 pt-2 border-t border-blue-100 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
              <Target className="w-3 h-3" /> Proyección final
            </span>
            <span className="text-base font-bold text-violet-700">{formatARS(data.projected_total)}</span>
          </div>
          {data.historical_monthly_avg > 0 && (
            <p className="text-[10px] text-gray-500 mt-0.5 text-right">
              Promedio histórico: {formatARS(data.historical_monthly_avg)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
