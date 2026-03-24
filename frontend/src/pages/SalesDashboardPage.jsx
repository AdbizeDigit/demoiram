import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, TrendingUp, Users, MessageCircle, Clock, AlertCircle, CheckCircle2, Loader2, Zap, ArrowUp, ArrowDown, Send } from 'lucide-react'
import api from '../services/api'

// ── Sentiment keywords ──────────────────────────────────────────────────────────

const POSITIVE_KEYWORDS = ['gracias', 'interesa', 'bueno', 'dale', 'si', 'genial', 'perfecto', 'quiero']
const NEGATIVE_KEYWORDS = ['no', 'spam', 'molesta', 'basta', 'dejen', 'no interesa', 'no gracias']

function analyzeSentiment(text) {
  if (!text) return 'neutral'
  const lower = text.toLowerCase()
  // Check multi-word negatives first
  for (const kw of NEGATIVE_KEYWORDS) {
    if (kw.includes(' ')) {
      if (lower.includes(kw)) return 'negativo'
    }
  }
  const words = lower.split(/\s+/)
  for (const w of words) {
    if (NEGATIVE_KEYWORDS.includes(w)) return 'negativo'
  }
  for (const w of words) {
    if (POSITIVE_KEYWORDS.includes(w)) return 'positivo'
  }
  return 'neutral'
}

