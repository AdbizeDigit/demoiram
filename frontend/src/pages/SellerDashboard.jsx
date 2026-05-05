import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send, TrendingUp, MessageCircle, Target, Trophy, Phone, DollarSign,
  Loader2, Sparkles, ChevronRight, Clock, Flame, AlertCircle, CheckCircle2,
  ArrowRight, Activity
} from 'lucide-react'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'

function formatCurrency(val) {
  if (!val || val === 0) return '$0'
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`
  return `$${Number(val).toLocaleString('es-AR')}`
}
function formatPct(n) { return `${Number(n || 0).toFixed(1)}%` }
function initials(name) {
  if (!name) return '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function Kpi({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-200',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-600 ring-amber-200',
    violet: 'bg-violet-50 text-violet-600 ring-violet-200',
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-200',
    red: 'bg-red-50 text-red-600 ring-red-200',
  }
  const c = colorMap[color] || colorMap.blue
  return (
    <div className="bg-white rounded-2xl p-4 ring-1 ring-gray-200 hover:shadow-md transition">
      <div className={`inline-flex p-2 rounded-xl ${c} ring-1`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-3">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function SellerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState(null)
  const [actions, setActions] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [claiming, setClaiming] = useState({})

  const load = useCallback(async () => {
    try {
      const [m, a, r] = await Promise.all([
        api.get('/api/seller/me/metrics'),
        api.get('/api/seller/me/next-actions'),
        api.get('/api/seller/recommendations?limit=6'),
      ])
      setMetrics(m.data)
      setActions(a.data)
      setRecommendations(r.data?.recommendations || [])
    } catch (err) {
      console.error('Error cargando panel vendedor:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(load, 60_000)
    return () => clearInterval(iv)
  }, [load])

  async function handleClaim(leadId) {
    setClaiming(p => ({ ...p, [leadId]: true }))
    try {
      await api.post(`/api/seller/leads/${leadId}/claim`)
      navigate(`/vendedor/lead/${leadId}`)
    } catch (err) {
      alert(err?.response?.data?.message || 'No se pudo reclamar el lead')
    } finally {
      setClaiming(p => ({ ...p, [leadId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  const kpis = metrics?.kpis || {}

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hola, {user?.name?.split(' ')[0] || 'Vendedor'} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Acá está todo lo que tenés que mover hoy.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Kpi icon={Send} label="Contactados hoy" value={kpis.contactedToday || 0} color="blue" />
        <Kpi icon={TrendingUp} label="Tasa respuesta 30d" value={formatPct(kpis.responseRate)} sub={`${kpis.replied30d}/${kpis.sent30d}`} color="emerald" />
        <Kpi icon={MessageCircle} label="En conversación" value={kpis.activeConversations || 0} color="amber" />
        <Kpi icon={Phone} label="Llamadas semana" value={kpis.callsThisWeek || 0} color="violet" />
        <Kpi icon={Target} label="Pipeline" value={formatCurrency(kpis.pipelineValue)} color="indigo" />
        <Kpi icon={Trophy} label="Ganados mes" value={kpis.wonThisMonth || 0} sub={formatCurrency(kpis.wonValue)} color="emerald" />
      </div>

      {/* Recomendaciones IA */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-violet-50 rounded-2xl p-5 ring-1 ring-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Leads recomendados por IA</h2>
              <p className="text-[11px] text-gray-500">Calculados sobre score, sector con buena conversión y completitud de datos</p>
            </div>
          </div>
          <button onClick={() => navigate('/vendedor/recomendados')} className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recommendations.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">No hay recomendaciones disponibles</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.map(r => (
              <div key={r.id} className="bg-white rounded-xl p-4 ring-1 ring-gray-200 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center text-[11px] font-bold text-violet-700 flex-shrink-0">
                      {initials(r.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                      <p className="text-[10px] text-gray-500 truncate capitalize">{r.sector || 'sin sector'} · {r.city || ''}</p>
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {Math.round(r.recommendation_score || 0)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  {r.email && <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">📧 email</span>}
                  {r.phone && <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full">📱 tel</span>}
                  {r.social_linkedin && <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full">in</span>}
                  {r.sector_win_rate > 0 && <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full">sector {Math.round(r.sector_win_rate * 100)}% win</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleClaim(r.id)}
                    disabled={claiming[r.id]}
                    className="flex-1 bg-blue-600 text-white text-[11px] font-semibold px-2 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {claiming[r.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Tomar lead
                  </button>
                  <button
                    onClick={() => navigate(`/vendedor/lead/${r.id}`)}
                    className="text-[11px] font-semibold px-2 py-1.5 rounded-lg ring-1 ring-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Próximas acciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-amber-50 p-1.5 rounded-lg"><Flame className="w-4 h-4 text-amber-600" /></div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Para hacer follow-up</h3>
              <p className="text-[11px] text-gray-500">Sin movimiento hace 2+ días</p>
            </div>
          </div>
          {(actions?.followUps || []).length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-6">Todo al día ✨</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {actions.followUps.map(l => (
                <button key={l.id} onClick={() => navigate(`/vendedor/lead/${l.id}`)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition text-left">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700">
                    {initials(l.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{l.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{l.stage} · score {l.score || 0}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-violet-50 p-1.5 rounded-lg"><Phone className="w-4 h-4 text-violet-600" /></div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Llamadas agendadas</h3>
              <p className="text-[11px] text-gray-500">Próximos 3 días</p>
            </div>
          </div>
          {(actions?.scheduledCalls || []).length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-6">Sin llamadas agendadas</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {actions.scheduledCalls.map(c => (
                <button key={c.id} onClick={() => navigate(`/vendedor/lead/${c.lead_id}`)}
                  className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition text-left">
                  <Clock className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{c.next_action}</p>
                    <p className="text-[10px] text-violet-600 mt-0.5">
                      {new Date(c.next_action_at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-red-50 p-1.5 rounded-lg"><AlertCircle className="w-4 h-4 text-red-600" /></div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Leads fríos</h3>
              <p className="text-[11px] text-gray-500">Contactados sin respuesta hace 5+ días</p>
            </div>
          </div>
          {(actions?.coldLeads || []).length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-6">No hay leads fríos</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {actions.coldLeads.map(l => (
                <button key={l.id} onClick={() => navigate(`/vendedor/lead/${l.id}`)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition text-left">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{l.name}</p>
                    <p className="text-[10px] text-gray-500 truncate capitalize">{l.sector || 'sin sector'} · score {l.score || 0}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Wins recientes */}
      <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-emerald-50 p-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Tus ganados recientes</h3>
            <p className="text-[11px] text-gray-500">Cerrados en los últimos 60 días</p>
          </div>
        </div>
        {(metrics?.recentWins || []).length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Todavía no cerraste ningún cliente. Vamos por el primero 🚀</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.recentWins.map(w => (
              <button key={w.id} onClick={() => navigate(`/vendedor/lead/${w.id}`)}
                className="text-left p-3 rounded-xl bg-emerald-50/40 ring-1 ring-emerald-100 hover:bg-emerald-50 transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{w.name}</p>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                </div>
                <p className="text-[10px] text-gray-500 truncate capitalize">{w.sector || 'sin sector'}</p>
                <p className="text-xs font-bold text-emerald-700 mt-1">{formatCurrency(w.value)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
