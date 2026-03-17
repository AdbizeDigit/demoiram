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
  const [pgTemperature, setPgTemperature] = useState(0.7)
  const [pgWebsite, setPgWebsite] = useState('www.empresatest.com.ar')
  const [pgPreview, setPgPreview] = useState(null)
  const [pgSequence, setPgSequence] = useState(null)
  const [pgActiveTab, setPgActiveTab] = useState('introduction')
  const [pgSending, setPgSending] = useState(false)
  const [pgStatus, setPgStatus] = useState(null) // null | 'generating' | 'sent' | 'error'
  const [pgLogs, setPgLogs] = useState([])

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

  const generateClientSideEmail = (type, data) => {
    const { name, sector, city, website } = data
    const templates = {
      introduction: {
        subject: `${name} - Potenciemos su presencia digital en ${city}`,
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h2 style="color: #1a1a2e;">Hola equipo de ${name},</h2>
<p>Mi nombre es [Tu Nombre] y me especializo en ayudar a empresas del sector <strong>${sector}</strong> en ${city} a potenciar su presencia digital y generar mas oportunidades de negocio.</p>
<p>Hemos trabajado con empresas similares a la suya y los resultados han sido muy positivos:</p>
<ul>
<li>Incremento del 40% en leads calificados</li>
<li>Reduccion del 25% en costo por adquisicion</li>
<li>Mayor visibilidad en su mercado objetivo</li>
</ul>
<p>Me encantaria agendar una breve llamada de 15 minutos para mostrarle como podriamos replicar estos resultados para ${name}.</p>
<p>Puede ver mas sobre nuestro trabajo en <a href="https://${website}">${website}</a>.</p>
<p style="margin-top: 20px;">Saludos cordiales,<br/>[Tu Nombre]</p>
</div>`
      },
      value: {
        subject: `3 estrategias que empresas de ${sector} en ${city} estan usando para crecer`,
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h2 style="color: #1a1a2e;">Hola equipo de ${name},</h2>
<p>Le escribo porque identifique 3 oportunidades especificas para empresas de <strong>${sector}</strong> en ${city}:</p>
<ol>
<li><strong>Automatizacion de procesos comerciales:</strong> Reducir tiempos de respuesta a prospectos en un 60%</li>
<li><strong>Segmentacion inteligente:</strong> Llegar al cliente ideal con precision usando datos de mercado</li>
<li><strong>Contenido personalizado:</strong> Generar confianza con comunicacion relevante para su industria</li>
</ol>
<p>Estas estrategias han generado un ROI promedio de 3x para empresas como ${name}.</p>
<p>Le interesaria una demo personalizada de 15 minutos?</p>
<p style="margin-top: 20px;">Saludos,<br/>[Tu Nombre]</p>
</div>`
      },
      case_study: {
        subject: `Como una empresa de ${sector} en ${city} aumento sus ventas un 150%`,
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h2 style="color: #1a1a2e;">Hola equipo de ${name},</h2>
<p>Queria compartirle un caso de exito que creo le resultara muy relevante:</p>
<div style="background: #f8f9fa; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; border-radius: 4px;">
<p><strong>Empresa:</strong> [Cliente del sector ${sector}] - ${city}</p>
<p><strong>Desafio:</strong> Baja conversion de prospectos y proceso comercial manual</p>
<p><strong>Solucion:</strong> Implementacion de automatizacion + IA para outreach personalizado</p>
<p><strong>Resultados:</strong></p>
<ul>
<li>+150% en tasa de conversion</li>
<li>-40% en tiempo de ciclo de venta</li>
<li>+200% en pipeline de oportunidades</li>
</ul>
</div>
<p>Creo que ${name} podria obtener resultados similares. Le gustaria conocer los detalles?</p>
<p style="margin-top: 20px;">Saludos,<br/>[Tu Nombre]</p>
</div>`
      },
      urgency: {
        subject: `${name}: oportunidad limitada para empresas de ${sector}`,
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h2 style="color: #1a1a2e;">Hola equipo de ${name},</h2>
<p>Le escribo porque estamos ofreciendo un <strong>programa exclusivo</strong> para empresas de ${sector} en ${city} con condiciones especiales que vencen este mes.</p>
<p>El programa incluye:</p>
<ul>
<li>Auditoria completa de su proceso comercial actual (valorada en $500 USD)</li>
<li>Setup e implementacion sin costo</li>
<li>30 dias de prueba con soporte dedicado</li>
<li>Descuento del 30% en el primer trimestre</li>
</ul>
<p style="background: #fef3c7; padding: 12px; border-radius: 6px; border: 1px solid #f59e0b;">Solo quedan <strong>5 lugares disponibles</strong> para empresas en ${city}. No quisiera que ${name} se quede afuera.</p>
<p>Puedo agendarle una llamada esta semana?</p>
<p style="margin-top: 20px;">Saludos,<br/>[Tu Nombre]</p>
</div>`
      },
      last_chance: {
        subject: `Ultimo mensaje - ${name}`,
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h2 style="color: #1a1a2e;">Hola equipo de ${name},</h2>
<p>Este es mi ultimo mensaje. Entiendo que los tiempos pueden no ser los ideales, y no quiero ser insistente.</p>
<p>Solo queria dejarle saber que seguimos disponibles cuando ${name} este lista para explorar nuevas oportunidades de crecimiento en el sector <strong>${sector}</strong>.</p>
<p>Si en algun momento desea retomar la conversacion, puede:</p>
<ul>
<li>Responder a este email</li>
<li>Agendar directamente en nuestro calendario: <a href="https://${website}">${website}</a></li>
<li>Llamarnos sin compromiso</li>
</ul>
<p>Le deseo mucho exito a ${name} y a todo su equipo en ${city}.</p>
<p style="margin-top: 20px;">Cordialmente,<br/>[Tu Nombre]</p>
</div>`
      },
    }
    return templates[type] || templates.introduction
  }

  const addPgLog = (message, type = 'info') => {
    setPgLogs(prev => {
      const newLogs = [{ message, type, time: new Date().toLocaleTimeString('es-AR') }, ...prev]
      return newLogs.slice(0, 10)
    })
  }

  const handlePgGeneratePreview = () => {
    const start = performance.now()
    setPgStatus('generating')
    setPgSequence(null)
    const data = { name: pgCompanyName, sector: pgSector, city: pgCity, email: pgTestEmail, website: pgWebsite }
    setTimeout(() => {
      const email = generateClientSideEmail(pgEmailType, data)
      setPgPreview(email)
      setPgStatus(null)
      const elapsed = (performance.now() - start).toFixed(0)
      addPgLog(`Preview generado (${PG_EMAIL_TYPES.find(t => t.value === pgEmailType)?.label}) - ${elapsed}ms - client-side render`, 'success')
    }, 300)
  }

  const handlePgGenerateSequence = () => {
    const start = performance.now()
    setPgStatus('generating')
    setPgPreview(null)
    const data = { name: pgCompanyName, sector: pgSector, city: pgCity, email: pgTestEmail, website: pgWebsite }
    setTimeout(() => {
      const seq = {}
      PG_EMAIL_TYPES.forEach(t => {
        seq[t.value] = generateClientSideEmail(t.value, data)
      })
      setPgSequence(seq)
      setPgActiveTab('introduction')
      setPgStatus(null)
      const elapsed = (performance.now() - start).toFixed(0)
      addPgLog(`Secuencia completa generada (5 emails) - ${elapsed}ms - client-side render`, 'success')
    }, 500)
  }

  const handlePgSendTest = async () => {
    if (!pgTestEmail) {
      addPgLog('Error: Debes ingresar un email destino de prueba', 'error')
      return
    }
    setPgSending(true)
    setPgStatus('generating')
    const currentPreview = pgSequence ? pgSequence[pgActiveTab] : pgPreview
    if (!currentPreview) {
      addPgLog('Error: Genera un preview primero antes de enviar', 'error')
      setPgSending(false)
      setPgStatus(null)
      return
    }
    const start = performance.now()
    try {
      // NOTE: The backend /api/outreach/email/send endpoint needs to accept
      // a `testEmail` field to override the lead's email for test sends.
      await api.post('/api/outreach/email/send', {
        lead_id: null,
        subject: currentPreview.subject,
        body: currentPreview.body,
        testEmail: pgTestEmail,
        testData: { name: pgCompanyName, sector: pgSector, city: pgCity, email: pgTestEmail, website: pgWebsite },
      })
      setPgStatus('sent')
      const elapsed = (performance.now() - start).toFixed(0)
      addPgLog(`Email de prueba enviado a ${pgTestEmail} - ${elapsed}ms`, 'success')
      setTimeout(() => setPgStatus(null), 3000)
    } catch (err) {
      setPgStatus('error')
      const elapsed = (performance.now() - start).toFixed(0)
      const errorMsg = err.response?.data?.error || err.message || 'Error desconocido'
      addPgLog(`Error enviando a ${pgTestEmail}: ${errorMsg} - ${elapsed}ms`, 'error')
      setTimeout(() => setPgStatus(null), 3000)
    } finally {
      setPgSending(false)
    }
  }

  const handlePgCopyHtml = () => {
    const currentPreview = pgSequence ? pgSequence[pgActiveTab] : pgPreview
    if (currentPreview) {
      navigator.clipboard.writeText(currentPreview.body)
      addPgLog('HTML copiado al portapapeles', 'success')
    }
  }

  const handlePgReset = () => {
    setPgPreview(null)
    setPgSequence(null)
    setPgStatus(null)
    setPgTestEmail('')
    setPgCompanyName('Empresa Test SA')
    setPgSector('tecnologia')
    setPgCity('Buenos Aires')
    setPgEmailType('introduction')
    setPgTemperature(0.7)
    setPgWebsite('www.empresatest.com.ar')
    setPgLogs([])
    addPgLog('Playground reseteado', 'info')
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
          onClick={() => setPlaygroundOpen(!playgroundOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-semibold text-gray-100">Playground Email</h2>
              <p className="text-xs text-gray-500">Genera y testea emails con datos ficticios</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${playgroundOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Playground Content */}
        {playgroundOpen && (
          <div className="border-t border-gray-700/50 px-6 py-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: Test Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Beaker className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-gray-300">Configuracion de Prueba</h3>
                </div>

                {/* Test email */}
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

                {/* Company name */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Nombre empresa ficticia</label>
                  <input
                    type="text"
                    value={pgCompanyName}
                    onChange={(e) => setPgCompanyName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Sector + City row */}
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

                {/* Email type */}
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

                {/* Temperature slider */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Temperatura IA: <span className="text-emerald-400 font-mono">{pgTemperature}</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={pgTemperature}
                    onChange={(e) => setPgTemperature(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                    <span>0.1 Preciso</span>
                    <span>1.0 Creativo</span>
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Website ficticio</label>
                  <input
                    type="text"
                    value={pgWebsite}
                    onChange={(e) => setPgWebsite(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Actions row */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={handlePgGeneratePreview}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Generar Preview
                  </button>
                  <button
                    onClick={handlePgSendTest}
                    disabled={pgSending || !pgTestEmail}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:text-gray-400 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {pgSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Enviar Email de Prueba
                  </button>
                  <button
                    onClick={handlePgGenerateSequence}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Generar Secuencia Completa
                  </button>
                  <button
                    onClick={handlePgCopyHtml}
                    disabled={!pgPreview && !pgSequence}
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
              </div>

              {/* Right: Preview Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-300">Preview</h3>
                  {pgStatus === 'generating' && (
                    <span className="flex items-center gap-1.5 text-xs text-blue-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generando...
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
                      Error al enviar
                    </span>
                  )}
                </div>

                {/* Sequence tabs */}
                {pgSequence && (
                  <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
                    {PG_EMAIL_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setPgActiveTab(t.value)}
                        className={`flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                          pgActiveTab === t.value
                            ? 'bg-emerald-600 text-white'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Email preview */}
                {(pgPreview || pgSequence) ? (
                  <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    {/* Subject */}
                    <div className="px-4 py-2.5 border-b border-gray-700 bg-gray-800/80">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Asunto</p>
                      <p className="text-sm text-gray-200 font-medium">
                        {pgSequence ? pgSequence[pgActiveTab]?.subject : pgPreview?.subject}
                      </p>
                    </div>
                    {/* Body */}
                    <div className="p-4 bg-white max-h-[400px] overflow-y-auto">
                      <div
                        className="text-sm"
                        dangerouslySetInnerHTML={{
                          __html: pgSequence ? pgSequence[pgActiveTab]?.body : pgPreview?.body
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center h-64">
                    <div className="text-center">
                      <FlaskConical className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Genera un preview para ver el email aqui</p>
                      <p className="text-xs text-gray-600 mt-1">Los emails se generan client-side con templates</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