const SENTIMENT_CFG = {
  positivo: { label: 'Positivo', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  negativo: { label: 'Negativo', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  neutral:  { label: 'Neutral',  bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

function formatNumber(n) {
  if (n == null) return '0'
  return Number(n).toLocaleString('es-ES')
}

function formatCurrency(val) {
  if (!val || val === 0) return '$0'
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`
  return `$${val.toLocaleString()}`
}

function formatPct(n) {
  if (n == null) return '0%'
  return `${Number(n).toFixed(1)}%`
}

function daysAgo(dateStr) {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000))
}

function dayLabel(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
}

// ── KPI Card ─────────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, subtitle, trend, trendLabel, color }) {
  const colorMap = {
    emerald: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', ring: 'ring-emerald-200' },
    blue:    { bg: 'bg-blue-50',    iconBg: 'bg-blue-100',    iconText: 'text-blue-600',    ring: 'ring-blue-200' },
    amber:   { bg: 'bg-amber-50',   iconBg: 'bg-amber-100',   iconText: 'text-amber-600',   ring: 'ring-amber-200' },
    red:     { bg: 'bg-red-50',     iconBg: 'bg-red-100',     iconText: 'text-red-600',     ring: 'ring-red-200' },
  }
  const c = colorMap[color] || colorMap.blue

  return (
    <div className={`${c.bg} rounded-2xl p-5 ring-1 ${c.ring} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`${c.iconBg} ${c.iconText} p-2.5 rounded-xl`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend != null && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      {trendLabel && <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>}
    </div>
  )
}

// ── Bar Chart (CSS-only) ─────────────────────────────────────────────────────────

function CssBarChart({ data, label, color = 'bg-blue-500', height = 160 }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        Sin datos
      </div>
    )
  }
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      <div className="flex items-end gap-1.5 justify-between" style={{ height }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {d.value} {label}
              </div>
              <div
                className={`w-full ${color} rounded-t-md transition-all duration-500 ease-out hover:opacity-80 min-h-[4px]`}
                style={{ height: `${Math.max(pct, 3)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1.5 justify-between mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-gray-500 truncate">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Horizontal Bar Chart ─────────────────────────────────────────────────────────

function HorizontalBarChart({ data, label }) {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 text-sm text-center py-8">Sin datos</div>
  }
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-8 text-right font-mono">{d.label}</span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative group">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-semibold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {d.value}% {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Sentiment Badge ──────────────────────────────────────────────────────────────

function SentimentBadge({ sentiment }) {
  const cfg = SENTIMENT_CFG[sentiment] || SENTIMENT_CFG.neutral
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────────

export default function SalesDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [sendingFollowUp, setSendingFollowUp] = useState({})

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get('/api/dashboard/sales-metrics')
      setData(res.data)
    } catch (err) {
      console.error('Error loading sales metrics:', err)
      setError('No se pudieron cargar las metricas de ventas')
      // Load mock data for development
      setData(buildMockData())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [loadData])

  const handleFollowUp = useCallback(async (leadId) => {
    setSendingFollowUp(prev => ({ ...prev, [leadId]: true }))
    try {
      await api.post(`/api/leads/${leadId}/follow-up`)
    } catch (err) {
      console.error('Error sending follow-up:', err)
    } finally {
      setSendingFollowUp(prev => ({ ...prev, [leadId]: false }))
    }
  }, [])

  // ── Loading state ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">Cargando dashboard de ventas...</p>
        </div>
      </div>
    )
  }

  const {
    kpis = {},
    dailyContacts = [],
    hourlyResponse = [],
    recentReplies = [],
    inactiveLeads = [],
  } = data || {}

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="bg-blue-100 p-2.5 rounded-xl">
                <BarChart3 className="w-7 h-7 text-blue-600" />
              </div>
              Dashboard de Ventas
            </h1>
            <p className="text-gray-500 mt-1 ml-14">Metricas en tiempo real del pipeline comercial</p>
          </div>
          <button
            onClick={() => { setLoading(true); loadData() }}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl ring-1 ring-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:ring-gray-300 transition-all shadow-sm"
          >
            <Zap className="w-4 h-4 text-blue-500" />
            Actualizar
          </button>
        </div>

        {/* ── Error banner ────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            icon={Send}
            label="Leads contactados hoy"
            value={formatNumber(kpis.contactedToday)}
            trend={kpis.contactedTodayTrend}
            trendLabel="vs ayer"
            color="blue"
          />
          <KpiCard
            icon={TrendingUp}
            label="Tasa de respuesta"
            value={formatPct(kpis.responseRate)}
            trend={kpis.responseRateTrend}
            subtitle={`${formatNumber(kpis.replied)} respondidos / ${formatNumber(kpis.sent)} enviados`}
            color="emerald"
          />
          <KpiCard
            icon={MessageCircle}
            label="En conversacion activa"
            value={formatNumber(kpis.activeConversations)}
            color="amber"
          />
          <KpiCard
            icon={CheckCircle2}
            label="Ganados este mes"
            value={formatNumber(kpis.wonThisMonth)}
            subtitle={`Valor total: ${formatCurrency(kpis.wonValue)}`}
            color="emerald"
          />
        </div>

        {/* ── Charts Section ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left: Daily contacts bar chart */}
          <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Leads contactados por dia</h2>
                <p className="text-xs text-gray-400 mt-0.5">Ultimos 7 dias</p>
              </div>
              <div className="bg-blue-50 p-2 rounded-lg">
                <BarChart3 className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <CssBarChart
              data={dailyContacts.map(d => ({
                label: dayLabel(d.date),
                value: d.count,
              }))}
              label="leads"
              color="bg-blue-500"
              height={180}
            />
          </div>

          {/* Right: Hourly response rate */}
          <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Tasa de respuesta por hora</h2>
                <p className="text-xs text-gray-400 mt-0.5">Mejores horas para enviar</p>
              </div>
              <div className="bg-emerald-50 p-2 rounded-lg">
                <Clock className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <div className="max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              <HorizontalBarChart
                data={hourlyResponse.map(d => ({
                  label: `${String(d.hour).padStart(2, '0')}h`,
                  value: Math.round(d.rate),
                }))}
                label="resp"
              />
            </div>
          </div>
        </div>

        {/* ── Sentiment Analysis ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-200 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Analisis de sentimiento</h2>
              <p className="text-xs text-gray-400 mt-0.5">Respuestas recientes clasificadas automaticamente</p>
            </div>
            <div className="flex gap-2">
              {Object.entries(SENTIMENT_CFG).map(([key, cfg]) => (
                <span key={key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              ))}
            </div>
          </div>

          {recentReplies.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No hay respuestas recientes para analizar
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {recentReplies.map((reply, i) => {
                const sentiment = reply.sentiment || analyzeSentiment(reply.message)
                return (
                  <div
                    key={reply.id || i}
                    className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {reply.leadName || 'Lead desconocido'}
                        </span>
                        <SentimentBadge sentiment={sentiment} />
                        <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">
                          {reply.date ? new Date(reply.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {reply.message || 'Sin contenido'}
                      </p>
                      {reply.channel && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-gray-400">
                          {reply.channel === 'whatsapp' ? <MessageCircle className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                          {reply.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Inactive Leads Alert ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="bg-red-50 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Leads inactivos</h2>
                <p className="text-xs text-gray-400 mt-0.5">En conversacion sin actividad por 3+ dias</p>
              </div>
            </div>
            {inactiveLeads.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {inactiveLeads.length} pendiente{inactiveLeads.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {inactiveLeads.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">Todos los leads estan al dia</p>
              <p className="text-gray-400 text-xs mt-1">No hay conversaciones sin seguimiento</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {inactiveLeads.map((lead, i) => {
                const days = lead.daysInactive || daysAgo(lead.lastActivity)
                const isSending = sendingFollowUp[lead.id]
                return (
                  <div
                    key={lead.id || i}
                    className="flex items-center gap-4 p-4 rounded-xl bg-red-50/50 hover:bg-red-50 ring-1 ring-red-100 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-red-500" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {lead.name || 'Lead sin nombre'}
                        </span>
                        <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          {days} dia{days !== 1 ? 's' : ''} inactivo
                        </span>
                      </div>
                      {lead.lastMessage && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          Ultimo: &ldquo;{lead.lastMessage}&rdquo;
                        </p>
                      )}
                      {lead.email && (
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{lead.email}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleFollowUp(lead.id)}
                      disabled={isSending}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
                    >
                      {isSending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      {isSending ? 'Enviando...' : 'Follow-up'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Mock Data (fallback for development) ─────────────────────────────────────────

function buildMockData() {
  const today = new Date()
  const dailyContacts = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    return {
      date: d.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 40) + 5,
    }
  })

  const hourlyResponse = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    rate: h >= 8 && h <= 20
      ? Math.floor(Math.random() * 35) + 10
      : Math.floor(Math.random() * 10),
  }))

  const sampleMessages = [
    { name: 'Carlos Mendez', msg: 'Gracias por la informacion, me interesa mucho el servicio', channel: 'email' },
    { name: 'Ana Rodriguez', msg: 'No gracias, ya tenemos proveedor', channel: 'whatsapp' },
    { name: 'Luis Garcia', msg: 'Podrian enviarme mas detalles sobre los precios?', channel: 'email' },
    { name: 'Maria Torres', msg: 'Genial, quiero agendar una llamada para la proxima semana', channel: 'whatsapp' },
    { name: 'Roberto Diaz', msg: 'Dejen de enviarme mensajes por favor', channel: 'email' },
    { name: 'Patricia Ruiz', msg: 'Bueno, me parece una propuesta interesante', channel: 'whatsapp' },
    { name: 'Fernando Lopez', msg: 'Recibido, lo reviso y les comento', channel: 'email' },
    { name: 'Sofia Morales', msg: 'Perfecto, dale adelante con la propuesta', channel: 'whatsapp' },
  ]

  const recentReplies = sampleMessages.map((m, i) => ({
    id: `reply-${i}`,
    leadName: m.name,
    message: m.msg,
    channel: m.channel,
    date: new Date(Date.now() - i * 3600000 * 2).toISOString(),
    sentiment: analyzeSentiment(m.msg),
  }))

  const inactiveLeads = [
    { id: 'lead-1', name: 'Empresa ABC S.A.', daysInactive: 5, lastMessage: 'Me interesa, enviame la propuesta', email: 'contacto@abc.com' },
    { id: 'lead-2', name: 'Tech Solutions MX', daysInactive: 4, lastMessage: 'Dejame revisarlo con mi equipo', email: 'info@techsolutions.mx' },
    { id: 'lead-3', name: 'Juan Perez - Consultor', daysInactive: 3, lastMessage: 'Si, podemos agendar una llamada', email: 'juan@consultor.com' },
  ]

  return {
    kpis: {
      contactedToday: 27,
      contactedTodayTrend: 12.5,
      responseRate: 18.3,
      responseRateTrend: 2.1,
      replied: 48,
      sent: 262,
      activeConversations: 15,
      wonThisMonth: 4,
      wonValue: 32500,
    },
    dailyContacts,
    hourlyResponse,
    recentReplies,
    inactiveLeads,
  }
}
