import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  GitBranch, Loader2, RefreshCw, Search, X, Filter, Plus,
  Phone, Mail, MessageCircle, Globe, Linkedin, MapPin,
  Building2, Calendar, Clock, DollarSign, FileText, CheckCircle2,
  AlertCircle, Star, Send, PhoneCall, ChevronRight, User, Tag,
  TrendingUp, Target, Snowflake, Trash2, Save, ExternalLink, History,
  StickyNote, ArrowRight, Sparkles, Zap
} from 'lucide-react'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'

// ─── Stages ───────────────────────────────────────────────────────────────────
const STAGES = [
  { key: 'NUEVO',           label: 'Nuevo',           bg: 'bg-slate-50',    head: 'bg-slate-100',   border: 'border-slate-200',   dot: 'bg-slate-400',   text: 'text-slate-700' },
  { key: 'CONTACTADO',      label: 'Contactado',      bg: 'bg-blue-50',     head: 'bg-blue-100',    border: 'border-blue-200',    dot: 'bg-blue-500',    text: 'text-blue-700' },
  { key: 'EN_CONVERSACION', label: 'En conversación', bg: 'bg-amber-50',    head: 'bg-amber-100',   border: 'border-amber-200',   dot: 'bg-amber-500',   text: 'text-amber-700' },
  { key: 'PROPUESTA',       label: 'Propuesta',       bg: 'bg-purple-50',   head: 'bg-purple-100',  border: 'border-purple-200',  dot: 'bg-purple-500',  text: 'text-purple-700' },
  { key: 'NEGOCIACION',     label: 'Negociación',     bg: 'bg-indigo-50',   head: 'bg-indigo-100',  border: 'border-indigo-200',  dot: 'bg-indigo-500',  text: 'text-indigo-700' },
  { key: 'GANADO',          label: 'Ganado',          bg: 'bg-emerald-50',  head: 'bg-emerald-100', border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  { key: 'PERDIDO',         label: 'Perdido',         bg: 'bg-red-50',      head: 'bg-red-100',     border: 'border-red-200',     dot: 'bg-red-400',     text: 'text-red-700' },
]
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

function normalizeStage(s) {
  if (!s) return 'NUEVO'
  const u = String(s).toUpperCase().replace(/\s+/g, '_')
  if (STAGE_MAP[u]) return u
  if (['NEW', 'PENDING'].includes(u)) return 'NUEVO'
  if (['CONTACTED', 'REACHED_OUT'].includes(u)) return 'CONTACTADO'
  if (['REPLIED', 'IN_CONVERSATION'].includes(u)) return 'EN_CONVERSACION'
  if (['PROPOSAL', 'PROPOSAL_SENT'].includes(u)) return 'PROPUESTA'
  if (['NEGOTIATION', 'NEGOTIATING'].includes(u)) return 'NEGOCIACION'
  if (['WON', 'CLOSED_WON'].includes(u)) return 'GANADO'
  if (['LOST', 'CLOSED_LOST'].includes(u)) return 'PERDIDO'
  return 'NUEVO'
}

function fmtCurrency(v) {
  const n = Number(v) || 0
  if (n === 0) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

function timeAgo(d) {
  if (!d) return '—'
  const date = new Date(d)
  const sec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (sec < 60) return 'hace seg'
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo`
}

function cleanPhone(p) {
  if (!p) return ''
  return String(p).replace(/[^0-9+]/g, '')
}

// ─── Lead Card ────────────────────────────────────────────────────────────────
function LeadCard({ lead, onClick, onDragStart }) {
  const stage = STAGE_MAP[lead.stage] || STAGE_MAP.NUEVO
  const score = Number(lead.score) || 0
  const scoreColor = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-gray-300'
  const next = lead.next_step_at ? new Date(lead.next_step_at) : null
  const overdue = next && next.getTime() < Date.now()
  const lastContact = lead.last_contact_at ? new Date(lead.last_contact_at) : null
  const stale = lastContact && (Date.now() - lastContact.getTime()) > 5 * 86400000 &&
                ['CONTACTADO','EN_CONVERSACION','PROPUESTA','NEGOCIACION'].includes(lead.stage)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onClick={() => onClick(lead)}
      className={`group bg-white rounded-xl border ${stage.border} p-3 mb-2 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all`}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-[13px] leading-tight line-clamp-2">
            {lead.name || 'Sin nombre'}
          </h4>
          {lead.sector && (
            <p className="text-[11px] text-gray-500 capitalize mt-0.5 truncate">{lead.sector}</p>
          )}
        </div>
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${scoreColor} text-white flex items-center justify-center text-[10px] font-bold`}>
          {score}
        </div>
      </div>

      {(lead.city || lead.state) && (
        <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1.5">
          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
        </div>
      )}

      {lead.deal_value > 0 && (
        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mb-1.5">
          <DollarSign className="w-3 h-3" />
          {fmtCurrency(lead.deal_value)}
        </div>
      )}

      {lead.next_step && (
        <div className={`text-[11px] rounded-md px-2 py-1 mb-1.5 flex items-start gap-1 ${overdue ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
          <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-snug">{lead.next_step}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-50">
        <div className="flex items-center gap-1">
          {lead.email && <Mail className="w-3 h-3 text-gray-400" />}
          {(lead.phone || lead.social_whatsapp) && <MessageCircle className="w-3 h-3 text-emerald-500" />}
          {lead.phone && <Phone className="w-3 h-3 text-blue-500" />}
          {lead.calls_count > 0 && (
            <span className="text-[9px] text-gray-500 font-semibold ml-0.5">{lead.calls_count}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {stale && <span title="Sin contacto >5d"><Snowflake className="w-3 h-3 text-blue-400" /></span>}
          <span className="text-[10px] text-gray-400">{timeAgo(lead.stage_changed_at || lead.updated_at)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────
function StageColumn({ stage, leads, onCardClick, onDragStart, onDrop, dragOver, setDragOver }) {
  const totalValue = leads.reduce((s, l) => s + (Number(l.deal_value) || 0), 0)
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(stage.key) }}
      onDragLeave={() => setDragOver(null)}
      onDrop={(e) => { e.preventDefault(); onDrop(stage.key); setDragOver(null) }}
      className={`flex-shrink-0 w-72 rounded-2xl ${stage.bg} border ${stage.border} ${dragOver === stage.key ? 'ring-2 ring-blue-400 ring-offset-2' : ''} flex flex-col max-h-[calc(100vh-220px)]`}
    >
      <div className={`px-3 py-2.5 ${stage.head} rounded-t-2xl border-b ${stage.border} flex items-center justify-between sticky top-0 z-10`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full ${stage.dot} flex-shrink-0`} />
          <h3 className={`text-xs font-bold uppercase tracking-wide ${stage.text} truncate`}>{stage.label}</h3>
          <span className={`text-[10px] font-bold ${stage.text} bg-white/70 px-1.5 py-0.5 rounded-full`}>
            {leads.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span className={`text-[10px] font-semibold ${stage.text}`}>{fmtCurrency(totalValue)}</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {leads.length === 0 ? (
          <div className="text-center py-6 text-[11px] text-gray-400 italic">Vacío</div>
        ) : (
          leads.map(l => (
            <LeadCard key={l.id} lead={l} onClick={onCardClick} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Lead Drawer (gestión completa) ──────────────────────────────────────────
function LeadDrawer({ leadId, onClose, onUpdated }) {
  const { user } = useAuthStore()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('resumen')
  const [timeline, setTimeline] = useState([])
  const [calls, setCalls] = useState([])

  // forms
  const [notes, setNotes] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [nextStepAt, setNextStepAt] = useState('')
  const [dealValue, setDealValue] = useState('')
  const [lostReason, setLostReason] = useState('')

  // email
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  // whatsapp
  const [waMessage, setWaMessage] = useState('')
  const [waSending, setWaSending] = useState(false)
  // call log
  const [callOutcome, setCallOutcome] = useState('CONECTADO')
  const [callDuration, setCallDuration] = useState('')
  const [callNotes, setCallNotes] = useState('')
  const [callNextAction, setCallNextAction] = useState('')
  const [callNextAt, setCallNextAt] = useState('')
  const [callSaving, setCallSaving] = useState(false)

  const load = useCallback(async () => {
    if (!leadId) return
    setLoading(true)
    try {
      const [{ data: leadData }, { data: tl }, { data: callsData }] = await Promise.all([
        api.get(`/api/scraping-engine/leads/${leadId}`).catch(async () => {
          const r = await api.get(`/api/scraping/leads/${leadId}`)
          return r
        }),
        api.get(`/api/seller/pipeline/leads/${leadId}/timeline`).catch(() => ({ data: { events: [] } })),
        api.get(`/api/seller/leads/${leadId}/calls`).catch(() => ({ data: { calls: [] } })),
      ])
      const raw = leadData?.data || leadData?.lead || leadData
      setLead(raw)
      setNotes(raw?.seller_notes || '')
      setNextStep(raw?.next_step || '')
      setNextStepAt(raw?.next_step_at ? new Date(raw.next_step_at).toISOString().slice(0, 16) : '')
      setDealValue(raw?.deal_value ? String(raw.deal_value) : '')
      setLostReason(raw?.lost_reason || '')
      setTimeline(tl.events || [])
      setCalls(callsData.calls || [])
    } catch (err) {
      console.error('Error cargando lead', err)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => { load() }, [load])

  async function savePipelineFields(extra = {}) {
    setSaving(true)
    try {
      const body = {
        seller_notes: notes,
        next_step: nextStep,
        next_step_at: nextStepAt || null,
        deal_value: dealValue ? Number(dealValue) : 0,
        ...extra,
      }
      const { data } = await api.patch(`/api/seller/pipeline/leads/${leadId}`, body)
      if (data?.lead) setLead(data.lead)
      onUpdated?.(data?.lead)
    } catch (err) {
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function changeStage(newStage) {
    const extra = { status: newStage }
    if (newStage === 'PERDIDO' && lostReason) extra.lost_reason = lostReason
    await savePipelineFields(extra)
  }

  async function claim() {
    try {
      await api.post(`/api/seller/leads/${leadId}/claim`)
      await load()
      onUpdated?.()
    } catch (err) {
      alert(err?.response?.data?.message || 'No se pudo reclamar')
    }
  }

  async function sendEmail() {
    if (!lead?.email) return alert('El lead no tiene email')
    if (!emailSubject || !emailBody) return alert('Completá asunto y cuerpo')
    setEmailSending(true)
    try {
      await api.post('/api/outreach/email/send-direct', {
        email: lead.email,
        subject: emailSubject,
        body: emailBody,
        leadId,
      })
      setEmailSubject(''); setEmailBody('')
      alert('Email enviado')
      await load()
    } catch (err) {
      alert(err?.response?.data?.error || 'Error al enviar email')
    } finally {
      setEmailSending(false)
    }
  }

  async function sendWhatsApp() {
    const phone = cleanPhone(lead?.social_whatsapp || lead?.phone)
    if (!phone) return alert('El lead no tiene WhatsApp ni teléfono')
    if (!waMessage.trim()) return alert('Escribí un mensaje')
    setWaSending(true)
    try {
      await api.post('/api/outreach/whatsapp/send-direct', {
        phone, message: waMessage, leadId,
      })
      setWaMessage('')
      alert('Mensaje enviado por WhatsApp')
      await load()
    } catch (err) {
      const msg = err?.response?.data?.error || 'Error al enviar WhatsApp'
      alert(msg + '\n\nTip: podés abrir wa.me en una pestaña si no hay cuenta conectada.')
    } finally {
      setWaSending(false)
    }
  }

  async function generateEmailDraft() {
    try {
      setEmailSending(true)
      const { data } = await api.post('/api/outreach/email/preview', {
        leadId, stepType: 'introduction',
      })
      if (data?.preview) {
        setEmailSubject(data.preview.subject || '')
        setEmailBody(data.preview.body || '')
      }
    } catch {
      alert('No se pudo generar el borrador')
    } finally {
      setEmailSending(false)
    }
  }

  async function generateWaDraft() {
    try {
      setWaSending(true)
      const { data } = await api.post('/api/outreach/whatsapp/generate', { leadId })
      if (data?.message) setWaMessage(data.message)
    } catch {
      alert('No se pudo generar el mensaje')
    } finally {
      setWaSending(false)
    }
  }

  async function logCall() {
    setCallSaving(true)
    try {
      await api.post(`/api/seller/leads/${leadId}/calls`, {
        duration_seconds: Number(callDuration) || 0,
        outcome: callOutcome,
        notes: callNotes,
        next_action: callNextAction,
        next_action_at: callNextAt || null,
      })
      setCallDuration(''); setCallNotes(''); setCallNextAction(''); setCallNextAt('')
      await load()
    } catch {
      alert('Error al registrar llamada')
    } finally {
      setCallSaving(false)
    }
  }

  if (!leadId) return null
  if (loading || !lead) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative w-full max-w-3xl bg-white h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    )
  }

  const stage = normalizeStage(lead.status)
  const stageCfg = STAGE_MAP[stage]
  const isMine = lead.assigned_seller_id === user?.id
  const isUnassigned = !lead.assigned_seller_id
  const score = Number(lead.score) || 0
  const phone = cleanPhone(lead.social_whatsapp || lead.phone)
  const waLink = phone ? `https://wa.me/${phone.replace('+', '')}` : null

  const tabs = [
    { key: 'resumen', label: 'Resumen', icon: User },
    { key: 'gestion', label: 'Gestión', icon: Target },
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { key: 'llamadas', label: 'Llamadas', icon: PhoneCall },
    { key: 'historial', label: 'Historial', icon: History },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-gray-50 h-full overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-bold text-gray-900 truncate">{lead.name || 'Sin nombre'}</h2>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${stageCfg.head} ${stageCfg.text}`}>
                  {stageCfg.label}
                </span>
                <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  Score {score}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                {lead.sector && <span className="capitalize flex items-center gap-1"><Tag className="w-3 h-3" />{lead.sector}</span>}
                {lead.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.city}{lead.state ? `, ${lead.state}` : ''}</span>}
                {lead.website && <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline"><Globe className="w-3 h-3" />Web</a>}
                {lead.social_linkedin && <a href={lead.social_linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline"><Linkedin className="w-3 h-3" />LinkedIn</a>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Stage selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STAGES.map(s => (
              <button
                key={s.key}
                disabled={saving || s.key === stage}
                onClick={() => changeStage(s.key)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition disabled:opacity-60 ${
                  s.key === stage
                    ? `${s.head} ${s.text} ring-2 ring-offset-1 ring-gray-300`
                    : 'ring-1 ring-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Claim / contact bar */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            {isUnassigned && (
              <button onClick={claim} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold">
                Tomar este lead
              </button>
            )}
            {isMine && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg ring-1 ring-emerald-200 font-semibold">
                Mío
              </span>
            )}
            {!isUnassigned && !isMine && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg ring-1 ring-amber-200">
                Asignado a otro
              </span>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="text-xs flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg">
                <Mail className="w-3 h-3" /> {lead.email}
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="text-xs flex items-center gap-1 bg-violet-50 hover:bg-violet-100 text-violet-700 px-2.5 py-1 rounded-lg">
                <Phone className="w-3 h-3" /> {lead.phone}
              </a>
            )}
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg">
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-[152px] z-10 bg-white border-b border-gray-200 px-6 flex gap-1 overflow-x-auto">
          {tabs.map(t => {
            const Ico = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                  tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Ico className="w-3.5 h-3.5" /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {tab === 'resumen' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Score</p>
                  <p className="text-2xl font-bold text-gray-900">{score}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Valor estimado</p>
                  <p className="text-2xl font-bold text-emerald-700">{fmtCurrency(lead.deal_value)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Último contacto</p>
                  <p className="text-sm font-semibold text-gray-900">{lead.last_contact_at ? timeAgo(lead.last_contact_at) + ' atrás' : 'Nunca'}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <p className="text-[10px] uppercase font-bold text-gray-400">En esta etapa</p>
                  <p className="text-sm font-semibold text-gray-900">{timeAgo(lead.stage_changed_at || lead.updated_at)}</p>
                </div>
              </div>

              {lead.ai_report && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    Informe IA
                  </h3>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{lead.ai_report}</p>
                </div>
              )}

              {lead.address && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Dirección</h3>
                  <p className="text-xs text-gray-600">{lead.address}</p>
                </div>
              )}
            </>
          )}

          {tab === 'gestion' && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
                    <StickyNote className="w-3.5 h-3.5" /> Notas internas
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={5}
                    placeholder="Qué charlaste, contexto, decisores, objeciones, dolor del cliente..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
                      <ArrowRight className="w-3.5 h-3.5" /> Próximo paso
                    </label>
                    <input
                      type="text"
                      value={nextStep}
                      onChange={e => setNextStep(e.target.value)}
                      placeholder="Ej: Mandar propuesta el lunes"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Fecha
                    </label>
                    <input
                      type="datetime-local"
                      value={nextStepAt}
                      onChange={e => setNextStepAt(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> Valor estimado del deal (USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={dealValue}
                      onChange={e => setDealValue(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    />
                  </div>
                  {stage === 'PERDIDO' && (
                    <div>
                      <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Razón de pérdida
                      </label>
                      <input
                        type="text"
                        value={lostReason}
                        onChange={e => setLostReason(e.target.value)}
                        placeholder="Precio, timing, competidor, no respondió..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => savePipelineFields()}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Guardar cambios
                </button>
              </div>
            </>
          )}

          {tab === 'email' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              {!lead.email && (
                <div className="bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg">
                  ⚠ Este lead no tiene email registrado.
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Para</label>
                <input
                  type="text"
                  value={lead.email || ''}
                  readOnly
                  className="w-full px-3 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Asunto</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Asunto del mensaje"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Cuerpo</label>
                <textarea
                  rows={8}
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  placeholder="Escribí o generá un borrador con IA"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateEmailDraft}
                  disabled={emailSending || !lead.email}
                  className="text-xs ring-1 ring-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Generar con IA
                </button>
                <button
                  onClick={sendEmail}
                  disabled={emailSending || !lead.email || !emailSubject || !emailBody}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {emailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar email
                </button>
              </div>
            </div>
          )}

          {tab === 'whatsapp' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              {!phone && (
                <div className="bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg">
                  ⚠ Este lead no tiene WhatsApp/teléfono registrado.
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Para</label>
                <input
                  type="text"
                  value={lead.social_whatsapp || lead.phone || ''}
                  readOnly
                  className="w-full px-3 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Mensaje</label>
                <textarea
                  rows={6}
                  value={waMessage}
                  onChange={e => setWaMessage(e.target.value)}
                  placeholder="Mensaje corto, personalizado, con CTA claro"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateWaDraft}
                  disabled={waSending || !phone}
                  className="text-xs ring-1 ring-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Generar con IA
                </button>
                <button
                  onClick={sendWhatsApp}
                  disabled={waSending || !phone || !waMessage.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {waSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar por WhatsApp
                </button>
              </div>
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer"
                  className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Abrir en wa.me como respaldo
                </a>
              )}
            </div>
          )}

          {tab === 'llamadas' && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Registrar llamada</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">Resultado</label>
                    <select
                      value={callOutcome}
                      onChange={e => setCallOutcome(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 outline-none"
                    >
                      <option value="CONECTADO">Conectado</option>
                      <option value="NO_CONTESTO">No contestó</option>
                      <option value="BUZON">Buzón de voz</option>
                      <option value="NUMERO_INCORRECTO">Número incorrecto</option>
                      <option value="INTERESADO">Interesado</option>
                      <option value="NO_INTERESADO">No interesado</option>
                      <option value="REAGENDADO">Reagendado</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">Duración (seg)</label>
                    <input
                      type="number"
                      min="0"
                      value={callDuration}
                      onChange={e => setCallDuration(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1.5 block">Notas</label>
                  <textarea
                    rows={3}
                    value={callNotes}
                    onChange={e => setCallNotes(e.target.value)}
                    placeholder="Qué se habló, objeciones, intereses..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">Próxima acción</label>
                    <input
                      type="text"
                      value={callNextAction}
                      onChange={e => setCallNextAction(e.target.value)}
                      placeholder="Reagendar para mostrar demo"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1.5 block">Cuándo</label>
                    <input
                      type="datetime-local"
                      value={callNextAt}
                      onChange={e => setCallNextAt(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={logCall}
                  disabled={callSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {callSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Registrar
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Historial de llamadas</h3>
                {calls.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Aún no hay llamadas registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {calls.map(c => (
                      <div key={c.id} className="border border-gray-100 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-900">{c.outcome || 'Sin resultado'}</span>
                          <span className="text-gray-400 text-[10px]">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        {c.duration_seconds > 0 && (
                          <p className="text-[10px] text-gray-500 mb-1">{Math.floor(c.duration_seconds / 60)}m {c.duration_seconds % 60}s</p>
                        )}
                        {c.notes && <p className="text-gray-700 leading-snug">{c.notes}</p>}
                        {c.next_action && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-100 text-amber-700">
                            <strong>Siguiente:</strong> {c.next_action}
                            {c.next_action_at && <span className="text-gray-400 ml-2">({new Date(c.next_action_at).toLocaleString()})</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'historial' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Línea de tiempo</h3>
              {timeline.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aún no hay actividad registrada.</p>
              ) : (
                <div className="space-y-3">
                  {timeline.map((ev, idx) => {
                    const Ico = ev.kind === 'email' ? Mail : ev.kind === 'whatsapp' ? MessageCircle : PhoneCall
                    const color = ev.kind === 'email' ? 'text-blue-600 bg-blue-50' : ev.kind === 'whatsapp' ? 'text-emerald-600 bg-emerald-50' : 'text-violet-600 bg-violet-50'
                    return (
                      <div key={`${ev.kind}-${ev.id || idx}`} className="flex gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                          <Ico className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-semibold text-gray-900">
                              {ev.kind === 'email' && (ev.subject || 'Email')}
                              {ev.kind === 'whatsapp' && 'WhatsApp'}
                              {ev.kind === 'call' && `Llamada · ${ev.outcome || 'sin resultado'}`}
                            </span>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">{ev.at ? new Date(ev.at).toLocaleString() : ''}</span>
                          </div>
                          {ev.body && ev.kind !== 'email' && (
                            <p className="text-[11px] text-gray-600 line-clamp-3 leading-snug mt-0.5">{ev.body}</p>
                          )}
                          {ev.notes && (
                            <p className="text-[11px] text-gray-600 line-clamp-3 leading-snug mt-0.5">{ev.notes}</p>
                          )}
                          {ev.status && (
                            <span className="text-[9px] uppercase font-bold text-gray-400 mt-0.5 inline-block">{ev.status}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SellerPipelinePage() {
  const { user } = useAuthStore()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('mine') // mine | all
  const [minScore, setMinScore] = useState(0)
  const [openLeadId, setOpenLeadId] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const draggedRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/seller/pipeline/board', {
        params: { scope: scope === 'all' ? 'all' : 'mine' }
      })
      setLeads((data.leads || []).map(l => ({
        ...l,
        stage: normalizeStage(l.stage),
        deal_value: Number(l.deal_value) || 0,
        calls_count: Number(l.calls_count) || 0,
      })))
    } catch (err) {
      console.error('Error cargando pipeline', err)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => { load() }, [load])

  // Refresca silenciosamente cuando vuelve el foco
  useEffect(() => {
    const onFocus = () => { load() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  // Filtros
  const filtered = useMemo(() => {
    let out = leads
    if (minScore > 0) out = out.filter(l => Number(l.score) >= minScore)
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(l =>
        (l.name || '').toLowerCase().includes(q) ||
        (l.sector || '').toLowerCase().includes(q) ||
        (l.city || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q)
      )
    }
    return out
  }, [leads, minScore, search])

  // Agrupado por stage
  const grouped = useMemo(() => {
    const g = {}
    STAGES.forEach(s => { g[s.key] = [] })
    filtered.forEach(l => {
      const k = g[l.stage] ? l.stage : 'NUEVO'
      g[k].push(l)
    })
    return g
  }, [filtered])

  // Stats
  const stats = useMemo(() => {
    const total = leads.length
    const active = leads.filter(l => ['CONTACTADO','EN_CONVERSACION','PROPUESTA','NEGOCIACION'].includes(l.stage)).length
    const proposals = leads.filter(l => l.stage === 'PROPUESTA' || l.stage === 'NEGOCIACION').length
    const wonMonth = leads.filter(l => {
      if (l.stage !== 'GANADO') return false
      const d = new Date(l.stage_changed_at || l.updated_at || 0)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const pipelineValue = leads
      .filter(l => ['CONTACTADO','EN_CONVERSACION','PROPUESTA','NEGOCIACION'].includes(l.stage))
      .reduce((s, l) => s + (Number(l.deal_value) || 0), 0)
    const wonValue = leads
      .filter(l => l.stage === 'GANADO')
      .reduce((s, l) => s + (Number(l.deal_value) || 0), 0)
    return { total, active, proposals, wonMonth, pipelineValue, wonValue }
  }, [leads])

  // Drag & drop
  function handleDragStart(e, lead) {
    draggedRef.current = lead
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(newStage) {
    const lead = draggedRef.current
    draggedRef.current = null
    if (!lead || lead.stage === newStage) return
    // Optimistic
    setLeads(prev => prev.map(l =>
      l.id === lead.id ? { ...l, stage: newStage, stage_changed_at: new Date().toISOString() } : l
    ))
    api.patch(`/api/seller/pipeline/leads/${lead.id}`, { status: newStage })
      .catch(() => {
        // revert
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: lead.stage } : l))
        alert('No se pudo mover el lead')
      })
  }

  function handleCardClick(lead) {
    setOpenLeadId(lead.id)
  }

  function handleDrawerClosed() {
    setOpenLeadId(null)
    // refrescar para tomar cambios
    load()
  }

  return (
    <div className="max-w-[1800px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-blue-600" />
            Mi Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestioná tus leads de principio a fin sin salir de acá.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <p className="text-[10px] uppercase font-bold text-gray-400">Total</p>
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-3">
          <p className="text-[10px] uppercase font-bold text-amber-600">Activos</p>
          <p className="text-xl font-bold text-amber-700">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-purple-200 p-3">
          <p className="text-[10px] uppercase font-bold text-purple-600">Propuestas</p>
          <p className="text-xl font-bold text-purple-700">{stats.proposals}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-3">
          <p className="text-[10px] uppercase font-bold text-emerald-600">Ganados este mes</p>
          <p className="text-xl font-bold text-emerald-700">{stats.wonMonth}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-3">
          <p className="text-[10px] uppercase font-bold text-blue-600">Valor pipeline</p>
          <p className="text-xl font-bold text-blue-700">{fmtCurrency(stats.pipelineValue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-3">
          <p className="text-[10px] uppercase font-bold text-emerald-600">Valor ganado</p>
          <p className="text-xl font-bold text-emerald-700">{fmtCurrency(stats.wonValue)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, sector, ciudad, email..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-500 font-semibold">Score mín:</span>
          {[0, 40, 70].map(s => (
            <button
              key={s}
              onClick={() => setMinScore(s)}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                minScore === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 0 ? 'Todos' : `${s}+`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-500 font-semibold">Mostrar:</span>
          <button
            onClick={() => setScope('mine')}
            className={`px-2.5 py-1 rounded-md font-semibold transition ${
              scope === 'mine' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Solo míos
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setScope('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                scope === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map(s => (
            <StageColumn
              key={s.key}
              stage={s}
              leads={grouped[s.key] || []}
              onCardClick={handleCardClick}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              dragOver={dragOver}
              setDragOver={setDragOver}
            />
          ))}
        </div>
      )}

      {openLeadId && (
        <LeadDrawer
          leadId={openLeadId}
          onClose={handleDrawerClosed}
          onUpdated={() => load()}
        />
      )}
    </div>
  )
}
