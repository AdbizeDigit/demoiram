import { useState, useEffect } from 'react'
import { Flame, AlertCircle, Activity, Loader2 } from 'lucide-react'
import api from '../../services/api'

const INTENT_CFG = {
  buying:  { bg: 'bg-emerald-100 border-emerald-400', text: 'text-emerald-800', icon: Flame, title: '🔥 Lead caliente — querés cerrarlo' },
  negative:{ bg: 'bg-red-100 border-red-400',         text: 'text-red-800',     icon: AlertCircle, title: '⚠️ Respuesta negativa' },
  neutral: { bg: 'bg-gray-100 border-gray-300',       text: 'text-gray-700',    icon: Activity, title: 'Respuesta neutral' }
}

export default function IntentBanner({ leadId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/seller/leads/${leadId}/intent`)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [leadId])

  if (loading) return null
  if (!data || !data.intent) return null

  const cfg = INTENT_CFG[data.intent] || INTENT_CFG.neutral
  const Icon = cfg.icon

  return (
    <div className={`rounded-2xl border-2 p-4 ${cfg.bg}`}>
      <div className="flex items-start gap-3">
        <div className="bg-white p-2 rounded-xl flex-shrink-0">
          <Icon className={`w-5 h-5 ${cfg.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${cfg.text}`}>{cfg.title}</p>
          <p className="text-xs text-gray-700 mt-1">
            <span className="font-semibold">Acción:</span> {data.action}
          </p>
          {data.lastReply?.body && (
            <div className="mt-2 bg-white/60 rounded-lg p-2 ring-1 ring-gray-200">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Última respuesta ({data.lastReply.channel})</p>
              <p className="text-xs text-gray-800 line-clamp-2">"{data.lastReply.body}"</p>
            </div>
          )}
          {data.signals?.length > 0 && (
            <p className="text-[10px] text-gray-600 mt-1.5">
              <span className="font-semibold">Señales:</span> {data.signals.join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
