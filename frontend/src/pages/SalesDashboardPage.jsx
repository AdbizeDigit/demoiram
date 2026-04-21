import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, TrendingUp, Users, MessageCircle, Clock, AlertCircle, CheckCircle2, Loader2,
  Zap, ArrowUp, ArrowDown, Send, Target, DollarSign, Award, Flame, Filter as FilterIcon,
  Mail, Activity, Sparkles, ChevronRight, Trophy, Brain, Calendar, ExternalLink
} from 'lucide-react'
import api from '../services/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SENTIMENT_CFG = {
  positive: { label: 'Positivo', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  negative: { label: 'Negativo', bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500' },
  neutral:  { label: 'Neutral',  bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  unknown:  { label: 'Sin analizar', bg: 'bg-gray-100', text: 'text-gray-500',   dot: 'bg-gray-400' },
}

const STAGE_CFG = {
  NUEVO:           { label: 'Nuevo',           color: 'bg-gray-400',    text: 'text-gray-700' },
  CONTACTADO:      { label: 'Contactado',      color: 'bg-blue-500',    text: 'text-blue-700' },
  EN_CONVERSACION: { label: 'En conversación', color: 'bg-amber-500',   text: 'text-amber-700' },
  PROPUESTA:       { label: 'Propuesta',       color: 'bg-purple-500',  text: 'text-purple-700' },
  NEGOCIACION:     { label: 'Negociación',     color: 'bg-indigo-500',  text: 'text-indigo-700' },
  GANADO:          { label: 'Ganado',          color: 'bg-emerald-500', text: 'text-emerald-700' },
  PERDIDO:         { label: 'Perdido',         color: 'bg-red-500',     text: 'text-red-700' },
}

function formatNumber(n) {
  if (n == null) return '0'
  return Number(n).toLocaleString('es-AR')
}
function formatCurrency(val) {
  if (!val || val === 0) return '$0'
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`
  return `$${val.toLocaleString('es-AR')}`
}
function formatPct(n) {
  if (n == null) return '0%'
  return `${Number(n).toFixed(1)}%`
}
function dayLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })
}
function shortTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function initials(name) {
  if (!name) return '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, subtitle, trend, trendLabel, color = 'blue', onClick }) {
  const colorMap = {
    blue:    { bg: 'bg-blue-50',    iconBg: 'bg-blue-100',    iconText: 'text-blue-600',    ring: 'ring-blue-200' },
    emerald: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', ring: 'ring-emerald-200' },
    amber:   { bg: 'bg-amber-50',   iconBg: 'bg-amber-100',   iconText: 'text-amber-600',   ring: 'ring-amber-200' },
    red:     { bg: 'bg-red-50',     iconBg: 'bg-red-100',     iconText: 'text-red-600',     ring: 'ring-red-200' },
    violet:  { bg: 'bg-violet-50',  iconBg: 'bg-violet-100',  iconText: 'text-violet-600',  ring: 'ring-violet-200' },
    indigo:  { bg: 'bg-indigo-50',  iconBg: 'bg-indigo-100',  iconText: 'text-indigo-600',  ring: 'ring-indigo-200' },
  }
  const c = colorMap[color] || colorMap.blue
  const Container = onClick ? 'button' : 'div'
  return (
    <Container
      onClick={onClick}
      className={`${c.bg} text-left rounded-2xl p-4 ring-1 ${c.ring} transition-all hover:shadow-md ${onClick ? 'hover:-translate-y-0.5 cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`${c.iconBg} ${c.iconText} p-2 rounded-xl`}>
          <Icon className="w-4 h-4" />
        </div>
        {trend != null && (
          <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {trend > 0 ? <ArrowUp className="w-3 h-3" /> : trend < 0 ? <ArrowDown className="w-3 h-3" /> : null}
            {Math.abs(Number(trend)).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{label}</p>
      {subtitle && <p className="text-[10px] text-gray-400 mt-1 leading-tight truncate">{subtitle}</p>}
      {trendLabel && !subtitle && <p className="text-[10px] text-gray-400 mt-1">{trendLabel}</p>}
    </Container>
  )
}

// ─── Stacked bar chart (daily contacts email vs whatsapp) ────────────────────
// SVG-based so rendering is deterministic — no flex-sizing tricks, no opacity tooltip hacks.

function StackedDailyChart({ data, height = 180 }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>Sin datos</div>
  }
  const W = 600
  const H = height
  const padL = 8, padR = 8, padT = 8, padB = 24
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const max = Math.max(...data.map(d => d.total), 1)
  const barW = chartW / data.length
  const gap = Math.min(6, barW * 0.2)
  const innerBarW = barW - gap

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i} x1={padL} x2={W - padR} y1={padT + chartH * p} y2={padT + chartH * p}
            stroke="#e5e7eb" strokeWidth="1" strokeDasharray={p === 1 ? '' : '3 3'} />
        ))}
        {data.map((d, i) => {
          const total = d.total || 0
          const emailH = total > 0 ? (d.email / max) * chartH : 0
          const waH = total > 0 ? (d.whatsapp / max) * chartH : 0
          const x = padL + i * barW + gap / 2
          const yEmail = padT + chartH - emailH
          const yWa = padT + chartH - emailH - waH
          const labelY = H - 8
          const tooltipY = Math.max(padT + 12, yWa - 4)
          return (
            <g key={i}>
              {/* Invisible hover target covers the whole column */}
              <rect x={padL + i * barW} y={padT} width={barW} height={chartH} fill="transparent" className="peer" />
              {/* Email (blue) — bottom */}
              {total > 0 && (
                <rect x={x} y={yEmail} width={innerBarW} height={emailH} fill="#3b82f6" rx="2" />
              )}
              {/* WhatsApp (emerald) — stacked on top */}
              {total > 0 && (
                <rect x={x} y={yWa} width={innerBarW} height={waH} fill="#10b981" rx="2" />
              )}
              {/* Native tooltip via SVG <title> — always works, no CSS needed */}
              <title>{`${dayLabel(d.date)} — ${total} total · Email ${d.email} · WA ${d.whatsapp}`}</title>
              {/* Day label */}
              <text x={padL + i * barW + barW / 2} y={labelY} textAnchor="middle"
                fontSize="9" fill="#6b7280" style={{ fontFamily: 'inherit' }}>
                {dayLabel(d.date)}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-blue-500 rounded-sm" /> Email</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-sm" /> WhatsApp</span>
        <span className="ml-auto text-[10px] text-gray-400">Pico: {max} contactos</span>
      </div>
    </div>
  )
}

// ─── Hourly response rate chart ──────────────────────────────────────────────

function HourlyRateChart({ data, height = 180 }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>Sin datos</div>
  }
  const filtered = data.filter(d => d.sent >= 2)
  const best = filtered.reduce((best, d) => d.rate > (best?.rate || 0) ? d : best, null)
  const max = Math.max(...data.map(d => d.rate), 1)
  const W = 600
  const H = height
  const padL = 8, padR = 8, padT = 8, padB = 20
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const barW = chartW / data.length
  const gap = Math.max(1, barW * 0.15)
  const innerBarW = barW - gap

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i} x1={padL} x2={W - padR} y1={padT + chartH * p} y2={padT + chartH * p}
            stroke="#e5e7eb" strokeWidth="1" strokeDasharray={p === 1 ? '' : '3 3'} />
        ))}
        {data.map((d, i) => {
          const noData = d.sent < 2
          const h = noData ? 1 : Math.max((d.rate / max) * chartH, 2)
          const x = padL + i * barW + gap / 2
          const y = padT + chartH - h
          const isBest = best && d.hour === best.hour
          const fill = isBest ? '#10b981' : noData ? '#e5e7eb' : '#60a5fa'
          return (
            <g key={i}>
              <rect x={x} y={y} width={innerBarW} height={h} fill={fill} rx="1.5" />
              <title>{`${String(d.hour).padStart(2,'0')}:00 — ${d.rate}% (${d.replied}/${d.sent})`}</title>
            </g>
          )
        })}
        {/* Axis labels */}
        {[0, 6, 12, 18, 23].map(h => {
          const x = padL + h * barW + barW / 2
          return (
            <text key={h} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af" style={{ fontFamily: 'inherit' }}>
              {String(h).padStart(2, '0')}h
            </text>
          )
        })}
      </svg>
      {best && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
          <Flame className="w-3.5 h-3.5" />
          Mejor hora: <span className="font-bold">{String(best.hour).padStart(2,'0')}h</span> · {best.rate}% respuesta · {best.replied}/{best.sent}
        </div>
      )}
    </div>
  )
}

