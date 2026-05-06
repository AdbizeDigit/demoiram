import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Loader2, RefreshCw, X, Flame, AlertCircle, Clock, Eye, ChevronRight } from 'lucide-react'
import api from '../services/api'

const SEVERITY_CFG = {
  high:   { ring: 'ring-red-300', bg: 'bg-red-50', text: 'text-red-700', icon: Flame },
  medium: { ring: 'ring-amber-300', bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertCircle },
  info:   { ring: 'ring-blue-200', bg: 'bg-blue-50', text: 'text-blue-700', icon: Bell },
  low:    { ring: 'ring-gray-200', bg: 'bg-gray-50', text: 'text-gray-700', icon: Bell },
}

const TYPE_ICON = {
  positive_reply_no_followup: Flame,
  multiple_email_opens: Eye,
  stalled_negotiation: Clock,
}

export default function SellerAlertsPage() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/seller/me/alerts')
      setAlerts(data?.alerts || [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function dismiss(id) {
    setAlerts(a => a.filter(x => x.id !== id))
    try { await api.patch(`/api/seller/me/alerts/${id}/dismiss`) } catch {}
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-500" /> Alertas <span className="text-gray-400 font-normal">({alerts.length})</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Lo que tu plataforma detectó que no querés perderte</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 ring-1 ring-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center ring-1 ring-gray-200">
          <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Todo al día. Volvé en un rato 🚀</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(a => {
            const cfg = SEVERITY_CFG[a.severity] || SEVERITY_CFG.info
            const Icon = TYPE_ICON[a.type] || cfg.icon
            return (
              <div key={a.id} className={`rounded-2xl ring-1 ${cfg.ring} ${cfg.bg} p-4 flex items-start gap-3`}>
                <div className="bg-white p-2 rounded-xl flex-shrink-0">
                  <Icon className={`w-4 h-4 ${cfg.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${cfg.text}`}>{a.title}</p>
                  {a.message && <p className="text-xs text-gray-700 mt-0.5">{a.message}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {a.lead_id && (
                    <button onClick={() => navigate(`/vendedor/lead/${a.lead_id}`)}
                      className="bg-white hover:bg-gray-50 ring-1 ring-gray-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
                      Ver lead <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={() => dismiss(a.id)} className="p-1.5 hover:bg-white rounded-lg" title="Descartar">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
