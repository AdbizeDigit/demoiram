import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, Loader2, ExternalLink, Phone, Mail,
  MessageCircle, Globe, Send, PhoneCall, FileText, Star,
  CheckCircle2, AlertCircle, Clock, ChevronDown, MapPin,
  Zap, Calendar, Tag, TrendingUp, Hash, RefreshCw,
  Facebook, Instagram, Linkedin, Twitter, Save, Plus,
  ChevronRight, Users, Search, Square
} from 'lucide-react'
import api from '../services/api'

// ─── Stage definitions ────────────────────────────────────────────────────────
const STAGES = [
  { key: 'NUEVO', label: 'Nuevo', color: 'gray', bg: 'bg-gray-50', border: 'border-gray-300', badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  { key: 'CONTACTADO', label: 'Contactado', color: 'blue', bg: 'bg-blue-50', border: 'border-blue-400', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  { key: 'EN_CONVERSACION', label: 'En Conversacion', color: 'amber', bg: 'bg-amber-50', border: 'border-amber-400', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  { key: 'PROPUESTA', label: 'Propuesta', color: 'purple', bg: 'bg-purple-50', border: 'border-purple-400', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
  { key: 'NEGOCIACION', label: 'Negociacion', color: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-400', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400' },
  { key: 'GANADO', label: 'Ganado', color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  { key: 'PERDIDO', label: 'Perdido', color: 'red', bg: 'bg-red-50', border: 'border-red-400', badge: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
]
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

function mapStatus(status) {
  if (!status) return 'NUEVO'
  const upper = status.toUpperCase().replace(/\s+/g, '_')
  if (STAGE_MAP[upper]) return upper
  if (['NEW', 'NUEVO', 'PENDING', 'NOT_NEEDED'].includes(upper)) return 'NUEVO'
  if (['CONTACTED', 'CONTACTADO'].includes(upper)) return 'CONTACTADO'
  if (['IN_CONVERSATION', 'EN_CONVERSACION', 'REPLIED'].includes(upper)) return 'EN_CONVERSACION'
  if (['PROPOSAL', 'PROPUESTA'].includes(upper)) return 'PROPUESTA'
  if (['NEGOTIATION', 'NEGOCIACION'].includes(upper)) return 'NEGOCIACION'
  if (['WON', 'GANADO', 'CONVERTED'].includes(upper)) return 'GANADO'
  if (['LOST', 'PERDIDO', 'DISMISSED'].includes(upper)) return 'PERDIDO'
  return 'NUEVO'
}

function normalizePhone(p) {
  if (!p) return null
  let clean = p.replace(/[^\d+]/g, '')
  if (!clean.startsWith('+')) clean = '+' + clean
  return clean
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Social icon helper ───────────────────────────────────────────────────────
function SocialIcon({ platform }) {
  const cls = "w-4 h-4"
  switch (platform.toLowerCase()) {
    case 'facebook': return <Facebook className={cls} />
    case 'instagram': return <Instagram className={cls} />
    case 'linkedin': return <Linkedin className={cls} />
    case 'twitter': return <Twitter className={cls} />
    default: return <Globe className={cls} />
  }
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
      )}
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [lead, setLead] = useState(null)
  const [report, setReport] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [actionResult, setActionResult] = useState(null)
  const [expandedMsgId, setExpandedMsgId] = useState(null)
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false)
  const [waInput, setWaInput] = useState('')
  const [waSending, setWaSending] = useState(false)
  const [waAutoMode, setWaAutoMode] = useState(false)
  const [waAutoRunning, setWaAutoRunning] = useState(false)
  const waEndRef = useRef(null)
  const waAutoRef = useRef(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [notes, setNotes] = useState([])
  const [executives, setExecutives] = useState([])
  const [loadingExecs, setLoadingExecs] = useState(false)
  const [scanningExecs, setScanningExecs] = useState(false)

  // ─── Load lead data ───────────────────────────────────────────────────────
  const loadLead = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get(`/api/scraping-engine/leads/${id}`)
      const raw = res.data?.data || res.data?.lead || res.data
      if (!raw || raw.success === false) throw new Error('Lead not found')
      // Normalize field names
      const data = {
        ...raw,
        company: raw.name || raw.company || '',
        name: raw.name || raw.company || '',
        stage: mapStatus(raw.status),
        createdAt: raw.created_at || raw.createdAt || '',
        updatedAt: raw.updated_at || raw.updatedAt || '',
        whatsapp: raw.social_whatsapp || raw.whatsapp || '',
        socialMedia: {
          facebook: raw.social_facebook || null,
          instagram: raw.social_instagram || null,
          linkedin: raw.social_linkedin || null,
          twitter: raw.social_twitter || null,
        },
      }
      setLead(data)
      // Parse notes from lead
      if (data.notes) {
        try {
          const parsed = JSON.parse(data.notes)
          setNotes(Array.isArray(parsed) ? parsed : [])
        } catch {
          setNotes(data.notes ? [{ text: data.notes, date: data.updatedAt || data.createdAt }] : [])
        }
      }
    } catch (err) {
      console.error('Error loading lead:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadReport = useCallback(async () => {
    setLoadingReport(true)
    try {
      const res = await api.get(`/api/scraping-engine/leads/${id}/report`)
      setReport(res.data?.report || res.data)
    } catch {
      setReport(null)
    } finally {
      setLoadingReport(false)
    }
  }, [id])

  const loadMessages = useCallback(async () => {
    setLoadingMessages(true)
    try {
      const res = await api.get(`/api/outreach/messages?leadId=${id}`)
      setMessages(res.data?.messages || [])
    } catch {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [id])

  useEffect(() => {
    loadLead()
    loadReport()
    loadMessages()
  }, [loadLead, loadReport, loadMessages])

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => { loadMessages() }, 5000)
    return () => clearInterval(interval)
  }, [loadMessages])

  // Auto-scroll WhatsApp chat
  const waMessages = messages.filter(m => (m.channel || m.type || '').toUpperCase() === 'WHATSAPP')
  useEffect(() => {
    waEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [waMessages.length])

  async function handleWaSend() {
    if (!waInput.trim() || waSending) return
    const phone = lead.whatsapp || lead.phone
    if (!phone) return
    setWaSending(true)
    try {
      const clean = phone.replace(/[^\d+]/g, '')
      await api.post('/api/outreach/whatsapp/send-direct', { phone: clean, message: waInput.trim(), leadId: lead.id })
      setWaInput('')
      setTimeout(loadMessages, 500)
    } catch (err) {
      setActionResult({ type: 'whatsapp', success: false, message: err.response?.data?.error || 'Error enviando WhatsApp' })
    }
    setWaSending(false)
  }

  async function startWaAuto() {
    if (waAutoRef.current) return
    waAutoRef.current = true
    setWaAutoMode(true)
    setWaAutoRunning(true)
    try {
      // Send initial AI message
      await api.post('/api/outreach/whatsapp/send-to-lead', { leadId: lead.id })
      setTimeout(loadMessages, 500)
      // Move stage to CONTACTADO
      try { await api.patch(`/api/scraping-engine/leads/${lead.id}`, { status: 'CONTACTADO' }) } catch {}
      setLead(prev => prev ? { ...prev, stage: 'CONTACTADO' } : prev)
    } catch (err) {
      setActionResult({ type: 'whatsapp', success: false, message: err.response?.data?.error || 'Error iniciando WhatsApp IA' })
    }
    setWaAutoRunning(false)
  }

  function stopWaAuto() {
    waAutoRef.current = false
    setWaAutoMode(false)
    setWaAutoRunning(false)
  }

  // Auto-reply when in auto mode and we receive a response
  useEffect(() => {
    if (!waAutoRef.current || !lead) return
    const replied = waMessages.filter(m => (m.status || '').toUpperCase() === 'REPLIED')
    if (replied.length === 0) return
    const lastReply = replied[0] // most recent (messages are newest-first from API)
    const lastReplyTime = new Date(lastReply.sentAt || lastReply.createdAt).getTime()
    // Check if we already replied after this
    const sentAfter = waMessages.filter(m => {
      const s = (m.status || '').toUpperCase()
      return s !== 'REPLIED' && new Date(m.sentAt || m.createdAt).getTime() > lastReplyTime
    })
    if (sentAfter.length > 0) return // already replied
    // Auto-reply with AI
    const timer = setTimeout(async () => {
      if (!waAutoRef.current) return
      setWaAutoRunning(true)
      try {
        await api.post('/api/outreach/whatsapp/send-to-lead', { leadId: lead.id })
        setTimeout(loadMessages, 500)
      } catch {}
      setWaAutoRunning(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [waMessages, lead])

  // Auto-generate report if lead has no report
  useEffect(() => {
    if (!lead || loadingReport || report) return
    // Lead loaded but no report exists - generate automatically
    const timer = setTimeout(async () => {
      try {
        setLoadingReport(true)
        const res = await api.post(`/api/scraping-engine/leads/${id}/report`)
        setReport(res.data?.report || res.data)
      } catch {
        // Silent fail - user can regenerate manually
      } finally {
        setLoadingReport(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [lead, report, loadingReport, id])

  // Load executives
  useEffect(() => {
    if (!id) return
    api.get(`/api/scraping-engine/leads/${id}/executives`)
      .then(r => setExecutives(r.data?.executives || []))
      .catch(() => {})
  }, [id])

  // Auto-scan for executives if none found
  useEffect(() => {
    if (!lead || executives.length > 0 || loadingExecs || scanningExecs) return
    const timer = setTimeout(async () => {
      setScanningExecs(true)
      try {
        const res = await api.post(`/api/scraping-engine/leads/${id}/executives/scan`)
        setExecutives(res.data?.executives || [])
      } catch {}
      setScanningExecs(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [lead, executives.length, loadingExecs, scanningExecs, id])

  // ─── Actions ──────────────────────────────────────────────────────────────
  async function handleAction(type) {
    setActionLoading(type)
    setActionResult(null)
    try {
      let res
      if (type === 'email') {
        res = await api.post('/api/outreach/email/send', { leadId: lead.id })
        setActionResult({ type, success: true, message: 'Email enviado correctamente', data: res.data })
        // Refresh messages and auto-update report
        loadMessages()
        api.post(`/api/scraping-engine/leads/${lead.id}/report`).then(r => setReport(r.data?.report || r.data)).catch(() => {})
      } else if (type === 'sequence') {
        res = await api.post('/api/outreach/email/sequence', { leadId: lead.id })
        setActionResult({ type, success: true, message: 'Secuencia de 5 emails iniciada', data: res.data })
        loadMessages()
        api.post(`/api/scraping-engine/leads/${lead.id}/report`).then(r => setReport(r.data?.report || r.data)).catch(() => {})
      } else if (type === 'whatsapp') {
        if (lead.whatsapp || lead.phone) {
          res = await api.post('/api/outreach/whatsapp/send-to-lead', { leadId: lead.id })
          setActionResult({ type, success: true, message: 'WhatsApp enviado via IA', data: res.data })
        } else {
          res = await api.post('/api/outreach/whatsapp/generate', { leadId: lead.id })
          setActionResult({ type, success: true, message: 'Mensaje WhatsApp generado', data: res.data })
        }
        loadMessages()
        api.post(`/api/scraping-engine/leads/${lead.id}/report`).then(r => setReport(r.data?.report || r.data)).catch(() => {})
      } else if (type === 'call') {
        res = await api.post('/api/outreach/call/script', { leadId: lead.id })
        setActionResult({ type, success: true, message: 'Guion de llamada generado', data: res.data })
        loadMessages()
      } else if (type === 'report') {
        res = await api.post(`/api/scraping-engine/leads/${lead.id}/report`)
        setReport(res.data?.report || res.data)
        setActionResult({ type, success: true, message: 'Informe IA generado', data: res.data })
      } else if (type === 'auto') {
        // Full auto contact flow
        setActionResult({ type, success: true, message: 'Iniciando contacto automatico completo...' })
        // Step 1: Report
        try { await api.post(`/api/scraping-engine/leads/${lead.id}/report`) } catch {}
        // Step 2: Email
        if (lead.email) {
          try { await api.post('/api/outreach/email/send', { leadId: lead.id }) } catch {}
        }
        // Step 3: WhatsApp
        if (lead.whatsapp || lead.phone) {
          try { await api.post('/api/outreach/whatsapp/send-direct', { leadId: lead.id }) } catch {}
        }
        // Step 4: Move stage
        try { await api.patch(`/api/scraping-engine/leads/${lead.id}`, { status: 'CONTACTADO' }) } catch {}
        setActionResult({ type, success: true, message: 'Contacto automatico completado. Se envio email, WhatsApp y se genero informe.' })
        loadLead()
        loadReport()
        loadMessages()
      }
    } catch (err) {
      setActionResult({ type, success: false, message: err.response?.data?.error || err.message || 'Error al ejecutar la accion' })
    }
    setActionLoading(null)
  }

  async function handleMoveStage(newStage) {
    try {
      await api.patch(`/api/scraping-engine/leads/${id}`, { stage: newStage })
      setLead(prev => ({ ...prev, stage: newStage }))
    } catch (err) {
      console.error('Error moving stage:', err)
    }
  }

  async function handleSaveNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    try {
      const newNote = { text: noteText.trim(), date: new Date().toISOString() }
      const updatedNotes = [newNote, ...notes]
      await api.patch(`/api/scraping-engine/leads/${id}`, { notes: JSON.stringify(updatedNotes) })
      setNotes(updatedNotes)
      setNoteText('')
    } catch (err) {
      console.error('Error saving note:', err)
    } finally {
      setSavingNote(false)
    }
  }

  async function handleScanExecs() {
    setScanningExecs(true)
    try {
      const res = await api.post(`/api/scraping-engine/leads/${id}/executives/scan`)
      setExecutives(res.data?.executives || [])
    } catch {}
    setScanningExecs(false)
  }

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Cargando lead...</p>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">No se encontro el lead</p>
          <button onClick={() => navigate('/admin/pipeline')} className="mt-4 text-sm text-blue-600 hover:underline">
            Volver al Pipeline
          </button>
        </div>
      </div>
    )
  }

  const stg = STAGE_MAP[lead.stage] || STAGE_MAP.NUEVO
  const currentStageIndex = STAGES.findIndex(s => s.key === lead.stage)
  const daysDetected = lead.createdAt ? Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000) : 0
  const scorePercent = lead.score != null ? Math.min(100, Math.max(0, lead.score)) : 0

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={() => navigate('/admin/pipeline')}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">{lead.company || lead.name || 'Sin nombre'}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${stg.badge}`}>{stg.label}</span>
                  {lead.sector && <span className="text-xs text-gray-400">{lead.sector}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Score badge */}
              {lead.score != null && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm ${
                  lead.score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                  lead.score >= 40 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  <Star className="w-4 h-4" />
                  {lead.score}/100
                </div>
              )}

              {/* Stage dropdown */}
              <div className="relative">
                <button onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${stg.badge} ${stg.border}`}>
                  <span className={`w-2 h-2 rounded-full ${stg.dot}`} />
                  {stg.label}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {stageDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setStageDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 min-w-[180px]">
                      {STAGES.map(s => (
                        <button key={s.key}
                          onClick={() => { handleMoveStage(s.key); setStageDropdownOpen(false) }}
                          disabled={s.key === lead.stage}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                            s.key === lead.stage ? 'opacity-50 cursor-default' : ''
                          }`}>
                          <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                          {s.label}
                          {s.key === lead.stage && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-gray-400" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Contacto Auto button */}
              <button onClick={() => handleAction('auto')} disabled={actionLoading === 'auto'}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">
                {actionLoading === 'auto' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Contacto Auto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Action result toast ─────────────────────────────────────────────── */}
      {actionResult && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className={`rounded-2xl p-4 flex items-start gap-3 ${actionResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            {actionResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${actionResult.success ? 'text-emerald-700' : 'text-red-700'}`}>{actionResult.message}</p>
              {actionResult.data?.generatedMessage && (
                <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{actionResult.data.generatedMessage}</p>
              )}
              {actionResult.data?.whatsappUrl && (
                <a href={actionResult.data.whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 hover:underline">
                  <MessageCircle className="w-3 h-3" /> Abrir WhatsApp
                </a>
              )}
            </div>
            <button onClick={() => setActionResult(null)} className="text-gray-400 hover:text-gray-600 p-1">
              <span className="text-lg leading-none">&times;</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Main content ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ─── Left column (60%) ─────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Informacion General */}
            <Card title="Informacion General" icon={Building2}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Empresa', value: lead.company || lead.name },
                  { label: 'Sector', value: lead.sector },
                  { label: 'Ciudad', value: lead.city },
                  { label: 'Estado/Provincia', value: lead.state },
                  { label: 'Direccion', value: lead.address },
                  { label: 'Fuente', value: lead.source },
                ].filter(i => i.value).map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">{item.label}</p>
                    <p className="text-sm text-gray-800 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Website link */}
              {lead.website && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 font-medium mb-1">Website</p>
                  <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                    <Globe className="w-3.5 h-3.5" /> {lead.website}
                  </a>
                </div>
              )}
              {lead.sourceUrl && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 font-medium mb-1">URL Fuente</p>
                  <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline truncate max-w-full">
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{lead.sourceUrl}</span>
                  </a>
                </div>
              )}

              {/* Score bar */}
              {lead.score != null && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-gray-400 font-medium">Score</p>
                    <span className={`text-sm font-bold ${
                      lead.score >= 70 ? 'text-emerald-600' : lead.score >= 40 ? 'text-amber-600' : 'text-red-600'
                    }`}>{lead.score}/100</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all duration-500 ${
                      lead.score >= 70 ? 'bg-emerald-500' : lead.score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`} style={{ width: `${scorePercent}%` }} />
                  </div>
                </div>
              )}

              {/* Meta info */}
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {daysDetected} dias desde deteccion
                </span>
                {lead.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {new Date(lead.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </Card>

            {/* Datos de Contacto */}
            <Card title="Datos de Contacto" icon={Phone}>
              <div className="space-y-2">
                {lead.phone && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Phone className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-400">Telefono</p>
                      <a href={`tel:${normalizePhone(lead.phone)}`} className="text-sm text-gray-800 font-medium hover:text-blue-600">{lead.phone}</a>
                    </div>
                    <a href={`tel:${normalizePhone(lead.phone)}`}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors">
                      Llamar
                    </a>
                  </div>
                )}

                {lead.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Mail className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-400">Email</p>
                      <a href={`mailto:${lead.email}`} className="text-sm text-gray-800 font-medium hover:text-emerald-600 truncate block">{lead.email}</a>
                    </div>
                    <a href={`mailto:${lead.email}`}
                      className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 transition-colors">
                      Enviar
                    </a>
                  </div>
                )}

                {(lead.whatsapp || lead.phone) && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <MessageCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-400">WhatsApp</p>
                      <p className="text-sm text-gray-800 font-medium">{lead.whatsapp || lead.phone}</p>
                    </div>
                    {waAutoMode ? (
                      <button onClick={stopWaAuto}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        Detener IA
                      </button>
                    ) : (
                      <button onClick={startWaAuto} disabled={waAutoRunning}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                        {waAutoRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        Iniciar IA
                      </button>
                    )}
                  </div>
                )}

                {lead.website && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Globe className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-400">Sitio Web</p>
                      <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-sm text-gray-800 font-medium hover:text-indigo-600 truncate block">{lead.website}</a>
                    </div>
                    <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-indigo-600">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}

                {/* Social media links */}
                {lead.socialMedia && Object.entries(lead.socialMedia).filter(([, v]) => v).length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-400 font-medium mb-2">Redes Sociales</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(lead.socialMedia).filter(([, v]) => v).map(([platform, url]) => (
                        <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-sm text-gray-700 capitalize">
                          <SocialIcon platform={platform} />
                          {platform}
                          <ExternalLink className="w-3 h-3 text-gray-300" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!lead.phone && !lead.email && !(lead.whatsapp || lead.phone) && !lead.website && (
                  <p className="text-sm text-gray-400 italic py-3">No hay datos de contacto disponibles.</p>
                )}
              </div>
            </Card>

            {/* Ejecutivos & Cargos Altos */}
            <Card title="Ejecutivos & Cargos Altos" icon={Users}>
              {scanningExecs ? (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Buscando ejecutivos de {lead.company || lead.name}...</p>
                    <p className="text-xs text-gray-400">Buscando en LinkedIn perfiles de directores, gerentes y fundadores</p>
                  </div>
                </div>
              ) : executives.length > 0 ? (
                <div className="space-y-3">
                  {executives.map((exec, i) => (
                    <div key={exec.id || i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {exec.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{exec.name}</p>
                        <p className="text-xs text-gray-500">{exec.role}</p>
                        {exec.snippet && <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{exec.snippet}</p>}
                      </div>
                      {exec.linkedin_url && (
                        <a href={exec.linkedin_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex-shrink-0">
                          <Linkedin className="w-3.5 h-3.5" />
                          LinkedIn
                        </a>
                      )}
                    </div>
                  ))}
                  <button onClick={handleScanExecs} disabled={scanningExecs}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    <RefreshCw className="w-3 h-3" /> Buscar mas ejecutivos
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400">No se encontraron ejecutivos</p>
                  <button onClick={handleScanExecs} disabled={scanningExecs}
                    className="mt-2 flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                    <Search className="w-4 h-4" /> Buscar Ejecutivos
                  </button>
                </div>
              )}
            </Card>

            {/* Informe IA */}
            <Card title="Informe IA" icon={FileText}>
              {loadingReport ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                </div>
              ) : report ? (
                <div className="space-y-4">
                  {report.companyProfile && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 uppercase mb-1">Perfil de Empresa</p>
                      <p className="text-sm text-gray-700">{typeof report.companyProfile === 'string' ? report.companyProfile : JSON.stringify(report.companyProfile)}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {report.contactQuality && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        report.contactQuality === 'high' || report.contactQuality === 'alta' ? 'bg-emerald-100 text-emerald-700' :
                        report.contactQuality === 'medium' || report.contactQuality === 'media' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        Calidad: {report.contactQuality}
                      </span>
                    )}
                    {report.socialPresence && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        report.socialPresence === 'strong' || report.socialPresence === 'fuerte' ? 'bg-blue-100 text-blue-700' :
                        report.socialPresence === 'moderate' || report.socialPresence === 'moderada' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        Presencia Social: {report.socialPresence}
                      </span>
                    )}
                  </div>

                  {report.summary && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 uppercase mb-1">Resumen de Contacto</p>
                      <p className="text-sm text-gray-700">{report.summary}</p>
                    </div>
                  )}

                  {report.recommendedApproach && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Enfoque Recomendado</p>
                      <p className="text-sm text-gray-700 font-medium">{typeof report.recommendedApproach === 'string' ? report.recommendedApproach : JSON.stringify(report.recommendedApproach)}</p>
                    </div>
                  )}

                  {report.strengths && report.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 uppercase mb-2">Fortalezas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(report.strengths) ? report.strengths : [report.strengths]).map((s, i) => (
                          <span key={i} className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.opportunities && report.opportunities.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Oportunidades</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(report.opportunities) ? report.opportunities : [report.opportunities]).map((o, i) => (
                          <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg font-medium">{o}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.nextSteps && report.nextSteps.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-indigo-700 uppercase mb-2">Proximos Pasos</p>
                      <ol className="space-y-1.5">
                        {(Array.isArray(report.nextSteps) ? report.nextSteps : [report.nextSteps]).map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {report.tags && report.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(report.tags) ? report.tags : [report.tags]).map((tag, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => handleAction('report')} disabled={actionLoading === 'report'}
                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors disabled:opacity-50">
                    {actionLoading === 'report' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Regenerar Informe
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="w-10 h-10 text-gray-200 mx-auto" />
                  <p className="text-sm text-gray-400 mt-2">No hay informe IA disponible</p>
                  <button onClick={() => handleAction('report')} disabled={actionLoading === 'report'}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50">
                    {actionLoading === 'report' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Generar Informe
                  </button>
                </div>
              )}
            </Card>

            {/* Notas */}
            <Card title="Notas" icon={FileText}>
              <div className="space-y-4">
                {/* Add note */}
                <div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Escribe una nota sobre este lead..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <button onClick={handleSaveNote} disabled={!noteText.trim() || savingNote}
                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar Nota
                  </button>
                </div>

                {/* Notes list */}
                {notes.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    {notes.map((note, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.text}</p>
                        <p className="text-[10px] text-gray-400 mt-1.5">
                          {note.date ? new Date(note.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {notes.length === 0 && !noteText && (
                  <p className="text-xs text-gray-400 italic">No hay notas aun.</p>
                )}
              </div>
            </Card>
          </div>

          {/* ─── Right column (40%) ────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Acciones Rapidas */}
            <Card title="Acciones Rapidas" icon={Zap}>
              <div className="space-y-2">
                <button onClick={() => handleAction('email')} disabled={actionLoading === 'email'}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {actionLoading === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar Email IA
                </button>

                <button onClick={() => handleAction('sequence')} disabled={actionLoading === 'sequence'}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {actionLoading === 'sequence' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Enviar Secuencia 5 Emails
                </button>

                <button onClick={() => waAutoMode ? stopWaAuto() : startWaAuto()} disabled={waAutoRunning}
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    waAutoMode ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-600 text-white hover:bg-green-700'
                  }`}>
                  {waAutoRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : waAutoMode ? <Square className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  {waAutoMode ? 'Detener WhatsApp IA' : 'Iniciar WhatsApp IA'}
                </button>

                <button onClick={() => handleAction('call')} disabled={actionLoading === 'call'}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50">
                  {actionLoading === 'call' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
                  Generar Guion Llamada
                </button>

                <button onClick={() => handleAction('auto')} disabled={actionLoading === 'auto'}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 mt-2">
                  {actionLoading === 'auto' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Contacto Auto Completo
                </button>
              </div>
            </Card>

            {/* WhatsApp Chat en Vivo */}
            <Card title="" className="!p-0 overflow-hidden">
              <div className="flex flex-col" style={{ height: '500px' }}>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-green-600">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                    {(lead.company || lead.name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{lead.company || lead.name}</p>
                    <p className="text-[10px] text-green-100">{lead.whatsapp || lead.phone || 'Sin telefono'}</p>
                  </div>
                  {/* Auto/Manual toggle */}
                  <button
                    onClick={() => waAutoMode ? stopWaAuto() : startWaAuto()}
                    disabled={waAutoRunning}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                      waAutoMode
                        ? 'bg-amber-400 text-amber-900 hover:bg-amber-300'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {waAutoRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : waAutoMode ? (
                      <>
                        <Zap className="w-3 h-3" />
                        IA AUTO
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-700 animate-pulse" />
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-3 h-3" />
                        MANUAL
                      </>
                    )}
                  </button>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ background: '#e5ddd5', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0L60 30L30 60L0 30z\' fill=\'%23d4cfc6\' fill-opacity=\'0.1\'/%3E%3C/svg%3E")' }}>
                  {waMessages.length === 0 && (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-green-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">Sin mensajes de WhatsApp</p>
                      <p className="text-xs text-gray-400 mt-1">Envia un mensaje con el boton de abajo o usa "Enviar WhatsApp IA"</p>
                    </div>
                  )}
                  {waMessages.slice().reverse().map((msg, i) => {
                    const status = (msg.status || '').toUpperCase()
                    const isFromMe = status !== 'REPLIED'
                    const text = msg.content || msg.message || msg.body || ''
                    const senderName = msg.subject?.startsWith('De: ') ? msg.subject.replace('De: ', '') : null
                    return (
                      <div key={msg.id || i} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 shadow-sm ${
                          isFromMe
                            ? 'bg-green-100 rounded-tr-sm'
                            : 'bg-white rounded-tl-sm'
                        }`}>
                          {!isFromMe && senderName && (
                            <p className="text-[10px] font-bold text-green-700 mb-0.5">{senderName}</p>
                          )}
                          <p className="text-[13px] text-gray-800 whitespace-pre-wrap leading-relaxed">{text}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] text-gray-400">{timeAgo(msg.sentAt || msg.createdAt)}</span>
                            {isFromMe && (
                              <span className="text-[10px]">
                                {status === 'SENT' || status === 'DELIVERED' ? (
                                  <CheckCircle2 className="w-3 h-3 text-blue-500 inline" />
                                ) : status === 'FAILED' || status === 'ERROR' ? (
                                  <AlertCircle className="w-3 h-3 text-red-400 inline" />
                                ) : (
                                  <Clock className="w-3 h-3 text-gray-400 inline" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={waEndRef} />
                </div>

                {/* Input area */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 border-t border-gray-200">
                  <input
                    type="text"
                    value={waInput}
                    onChange={e => setWaInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleWaSend()}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 px-4 py-2.5 bg-white rounded-full text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={!(lead.whatsapp || lead.phone)}
                  />
                  <button
                    onClick={handleWaSend}
                    disabled={!waInput.trim() || waSending || !(lead.whatsapp || lead.phone)}
                    className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {waSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </Card>

            {/* Historial de Emails */}
            <Card title="Historial de Emails" icon={Mail}>
              {(() => {
                const emailMsgs = messages.filter(m => {
                  const ch = (m.channel || m.type || '').toUpperCase()
                  return ch === 'EMAIL' || ch === 'CALL'
                })
                if (loadingMessages) return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                if (!emailMsgs.length) return <div className="text-center py-6"><Mail className="w-8 h-8 text-gray-200 mx-auto" /><p className="text-sm text-gray-400 mt-2">Sin emails enviados</p></div>
                return (
                  <div className="space-y-3">
                    {emailMsgs.map((msg, i) => {
                      const ch = (msg.channel || msg.type || '').toUpperCase()
                      const isEmail = ch === 'EMAIL'
                      const status = (msg.status || '').toUpperCase()
                      const isExpanded = expandedMsgId === (msg.id || i)
                      const stepNum = msg.stepNumber || msg.sequenceStep
                      const totalSteps = msg.totalSteps || msg.sequenceTotal
                      return (
                        <div key={msg.id || i} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              {isEmail ? <Mail className="w-4 h-4 text-blue-500" /> : <PhoneCall className="w-4 h-4 text-purple-500" />}
                              <span className="text-sm font-semibold text-gray-700">
                                {isEmail ? 'Email' : 'Guion de Llamada'}
                                {stepNum ? ` ${stepNum}${totalSteps ? `/${totalSteps}` : ''}` : ''}
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              status === 'SENT' || status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                              status === 'FAILED' || status === 'ERROR' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{status === 'SENT' ? 'Enviado' : status === 'DELIVERED' ? 'Entregado' : status === 'FAILED' ? 'Fallido' : status}</span>
                          </div>
                          <p className="text-[11px] text-gray-400 mb-2">{timeAgo(msg.sentAt || msg.createdAt)}</p>
                          {msg.subject && <p className="text-xs text-gray-600">Asunto: <span className="font-medium">"{msg.subject}"</span></p>}
                          <button onClick={() => setExpandedMsgId(isExpanded ? null : (msg.id || i))}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-1">
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            {isExpanded ? 'Ocultar' : 'Ver contenido'}
                          </button>
                          {isExpanded && (
                            <div className="mt-2 bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-700 max-h-80 overflow-y-auto">
                              {msg.bodyHtml || msg.body ? (
                                <div dangerouslySetInnerHTML={{ __html: msg.bodyHtml || msg.body || '' }} />
                              ) : (
                                <p className="whitespace-pre-wrap">{msg.content || msg.message || 'Sin contenido'}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </Card>

            {/* Mover Etapa */}
            <Card title="Mover Etapa" icon={ChevronRight}>
              <div className="space-y-3">
                {/* Progress indicator */}
                <div className="flex items-center gap-1 mb-4">
                  {STAGES.filter(s => s.key !== 'PERDIDO').map((s, i) => {
                    const isActive = s.key === lead.stage
                    const isPast = STAGES.findIndex(st => st.key === lead.stage) > i
                    return (
                      <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full h-2 rounded-full transition-colors ${
                          isActive ? `bg-${s.color}-500` :
                          isPast ? `bg-${s.color}-300` :
                          'bg-gray-200'
                        }`}
                          style={{
                            backgroundColor: isActive ? undefined : isPast ? undefined : undefined
                          }}
                        />
                        <span className={`text-[9px] font-medium ${isActive ? 'text-gray-700' : 'text-gray-400'}`}>
                          {s.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Stage buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {STAGES.map(s => (
                    <button key={s.key}
                      onClick={() => handleMoveStage(s.key)}
                      disabled={s.key === lead.stage}
                      className={`text-sm font-medium px-3 py-2.5 rounded-xl transition-colors flex items-center gap-2 ${
                        s.key === lead.stage
                          ? `${s.badge} ring-2 ring-offset-1 ring-current opacity-70 cursor-default`
                          : `${s.badge} hover:opacity-80`
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                      {s.label}
                      {s.key === lead.stage && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