// ─── Funnel visualization ─────────────────────────────────────────────────────

function Funnel({ stages }) {
  if (!stages || stages.length === 0) return <div className="text-gray-400 text-sm">Sin datos</div>
  const max = Math.max(...stages.map(s => s.count), 1)
  return (
    <div className="space-y-1.5">
      {stages.map((s, i) => {
        const cfg = STAGE_CFG[s.stage] || STAGE_CFG.NUEVO
        const pctWidth = Math.max((s.count / max) * 100, 3)
        return (
          <div key={s.stage} className="flex items-center gap-3">
            <div className="w-28 flex-shrink-0 text-right">
              <p className="text-[11px] font-semibold text-gray-700 truncate">{cfg.label}</p>
              {s.fromPrev != null && (
                <p className={`text-[10px] ${s.fromPrev >= 50 ? 'text-emerald-600' : s.fromPrev >= 25 ? 'text-amber-600' : 'text-red-500'} font-medium`}>
                  {s.fromPrev}% del anterior
                </p>
              )}
            </div>
            <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden relative">
              <div className={`h-full ${cfg.color} rounded-lg transition-all duration-700 ease-out`} style={{ width: `${pctWidth}%` }} />
              <span className="absolute inset-0 flex items-center px-3 text-[11px] font-bold text-white mix-blend-plus-lighter">
                {formatNumber(s.count)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Sentiment badge ─────────────────────────────────────────────────────────

function SentimentBadge({ sentiment }) {
  const key = sentiment || 'unknown'
  const cfg = SENTIMENT_CFG[key] || SENTIMENT_CFG.unknown
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SalesDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [sendingFollowUp, setSendingFollowUp] = useState({})
  const [channelFilter, setChannelFilter] = useState('all')  // 'all' | 'email' | 'whatsapp'

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      setError(null)
      const res = await api.get('/api/dashboard/sales-metrics')
      setData(res.data)
    } catch (err) {
      console.error('Error loading sales metrics:', err)
      setError(err?.response?.data?.error || 'No se pudieron cargar las métricas')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const iv = setInterval(() => loadData(true), 60_000)
    return () => clearInterval(iv)
  }, [loadData])

  const handleFollowUp = useCallback(async (leadId) => {
    setSendingFollowUp(prev => ({ ...prev, [leadId]: true }))
    try {
      await api.post(`/api/leads/${leadId}/follow-up`, {}, { timeout: 90_000 })
      await loadData(true)
    } catch (err) {
      console.error('Follow-up failed:', err?.response?.data?.error || err.message)
      alert(err?.response?.data?.error || 'No se pudo enviar el follow-up')
    } finally {
      setSendingFollowUp(prev => ({ ...prev, [leadId]: false }))
    }
  }, [loadData])

  const filteredReplies = useMemo(() => {
    if (!data?.recentReplies) return []
    if (channelFilter === 'all') return data.recentReplies
    return data.recentReplies.filter(r => (r.channel || '').toLowerCase() === channelFilter)
  }, [data, channelFilter])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <p className="mt-3 text-sm text-gray-600 font-medium">Cargando dashboard de ventas...</p>
        </div>
      </div>
    )
  }

  const { kpis = {}, dailyContacts = [], hourlyResponse = [], funnel = [], sectors = [],
    channels = {}, recentReplies = [], topPriorityLeads = [], inactiveLeads = [], recentWins = [], coach = {} } = data || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-xl">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              Dashboard de Ventas
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 ml-12">
              Métricas en vivo del pipeline · última actualización {data?.generated_at ? shortTime(data.generated_at) : '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/pipeline')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl ring-1 ring-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all">
              <Target className="w-3.5 h-3.5 text-blue-500" />
              Ver pipeline
            </button>
            <button
              onClick={() => loadData()}
              className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl ring-1 ring-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all">
              <Zap className="w-3.5 h-3.5 text-blue-500" />
              Actualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* KPI grid — 6 cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={Send} label="Contactados hoy" value={formatNumber(kpis.contactedToday)} trend={kpis.contactedTodayTrend} trendLabel="vs ayer" color="blue" />
          <KpiCard icon={TrendingUp} label="Tasa respuesta" value={formatPct(kpis.responseRate)} trend={kpis.responseRateTrend}
            subtitle={`${formatNumber(kpis.replied)} / ${formatNumber(kpis.sent)}`} color="emerald" />
          <KpiCard icon={MessageCircle} label="En conversación" value={formatNumber(kpis.activeConversations)} color="amber" onClick={() => navigate('/admin/pipeline')} />
          <KpiCard icon={Target} label="Pipeline valor" value={formatCurrency(kpis.pipelineValue)}
            subtitle="leads activos × score" color="indigo" />
          <KpiCard icon={Award} label="Ganados mes" value={formatNumber(kpis.wonThisMonth)} subtitle={formatCurrency(kpis.wonValue)} color="emerald" />
          <KpiCard icon={Activity} label="Conversión"
            value={formatPct(kpis.conversionRate)}
            subtitle={kpis.avgResponseHours != null ? `resp. en ${kpis.avgResponseHours}h` : 'ganados/(gan+perd)'}
            color="violet" />
        </div>

        {/* Charts row: daily stacked + hourly rate */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Contactos diarios</h2>
                <p className="text-[11px] text-gray-400">Últimos 14 días · Email + WhatsApp</p>
              </div>
              <BarChart3 className="w-4 h-4 text-blue-500" />
            </div>
            <StackedDailyChart data={dailyContacts} />
          </div>
          <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Respuesta por hora del día</h2>
                <p className="text-[11px] text-gray-400">% respuesta · últimos 60 días</p>
              </div>
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <HourlyRateChart data={hourlyResponse} />
          </div>
        </div>

        {/* Row: Funnel (2 cols) + Channels split (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Embudo de ventas</h2>
                <p className="text-[11px] text-gray-400">Leads por etapa y conversión entre etapas</p>
              </div>
              <Target className="w-4 h-4 text-violet-500" />
            </div>
            <Funnel stages={funnel} />
          </div>
          <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Canales</h2>
                <p className="text-[11px] text-gray-400">Rendimiento por canal</p>
              </div>
              <Send className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="space-y-3">
              {['EMAIL', 'WHATSAPP'].map(ch => {
                const c = channels[ch] || { sent: 0, replied: 0, replyRate: 0, avgScore: null }
                const Icon = ch === 'EMAIL' ? Mail : MessageCircle
                const colorBar = ch === 'EMAIL' ? 'bg-blue-500' : 'bg-emerald-500'
                return (
                  <div key={ch}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${ch === 'EMAIL' ? 'text-blue-500' : 'text-emerald-500'}`} />
                        <span className="text-xs font-semibold text-gray-700">{ch === 'EMAIL' ? 'Email' : 'WhatsApp'}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-800">{formatPct(c.replyRate)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <div className={`h-full ${colorBar} transition-all duration-500`} style={{ width: `${Math.min(100, c.replyRate)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>{formatNumber(c.replied)} / {formatNumber(c.sent)}</span>
                      {c.avgScore != null && <span>score avg: <span className="font-semibold text-gray-700">{c.avgScore}</span></span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Mini AI Coach summary */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Brain className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[11px] font-semibold text-gray-700">AI Coach</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-bold text-violet-700">{coach.avgScore != null ? coach.avgScore : '—'}</p>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider">score avg</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700">{formatNumber(coach.scored)}</p>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider">scored</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700">{formatNumber(coach.activeVersions)}</p>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider">versiones</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row: Top sectors + Top priority leads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Sectores top por respuesta</h2>
                <p className="text-[11px] text-gray-400">Mínimo 5 envíos · ordenado por % respuesta</p>
              </div>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            {sectors.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">Sin datos suficientes</p>
            ) : (
              <div className="space-y-1.5">
                {sectors.slice(0, 8).map((s, i) => (
                  <div key={s.sector} className="flex items-center gap-3 group">
                    <span className="w-5 text-[10px] font-bold text-gray-400">{i + 1}</span>
                    <span className="flex-1 text-xs text-gray-700 truncate capitalize">{s.sector}</span>
                    <div className="w-32 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: `${Math.min(100, s.replyRate)}%` }} />
                      <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold text-white">
                        {s.replyRate}%
                      </span>
                    </div>
                    <div className="w-20 text-right text-[10px] text-gray-500">
                      <span className="font-semibold">{s.replied}</span>/{s.sent}
                      {s.won > 0 && <span className="text-emerald-600 ml-1">· {s.won}W</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Leads prioritarios</h2>
                <p className="text-[11px] text-gray-400">Activos con mayor score · enfocate acá</p>
              </div>
              <Flame className="w-4 h-4 text-red-500" />
            </div>
            {topPriorityLeads.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">No hay leads activos</p>
            ) : (
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                {topPriorityLeads.map(l => {
                  const cfg = STAGE_CFG[l.stage] || STAGE_CFG.CONTACTADO
                  return (
                    <div
                      key={l.id}
                      onClick={() => navigate(`/admin/leads/${l.id}`)}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-indigo-700">
                        {initials(l.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{l.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">
                          <span className="capitalize">{l.sector || 'sin sector'}</span>
                          {l.city && <> · {l.city}</>}
                        </p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${cfg.text} bg-opacity-10`} style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                          <span className={`w-1 h-1 rounded-full ${cfg.color}`} />
                          {cfg.label}
                        </span>
                        <span className="text-[10px] font-bold text-gray-700">score {l.score}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 flex-shrink-0" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent replies with sentiment */}
        <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Respuestas recientes</h2>
              <p className="text-[11px] text-gray-400">Sentimiento detectado automáticamente por el AI Coach</p>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                {[{ key: 'all', label: 'Todas' }, { key: 'email', label: 'Email' }, { key: 'whatsapp', label: 'WA' }].map(f => (
                  <button key={f.key} onClick={() => setChannelFilter(f.key)}
                    className={`text-[10px] px-2 py-1 rounded ${channelFilter === f.key ? 'bg-white shadow-sm font-semibold text-gray-800' : 'text-gray-500'} transition-all`}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 ml-2">
                {Object.entries(SENTIMENT_CFG).filter(([k]) => k !== 'unknown').map(([k, c]) => (
                  <span key={k} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${c.bg} ${c.text}`}>
                    <span className={`w-1 h-1 rounded-full ${c.dot}`} /> {c.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {filteredReplies.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">No hay respuestas recientes</div>
          ) : (
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {filteredReplies.map((r, i) => (
                <div key={r.id || i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group cursor-pointer"
                  onClick={() => r.leadId && navigate(`/admin/leads/${r.leadId}`)}>
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-blue-700">
                    {initials(r.leadName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-semibold text-gray-900 truncate">{r.leadName}</span>
                      <SentimentBadge sentiment={r.sentiment} />
                      {r.channel && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                          {r.channel === 'whatsapp' ? <MessageCircle className="w-2.5 h-2.5" /> : <Mail className="w-2.5 h-2.5" />}
                          {r.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{shortTime(r.date)}</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{r.message || r.subject || 'Sin contenido'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row: Recent wins + Inactive leads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-50 p-1.5 rounded-lg">
                  <Trophy className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Ganados recientes</h2>
                  <p className="text-[11px] text-gray-400">Últimos 60 días</p>
                </div>
              </div>
            </div>
            {recentWins.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">Todavía no hay clientes ganados</div>
            ) : (
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {recentWins.map(w => (
                  <div key={w.id} onClick={() => navigate(`/admin/leads/${w.id}`)}
                    className="flex items-center gap-3 p-2 rounded-lg bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer group transition-colors">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{w.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">
                        <span className="capitalize">{w.sector || 'sin sector'}</span>
                        {w.city && <> · {w.city}</>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-emerald-700">{formatCurrency(w.value)}</p>
                      <p className="text-[9px] text-gray-400">{shortTime(w.wonAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-red-50 p-1.5 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Leads inactivos</h2>
                  <p className="text-[11px] text-gray-400">En conversación sin respuesta hace 3+ días</p>
                </div>
              </div>
              {inactiveLeads.length > 0 && (
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {inactiveLeads.length}
                </span>
              )}
            </div>
            {inactiveLeads.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-medium">Todos los leads al día</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {inactiveLeads.map(l => {
                  const isSending = sendingFollowUp[l.id]
                  const stageCfg = STAGE_CFG[l.stage] || STAGE_CFG.EN_CONVERSACION
                  return (
                    <div key={l.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-red-50/50 hover:bg-red-50 ring-1 ring-red-100 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/admin/leads/${l.id}`)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-900 truncate">{l.name}</span>
                          <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                            {l.daysInactive}d
                          </span>
                          <span className={`text-[9px] font-semibold ${stageCfg.text}`}>{stageCfg.label}</span>
                        </div>
                        {l.lastMessage && (
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">"{l.lastMessage}"</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleFollowUp(l.id)}
                        disabled={isSending}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-[10px] font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0">
                        {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        {isSending ? 'Enviando' : 'Follow-up'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
