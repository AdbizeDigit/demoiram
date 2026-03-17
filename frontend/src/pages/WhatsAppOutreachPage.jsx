import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import {
  MessageCircle, Phone, Send, Copy, ExternalLink, CheckCircle,
  Loader2, RefreshCw, ChevronDown, ChevronUp, Filter,
  ChevronLeft, ChevronRight, Zap, AlertCircle, Users, Clock,
  ToggleLeft, ToggleRight, Sparkles, X, Search, Eye,
  FlaskConical, RotateCcw,
} from 'lucide-react'

const PAGE_SIZE = 10

export default function WhatsAppOutreachPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // ── Admin guard ──
  const isAdmin = user?.role === 'admin' || user?.email === 'contacto@adbize.com'
  useEffect(() => {
    if (!isAdmin) navigate('/dashboard')
  }, [isAdmin, navigate])

  // ── Mode ──
  const [mode, setMode] = useState('auto') // 'auto' | 'manual'

  // ── Leads ──
  const [leads, setLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(true)

  // ── Messages ──
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(true)

  // ── Auto mode state ──
  const [generatingLeadId, setGeneratingLeadId] = useState(null)
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })

  // ── Manual mode state ──
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [manualMessage, setManualMessage] = useState('')
  const [manualGenerating, setManualGenerating] = useState(false)

  // ── Table state ──
  const [expandedRow, setExpandedRow] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  // ── Playground state ──
  const [playgroundOpen, setPlaygroundOpen] = useState(false)
  const [pgPhone, setPgPhone] = useState('')
  const [pgName, setPgName] = useState('Empresa Test SA')
  const [pgSector, setPgSector] = useState('tecnologia')
  const [pgCity, setPgCity] = useState('Buenos Aires')
  const [pgWebsite, setPgWebsite] = useState('www.empresatest.com.ar')
  const [pgContext, setPgContext] = useState('')
  const [pgMessage, setPgMessage] = useState('')
  const [pgVariations, setPgVariations] = useState([])
  const [pgLog, setPgLog] = useState([])
  const [pgApiLoading, setPgApiLoading] = useState(false)

  // ── Notifications ──
  const [toast, setToast] = useState(null)

  const showToast = (text, type = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Data loading ──
  const loadLeads = useCallback(async () => {
    setLeadsLoading(true)
    try {
      const res = await api.get('/api/scraping-engine/leads', { params: { limit: 100 } })
      const data = res.data?.data || res.data?.leads || res.data || []
      const list = Array.isArray(data) ? data : []
      setLeads(list)
    } catch {
      setLeads([])
    } finally {
      setLeadsLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async () => {
    setMessagesLoading(true)
    try {
      const res = await api.get('/api/outreach/messages', { params: { channel: 'WHATSAPP' } })
      const data = res.data?.data || res.data?.messages || res.data || []
      setMessages(Array.isArray(data) ? data : [])
    } catch {
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLeads()
    loadMessages()
  }, [loadLeads, loadMessages])

  // ── Derived data ──
  const leadsWithPhone = leads.filter(l => l.phone || l.whatsapp || l.telefono)
  const leadsWithoutPhone = leads.filter(l => !l.phone && !l.whatsapp && !l.telefono)

  const getLeadPhone = (lead) => lead.whatsapp || lead.phone || lead.telefono || ''
  const getLeadName = (lead) => lead.name || lead.nombre || lead.business_name || lead.empresa || 'Sin nombre'
  const getLeadMessage = (leadId) => messages.find(m => (m.lead_id || m.leadId) === leadId)

  const totalGenerated = messages.length
  const totalSent = messages.filter(m => m.status === 'SENT' || m.status === 'ENVIADO').length
  const totalPending = messages.filter(m => m.status === 'PENDING' || m.status === 'PENDIENTE' || !m.status).length

  // ── Generate message for a single lead ──
  const generateMessage = async (leadId) => {
    setGeneratingLeadId(leadId)
    try {
      const res = await api.post('/api/outreach/whatsapp/generate', { leadId })
      const msg = res.data?.data || res.data?.message || res.data
      if (msg) {
        setMessages(prev => {
          const exists = prev.findIndex(m => (m.lead_id || m.leadId) === leadId)
          if (exists >= 0) {
            const updated = [...prev]
            updated[exists] = { ...updated[exists], ...msg }
            return updated
          }
          return [msg, ...prev]
        })
        showToast('Mensaje generado con IA')
        return msg
      }
    } catch {
      showToast('Error al generar mensaje', 'error')
    } finally {
      setGeneratingLeadId(null)
    }
    return null
  }

  // ── Mark as sent ──
  const markAsSent = async (messageId) => {
    try {
      await api.patch(`/api/outreach/messages/${messageId}`, { status: 'SENT' })
      setMessages(prev => prev.map(m => (m.id || m._id) === messageId ? { ...m, status: 'SENT' } : m))
      showToast('Marcado como enviado')
    } catch {
      // Optimistic update anyway
      setMessages(prev => prev.map(m => (m.id || m._id) === messageId ? { ...m, status: 'SENT' } : m))
      showToast('Marcado como enviado')
    }
  }

  // ── Open WhatsApp ──
  const openWhatsApp = (phone, text) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '')
    const encoded = encodeURIComponent(text || '')
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank')
  }

  // ── Copy to clipboard ──
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copiado al portapapeles')
    }).catch(() => {
      showToast('Error al copiar', 'error')
    })
  }

  // ── Playground: generate test message ──
  const generateTestMessage = (data, style = 'professional') => {
    const senderName = 'Gian Koch'
    const templates = {
      professional: `Hola! Soy ${senderName} de Adbize. Encontre a ${data.name} investigando empresas de ${data.sector} en ${data.city}. En Adbize ayudamos a empresas a automatizar procesos con inteligencia artificial. ¿Les interesaria saber como la IA puede ayudarles a crecer?`,
      casual: `Hola! 👋 Soy ${senderName} de Adbize. Vi que ${data.name} trabaja en ${data.sector} en ${data.city} y me parecio interesante. Nosotros hacemos soluciones de IA para empresas. ¿Te copa que charlemos 5 min?`,
      direct: `Hola, soy ${senderName} de Adbize. Tenemos soluciones de IA para empresas de ${data.sector}. ¿Tienen 15 min esta semana para una demo rapida?`,
    }
    return templates[style] || templates.professional
  }

  const pgData = { name: pgName, sector: pgSector, city: pgCity, website: pgWebsite, context: pgContext }

  const handlePgGenerate = () => {
    const msg = generateTestMessage(pgData, 'professional')
    setPgMessage(msg)
    setPgLog(prev => [{ text: msg, style: 'professional', timestamp: new Date().toISOString() }, ...prev])
    showToast('Mensaje generado localmente')
  }

  const handlePgGenerateApi = async () => {
    setPgApiLoading(true)
    try {
      const res = await api.post('/api/outreach/whatsapp/generate', { leadId: 'playground-test' })
      const msg = res.data?.data?.text || res.data?.data?.message || res.data?.data?.content || res.data?.message || ''
      if (msg) {
        setPgMessage(msg)
        setPgLog(prev => [{ text: msg, style: 'api', timestamp: new Date().toISOString() }, ...prev])
        showToast('Mensaje generado via API')
      }
    } catch {
      // Fallback to client-side generation
      const msg = generateTestMessage(pgData, 'professional')
      setPgMessage(msg)
      setPgLog(prev => [{ text: msg, style: 'fallback', timestamp: new Date().toISOString() }, ...prev])
      showToast('API no disponible, generado localmente', 'info')
    } finally {
      setPgApiLoading(false)
    }
  }

  const handlePgVariations = () => {
    const styles = [
      { key: 'professional', label: 'Formal' },
      { key: 'casual', label: 'Casual / Amigable' },
      { key: 'direct', label: 'Directo / Corto' },
    ]
    const variations = styles.map(s => ({
      label: s.label,
      style: s.key,
      text: generateTestMessage(pgData, s.key),
    }))
    setPgVariations(variations)
    variations.forEach(v => {
      setPgLog(prev => [{ text: v.text, style: v.style, timestamp: new Date().toISOString() }, ...prev])
    })
    showToast('3 variaciones generadas')
  }

  const handlePgUseVariation = (text) => {
    setPgMessage(text)
    showToast('Variacion seleccionada')
  }

  // ── Bulk generate ──
  const handleBulkGenerate = async () => {
    const eligibleLeads = leadsWithPhone.filter(l => !getLeadMessage(l.id || l._id))
    if (eligibleLeads.length === 0) {
      showToast('Todos los leads ya tienen mensajes generados', 'info')
      return
    }
    setBulkGenerating(true)
    setBulkProgress({ current: 0, total: eligibleLeads.length })

    for (let i = 0; i < eligibleLeads.length; i++) {
      const lead = eligibleLeads[i]
      try {
        const res = await api.post('/api/outreach/whatsapp/generate', { leadId: lead.id || lead._id })
        const msg = res.data?.data || res.data?.message || res.data
        if (msg) {
          setMessages(prev => [msg, ...prev])
        }
      } catch { /* continue */ }
      setBulkProgress({ current: i + 1, total: eligibleLeads.length })
    }

    setBulkGenerating(false)
    showToast(`Mensajes generados para ${eligibleLeads.length} leads`)
    loadMessages()
  }

  // ── Manual mode: generate ──
  const handleManualGenerate = async () => {
    if (!selectedLeadId) return
    setManualGenerating(true)
    const msg = await generateMessage(selectedLeadId)
    if (msg) {
      setManualMessage(msg.text || msg.message || msg.content || '')
    }
    setManualGenerating(false)
  }

  // ── Filter & paginate messages ──
  const filteredMessages = messages.filter(m => {
    if (statusFilter !== 'ALL') {
      const mStatus = m.status || 'PENDING'
      if (statusFilter === 'SENT' && mStatus !== 'SENT' && mStatus !== 'ENVIADO') return false
      if (statusFilter === 'PENDING' && mStatus !== 'PENDING' && mStatus !== 'PENDIENTE' && mStatus) return false
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const lead = leads.find(l => (l.id || l._id) === (m.lead_id || m.leadId))
      const leadName = lead ? getLeadName(lead).toLowerCase() : ''
      const msgText = (m.text || m.message || m.content || '').toLowerCase()
      return leadName.includes(term) || msgText.includes(term)
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / PAGE_SIZE))
  const paginatedMessages = filteredMessages.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset page when filter changes
  useEffect(() => { setPage(1) }, [statusFilter, searchTerm])

  // ── Loading state ──
  if (leadsLoading && messagesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        <p className="text-sm text-gray-400">Cargando WhatsApp Outreach...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'error' ? 'bg-red-500 text-white' :
          toast.type === 'info' ? 'bg-blue-500 text-white' :
          'bg-green-500 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.text}
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ═══════════════════ HEADER ═══════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title + mode toggle */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">WhatsApp Outreach</h1>
              <p className="text-sm text-gray-400">Genera y envia mensajes personalizados por WhatsApp</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode(mode === 'auto' ? 'manual' : 'auto')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'auto'
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {mode === 'auto' ? (
                <>
                  <ToggleRight className="w-5 h-5" />
                  Modo Automatico
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5" />
                  Modo Manual
                </>
              )}
            </button>
            <button
              onClick={() => { loadLeads(); loadMessages() }}
              className="p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              title="Refrescar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mt-5">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{totalGenerated}</p>
            <p className="text-xs text-gray-500 mt-1">Total Generados</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalSent}</p>
            <p className="text-xs text-green-600 mt-1">Enviados</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{totalPending}</p>
            <p className="text-xs text-yellow-600 mt-1">Pendientes</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════ AUTO MODE ═══════════════════ */}
      {mode === 'auto' && (
        <div className="space-y-4">
          {/* Auto banner */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Modo Automatico IA activo</p>
              <p className="text-xs text-green-600 mt-0.5">
                Los mensajes se generan automaticamente para cada lead con WhatsApp/telefono
              </p>
            </div>
          </div>

          {/* Lead cards with generated messages */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Leads con WhatsApp / Telefono
                <span className="text-sm font-normal text-gray-400 ml-1">({leadsWithPhone.length})</span>
              </h2>
            </div>

            {leadsWithPhone.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Phone className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No se encontraron leads con datos de telefono/WhatsApp</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {leadsWithPhone.slice(0, 20).map(lead => {
                  const leadId = lead.id || lead._id
                  const phone = getLeadPhone(lead)
                  const existingMsg = getLeadMessage(leadId)
                  const msgText = existingMsg?.text || existingMsg?.message || existingMsg?.content || ''
                  const msgStatus = existingMsg?.status || 'PENDING'
                  const isSent = msgStatus === 'SENT' || msgStatus === 'ENVIADO'

                  return (
                    <div key={leadId} className="p-5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-gray-800 truncate">{getLeadName(lead)}</h3>
                            {isSent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3" /> Enviado
                              </span>
                            )}
                            {existingMsg && !isSent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                <Clock className="w-3 h-3" /> Pendiente
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {phone}
                          </p>

                          {/* Message preview */}
                          {existingMsg && msgText && (
                            <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3">
                              <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{msgText}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!existingMsg ? (
                            <button
                              onClick={() => generateMessage(leadId)}
                              disabled={generatingLeadId === leadId}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
                            >
                              {generatingLeadId === leadId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                              Generar
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => openWhatsApp(phone, msgText)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Abrir WhatsApp
                              </button>
                              {!isSent && (
                                <button
                                  onClick={() => markAsSent(existingMsg.id || existingMsg._id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Marcar como Enviado
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════ MANUAL MODE ═══════════════════ */}
      {mode === 'manual' && (
        <div className="space-y-4">
          {/* Manual banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Modo Manual</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Selecciona un lead, genera el mensaje con IA, editalo y envialo por WhatsApp
              </p>
            </div>
          </div>

          {/* Compose form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Componer Mensaje
            </h2>

            {/* Lead selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Seleccionar Lead</label>
              <select
                value={selectedLeadId}
                onChange={(e) => {
                  setSelectedLeadId(e.target.value)
                  setManualMessage('')
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">-- Seleccionar lead --</option>
                {leadsWithPhone.map(lead => {
                  const id = lead.id || lead._id
                  return (
                    <option key={id} value={id}>
                      {getLeadName(lead)} - {getLeadPhone(lead)}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Generate button */}
            <div className="mb-4">
              <button
                onClick={handleManualGenerate}
                disabled={!selectedLeadId || manualGenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {manualGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generar mensaje con IA
              </button>
            </div>

            {/* Message textarea */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensaje</label>
              <textarea
                value={manualMessage}
                onChange={(e) => setManualMessage(e.target.value)}
                rows={5}
                placeholder="El mensaje generado aparecera aqui. Puedes editarlo antes de enviar..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => copyToClipboard(manualMessage)}
                disabled={!manualMessage}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </button>
              <button
                onClick={() => {
                  const lead = leadsWithPhone.find(l => (l.id || l._id) === selectedLeadId)
                  if (lead) openWhatsApp(getLeadPhone(lead), manualMessage)
                }}
                disabled={!selectedLeadId || !manualMessage}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir WhatsApp
              </button>
            </div>

            {/* WhatsApp bubble preview */}
            {manualMessage && (
              <div className="mt-6">
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Vista previa
                </p>
                <div className="max-w-md">
                  <div className="bg-[#dcf8c6] rounded-2xl rounded-bl-md p-4 shadow-sm relative">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{manualMessage}</p>
                    <div className="flex items-center justify-end gap-1 mt-2">
                      <span className="text-[10px] text-gray-500">
                        {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <CheckCircle className="w-3 h-3 text-blue-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════ BULK ACTIONS ═══════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-green-600" />
          Acciones Masivas
        </h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={handleBulkGenerate}
            disabled={bulkGenerating || leadsWithPhone.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {bulkGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generar mensajes para todos los leads con WhatsApp
          </button>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4 text-green-500" />
              <strong className="text-gray-800">{leadsWithPhone.length}</strong> con telefono
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4 text-gray-400" />
              <strong className="text-gray-800">{leadsWithoutPhone.length}</strong> sin telefono
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {bulkGenerating && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Generando mensajes...</span>
              <span>{bulkProgress.current} / {bulkProgress.total}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${bulkProgress.total ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════ MESSAGE HISTORY TABLE ═══════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              Historial de Mensajes
              <span className="text-sm font-normal text-gray-400">({filteredMessages.length})</span>
            </h2>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-48"
                />
              </div>

              {/* Status filter */}
              <div className="relative">
                <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="ALL">Todos</option>
                  <option value="SENT">Enviados</option>
                  <option value="PENDING">Pendientes</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        {messagesLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-green-500 mx-auto" />
          </div>
        ) : paginatedMessages.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay mensajes que mostrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lead</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefono</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mensaje</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Generado</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedMessages.map(msg => {
                  const msgId = msg.id || msg._id || Math.random().toString()
                  const leadId = msg.lead_id || msg.leadId
                  const lead = leads.find(l => (l.id || l._id) === leadId)
                  const leadName = lead ? getLeadName(lead) : msg.lead_name || msg.leadName || 'Desconocido'
                  const phone = lead ? getLeadPhone(lead) : msg.phone || msg.telefono || '-'
                  const msgText = msg.text || msg.message || msg.content || ''
                  const status = msg.status || 'PENDING'
                  const isSent = status === 'SENT' || status === 'ENVIADO'
                  const createdAt = msg.created_at || msg.createdAt || msg.generatedAt
                  const isExpanded = expandedRow === msgId

                  return (
                    <tr key={msgId} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-gray-800">{leadName}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {phone}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        {isExpanded ? (
                          <div className="text-gray-600 whitespace-pre-wrap text-xs leading-relaxed">{msgText}</div>
                        ) : (
                          <p className="text-gray-600 truncate">{msgText || '-'}</p>
                        )}
                        {msgText && (
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : msgId)}
                            className="text-xs text-green-600 hover:text-green-700 mt-1 inline-flex items-center gap-0.5"
                          >
                            {isExpanded ? (
                              <><ChevronUp className="w-3 h-3" /> Colapsar</>
                            ) : (
                              <><ChevronDown className="w-3 h-3" /> Ver todo</>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          isSent
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {isSent ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {isSent ? 'Enviado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                        {createdAt ? new Date(createdAt).toLocaleDateString('es-AR', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        }) : '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {msgText && (
                            <button
                              onClick={() => copyToClipboard(msgText)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                              title="Copiar mensaje"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                          {phone && phone !== '-' && (
                            <button
                              onClick={() => openWhatsApp(phone, msgText)}
                              className="p-1.5 rounded-lg text-green-500 hover:text-green-700 hover:bg-green-50 transition-colors"
                              title="Abrir WhatsApp"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                          {!isSent && (
                            <button
                              onClick={() => markAsSent(msgId)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Marcar como enviado"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Mostrando {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredMessages.length)} de {filteredMessages.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-green-500 text-white'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════ PLAYGROUND ═══════════════════ */}
      <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-lg overflow-hidden">
        {/* Playground Header */}
        <button
          onClick={() => setPlaygroundOpen(!playgroundOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-white">Playground WhatsApp</h2>
              <p className="text-xs text-gray-500">Genera y previsualiza mensajes de prueba sin enviar</p>
            </div>
          </div>
          {playgroundOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* Playground Content */}
        {playgroundOpen && (
          <div className="border-t border-gray-700 p-5 space-y-6">

            {/* ── Config + Preview Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Left: Test Configuration */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wide">Configuracion de prueba</h3>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Numero WhatsApp de prueba</label>
                  <input
                    type="text"
                    value={pgPhone}
                    onChange={(e) => setPgPhone(e.target.value)}
                    placeholder="+5491112345678"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Nombre empresa ficticia</label>
                  <input
                    type="text"
                    value={pgName}
                    onChange={(e) => setPgName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Sector</label>
                    <select
                      value={pgSector}
                      onChange={(e) => setPgSector(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="tecnologia">Tecnologia</option>
                      <option value="fabricas">Fabricas</option>
                      <option value="consultora">Consultora</option>
                      <option value="software">Software</option>
                      <option value="alimentos">Alimentos</option>
                      <option value="logistica">Logistica</option>
                      <option value="retail">Retail</option>
                      <option value="construccion">Construccion</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Ciudad</label>
                    <select
                      value={pgCity}
                      onChange={(e) => setPgCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Buenos Aires">Buenos Aires</option>
                      <option value="Cordoba">Cordoba</option>
                      <option value="Rosario">Rosario</option>
                      <option value="Mendoza">Mendoza</option>
                      <option value="Tucuman">Tucuman</option>
                      <option value="Salta">Salta</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Website ficticio</label>
                  <input
                    type="text"
                    value={pgWebsite}
                    onChange={(e) => setPgWebsite(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Contexto adicional <span className="text-gray-600">(opcional)</span></label>
                  <textarea
                    value={pgContext}
                    onChange={(e) => setPgContext(e.target.value)}
                    rows={2}
                    placeholder="Ej: empresa familiar, 50 empleados, buscan automatizar..."
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handlePgGenerate}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generar Mensaje IA
                  </button>
                  <button
                    onClick={handlePgGenerateApi}
                    disabled={pgApiLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {pgApiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Generar con API
                  </button>
                  {pgMessage && (
                    <>
                      <button
                        onClick={() => openWhatsApp(pgPhone || '+5491100000000', pgMessage)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir WhatsApp
                      </button>
                      <button
                        onClick={() => copyToClipboard(pgMessage)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Mensaje
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Right: WhatsApp Phone Preview */}
              <div className="flex flex-col items-center">
                <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wide mb-3 self-start">Vista previa</h3>

                {/* Phone mockup */}
                <div className="w-full max-w-xs">
                  <div className="bg-gray-800 rounded-3xl border-2 border-gray-600 overflow-hidden shadow-2xl">
                    {/* Notch */}
                    <div className="flex justify-center py-2 bg-gray-800">
                      <div className="w-20 h-1.5 bg-gray-600 rounded-full" />
                    </div>

                    {/* Chat header */}
                    <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        {pgName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{pgName}</p>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                          <span className="text-[10px] text-green-200">en linea</span>
                        </div>
                      </div>
                      <Phone className="w-4 h-4 text-white/70" />
                    </div>

                    {/* Chat body */}
                    <div className="bg-[#0b141a] min-h-[200px] p-4 flex flex-col justify-end" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                      {pgMessage ? (
                        <div className="bg-[#dcf8c6] rounded-xl rounded-tr-sm p-3 max-w-[90%] self-end shadow-sm">
                          <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{pgMessage}</p>
                          <div className="flex items-center justify-end gap-1 mt-1.5">
                            <span className="text-[9px] text-gray-500">11:30</span>
                            <span className="text-[9px] text-blue-500">✓✓</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 text-xs py-8">
                          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          Genera un mensaje para ver la vista previa
                        </div>
                      )}
                    </div>

                    {/* Input bar (decorative) */}
                    <div className="bg-[#1f2c34] px-3 py-2.5 flex items-center gap-2">
                      <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
                        <span className="text-xs text-gray-500">Escribe un mensaje...</span>
                      </div>
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <Send className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Counters */}
                {pgMessage && (
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>{pgMessage.length} caracteres</span>
                    <span>{pgMessage.split(/\s+/).filter(Boolean).length} palabras</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Variations Generator ── */}
            <div className="border-t border-gray-700 pt-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wide">Variaciones</h3>
                <button
                  onClick={handlePgVariations}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gray-700 text-green-400 hover:bg-gray-600 border border-gray-600 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Generar 3 Variaciones
                </button>
              </div>

              {pgVariations.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {pgVariations.map((v, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                      <div className="px-3 py-2 bg-gray-750 border-b border-gray-700 flex items-center justify-between">
                        <span className="text-xs font-semibold text-green-400">{v.label}</span>
                        <span className="text-[10px] text-gray-500">{v.text.length} chars</span>
                      </div>
                      <div className="p-3">
                        <div className="bg-[#dcf8c6] rounded-xl rounded-tr-sm p-3 shadow-sm">
                          <p className="text-[11px] text-gray-800 whitespace-pre-wrap leading-relaxed">{v.text}</p>
                          <div className="flex items-center justify-end gap-1 mt-1.5">
                            <span className="text-[9px] text-gray-500">11:30</span>
                            <span className="text-[9px] text-blue-500">✓✓</span>
                          </div>
                        </div>
                      </div>
                      <div className="px-3 pb-3 flex gap-2">
                        <button
                          onClick={() => handlePgUseVariation(v.text)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Usar esta
                        </button>
                        <button
                          onClick={() => copyToClipboard(v.text)}
                          className="px-2.5 py-1.5 rounded-lg text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Test Log ── */}
            {pgLog.length > 0 && (
              <div className="border-t border-gray-700 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wide">Log de generacion</h3>
                  <button
                    onClick={() => setPgLog([])}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {pgLog.map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-gray-800 rounded-lg p-3 border border-gray-700">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                            entry.style === 'professional' ? 'bg-blue-500/20 text-blue-400' :
                            entry.style === 'casual' ? 'bg-yellow-500/20 text-yellow-400' :
                            entry.style === 'direct' ? 'bg-red-500/20 text-red-400' :
                            entry.style === 'api' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {entry.style}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            {new Date(entry.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2">{entry.text}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(entry.text)}
                        className="flex-shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
                        title="Copiar"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
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
