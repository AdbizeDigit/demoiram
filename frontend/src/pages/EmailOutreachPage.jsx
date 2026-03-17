import { useState, useEffect, useCallback } from 'react'
import {
  Mail, Send, Clock, AlertCircle, CheckCircle, XCircle,
  Play, Square, Settings, ChevronDown, ChevronUp,
  Eye, RefreshCw, Filter, Users, BarChart3, Zap,
  Edit3, Loader2
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
    </div>
  )
}
