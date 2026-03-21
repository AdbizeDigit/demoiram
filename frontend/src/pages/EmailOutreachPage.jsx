import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Mail, Send, Clock, AlertCircle, CheckCircle, XCircle,
  Search, Plus, ChevronDown, ChevronUp, ExternalLink,
  Settings, Loader2, FlaskConical, Beaker, Copy, RotateCcw,
  Zap, Filter, BarChart3, CalendarClock, Bot,
  Inbox, MessageSquare, RefreshCw
} from 'lucide-react'
import api from '../services/api'

const STATUS_CONFIG = {
  SENT: { label: 'Enviado', color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
  SCHEDULED: { label: 'Programado', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  FAILED: { label: 'Fallido', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  PENDING: { label: 'Pendiente', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
  OPENED: { label: 'Abierto', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  REPLIED: { label: 'Respondido', color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
}

const STEP_TYPES = ['introduction', 'value', 'case_study', 'urgency', 'last_chance']

export default function EmailOutreachPage() {
  // ── Core state ──
  const [leads, setLeads] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total_sent: 0, scheduled: 0, failed: 0, open_rate: 0 })

  // ── Thread state ──
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [threadFilter, setThreadFilter] = useState('all') // all | sent | scheduled | failed | ai
  const [expandedEmails, setExpandedEmails] = useState({})

  // ── Compose state ──
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [generating, setGenerating] = useState(false)

  // ── Notification ──
  const [notification, setNotification] = useState(null)

  // ── Playground state ──
  const [playgroundOpen, setPlaygroundOpen] = useState(false)
  const [pgTestEmail, setPgTestEmail] = useState('')
  const [pgCompanyName, setPgCompanyName] = useState('Empresa Test SA')
  const [pgSector, setPgSector] = useState('tecnologia')
  const [pgCity, setPgCity] = useState('Buenos Aires')
  const [pgEmailType, setPgEmailType] = useState('introduction')
  const [pgWebsite, setPgWebsite] = useState('www.empresatest.com.ar')
  const [pgPreview, setPgPreview] = useState(null)
  const [pgSending, setPgSending] = useState(false)
  const [pgGenerating, setPgGenerating] = useState(false)
  const [pgStatus, setPgStatus] = useState(null)
  const [pgLogs, setPgLogs] = useState([])
  const [emailConfig, setEmailConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)
  const [activeAvatar, setActiveAvatar] = useState(null)

  const threadListRef = useRef(null)
  const emailThreadRef = useRef(null)

  // ── Notification helper ──
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }, [])

  // ── AI toggle per lead (localStorage) ──
  const getAiEnabled = (leadId) => {
    const stored = localStorage.getItem(`email_ai_${leadId}`)
    return stored === null ? true : stored === 'true'
  }

  const setAiEnabled = (leadId, enabled) => {
    localStorage.setItem(`email_ai_${leadId}`, String(enabled))
  }

  // ── Load data ──
  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/api/outreach/email/stats')
      setStats(res.data?.stats || res.data || { total_sent: 0, scheduled: 0, failed: 0, open_rate: 0 })
    } catch (err) {
      console.error('Error loading email stats:', err)
    }
  }, [])

  const loadMessages = useCallback(async () => {
    try {
      const res = await api.get('/api/outreach/messages', { params: { channel: 'EMAIL', limit: 500 } })
      const data = res.data
      setMessages(data.messages || data.data || [])
    } catch (err) {
      console.error('Error loading messages:', err)
      setMessages([])
    }
  }, [])

  const loadLeads = useCallback(async () => {
    try {
      const res = await api.get('/api/scraping-engine/leads', { params: { limit: 200 } })
      const allLeads = res.data?.leads || res.data || []
      setLeads(allLeads.filter(l => l.email || l.lead_data?.email))
    } catch (err) {
      console.error('Error loading leads:', err)
      setLeads([])
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadStats(), loadMessages(), loadLeads()])
      setLoading(false)
    }
    init()
  }, [loadStats, loadMessages, loadLeads])

  // ── Derived data: threads grouped by lead ──
  const threads = useMemo(() => {
    const threadMap = new Map()

    // Create thread entries from messages
    messages.forEach(msg => {
      // Group by lead_id, or by email address if no lead_id
      const msgEmail = msg.lead_email || msg.lead?.email || msg.lead?.lead_data?.email || ''
      const leadId = msg.lead_id || msg.lead?.id || (msgEmail ? `email-${msgEmail}` : `orphan-${msg.id}`)

      if (!threadMap.has(leadId)) {
        threadMap.set(leadId, {
          leadId,
          leadName: msg.lead_name || msg.lead?.name || msg.lead?.lead_data?.company || msgEmail || 'Email Directo',
          leadEmail: msgEmail,
          leadCompany: msg.lead?.lead_data?.company || msg.lead?.name || '',
          emails: [],
          lastDate: null,
          lastStatus: 'PENDING',
          maxStep: 0,
          totalSteps: 5,
        })
      }

      const thread = threadMap.get(leadId)
      thread.emails.push(msg)
      const msgDate = new Date(msg.sent_at || msg.created_at || 0)
      if (!thread.lastDate || msgDate > thread.lastDate) {
        thread.lastDate = msgDate
        thread.lastStatus = msg.status || 'SENT'
        thread.lastSubject = msg.subject || ''
        thread.lastBody = msg.body || msg.html || msg.content || ''
      }
      const step = msg.step || msg.sequence_step || 1
      if (step > thread.maxStep) thread.maxStep = step
    })

    // Add leads with email that don't have messages yet
    leads.forEach(lead => {
      const id = lead.id || lead._id
      if (!threadMap.has(id)) {
        threadMap.set(id, {
          leadId: id,
          leadName: lead.name || lead.lead_data?.company || lead.lead_data?.contact_name || 'Sin nombre',
          leadEmail: lead.email || lead.lead_data?.email || '',
          leadCompany: lead.name || lead.lead_data?.company || '',
          emails: [],
          lastDate: null,
          lastStatus: null,
          lastSubject: '',
          lastBody: '',
          maxStep: 0,
          totalSteps: 5,
        })
      }
    })

    // Sort by last date descending, threads without emails at end
    const arr = Array.from(threadMap.values())
    arr.sort((a, b) => {
      if (!a.lastDate && !b.lastDate) return 0
      if (!a.lastDate) return 1
      if (!b.lastDate) return -1
      return b.lastDate - a.lastDate
    })

    // Sort emails within each thread chronologically
    arr.forEach(t => {
      t.emails.sort((a, b) => new Date(a.sent_at || a.created_at || 0) - new Date(b.sent_at || b.created_at || 0))
    })

    return arr
  }, [messages, leads])

  // ── Filtered threads ──
  const filteredThreads = useMemo(() => {
    let result = threads

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.leadName.toLowerCase().includes(q) ||
        t.leadEmail.toLowerCase().includes(q) ||
        t.leadCompany.toLowerCase().includes(q) ||
        (t.lastSubject && t.lastSubject.toLowerCase().includes(q))
      )
    }

    // Status filter
    if (threadFilter === 'sent') {
      result = result.filter(t => t.emails.some(e => e.status === 'SENT'))
    } else if (threadFilter === 'scheduled') {
      result = result.filter(t => t.emails.some(e => e.status === 'SCHEDULED'))
    } else if (threadFilter === 'failed') {
      result = result.filter(t => t.emails.some(e => e.status === 'FAILED'))
    } else if (threadFilter === 'ai') {
      result = result.filter(t => getAiEnabled(t.leadId))
    }

    return result
  }, [threads, searchQuery, threadFilter])

  // ── Selected thread ──
  const selectedThread = useMemo(() => {
    return threads.find(t => t.leadId === selectedLeadId) || null
  }, [threads, selectedLeadId])

  // ── Computed stats ──
  const computedStats = useMemo(() => {
    const totalThreads = threads.length
    const sentCount = messages.filter(m => m.status === 'SENT').length
    const scheduledCount = messages.filter(m => m.status === 'SCHEDULED').length
    const responseRate = stats.open_rate || 0
    const aiActiveCount = threads.filter(t => getAiEnabled(t.leadId)).length
    return { totalThreads, sentCount, scheduledCount, responseRate, aiActiveCount }
  }, [threads, messages, stats])

  // ── Actions ──
  const handleSendEmail = async () => {
    if (!selectedLeadId || !composeSubject.trim() || !composeBody.trim()) return
    setSending(true)
    try {
      await api.post('/api/outreach/email/send', {
        lead_id: selectedLeadId,
        subject: composeSubject,
        body: composeBody,
      })
      showNotification('Email enviado correctamente')
      setComposeSubject('')
      setComposeBody('')
      await Promise.all([loadMessages(), loadStats()])
    } catch (err) {
      showNotification(err.response?.data?.error || 'Error enviando email', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleGenerateAI = async () => {
    if (!selectedLeadId) return
    setGenerating(true)
    try {
      const nextStep = selectedThread ? STEP_TYPES[Math.min(selectedThread.maxStep, STEP_TYPES.length - 1)] : 'introduction'
      const res = await api.post('/api/outreach/email/preview', {
        lead_id: selectedLeadId,
        stepType: nextStep,
      })
      const data = res.data
      setComposeSubject(data.subject || '')
      setComposeBody(data.body || data.html || '')
      showNotification('Email generado con IA')
    } catch (err) {
      showNotification('Error generando email con IA', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleCreateSequence = async (leadId) => {
    try {
      await api.post('/api/outreach/email/sequence', { leadId })
      showNotification('Secuencia IA creada')
      await Promise.all([loadMessages(), loadStats()])
    } catch (err) {
      showNotification('Error creando secuencia', 'error')
    }
  }

  const toggleEmailExpand = (emailId) => {
    setExpandedEmails(prev => ({ ...prev, [emailId]: !prev[emailId] }))
  }

  // ── Date formatting ──
  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const formatRelative = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'ahora'
    if (diffMins < 60) return `${diffMins}m`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d`
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  }

  const truncate = (text, max = 60) => {
    if (!text) return ''
    const clean = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    return clean.length > max ? clean.slice(0, max) + '...' : clean
  }

  // ── Scroll to bottom of email thread when selecting ──
  useEffect(() => {
    if (emailThreadRef.current) {
      setTimeout(() => {
        emailThreadRef.current.scrollTop = emailThreadRef.current.scrollHeight
      }, 100)
    }
  }, [selectedLeadId])

  // ══════════════════════════════════════════════════════
  // ── Playground helpers (preserved from original) ──
  // ══════════════════════════════════════════════════════

  const PG_SECTORS = ['tecnologia', 'fabricas', 'consultora', 'software', 'alimentos', 'logistica', 'retail', 'construccion']
  const PG_CITIES = ['Buenos Aires', 'Cordoba', 'Rosario', 'Mendoza', 'Tucuman', 'Salta']
  const PG_EMAIL_TYPES = [
    { value: 'introduction', label: 'Presentacion' },
    { value: 'value', label: 'Valor' },
    { value: 'case_study', label: 'Caso de Exito' },
    { value: 'urgency', label: 'Urgencia' },
    { value: 'last_chance', label: 'Ultimo' },
  ]
  const PG_TONES = ['consultivo', 'formal', 'amigable', 'directo', 'tecnico']
  const PG_CTA_TYPES = ['call', 'meeting', 'demo', 'reply', 'website']

  const addPgLog = (message, type = 'info') => {
    setPgLogs(prev => {
      const newLogs = [{ message, type, time: new Date().toLocaleTimeString('es-AR') }, ...prev]
      return newLogs.slice(0, 15)
    })
  }

  const loadEmailConfig = async () => {
    setConfigLoading(true)
    try {
      const res = await api.get('/api/outreach/email/config')
      if (res.data?.config) {
        setEmailConfig(res.data.config)
        addPgLog('Configuracion cargada desde DB', 'success')
      }
    } catch (err) {
      addPgLog('Error cargando config: ' + (err.response?.data?.error || err.message), 'error')
    } finally {
      setConfigLoading(false)
    }
  }

  const loadActiveAvatar = async () => {
    try {
      const res = await api.get('/api/avatars')
      const avatars = res.data?.avatars || []
      const active = avatars.find(a => a.is_default) || avatars[0] || null
      setActiveAvatar(active)
    } catch {
      // silently fail
    }
  }

  const handleSaveConfig = async () => {
    if (!emailConfig) return
    setConfigSaving(true)
    try {
      const res = await api.put('/api/outreach/email/config', emailConfig)
      if (res.data?.config) {
        setEmailConfig(res.data.config)
        addPgLog('Configuracion guardada exitosamente', 'success')
        showNotification('Configuracion de email guardada')
      }
    } catch (err) {
      addPgLog('Error guardando config: ' + (err.response?.data?.error || err.message), 'error')
      showNotification('Error guardando configuracion', 'error')
    } finally {
      setConfigSaving(false)
    }
  }

  const handlePgGenerateWithAI = async () => {
    setPgGenerating(true)
    setPgPreview(null)
    setPgStatus('generating')
    const start = performance.now()
    addPgLog('Generando email con IA (DeepSeek)...', 'info')
    try {
      const res = await api.post('/api/outreach/email/test', {
        email: pgTestEmail || 'test@test.com',
        companyName: pgCompanyName,
        sector: pgSector,
        city: pgCity,
        website: pgWebsite,
        stepType: pgEmailType,
      })
      if (res.data?.email) {
        setPgPreview(res.data.email)
        const elapsed = (performance.now() - start).toFixed(0)
        addPgLog(`Email generado con IA - ${elapsed}ms`, 'success')
        setPgStatus(null)
      }
    } catch (err) {
      const elapsed = (performance.now() - start).toFixed(0)
      addPgLog(`Error generando: ${err.response?.data?.error || err.message} - ${elapsed}ms`, 'error')
      setPgStatus('error')
      setTimeout(() => setPgStatus(null), 3000)
    } finally {
      setPgGenerating(false)
    }
  }

  const handlePgSendTest = async () => {
    if (!pgTestEmail) {
      addPgLog('Error: Debes ingresar un email destino de prueba', 'error')
      return
    }
    if (!pgPreview) {
      addPgLog('Error: Genera un preview primero antes de enviar', 'error')
      return
    }
    setPgSending(true)
    setPgStatus('generating')
    const start = performance.now()
    try {
      await api.post('/api/outreach/email/test', {
        email: pgTestEmail,
        subject: pgPreview.subject,
        body: pgPreview.body,
        companyName: pgCompanyName,
        sector: pgSector,
        city: pgCity,
        website: pgWebsite,
        stepType: pgEmailType,
        sendEmail: true,
      })
      setPgStatus('sent')
      const elapsed = (performance.now() - start).toFixed(0)
      addPgLog(`Email de prueba enviado a ${pgTestEmail} - ${elapsed}ms`, 'success')
      showNotification(`Email enviado a ${pgTestEmail}`)
      setTimeout(() => setPgStatus(null), 3000)
    } catch (err) {
      setPgStatus('error')
      const elapsed = (performance.now() - start).toFixed(0)
      const errorMsg = err.response?.data?.error || err.message || 'Error desconocido'
      addPgLog(`Error enviando a ${pgTestEmail}: ${errorMsg} - ${elapsed}ms`, 'error')
      showNotification('Error enviando email', 'error')
      setTimeout(() => setPgStatus(null), 3000)
    } finally {
      setPgSending(false)
    }
  }

  const handlePgCopyHtml = () => {
    if (pgPreview) {
      navigator.clipboard.writeText(pgPreview.body)
      addPgLog('HTML copiado al portapapeles', 'success')
    }
  }

  const handlePgReset = () => {
    setPgPreview(null)
    setPgStatus(null)
    setPgTestEmail('')
    setPgCompanyName('Empresa Test SA')
    setPgSector('tecnologia')
    setPgCity('Buenos Aires')
    setPgEmailType('introduction')
    setPgWebsite('www.empresatest.com.ar')
    setPgLogs([])
    addPgLog('Playground reseteado', 'info')
  }

  const updateConfig = (field, value) => {
    setEmailConfig(prev => prev ? { ...prev, [field]: value } : null)
  }

  // ══════════════════════════════════════════════════════
  // ── RENDER ──
  // ══════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-gray-500">Cargando bandeja de emails...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 transition-all ${
          notification.type === 'error'
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {notification.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {notification.message}
        </div>
      )}

      {/* ═══ STATS BAR ═══ */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Email Outreach</h1>
              <p className="text-xs text-gray-400">Bandeja de emails y secuencias IA</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-sm">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Hilos:</span>
              <span className="font-semibold text-gray-800">{computedStats.totalThreads}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Send className="w-4 h-4 text-green-500" />
              <span className="text-gray-500">Enviados:</span>
              <span className="font-semibold text-gray-800">{computedStats.sentCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-gray-500">Programados:</span>
              <span className="font-semibold text-gray-800">{computedStats.scheduledCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <span className="text-gray-500">Tasa resp:</span>
              <span className="font-semibold text-gray-800">{computedStats.responseRate}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Bot className="w-4 h-4 text-indigo-500" />
              <span className="text-gray-500">Con IA:</span>
              <span className="font-semibold text-gray-800">{computedStats.aiActiveCount}</span>
            </div>
            <button
              onClick={async () => {
                try {
                  await api.post('/api/outreach/email/check-inbox')
                  showNotification('Bandeja revisada')
                } catch {}
                loadMessages(); loadStats()
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Revisar bandeja de entrada"
            >
              <Inbox className="w-3.5 h-3.5" />
              Revisar Inbox
            </button>
            <button
              onClick={() => { loadMessages(); loadStats() }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refrescar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT: SIDEBAR + PANEL ═══ */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>

        {/* ── LEFT SIDEBAR: Thread List (35%) ── */}
        <div className="w-[35%] min-w-[320px] bg-white border-r border-gray-200 flex flex-col">

          {/* Nuevo Email button */}
          <div className="p-3 border-b border-gray-100">
            <button
              onClick={() => {
                setSelectedLeadId(null)
                setComposeSubject('')
                setComposeBody('')
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Email
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar lead, empresa, email..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="px-3 pb-2 flex items-center gap-1 flex-wrap">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'sent', label: 'Enviados' },
              { key: 'scheduled', label: 'Programados' },
              { key: 'failed', label: 'Fallidos' },
              { key: 'ai', label: 'Con IA' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setThreadFilter(f.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                  threadFilter === f.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Thread list */}
          <div ref={threadListRef} className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No se encontraron hilos</p>
              </div>
            ) : (
              filteredThreads.map(thread => {
                const isActive = selectedLeadId === thread.leadId
                const statusCfg = STATUS_CONFIG[thread.lastStatus] || STATUS_CONFIG.PENDING
                const aiOn = getAiEnabled(thread.leadId)

                return (
                  <div
                    key={thread.leadId}
                    onClick={() => {
                      setSelectedLeadId(thread.leadId)
                      setComposeSubject('')
                      setComposeBody('')
                    }}
                    className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blue-50 border-l-[3px] border-l-blue-500'
                        : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate">{thread.leadName}</span>
                          {aiOn && <Bot className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                        </div>
                        {thread.leadCompany && thread.leadCompany !== thread.leadName && (
                          <p className="text-xs text-gray-400 truncate">{thread.leadCompany}</p>
                        )}
                        {thread.lastSubject ? (
                          <p className="text-xs text-gray-600 mt-1 truncate font-medium">{thread.lastSubject}</p>
                        ) : null}
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {thread.emails.length > 0
                            ? truncate(thread.lastBody, 50)
                            : 'Sin emails enviados'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {thread.lastDate && (
                          <span className="text-[10px] text-gray-400">
                            {formatRelative(thread.lastDate)}
                          </span>
                        )}
                        {thread.lastStatus && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        )}
                        {thread.emails.length > 0 && (
                          <span className="text-[10px] text-gray-400 font-medium">
                            {thread.maxStep}/{thread.totalSteps}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL (65%) ── */}
        <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
          {!selectedLeadId ? (
            /* New Email / Empty state */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-lg">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-7 h-7 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">Nuevo Email</h2>
                  <p className="text-sm text-gray-400 mt-1">Selecciona un lead o escribe un email directo</p>
                </div>

                {/* Quick lead selector */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Lead</label>
                    <select
                      onChange={(e) => { if (e.target.value) setSelectedLeadId(e.target.value) }}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue=""
                    >
                      <option value="" disabled>Elegir un lead con email...</option>
                      {threads.filter(t => t.leadEmail).map(t => (
                        <option key={t.leadId} value={t.leadId}>
                          {t.leadName} — {t.leadEmail}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-xs text-gray-400">o envia un email directo</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email destino</label>
                    <input
                      type="email"
                      placeholder="email@empresa.com"
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      id="directEmailInput"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                    <input
                      type="text"
                      placeholder="Asunto del email..."
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      id="directSubjectInput"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                    <textarea
                      rows={5}
                      placeholder="Escribe tu email..."
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      id="directBodyInput"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      const email = document.getElementById('directEmailInput')?.value
                      const subject = document.getElementById('directSubjectInput')?.value
                      const body = document.getElementById('directBodyInput')?.value
                      if (!email || !subject || !body) { alert('Completa todos los campos'); return }
                      try {
                        await api.post('/api/outreach/email/send-direct', { email, subject, body })
                        showNotification('Email enviado correctamente')
                        document.getElementById('directEmailInput').value = ''
                        document.getElementById('directSubjectInput').value = ''
                        document.getElementById('directBodyInput').value = ''
                        // Reload messages to show the new thread
                        await Promise.all([loadMessages(), loadStats()])
                      } catch (err) {
                        showNotification(err.response?.data?.error || 'Error enviando', 'error')
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    <Send className="w-4 h-4" /> Enviar Email
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ── Thread Header ── */}
              <div className="bg-white border-b border-gray-200 px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-gray-900 truncate">{selectedThread?.leadName || 'Lead'}</h2>
                      {selectedThread && selectedThread.maxStep > 0 && (
                        <span className="flex-shrink-0 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                          Paso {selectedThread.maxStep} de {selectedThread.totalSteps}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">{selectedThread?.leadEmail}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* AI Sequence toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Secuencia IA</span>
                      <button
                        onClick={() => {
                          const current = getAiEnabled(selectedLeadId)
                          setAiEnabled(selectedLeadId, !current)
                          // Force re-render
                          setSelectedLeadId(prev => prev)
                          if (!current) {
                            handleCreateSequence(selectedLeadId)
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          getAiEnabled(selectedLeadId) ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                          getAiEnabled(selectedLeadId) ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    {/* Ver Lead button */}
                    <a
                      href={`/admin/lead/${selectedLeadId}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver Lead
                    </a>
                  </div>
                </div>
              </div>

              {/* ── Email Thread View ── */}
              <div ref={emailThreadRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {selectedThread?.emails.length === 0 ? (
                  <div className="text-center py-16">
                    <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No hay emails en este hilo</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {getAiEnabled(selectedLeadId)
                        ? 'La secuencia IA enviara el primer email automaticamente'
                        : 'Compone un email o activa la secuencia IA'}
                    </p>
                  </div>
                ) : (
                  selectedThread?.emails.map((email, idx) => {
                    const emailId = email.id || email._id || idx
                    const isExpanded = expandedEmails[emailId] !== false // default expanded
                    const status = email.status || 'SENT'
                    const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
                    const step = email.step || email.sequence_step || (idx + 1)
                    const isScheduled = status === 'SCHEDULED'
                    const isFailed = status === 'FAILED'

                    return (
                      <div
                        key={emailId}
                        className={`rounded-xl border overflow-hidden transition-all ${
                          isFailed
                            ? 'bg-red-50/50 border-red-200'
                            : isScheduled
                              ? 'bg-gray-50 border-gray-200 border-dashed'
                              : 'bg-white border-gray-200 border-l-[3px] border-l-blue-400'
                        }`}
                      >
                        {/* Email header - always visible */}
                        <div
                          onClick={() => toggleEmailExpand(emailId)}
                          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {isScheduled && <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                            {isFailed && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                            {!isScheduled && !isFailed && <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {email.subject || 'Sin asunto'}
                              </p>
                              {!isExpanded && (
                                <p className="text-xs text-gray-400 truncate mt-0.5">
                                  {truncate(email.body || email.html || email.content || '', 80)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <span className="text-[10px] text-gray-400 font-medium">Paso {step}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {formatDate(email.sent_at || email.created_at)}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </div>

                        {/* Email body - expandable */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-100">
                            <div
                              className="mt-3 text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: email.body || email.html || email.content || '<p class="text-gray-400">Sin contenido disponible</p>' }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* ── Compose Area ── */}
              <div className="bg-white border-t border-gray-200 px-6 py-4">
                {getAiEnabled(selectedLeadId) ? (
                  /* AI Sequence Active */
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                          <Bot className="w-3.5 h-3.5" />
                          Secuencia IA activa - emails se envian automaticamente
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {selectedThread && (
                          <span>Paso actual: {selectedThread.maxStep}/{selectedThread.totalSteps}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5" />
                          Proximo envio automatico
                        </span>
                      </div>
                    </div>

                    {/* Even with AI on, allow manual compose */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleGenerateAI}
                          disabled={generating}
                          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                          Generar Email con IA
                        </button>
                        <span className="text-[10px] text-gray-400">o compone manualmente debajo</span>
                      </div>
                      <input
                        type="text"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        placeholder="Asunto del email..."
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <textarea
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                        rows={3}
                        placeholder="Cuerpo del email..."
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleSendEmail}
                          disabled={sending || !composeSubject.trim() || !composeBody.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Enviar
                        </button>
                        <button
                          onClick={() => {
                            // Schedule for later - same as send but with scheduled flag
                            showNotification('Funcionalidad de programar en desarrollo')
                          }}
                          disabled={!composeSubject.trim() || !composeBody.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                        >
                          <CalendarClock className="w-4 h-4" />
                          Programar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Manual Compose */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">Modo manual - compone y envia emails individualmente</span>
                      </div>
                      <button
                        onClick={handleGenerateAI}
                        disabled={generating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        Generar Email con IA
                      </button>
                    </div>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="Asunto del email..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <textarea
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      rows={4}
                      placeholder="Escribe el cuerpo del email..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleSendEmail}
                        disabled={sending || !composeSubject.trim() || !composeBody.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Enviar
                      </button>
                      <button
                        onClick={() => showNotification('Funcionalidad de programar en desarrollo')}
                        disabled={!composeSubject.trim() || !composeBody.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                      >
                        <CalendarClock className="w-4 h-4" />
                        Programar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ PLAYGROUND SECTION ═══ */}
      <div className="mx-4 mb-4 mt-4 bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
        {/* Playground Header */}
        <button
          onClick={() => {
            const opening = !playgroundOpen
            setPlaygroundOpen(opening)
            if (opening && !emailConfig) {
              loadEmailConfig()
              loadActiveAvatar()
            }
          }}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-semibold text-gray-100">Playground Email + Configuracion IA</h2>
              <p className="text-xs text-gray-500">System prompt, diseno HTML, firma del avatar activo</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${playgroundOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Playground Content */}
        {playgroundOpen && (
          <div className="border-t border-gray-700/50 px-6 py-5 space-y-5">
            {/* Notice */}
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg px-4 py-2.5">
              <p className="text-xs text-amber-300">Esta configuracion se aplicara a TODOS los emails enviados a leads. Los cambios se guardan en la base de datos.</p>
            </div>

            {/* Active Avatar Info */}
            {activeAvatar && (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3 flex items-center gap-3">
                {activeAvatar.photo_url ? (
                  <img src={activeAvatar.photo_url} alt={activeAvatar.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                    {activeAvatar.name?.charAt(0) || 'A'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-200">Avatar activo: {activeAvatar.name}</p>
                  <p className="text-xs text-gray-500">{activeAvatar.role || ''} {activeAvatar.company ? `- ${activeAvatar.company}` : ''} | {activeAvatar.email || ''}</p>
                </div>
              </div>
            )}

            {configLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                <span className="ml-2 text-gray-400 text-sm">Cargando configuracion...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* LEFT: Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Settings className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-gray-300">Configuracion del Email IA</h3>
                  </div>

                  {/* System Prompt */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">System Prompt (instrucciones para la IA)</label>
                    <textarea
                      value={emailConfig?.system_prompt || ''}
                      onChange={(e) => updateConfig('system_prompt', e.target.value)}
                      rows={12}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono leading-relaxed resize-y"
                      placeholder="Instrucciones para la IA al generar emails..."
                    />
                    <p className="text-[10px] text-gray-600 mt-1">Este prompt se envia a DeepSeek junto con los datos del lead</p>
                  </div>

                  {/* Company Info */}
                  <div className="bg-gray-800/40 rounded-lg p-3 space-y-3 border border-gray-700/50">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Datos de la Empresa</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Nombre empresa</label>
                        <input
                          type="text"
                          value={emailConfig?.company_name || ''}
                          onChange={(e) => updateConfig('company_name', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Website</label>
                        <input
                          type="text"
                          value={emailConfig?.company_website || ''}
                          onChange={(e) => updateConfig('company_website', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Descripcion</label>
                      <input
                        type="text"
                        value={emailConfig?.company_description || ''}
                        onChange={(e) => updateConfig('company_description', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Servicios</label>
                      <input
                        type="text"
                        value={emailConfig?.company_services || ''}
                        onChange={(e) => updateConfig('company_services', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Propuesta de valor</label>
                      <input
                        type="text"
                        value={emailConfig?.company_value_proposition || ''}
                        onChange={(e) => updateConfig('company_value_proposition', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Email Style Settings */}
                  <div className="bg-gray-800/40 rounded-lg p-3 space-y-3 border border-gray-700/50">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estilo del Email</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Tono</label>
                        <select
                          value={emailConfig?.tone || 'consultivo'}
                          onChange={(e) => updateConfig('tone', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {PG_TONES.map(t => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Max palabras</label>
                        <input
                          type="number"
                          value={emailConfig?.max_words || 150}
                          onChange={(e) => updateConfig('max_words', parseInt(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">CTA tipo</label>
                        <select
                          value={emailConfig?.cta_type || 'call'}
                          onChange={(e) => updateConfig('cta_type', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {PG_CTA_TYPES.map(c => (
                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emailConfig?.anti_spam_mode ?? true}
                          onChange={(e) => updateConfig('anti_spam_mode', e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                        />
                        Anti-spam mode
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emailConfig?.include_avatar_photo ?? true}
                          onChange={(e) => updateConfig('include_avatar_photo', e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                        />
                        Incluir foto avatar
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emailConfig?.include_calendar_link ?? true}
                          onChange={(e) => updateConfig('include_calendar_link', e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                        />
                        Incluir link calendario
                      </label>
                    </div>
                  </div>

                  {/* HTML Template */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">HTML Template (wrapper)</label>
                    <textarea
                      value={emailConfig?.html_template || ''}
                      onChange={(e) => updateConfig('html_template', e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono leading-relaxed resize-y"
                      placeholder="HTML wrapper con {{BODY}} y {{SIGNATURE}} como placeholders..."
                    />
                    <p className="text-[10px] text-gray-600 mt-1">Usa {'{{BODY}}'} y {'{{SIGNATURE}}'} como placeholders</p>
                  </div>

                  {/* Save Config Button */}
                  <button
                    onClick={handleSaveConfig}
                    disabled={configSaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:text-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {configSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                    Guardar Configuracion
                  </button>
                </div>

                {/* RIGHT: Test Area */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Beaker className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-gray-300">Probar Email con IA</h3>
                  </div>

                  {/* Test fields */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Email destino de prueba</label>
                    <input
                      type="email"
                      value={pgTestEmail}
                      onChange={(e) => setPgTestEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Empresa ficticia</label>
                    <input
                      type="text"
                      value={pgCompanyName}
                      onChange={(e) => setPgCompanyName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Sector</label>
                      <select
                        value={pgSector}
                        onChange={(e) => setPgSector(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        {PG_SECTORS.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Ciudad</label>
                      <select
                        value={pgCity}
                        onChange={(e) => setPgCity(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        {PG_CITIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Tipo de email</label>
                      <select
                        value={pgEmailType}
                        onChange={(e) => setPgEmailType(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        {PG_EMAIL_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Website</label>
                      <input
                        type="text"
                        value={pgWebsite}
                        onChange={(e) => setPgWebsite(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={handlePgGenerateWithAI}
                      disabled={pgGenerating}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:text-gray-400 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {pgGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      Generar con IA
                    </button>
                    <button
                      onClick={handlePgSendTest}
                      disabled={pgSending || !pgTestEmail || !pgPreview}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:text-gray-400 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {pgSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Enviar Email de Prueba
                    </button>
                    <button
                      onClick={handlePgCopyHtml}
                      disabled={!pgPreview}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-gray-300 text-xs font-medium rounded-lg transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar HTML
                    </button>
                    <button
                      onClick={handlePgReset}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>

                  {/* Preview area */}
                  <div className="space-y-3 mt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-300">Preview del Email</h3>
                      {pgStatus === 'generating' && (
                        <span className="flex items-center gap-1.5 text-xs text-blue-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Generando con IA...
                        </span>
                      )}
                      {pgStatus === 'sent' && (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Enviado!
                        </span>
                      )}
                      {pgStatus === 'error' && (
                        <span className="flex items-center gap-1.5 text-xs text-red-400">
                          <XCircle className="w-3.5 h-3.5" />
                          Error
                        </span>
                      )}
                    </div>

                    {pgPreview ? (
                      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-gray-700 bg-gray-800/80">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Asunto</p>
                          <p className="text-sm text-gray-200 font-medium">{pgPreview.subject}</p>
                        </div>
                        <div className="p-4 bg-white max-h-[500px] overflow-y-auto">
                          <div
                            className="text-sm"
                            dangerouslySetInnerHTML={{ __html: pgPreview.body }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center h-48">
                        <div className="text-center">
                          <FlaskConical className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Haz click en "Generar con IA" para crear un email</p>
                          <p className="text-xs text-gray-600 mt-1">Usa el system prompt configurado + datos del lead</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Response Log */}
            {pgLogs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Response Log</h3>
                <div className="bg-gray-950 rounded-lg border border-gray-800 max-h-[160px] overflow-y-auto font-mono text-xs">
                  {pgLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`px-3 py-1.5 border-b border-gray-800/50 flex items-start gap-2 ${
                        i === 0 ? 'bg-gray-900/50' : ''
                      }`}
                    >
                      <span className="text-gray-600 flex-shrink-0">[{log.time}]</span>
                      <span className={
                        log.type === 'success' ? 'text-emerald-400' :
                        log.type === 'error' ? 'text-red-400' :
                        'text-blue-400'
                      }>
                        {log.type === 'success' ? '++' : log.type === 'error' ? '!!' : '--'}
                      </span>
                      <span className={
                        log.type === 'success' ? 'text-emerald-300' :
                        log.type === 'error' ? 'text-red-300' :
                        'text-gray-400'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
