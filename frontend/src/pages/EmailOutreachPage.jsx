import { useState, useEffect, useCallback } from 'react'
import {
  Mail, Send, Clock, AlertCircle, CheckCircle, XCircle,
  Play, Square, Settings, ChevronDown, ChevronUp,
  Eye, RefreshCw, Filter, Users, BarChart3, Zap,
  Edit3, Loader2, FlaskConical, Beaker, Copy, RotateCcw
} from 'lucide-react'
import api from '../services/api'

const STATUS_CONFIG = {
  SENT: { label: 'Enviado', color: 'bg-green-100 text-green-700 border-green-200' },
  SCHEDULED: { label: 'Programado', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  FAILED: { label: 'Fallido', color: 'bg-red-100 text-red-700 border-red-200' },
  PENDING: { label: 'Pendiente', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  OPENED: { label: 'Abierto', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REPLIED: { label: 'Respondido', color: 'bg-purple-100 text-purple-700 border-purple-200' },
}

const INTERVAL_OPTIONS = [
  { value: '1h', label: 'Cada 1 hora' },
  { value: '2h', label: 'Cada 2 horas' },
  { value: '4h', label: 'Cada 4 horas' },
  { value: '8h', label: 'Cada 8 horas' },
  { value: '24h', label: 'Cada 24 horas' },
]

export default function EmailOutreachPage() {
  // Mode
  const [mode, setMode] = useState('auto') // 'auto' | 'manual'

  // Stats
  const [stats, setStats] = useState({
    total_sent: 0,
    scheduled: 0,
    failed: 0,
    open_rate: 0,
  })

  // Auto mode settings
  const [autoSettings, setAutoSettings] = useState({
    interval: '4h',
    max_per_day: 20,
    sequence_length: 3,
  })
  const [autoRunning, setAutoRunning] = useState(false)
  const [startingAuto, setStartingAuto] = useState(false)

  // Manual mode
  const [leads, setLeads] = useState([])
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [emailPreview, setEmailPreview] = useState(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [sending, setSending] = useState(false)

  // Email history
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedRow, setExpandedRow] = useState(null)

  // Bulk send
  const [bulkSending, setBulkSending] = useState(false)

  // Notification
  const [notification, setNotification] = useState(null)

  // Playground
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
  // Email config state
  const [emailConfig, setEmailConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)
  const [activeAvatar, setActiveAvatar] = useState(null)

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }, [])

  // ── Load data ──

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/api/outreach/email/stats')
      setStats(res.data?.stats || res.data || {
        total_sent: 0, scheduled: 0, failed: 0, open_rate: 0
      })
    } catch (err) {
      console.error('Error loading email stats:', err)
    }
  }, [])

  const loadMessages = useCallback(async () => {
    setMessagesLoading(true)
    try {
      const params = { channel: 'EMAIL', page, limit: 15 }
      if (statusFilter !== 'all') params.status = statusFilter
      const res = await api.get('/api/outreach/messages', { params })
      const data = res.data
      setMessages(data.messages || data.data || [])
      setTotalPages(data.totalPages || data.total_pages || Math.ceil((data.total || 0) / 15) || 1)
    } catch (err) {
      console.error('Error loading messages:', err)
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }, [page, statusFilter])

  const loadLeads = useCallback(async () => {
    try {
      const res = await api.get('/api/crm/leads')
      const allLeads = res.data?.leads || res.data || []
      setLeads(allLeads.filter(l => l.lead_data?.email))
    } catch (err) {
      console.error('Error loading leads:', err)
    }
  }, [])

  useEffect(() => {
    loadStats()
    loadMessages()
    loadLeads()
  }, [loadStats, loadMessages, loadLeads])

  useEffect(() => {
    loadMessages()
  }, [page, statusFilter, loadMessages])

  // ── Preview email ──

  const handlePreview = async () => {
    if (!selectedLeadId) return
    setPreviewLoading(true)
    try {
      const res = await api.post('/api/outreach/email/preview', { lead_id: selectedLeadId })
      const data = res.data
      setEmailPreview(data)
      setEditSubject(data.subject || '')
      setEditBody(data.body || data.html || '')
    } catch (err) {
      showNotification('Error generando preview del email', 'error')
    } finally {
      setPreviewLoading(false)
    }
  }

  // ── Send single email ──

  const handleSendEmail = async () => {
    if (!selectedLeadId) return
    setSending(true)
    try {
      await api.post('/api/outreach/email/send', {
        lead_id: selectedLeadId,
        subject: editSubject,
        body: editBody,
      })
      showNotification('Email enviado correctamente')
      setEmailPreview(null)
      setEditSubject('')
      setEditBody('')
      setSelectedLeadId('')
      loadStats()
      loadMessages()
    } catch (err) {
      showNotification(err.response?.data?.error || 'Error enviando email', 'error')
    } finally {
      setSending(false)
    }
  }

  // ── Bulk send all leads ──

  const handleBulkSend = async () => {
    setBulkSending(true)
    try {
      await api.post('/api/outreach/email/sequence', {
        mode: 'auto',
        ...autoSettings,
      })
      showNotification('Secuencia de emails iniciada para todos los leads')
      loadStats()
      loadMessages()
    } catch (err) {
      showNotification(err.response?.data?.error || 'Error enviando emails masivos', 'error')
    } finally {
      setBulkSending(false)
    }
  }

  // ── Auto mode start/stop ──

  const toggleAutoMode = async () => {
    setStartingAuto(true)
    try {
      if (autoRunning) {
        await api.post('/api/outreach/email/sequence', { action: 'stop' })
        setAutoRunning(false)
        showNotification('Envio automatico detenido')
      } else {
        await api.post('/api/outreach/email/sequence', {
          action: 'start',
          ...autoSettings,
        })
        setAutoRunning(true)
        showNotification('Envio automatico iniciado')
      }
    } catch (err) {
      showNotification('Error al cambiar estado automatico', 'error')
    } finally {
      setStartingAuto(false)
    }
  }

  // ── Playground helpers ──

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

  // ── Helpers ──

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getLeadName = (msg) => {
    return msg.lead_name || msg.lead?.lead_data?.company || msg.lead?.lead_data?.contact_name || 'Sin nombre'
  }

  const getLeadEmail = (msg) => {
    return msg.to_email || msg.lead?.lead_data?.email || msg.email || '-'
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 space-y-6">
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

      {/* ═══ HEADER ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Title + toggle */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Mail className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Email Outreach</h1>
              <p className="text-sm text-gray-500">Gestiona y automatiza el envio de emails a tus leads</p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setMode('auto')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'auto'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Zap className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Modo Automatico
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'manual'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Edit3 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Modo Manual
              </button>
            </div>

            {/* Bulk send button (auto only) */}
            {mode === 'auto' && (
              <button
                onClick={handleBulkSend}
                disabled={bulkSending}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                {bulkSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Enviar a Todos los Leads con Email
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
              <Send className="w-3.5 h-3.5" />
              Total Enviados
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total_sent || 0}</p>
          </div>
          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-medium mb-1">
              <Clock className="w-3.5 h-3.5" />
              Programados
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats.scheduled || 0}</p>
          </div>
          <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center gap-2 text-red-500 text-xs font-medium mb-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Fallidos
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.failed || 0}</p>
          </div>
          <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium mb-1">
              <BarChart3 className="w-3.5 h-3.5" />
              Tasa Apertura
            </div>
            <p className="text-2xl font-bold text-emerald-700">{stats.open_rate || 0}%</p>
          </div>
        </div>
      </div>

      {/* ═══ AUTO MODE SECTION ═══ */}
      {mode === 'auto' && (
        <div className="space-y-4">
          {/* Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <Zap className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Modo Automatico IA activo</p>
              <p className="text-sm text-emerald-700 mt-0.5">
                Los emails se generan y envian automaticamente a cada lead con email detectado.
                La IA personaliza el contenido segun el perfil del lead y tu propuesta de valor.
              </p>
            </div>
          </div>

          {/* Settings card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Settings className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Configuracion de Envio Automatico</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Intervalo entre emails
                </label>
                <select
                  value={autoSettings.interval}
                  onChange={(e) => setAutoSettings(prev => ({ ...prev, interval: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {INTERVAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Max per day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Max emails por dia
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={autoSettings.max_per_day}
                  onChange={(e) => setAutoSettings(prev => ({ ...prev, max_per_day: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Sequence length */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Longitud de secuencia (emails)
                </label>
                <select
                  value={autoSettings.sequence_length}
                  onChange={(e) => setAutoSettings(prev => ({ ...prev, sequence_length: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n} email{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Start/Stop button */}
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={toggleAutoMode}
                disabled={startingAuto}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm ${
                  autoRunning
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                } disabled:opacity-50`}
              >
                {startingAuto ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : autoRunning ? (
                  <Square className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {autoRunning ? 'Detener Envio Automatico' : 'Iniciar Envio Automatico'}
              </button>

              {autoRunning && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Enviando automaticamente...
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MANUAL MODE SECTION ═══ */}
      {mode === 'manual' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Edit3 className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Componer Email Manual</h2>
          </div>

          {/* Select lead */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Seleccionar Lead
            </label>
            <div className="flex gap-3">
              <select
                value={selectedLeadId}
                onChange={(e) => {
                  setSelectedLeadId(e.target.value)
                  setEmailPreview(null)
                  setEditSubject('')
                  setEditBody('')
                }}
                className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Selecciona un lead --</option>
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>
                    {lead.lead_data?.company || lead.lead_data?.contact_name || 'Sin nombre'} - {lead.lead_data?.email}
                  </option>
                ))}
              </select>
              <button
                onClick={handlePreview}
                disabled={!selectedLeadId || previewLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {previewLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                Generar Preview
              </button>
            </div>
          </div>

          {/* Email compose form */}
          {(emailPreview || editSubject) && (
            <div className="space-y-4 mt-5 pt-5 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Asunto</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Asunto del email..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cuerpo del Email</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                  placeholder="Escribe o edita el cuerpo del email..."
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSendEmail}
                  disabled={sending || !editSubject.trim() || !editBody.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Enviar Email
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ EMAIL HISTORY TABLE ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Historial de Emails</h2>
            <span className="text-xs text-gray-400 ml-1">({messages.length} en esta pagina)</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Status filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos los estados</option>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => { loadMessages(); loadStats() }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refrescar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        {messagesLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="ml-2 text-sm text-gray-500">Cargando emails...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay emails registrados</p>
            <p className="text-gray-400 text-xs mt-1">Los emails enviados apareceran aqui</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Asunto</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Canal</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Paso</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Enviado</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => {
                    const statusCfg = STATUS_CONFIG[msg.status] || STATUS_CONFIG.PENDING
                    const msgId = msg.id || msg._id
                    const isExpanded = expandedRow === msgId

                    return (
                      <tr key={msgId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                        <td className="py-3 px-3 font-medium text-gray-900 max-w-[160px] truncate">
                          {getLeadName(msg)}
                        </td>
                        <td className="py-3 px-3 text-gray-600 max-w-[180px] truncate">
                          {getLeadEmail(msg)}
                        </td>
                        <td className="py-3 px-3 text-gray-700 max-w-[200px]">
                          <div className="truncate">{msg.subject || '-'}</div>
                          {isExpanded && (
                            <div className="mt-3 max-w-3xl">
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Contenido del Email</p>
                              <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {msg.body || msg.html || msg.content || 'Sin contenido disponible'}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 align-top">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 align-top">
                          {msg.channel || 'EMAIL'}
                        </td>
                        <td className="py-3 px-3 text-gray-500 align-top">
                          {msg.step || msg.sequence_step || 1}
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-xs align-top">
                          {formatDate(msg.sent_at || msg.created_at)}
                        </td>
                        <td className="py-3 px-3 align-top">
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : msgId)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ver contenido"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Pagina {page} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = page <= 3 ? i + 1 : page + i - 2
                    if (pageNum < 1 || pageNum > totalPages) return null
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          pageNum === page
                            ? 'bg-emerald-600 text-white'
                            : 'border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ PLAYGROUND SECTION ═══ */}
      <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
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
                {/* ══ LEFT: Configuration ══ */}
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

                {/* ══ RIGHT: Test Area ══ */}
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
