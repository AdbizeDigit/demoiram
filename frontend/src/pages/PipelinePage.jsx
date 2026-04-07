import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GitBranch, Loader2, RefreshCw, LayoutGrid, List, ChevronDown,
  Phone, Mail, MessageCircle, Globe, ExternalLink, Zap, Eye,
  X, ArrowRight, CheckCircle2, AlertCircle, Clock, Building2,
  MapPin, Star, FileText, Send, PhoneCall, BarChart3, Users,
  TrendingUp, ChevronRight, Search, Filter, MoreVertical,
  Copy, Check, Play, Square, Radio, Bell
} from 'lucide-react'
import api from '../services/api'

// ─── Stage definitions ────────────────────────────────────────────────────────
const STAGES = [
  { key: 'NUEVO', label: 'Nuevo', color: 'gray', bg: 'bg-gray-50', border: 'border-gray-300', badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400', desc: 'Leads recien detectados' },
  { key: 'CONTACTADO', label: 'Contactado', color: 'blue', bg: 'bg-blue-50', border: 'border-blue-400', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400', desc: 'Se envio email/whatsapp' },
  { key: 'EN_CONVERSACION', label: 'En Conversacion', color: 'amber', bg: 'bg-amber-50', border: 'border-amber-400', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', desc: 'Respondio, hay dialogo' },
  { key: 'PROPUESTA', label: 'Propuesta', color: 'purple', bg: 'bg-purple-50', border: 'border-purple-400', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400', desc: 'Se envio propuesta comercial' },
  { key: 'NEGOCIACION', label: 'Negociacion', color: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-400', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400', desc: 'Negociando precio/condiciones' },
  { key: 'GANADO', label: 'Ganado', color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', desc: 'Cliente cerrado' },
  { key: 'PERDIDO', label: 'Perdido', color: 'red', bg: 'bg-red-50', border: 'border-red-400', badge: 'bg-red-100 text-red-700', dot: 'bg-red-400', desc: 'No se concreto' },
]

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

function mapStatus(status) {
  if (!status) return 'NUEVO'
  const upper = status.toUpperCase().replace(/\s+/g, '_')
  if (STAGE_MAP[upper]) return upper
  if (['NEW', 'NUEVO', 'PENDING'].includes(upper)) return 'NUEVO'
  if (['CONTACTED', 'CONTACTADO'].includes(upper)) return 'CONTACTADO'
  if (['IN_CONVERSATION', 'EN_CONVERSACION', 'REPLIED'].includes(upper)) return 'EN_CONVERSACION'
  if (['PROPOSAL', 'PROPUESTA', 'PROPOSAL_SENT'].includes(upper)) return 'PROPUESTA'
  if (['NEGOTIATION', 'NEGOCIACION', 'NEGOTIATING'].includes(upper)) return 'NEGOCIACION'
  if (['WON', 'GANADO', 'CLOSED_WON'].includes(upper)) return 'GANADO'
  if (['LOST', 'PERDIDO', 'CLOSED_LOST'].includes(upper)) return 'PERDIDO'
  return 'NUEVO'
}

function daysAgo(dateStr) {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000))
}

function formatCurrency(val) {
  if (!val || val === 0) return '$0'
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`
  return `$${val.toLocaleString()}`
}

function normalizePhone(phone) {
  if (!phone) return null
  return phone.replace(/[^0-9+]/g, '')
}

// ─── Score Bar Component ──────────────────────────────────────────────────────
function ScoreBar({ score }) {
  const s = Math.min(100, Math.max(0, score || 0))
  const color = s >= 70 ? 'bg-emerald-500' : s >= 40 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${s}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-500 w-7 text-right">{s}</span>
    </div>
  )
}

// ─── Lead Card (Kanban) ───────────────────────────────────────────────────────
function LeadCard({ lead, stage, onOpenDetail, onMoveStage, onAutoContact }) {
  const [moveOpen, setMoveOpen] = useState(false)
  const moveRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (moveRef.current && !moveRef.current.contains(e.target)) setMoveOpen(false)
    }
    if (moveOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [moveOpen])

  const phone = normalizePhone(lead.phone)
  const whatsapp = normalizePhone(lead.whatsapp || lead.phone)
  const score = lead.score || 0
  const scoreColor = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-gray-300'
  const scoreBorder = score >= 70 ? 'border-l-emerald-500' : score >= 40 ? 'border-l-amber-500' : 'border-l-gray-300'

  return (
    <div className={`group relative bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${scoreBorder} p-3 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer`}
      onClick={() => onOpenDetail(lead)}>
      {/* Header: Name + Score */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 flex-1">{lead.company || lead.name || 'Sin nombre'}</h4>
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${scoreColor} text-white flex items-center justify-center text-[10px] font-bold`}>{score}</div>
      </div>

      {/* Sector + location pills */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {lead.sector && (
          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 truncate max-w-[120px]">
            {lead.sector}
          </span>
        )}
        {(lead.city || lead.state) && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 truncate max-w-[120px]">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
          </span>
        )}
      </div>

      {/* AI summary */}
      {lead.aiSummary && (
        <p className="text-[11px] text-gray-500 italic line-clamp-2 mb-2 leading-snug">
          {lead.aiSummary}
        </p>
      )}

      {/* Contact channels available */}
      <div className="flex items-center gap-1 mb-2">
        {phone && (
          <a href={`tel:${phone}`} onClick={e => e.stopPropagation()}
            className="w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors" title={`Llamar ${phone}`}>
            <Phone className="w-3 h-3" />
          </a>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()}
            className="w-6 h-6 rounded-md bg-purple-50 hover:bg-purple-100 flex items-center justify-center text-purple-600 transition-colors" title={lead.email}>
            <Mail className="w-3 h-3" />
          </a>
        )}
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp.replace('+', '')}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            className="w-6 h-6 rounded-md bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors" title={`WhatsApp ${whatsapp}`}>
            <MessageCircle className="w-3 h-3" />
          </a>
        )}
        {lead.website && (
          <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            className="w-6 h-6 rounded-md bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors" title="Sitio web">
            <Globe className="w-3 h-3" />
          </a>
        )}
        <span className="ml-auto text-[10px] text-gray-400 flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" /> {lead.daysInStage}d
        </span>
      </div>

      {/* Action buttons - hidden until hover for cleaner look */}
      <div className="flex items-center gap-1 pt-2 border-t border-gray-50 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onAutoContact(lead) }}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all"
        >
          <Zap className="w-3 h-3" /> Auto Contacto
        </button>

        <div className="relative" ref={moveRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMoveOpen(!moveOpen) }}
            className="px-1.5 py-1 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-0.5"
            title="Mover etapa"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
          {moveOpen && (
            <div className="absolute right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1 w-44">
              {STAGES.filter(s => s.key !== stage.key).map(s => (
                <button key={s.key}
                  onClick={(e) => { e.stopPropagation(); onMoveStage(lead.id, s.key); setMoveOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({ stage, leads, totalCount, onOpenDetail, onMoveStage, onAutoContact }) {
  const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0)
  const displayCount = totalCount ?? leads.length

  return (
    <div className="flex-shrink-0 w-[19rem] flex flex-col">
      {/* Column header - sticky */}
      <div className={`sticky top-0 z-10 ${stage.bg} backdrop-blur rounded-t-2xl px-4 py-3 border border-gray-100 border-b-0`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full ${stage.dot} flex-shrink-0`} />
            <h3 className="font-bold text-sm text-gray-800 truncate">{stage.label}</h3>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${stage.badge}`}>
              {displayCount.toLocaleString()}
            </span>
          </div>
          {totalValue > 0 && (
            <span className="text-[10px] font-semibold text-gray-500">{formatCurrency(totalValue)}</span>
          )}
        </div>
        {totalCount && totalCount > leads.length && (
          <p className="text-[10px] text-gray-400 mt-1">Mostrando {leads.length} de {totalCount.toLocaleString()}</p>
        )}
      </div>

      {/* Cards */}
      <div className={`flex-1 px-2 py-2 space-y-2 ${stage.bg} border border-gray-100 border-t-0 rounded-b-2xl min-h-[200px] max-h-[calc(100vh-22rem)] overflow-y-auto`}>
        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-300">
            <Building2 className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-xs font-medium">Sin leads</p>
          </div>
        )}
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            stage={stage}
            onOpenDetail={onOpenDetail}
            onMoveStage={onMoveStage}
            onAutoContact={onAutoContact}
          />
        ))}
      </div>
    </div>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────
function ListView({ leads, onOpenDetail, onMoveStage, onAutoContact, selectedIds, onToggleSelect, onSelectAll }) {
  const [sortField, setSortField] = useState('score')
  const [sortDir, setSortDir] = useState('desc')

  const sorted = useMemo(() => {
    const arr = [...leads]
    arr.sort((a, b) => {
      let va = a[sortField], vb = b[sortField]
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [leads, sortField, sortDir])

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const SortHeader = ({ field, children, className = '' }) => (
    <th
      className={`px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} />}
      </span>
    </th>
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-3 py-3 w-10">
                <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  checked={selectedIds.size === leads.length && leads.length > 0}
                  onChange={onSelectAll}
                />
              </th>
              <SortHeader field="company">Empresa</SortHeader>
              <SortHeader field="sector">Sector</SortHeader>
              <SortHeader field="city">Ciudad</SortHeader>
              <SortHeader field="score">Score</SortHeader>
              <SortHeader field="stage">Etapa</SortHeader>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefono</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">WhatsApp</th>
              <SortHeader field="daysInStage">Dias</SortHeader>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map(lead => {
              const stg = STAGE_MAP[lead.stage] || STAGE_MAP.NUEVO
              const phone = normalizePhone(lead.phone)
              const whatsapp = normalizePhone(lead.whatsapp || lead.phone)
              return (
                <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => onOpenDetail(lead)}>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => onToggleSelect(lead.id)}
                    />
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-gray-900 max-w-[180px] truncate">{lead.company || lead.name}</td>
                  <td className="px-3 py-3">
                    {lead.sector && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{lead.sector}</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{lead.city || '-'}</td>
                  <td className="px-3 py-3 w-28"><ScoreBar score={lead.score} /></td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stg.badge}`}>{stg.label}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500 max-w-[160px] truncate">{lead.email || '-'}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{phone || '-'}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">
                    {whatsapp ? (
                      <a href={`https://wa.me/${whatsapp.replace('+', '')}`} target="_blank" rel="noopener noreferrer"
                        className="text-green-600 hover:underline" onClick={e => e.stopPropagation()}>
                        {whatsapp}
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{lead.daysInStage}d</td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onAutoContact(lead)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors" title="Contacto Auto">
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onOpenDetail(lead)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors" title="Ver Detalle">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Lead Detail Panel ────────────────────────────────────────────────────────
function DetailPanel({ lead, onClose, onMoveStage, onRefreshLead }) {
  const [report, setReport] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingReport, setLoadingReport] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [actionResult, setActionResult] = useState(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [expandedMsgId, setExpandedMsgId] = useState(null)
  const stg = STAGE_MAP[lead.stage] || STAGE_MAP.NUEVO

  useEffect(() => {
    // Load report
    setLoadingReport(true)
    api.get(`/api/scraping-engine/leads/${lead.id}/report`)
      .then(r => setReport(r.data?.report || r.data))
      .catch(() => setReport(null))
      .finally(() => setLoadingReport(false))

    // Load outreach messages
    setLoadingMessages(true)
    api.get(`/api/outreach/messages?leadId=${lead.id}`)
      .then(r => setMessages(r.data?.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false))
  }, [lead.id])

  async function handleAction(type) {
    setActionLoading(type)
    setActionResult(null)
    try {
      let res
      if (type === 'email') {
        res = await api.post('/api/outreach/email/send', { leadId: lead.id })
        setActionResult({ type, success: true, message: 'Email enviado correctamente', data: res.data })
      } else if (type === 'whatsapp') {
        if (lead.whatsapp || lead.phone) {
          res = await api.post('/api/outreach/whatsapp/send-direct', { leadId: lead.id })
          setActionResult({ type, success: true, message: 'WhatsApp enviado', data: res.data })
        } else {
          res = await api.post('/api/outreach/whatsapp/generate', { leadId: lead.id })
          setActionResult({ type, success: true, message: 'Mensaje WhatsApp generado', data: res.data })
        }
      } else if (type === 'call') {
        res = await api.post('/api/outreach/call/script', { leadId: lead.id })
        setActionResult({ type, success: true, message: 'Guion de llamada generado', data: res.data })
      } else if (type === 'report') {
        res = await api.post(`/api/scraping-engine/leads/${lead.id}/report`)
        setReport(res.data?.report || res.data)
        setActionResult({ type, success: true, message: 'Informe IA generado', data: res.data })
      }
    } catch (err) {
      setActionResult({ type, success: false, message: err.response?.data?.error || err.message || 'Error al ejecutar la accion' })
    }
    setActionLoading(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl ${stg.badge} flex items-center justify-center`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 truncate">{lead.company || lead.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stg.badge}`}>{stg.label}</span>
                {messages.filter(m => (m.channel || '').toUpperCase() === 'EMAIL').length > 0 && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                    {messages.filter(m => (m.channel || '').toUpperCase() === 'EMAIL').length} emails
                  </span>
                )}
                {messages.filter(m => (m.channel || '').toUpperCase() === 'WHATSAPP').length > 0 && (
                  <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                    {messages.filter(m => (m.channel || '').toUpperCase() === 'WHATSAPP').length} whatsapp
                  </span>
                )}
                {messages.filter(m => (m.channel || '').toUpperCase() === 'CALL').length > 0 && (
                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                    {messages.filter(m => (m.channel || '').toUpperCase() === 'CALL').length} llamadas
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Info section */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Informacion General</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Sector', value: lead.sector },
                { label: 'Ciudad', value: lead.city },
                { label: 'Estado', value: lead.state },
                { label: 'Direccion', value: lead.address },
                { label: 'Score', value: lead.score != null ? `${lead.score}/100` : null },
                { label: 'Valor', value: lead.value ? formatCurrency(lead.value) : null },
                { label: 'Dias en etapa', value: `${lead.daysInStage} dias` },
                { label: 'Fuente', value: lead.source },
              ].filter(i => i.value).map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-gray-400 font-medium">{item.label}</p>
                  <p className="text-sm text-gray-800 font-medium truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Contact section */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Datos de Contacto</h3>
            <div className="space-y-2">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <Mail className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-gray-700">{lead.email}</span>
                  <ExternalLink className="w-3 h-3 text-gray-300 ml-auto" />
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${normalizePhone(lead.phone)}`} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <Phone className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700">{lead.phone}</span>
                  <ExternalLink className="w-3 h-3 text-gray-300 ml-auto" />
                </a>
              )}
              {(lead.whatsapp || lead.phone) && (
                <a href={`https://wa.me/${normalizePhone(lead.whatsapp || lead.phone)?.replace('+', '')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">{lead.whatsapp || lead.phone}</span>
                  <ExternalLink className="w-3 h-3 text-gray-300 ml-auto" />
                </a>
              )}
              {lead.website && (
                <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm text-gray-700 truncate">{lead.website}</span>
                  <ExternalLink className="w-3 h-3 text-gray-300 ml-auto" />
                </a>
              )}
              {lead.socialMedia && Object.entries(lead.socialMedia).filter(([, v]) => v).map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 capitalize">{key}</span>
                  <ExternalLink className="w-3 h-3 text-gray-300 ml-auto" />
                </a>
              ))}
            </div>
          </section>

          {/* AI Report */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Informe IA</h3>
            {loadingReport ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : report ? (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-3">
                {report.companyProfile && (
                  <div>
                    <p className="text-[10px] font-semibold text-emerald-700 uppercase">Perfil de Empresa</p>
                    <p className="text-sm text-gray-700 mt-0.5">{typeof report.companyProfile === 'string' ? report.companyProfile : JSON.stringify(report.companyProfile)}</p>
                  </div>
                )}
                {report.contactQuality && (
                  <div>
                    <p className="text-[10px] font-semibold text-emerald-700 uppercase">Calidad de Contacto</p>
                    <p className="text-sm text-gray-700 mt-0.5">{typeof report.contactQuality === 'string' ? report.contactQuality : JSON.stringify(report.contactQuality)}</p>
                  </div>
                )}
                {report.recommendedApproach && (
                  <div>
                    <p className="text-[10px] font-semibold text-emerald-700 uppercase">Enfoque Recomendado</p>
                    <p className="text-sm text-gray-700 mt-0.5">{typeof report.recommendedApproach === 'string' ? report.recommendedApproach : JSON.stringify(report.recommendedApproach)}</p>
                  </div>
                )}
                {report.summary && (
                  <div>
                    <p className="text-[10px] font-semibold text-emerald-700 uppercase">Resumen</p>
                    <p className="text-sm text-gray-700 mt-0.5">{report.summary}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic py-3">Sin informe. Genera uno con el boton de abajo.</p>
            )}
          </section>

          {/* Outreach history - Timeline */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Historial de Contacto</h3>
            {loadingMessages ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : messages.length > 0 ? (
              <div className="relative max-h-[400px] overflow-y-auto pr-1">
                {/* Timeline left border line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200" />

                {messages.map((msg, i) => {
                  const ch = (msg.channel || msg.type || '').toUpperCase()
                  const isEmail = ch === 'EMAIL'
                  const isWhatsapp = ch === 'WHATSAPP'
                  const isCall = ch === 'CALL'
                  const status = (msg.status || '').toUpperCase()
                  const isExpanded = expandedMsgId === (msg.id || i)
                  const totalSteps = msg.totalSteps || msg.sequenceTotal
                  const stepNum = msg.stepNumber || msg.sequenceStep

                  // Status badge config
                  const statusConfig = {
                    SENT: { label: 'Enviado', cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
                    DELIVERED: { label: 'Entregado', cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
                    SCHEDULED: { label: 'Programado', cls: 'bg-blue-100 text-blue-700', icon: <Clock className="w-2.5 h-2.5" /> },
                    FAILED: { label: 'Fallido', cls: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-2.5 h-2.5" /> },
                    ERROR: { label: 'Error', cls: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-2.5 h-2.5" /> },
                    GENERATED: { label: 'Generado', cls: 'bg-gray-100 text-gray-600', icon: <FileText className="w-2.5 h-2.5" /> },
                    PENDING: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700', icon: <Clock className="w-2.5 h-2.5" /> },
                  }
                  const stInfo = statusConfig[status] || statusConfig.GENERATED

                  // Time ago helper
                  const timeAgo = (dateStr) => {
                    if (!dateStr) return ''
                    const diff = Date.now() - new Date(dateStr).getTime()
                    const mins = Math.floor(diff / 60000)
                    if (mins < 1) return 'ahora'
                    if (mins < 60) return `hace ${mins}m`
                    const hrs = Math.floor(mins / 60)
                    if (hrs < 24) return `hace ${hrs}h`
                    const days = Math.floor(hrs / 24)
                    if (days < 7) return `hace ${days}d`
                    return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
                  }

                  return (
                    <div key={msg.id || i} className="relative pl-9 pb-4">
                      {/* Timeline dot */}
                      <div className={`absolute left-[11px] top-1 w-[10px] h-[10px] rounded-full border-2 border-white z-10 ${
                        isEmail ? 'bg-emerald-400' : isWhatsapp ? 'bg-green-400' : isCall ? 'bg-blue-400' : 'bg-gray-400'
                      }`} />

                      <div className="bg-gray-50 rounded-xl p-3">
                        {/* Header row */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isEmail && <Mail className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                            {isWhatsapp && <MessageCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                            {isCall && <PhoneCall className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                            {!isEmail && !isWhatsapp && !isCall && <Send className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                            <span className="text-xs font-semibold text-gray-700">
                              {isEmail ? 'Email' : isWhatsapp ? 'WhatsApp' : isCall ? 'Guion de Llamada' : (msg.channel || 'Mensaje')}
                              {stepNum ? ` - Paso ${stepNum}${totalSteps ? `/${totalSteps}` : ''}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${stInfo.cls}`}>
                              {stInfo.icon} {stInfo.label}
                            </span>
                            <span className="text-[10px] text-gray-400">{timeAgo(msg.sentAt || msg.createdAt)}</span>
                          </div>
                        </div>

                        {/* Email content */}
                        {isEmail && (
                          <div>
                            {msg.subject && (
                              <p className="text-[11px] text-gray-600 mb-1">
                                <span className="text-gray-400 font-medium">Asunto: </span>
                                <span className="font-medium">"{msg.subject}"</span>
                              </p>
                            )}
                            <button
                              onClick={() => setExpandedMsgId(isExpanded ? null : (msg.id || i))}
                              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5"
                            >
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              {isExpanded ? 'Ocultar contenido' : 'Ver contenido'}
                            </button>
                            {isExpanded && (
                              <div className="mt-2 bg-white rounded-lg border border-gray-200 p-3 text-xs text-gray-700 max-h-60 overflow-y-auto">
                                {msg.bodyHtml || msg.body ? (
                                  <div dangerouslySetInnerHTML={{ __html: msg.bodyHtml || msg.body || '' }} />
                                ) : (
                                  <p className="whitespace-pre-wrap">{msg.content || msg.message || 'Sin contenido'}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* WhatsApp content */}
                        {isWhatsapp && (
                          <div className="mt-1">
                            <div className="bg-green-50 border border-green-200 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                              {msg.content || msg.message || msg.body || 'Sin contenido'}
                            </div>
                            {msg.whatsappUrl && (
                              <a href={msg.whatsappUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-green-600 hover:underline font-medium">
                                <ExternalLink className="w-2.5 h-2.5" /> Abrir en WhatsApp
                              </a>
                            )}
                          </div>
                        )}

                        {/* Call script content */}
                        {isCall && (
                          <div className="mt-1 space-y-1.5">
                            {(msg.script?.opening || msg.opening) && (
                              <div>
                                <span className="text-[10px] font-semibold text-blue-600 uppercase">Apertura:</span>
                                <p className="text-[11px] text-gray-600 mt-0.5">"{msg.script?.opening || msg.opening}"</p>
                              </div>
                            )}
                            {(msg.script?.hook || msg.hook) && (
                              <div>
                                <span className="text-[10px] font-semibold text-blue-600 uppercase">Gancho:</span>
                                <p className="text-[11px] text-gray-600 mt-0.5">"{msg.script?.hook || msg.hook}"</p>
                              </div>
                            )}
                            {(msg.script?.valueProp || msg.valueProp || msg.script?.valueProposition) && !isExpanded && (
                              <button
                                onClick={() => setExpandedMsgId(msg.id || i)}
                                className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                              >
                                <ChevronDown className="w-3 h-3" /> Ver guion completo
                              </button>
                            )}
                            {isExpanded && (
                              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 space-y-1.5">
                                {(msg.script?.valueProp || msg.valueProp || msg.script?.valueProposition) && (
                                  <div>
                                    <span className="text-[10px] font-semibold text-blue-600 uppercase">Propuesta de Valor:</span>
                                    <p className="text-[11px] text-gray-600 mt-0.5">{msg.script?.valueProp || msg.valueProp || msg.script?.valueProposition}</p>
                                  </div>
                                )}
                                {(msg.script?.objectionHandling || msg.objectionHandling) && (
                                  <div>
                                    <span className="text-[10px] font-semibold text-blue-600 uppercase">Manejo de Objeciones:</span>
                                    <p className="text-[11px] text-gray-600 mt-0.5">{msg.script?.objectionHandling || msg.objectionHandling}</p>
                                  </div>
                                )}
                                {(msg.script?.closing || msg.closing) && (
                                  <div>
                                    <span className="text-[10px] font-semibold text-blue-600 uppercase">Cierre:</span>
                                    <p className="text-[11px] text-gray-600 mt-0.5">{msg.script?.closing || msg.closing}</p>
                                  </div>
                                )}
                                {/* Fallback: show raw content/script if no structured fields */}
                                {!msg.script?.opening && !msg.opening && !msg.script?.hook && !msg.hook && (
                                  <p className="text-[11px] text-gray-600 whitespace-pre-wrap">{msg.content || msg.message || msg.body || (typeof msg.script === 'string' ? msg.script : JSON.stringify(msg.script, null, 2))}</p>
                                )}
                                <button
                                  onClick={() => setExpandedMsgId(null)}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5 mt-1"
                                >
                                  <ChevronDown className="w-3 h-3 rotate-180" /> Ocultar guion
                                </button>
                              </div>
                            )}
                            {/* Fallback for calls with no structured script */}
                            {!msg.script?.opening && !msg.opening && !msg.script?.hook && !msg.hook && !isExpanded && (
                              <p className="text-[11px] text-gray-600 line-clamp-2">{msg.content || msg.message || msg.body || 'Sin contenido'}</p>
                            )}
                          </div>
                        )}

                        {/* Generic fallback for other channels */}
                        {!isEmail && !isWhatsapp && !isCall && (
                          <p className="text-xs text-gray-600 line-clamp-2 mt-1">{msg.content || msg.subject || msg.message || 'Sin contenido'}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic py-3">Sin historial de contacto aun.</p>
            )}
          </section>

          {/* Action result */}
          {actionResult && (
            <div className={`rounded-xl p-3 flex items-start gap-2 ${actionResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              {actionResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
              <div className="min-w-0">
                <p className={`text-sm font-medium ${actionResult.success ? 'text-emerald-700' : 'text-red-700'}`}>{actionResult.message}</p>
                {actionResult.data?.generatedMessage && (
                  <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{actionResult.data.generatedMessage}</p>
                )}
                {actionResult.data?.script && (
                  <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{actionResult.data.script}</p>
                )}
                {actionResult.data?.whatsappUrl && (
                  <a href={actionResult.data.whatsappUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 hover:underline">
                    <MessageCircle className="w-3 h-3" /> Abrir WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Acciones</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleAction('email')} disabled={actionLoading === 'email'}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50">
                {actionLoading === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar Email IA
              </button>
              <button onClick={() => handleAction('whatsapp')} disabled={actionLoading === 'whatsapp'}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50">
                {actionLoading === 'whatsapp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                Enviar WhatsApp
              </button>
              <button onClick={() => handleAction('call')} disabled={actionLoading === 'call'}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50">
                {actionLoading === 'call' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
                Guion Llamada
              </button>
              <button onClick={() => handleAction('report')} disabled={actionLoading === 'report'}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors disabled:opacity-50">
                {actionLoading === 'report' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Informe IA
              </button>
            </div>
          </section>

          {/* Move stage */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mover Etapa</h3>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map(s => (
                <button key={s.key}
                  onClick={() => { onMoveStage(lead.id, s.key); onClose() }}
                  disabled={s.key === lead.stage}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    s.key === lead.stage ? `${s.badge} ring-2 ring-offset-1 ring-current opacity-70 cursor-default` : `${s.badge} hover:opacity-80`
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          {/* Full detail page link */}
          <section className="pt-4 border-t border-gray-100">
            <a href={`/admin/lead/${lead.id}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              <ExternalLink className="w-4 h-4" /> Ver en Detalle Completo
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}

// ─── Auto Contact Modal ───────────────────────────────────────────────────────
function AutoContactModal({ lead, onClose, onMoveStage }) {
  const [steps, setSteps] = useState([])
  const [running, setRunning] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true
    runAutoContact()
  }, [])

  async function runAutoContact() {
    const results = []
    const hasEmail = !!lead.email
    const hasPhone = !!(lead.whatsapp || lead.phone)

    // Step 1: Generate report
    setCurrentStep(0)
    results.push({ label: 'Generando informe IA...', status: 'loading' })
    setSteps([...results])
    try {
      await api.post(`/api/scraping-engine/leads/${lead.id}/report`)
      results[results.length - 1] = { label: 'Informe IA generado', status: 'success' }
    } catch {
      results[results.length - 1] = { label: 'No se pudo generar informe IA', status: 'error' }
    }
    setSteps([...results])

    // Step 2: Send email
    if (hasEmail) {
      setCurrentStep(1)
      results.push({ label: 'Enviando email con IA...', status: 'loading' })
      setSteps([...results])
      try {
        const res = await api.post('/api/outreach/email/send', { leadId: lead.id })
        results[results.length - 1] = { label: 'Email enviado', status: 'success', data: res.data }
      } catch {
        results[results.length - 1] = { label: 'No se pudo enviar email', status: 'error' }
      }
      setSteps([...results])
    }

    // Step 3: WhatsApp
    if (hasPhone) {
      setCurrentStep(2)
      results.push({ label: 'Generando mensaje WhatsApp...', status: 'loading' })
      setSteps([...results])
      try {
        const res = await api.post('/api/outreach/whatsapp/generate', { leadId: lead.id })
        const waUrl = res.data?.whatsappUrl || null
        results[results.length - 1] = { label: 'WhatsApp generado', status: 'success', data: res.data, waUrl }
      } catch {
        results[results.length - 1] = { label: 'No se pudo generar WhatsApp', status: 'error' }
      }
      setSteps([...results])
    }

    // Step 4: Call script
    if (hasPhone) {
      setCurrentStep(3)
      results.push({ label: 'Generando guion de llamada...', status: 'loading' })
      setSteps([...results])
      try {
        const res = await api.post('/api/outreach/call/script', { leadId: lead.id })
        results[results.length - 1] = { label: 'Guion de llamada listo', status: 'success', data: res.data }
      } catch {
        results[results.length - 1] = { label: 'No se pudo generar guion', status: 'error' }
      }
      setSteps([...results])
    }

    // Move to CONTACTADO
    try {
      await api.patch(`/api/scraping-engine/leads/${lead.id}`, { status: 'CONTACTADO' })
      onMoveStage(lead.id, 'CONTACTADO')
      results.push({ label: 'Lead movido a "Contactado"', status: 'success' })
    } catch {
      results.push({ label: 'No se pudo mover el lead', status: 'error' })
    }
    setSteps([...results])
    setRunning(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={!running ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Contacto Automatico</h3>
              <p className="text-xs text-gray-500">{lead.company || lead.name}</p>
            </div>
          </div>
          {!running && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-3">
          {running && steps.length === 0 && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              <p className="text-sm text-gray-600">Iniciando contacto automatico con <strong>{lead.company || lead.name}</strong>...</p>
            </div>
          )}
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              {step.status === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-emerald-500 mt-0.5 flex-shrink-0" />}
              {step.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />}
              {step.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${step.status === 'error' ? 'text-red-600' : 'text-gray-700'}`}>{step.label}</p>
                {step.data?.generatedMessage && (
                  <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap line-clamp-3">{step.data.generatedMessage}</p>
                )}
                {step.data?.script && (
                  <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap line-clamp-3">{step.data.script}</p>
                )}
                {step.waUrl && (
                  <a href={step.waUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 font-medium hover:underline">
                    <MessageCircle className="w-3 h-3" /> Abrir en WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {!running && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Pipeline Page ───────────────────────────────────────────────────────
export default function PipelinePage() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('kanban')
  const [searchQuery, setSearchQuery] = useState('')
  const [detailLead, setDetailLead] = useState(null)
  const [autoContactLead, setAutoContactLead] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [autoProgress, setAutoProgress] = useState({ done: 0, total: 0, current: '' })
  const [repliedLeads, setRepliedLeads] = useState([])
  const [waAccounts, setWaAccounts] = useState([])
  const [emailStats, setEmailStats] = useState(null)
  const [stageCounts, setStageCounts] = useState(null)

  const loadStageCounts = useCallback(async () => {
    try {
      const { data } = await api.get('/api/leads/stage-counts')
      setStageCounts(data)
    } catch {}
  }, [])

  const loadWaAccounts = useCallback(async () => {
    try {
      const { data } = await api.get('/api/whatsapp-accounts')
      setWaAccounts(data.accounts || [])
    } catch {}
  }, [])

  const loadEmailStats = useCallback(async () => {
    try {
      const { data } = await api.get('/api/email-daily-stats')
      setEmailStats(data)
    } catch {}
  }, [])

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      // Sync statuses first: any lead with sent messages should be CONTACTADO, with replies → EN_CONVERSACION
      try { await api.post('/api/leads/sync-status') } catch {}
      // Load real stage counts (for the totals shown in the header)
      loadStageCounts()
      // Bring 1000 leads max for the kanban view (we'll show the stage count badges from sql)
      const res = await api.get('/api/scraping-engine/leads', { params: { limit: 1000 } })
      const data = res.data
      const raw = data.leads || data.data || (Array.isArray(data) ? data : [])
      setLeads(raw.map(l => ({
        id: l.id || l._id,
        name: l.name || l.businessName || l.title || '',
        company: l.businessName || l.company || l.name || l.title || '',
        sector: l.sector || l.category || l.industry || '',
        city: l.city || l.ciudad || '',
        state: l.state || l.estado || l.province || '',
        address: l.address || l.direccion || '',
        phone: l.phone || l.telefono || l.phoneNumber || '',
        whatsapp: l.whatsapp || l.whatsappNumber || '',
        email: l.email || l.correo || '',
        website: l.website || l.sitioWeb || l.url || '',
        socialMedia: l.socialMedia || l.redesSociales || {},
        score: Number(l.score || l.qualityScore || l.fitScore || 0),
        value: Number(l.value || l.estimatedValue || l.estimated_value || 0),
        stage: mapStatus(l.status || l.pipelineStage),
        source: l.source || l.fuente || '',
        createdAt: l.createdAt || l.created_at || l.fechaCreacion || '',
        daysInStage: daysAgo(l.stageChangedAt || l.updatedAt || l.createdAt || l.created_at),
        aiSummary: l.aiSummary || l.report?.summary || '',
        raw: l,
      })))
    } catch {
      setLeads([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadLeads() }, [loadLeads])
  useEffect(() => { loadWaAccounts(); loadEmailStats() }, [loadWaAccounts, loadEmailStats])
  useEffect(() => {
    const iv = setInterval(() => { loadWaAccounts(); loadEmailStats() }, 30000)
    return () => clearInterval(iv)
  }, [loadWaAccounts, loadEmailStats])

  // Load leads that replied
  const loadReplied = useCallback(async () => {
    try {
      const { data } = await api.get('/api/leads/replied')
      setRepliedLeads(data.leads || [])
    } catch {}
  }, [])
  useEffect(() => { loadReplied() }, [loadReplied])
  useEffect(() => {
    const iv = setInterval(loadReplied, 10000)
    return () => clearInterval(iv)
  }, [loadReplied])

  // ─── Derived data ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return leads
    const q = searchQuery.toLowerCase()
    return leads.filter(l =>
      (l.company || '').toLowerCase().includes(q) ||
      (l.sector || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q)
    )
  }, [leads, searchQuery])

  const stageGroups = useMemo(() => {
    const groups = {}
    STAGES.forEach(s => { groups[s.key] = [] })
    filtered.forEach(l => {
      const key = groups[l.stage] ? l.stage : 'NUEVO'
      groups[key].push(l)
    })
    return groups
  }, [filtered])

  const stats = useMemo(() => {
    const total = leads.length
    const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0)
    const ganados = leads.filter(l => l.stage === 'GANADO').length
    const perdidos = leads.filter(l => l.stage === 'PERDIDO').length
    const finalized = ganados + perdidos
    const conversion = finalized > 0 ? Math.round((ganados / finalized) * 100) : 0
    return { total, totalValue, ganados, perdidos, conversion }
  }, [leads])

  // ─── Handlers ─────────────────────────────────────────────────────────────
  function handleMoveStage(id, newStage) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: newStage, daysInStage: 0 } : l))
    api.patch(`/api/scraping-engine/leads/${id}`, { status: newStage }).catch(() => {})
  }

  function handleToggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(l => l.id)))
  }

  async function handleBulkContact() {
    if (selectedIds.size === 0) return
    setBulkLoading(true)
    const ids = [...selectedIds]
    for (const id of ids) {
      const lead = leads.find(l => l.id === id)
      if (!lead) continue
      try {
        await api.post(`/api/scraping-engine/leads/${id}/report`)
      } catch {}
      if (lead.email) {
        try { await api.post('/api/outreach/email/send', { leadId: id }) } catch {}
      }
      if (lead.whatsapp || lead.phone) {
        try { await api.post('/api/outreach/whatsapp/generate', { leadId: id }) } catch {}
      }
      handleMoveStage(id, 'CONTACTADO')
    }
    setSelectedIds(new Set())
    setBulkLoading(false)
  }

  // Poll auto-play status from backend
  useEffect(() => {
    const poll = async () => {
      try {
        const { data } = await api.get('/api/autoplay/status')
        setAutoPlay(data.running)
        setAutoProgress({ done: data.done, total: data.total, current: data.current || '' })
        if (!data.running && data.done > 0 && data.done >= data.total) loadLeads()
      } catch {}
    }
    poll()
    const iv = setInterval(poll, 2000)
    return () => clearInterval(iv)
  }, [loadLeads])

  async function startAutoPlay() {
    try {
      await api.post('/api/autoplay/start')
      setAutoPlay(true)
    } catch {}
  }

  async function stopAutoPlay() {
    try {
      await api.post('/api/autoplay/stop')
      setAutoPlay(false)
      loadLeads()
    } catch {}
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm text-gray-400">Cargando pipeline...</p>
      </div>
    )
  }

  // Calculated stats for hero cards
  const totalLeads = stageCounts?.total ?? stats.total
  const nuevoCount = stageCounts?.stages?.NUEVO ?? (stageGroups.NUEVO?.length || 0)
  const contactadoCount = stageCounts?.stages?.CONTACTADO ?? (stageGroups.CONTACTADO?.length || 0)
  const conversacionCount = stageCounts?.stages?.EN_CONVERSACION ?? (stageGroups.EN_CONVERSACION?.length || 0)
  const ganadoCount = stageCounts?.stages?.GANADO ?? (stageGroups.GANADO?.length || 0)
  const responseRate = contactadoCount > 0 ? Math.round((conversacionCount / contactadoCount) * 100) : 0

  return (
    <div className="space-y-4">
      {/* ── Hero: Title + Quick Actions ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipeline de Ventas</h1>
            <p className="text-xs text-gray-500 mt-0.5">Gestiona tu embudo de leads en tiempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar leads..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm w-56 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1">
            <button onClick={() => setView('kanban')}
              className={`p-1.5 rounded-lg transition-all ${view === 'kanban' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Kanban">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setView('list')}
              className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Lista">
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh */}
          <button onClick={loadLeads} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors" title="Refrescar">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>

          {/* Auto Play */}
          {autoPlay ? (
            <button onClick={stopAutoPlay}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 shadow-sm transition-colors">
              <Square className="w-4 h-4" />
              Detener
            </button>
          ) : (
            <button onClick={startAutoPlay}
              disabled={leads.filter(l => l.stage === 'NUEVO' && (l.email || l.phone || l.whatsapp)).length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              <Play className="w-4 h-4" />
              Auto Play
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">
                {leads.filter(l => l.stage === 'NUEVO' && (l.email || l.phone || l.whatsapp)).length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Stat Cards Hero ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Leads */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalLeads.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Leads en base</p>
        </div>

        {/* Nuevos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <Star className="w-4 h-4 text-gray-600" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Nuevos</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{nuevoCount.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Sin contactar</p>
        </div>

        {/* Contactados */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Send className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Contactados</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{contactadoCount.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Email/WhatsApp enviado</p>
        </div>

        {/* En conversación */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Conversación</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{conversacionCount.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{responseRate}% tasa respuesta</p>
        </div>

        {/* Ganados */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl border border-emerald-400 p-4 hover:shadow-md transition-shadow text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">Ganados</span>
          </div>
          <p className="text-2xl font-bold">{ganadoCount.toLocaleString()}</p>
          <p className="text-[11px] text-white/80 mt-0.5">{stats.conversion}% conversión · {formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      {/* Outreach Channels Status */}
      {(waAccounts.length > 0 || emailStats) && (
        <div className="flex items-center gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl flex-wrap">
          {/* WhatsApp Section */}
          {waAccounts.length > 0 && (
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-green-800">WhatsApp</span>
              {waAccounts.filter(a => a.is_active).map(acc => {
                const used = acc.messages_today || 0
                const limit = acc.daily_limit || 100
                const pct = Math.min(100, Math.round((used / limit) * 100))
                const full = pct >= 100
                return (
                  <div key={acc.id} className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${acc.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-[11px] text-gray-600 font-medium">{acc.name || acc.phone || 'Cuenta'}</span>
                    <div className="w-14 h-1.5 bg-green-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${full ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-[10px] font-bold ${full ? 'text-red-600' : 'text-gray-500'}`}>{used}/{limit}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Divider */}
          {waAccounts.length > 0 && emailStats && <div className="w-px h-5 bg-gray-300" />}

          {/* Email Section */}
          {emailStats && (
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-blue-800">Email</span>
              <span className={`w-1.5 h-1.5 rounded-full ${emailStats.configured ? 'bg-blue-500' : 'bg-gray-400'}`} />
              <span className="text-[11px] text-gray-600 font-medium">{emailStats.provider}</span>
              <span className="text-[10px] font-bold text-gray-500">{emailStats.sent_today} hoy</span>
              <span className="text-[10px] text-gray-400">({emailStats.sent_total} total)</span>
            </div>
          )}
        </div>
      )}

      {/* Replied Leads Alert */}
      {repliedLeads.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-200 bg-amber-100/50">
            <Bell className="w-4 h-4 text-amber-600 animate-pulse" />
            <span className="text-sm font-bold text-amber-800">{repliedLeads.length} lead{repliedLeads.length > 1 ? 's' : ''} respondieron</span>
            <span className="text-xs text-amber-600 ml-1">Requieren atencion</span>
          </div>
          <div className="divide-y divide-amber-100">
            {repliedLeads.map(rl => (
              <div
                key={rl.id}
                onClick={() => navigate(`/admin/lead/${rl.id}`)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-amber-100/50 cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {(rl.name || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{rl.name}</p>
                  <p className="text-xs text-gray-500 truncate">{rl.last_message?.slice(0, 80) || 'Respondio'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  <span className="text-[10px] text-gray-400">
                    {rl.replied_at ? new Date(rl.replied_at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto Play Progress */}
      {autoPlay && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-800">Auto Play activo</span>
            </div>
            <span className="text-sm font-bold text-emerald-700">{autoProgress.done}/{autoProgress.total}</span>
          </div>
          <div className="w-full bg-emerald-200 rounded-full h-2.5 mb-2">
            <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${autoProgress.total > 0 ? (autoProgress.done / autoProgress.total) * 100 : 0}%` }} />
          </div>
          {autoProgress.current && (
            <p className="text-xs text-emerald-600">Contactando: <span className="font-semibold">{autoProgress.current}</span></p>
          )}
        </div>
      )}

      {/* ── Bulk actions (list view) ───────────────────────────────────────── */}
      {view === 'list' && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <span className="text-sm text-emerald-700 font-medium">{selectedIds.size} seleccionados</span>
          <button
            onClick={handleBulkContact}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Contactar Seleccionados
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-emerald-600 hover:underline ml-auto">
            Deseleccionar todo
          </button>
        </div>
      )}

      {/* ── Kanban View ────────────────────────────────────────────────────── */}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-4 -mx-2 px-2">
          <div className="flex gap-4" style={{ minWidth: STAGES.length * 288 }}>
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                leads={stageGroups[stage.key] || []}
                totalCount={stageCounts?.stages?.[stage.key]}
                onOpenDetail={setDetailLead}
                onMoveStage={handleMoveStage}
                onAutoContact={setAutoContactLead}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── List View ──────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <ListView
          leads={filtered}
          onOpenDetail={setDetailLead}
          onMoveStage={handleMoveStage}
          onAutoContact={setAutoContactLead}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
        />
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mb-3" />
          <p className="text-lg font-medium">Sin leads en el pipeline</p>
          <p className="text-sm mt-1">Los leads apareceran aqui cuando se detecten.</p>
        </div>
      )}

      {/* ── Detail Panel ───────────────────────────────────────────────────── */}
      {detailLead && (
        <DetailPanel
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onMoveStage={(id, stage) => { handleMoveStage(id, stage); setDetailLead(prev => prev ? { ...prev, stage } : null) }}
          onRefreshLead={loadLeads}
        />
      )}

      {/* ── Auto Contact Modal ─────────────────────────────────────────────── */}
      {autoContactLead && (
        <AutoContactModal
          lead={autoContactLead}
          onClose={() => { setAutoContactLead(null); loadLeads() }}
          onMoveStage={handleMoveStage}
        />
      )}
    </div>
  )
}
