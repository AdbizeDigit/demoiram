import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import {
  MessageCircle, Send, Search, Phone, Loader2, Bot, User,
  ToggleLeft, ToggleRight, Sparkles, QrCode, Wifi, WifiOff,
  Eye, Paperclip, Check, CheckCheck, Plus, Filter,
  MessageSquare, Zap, Users, ArrowLeft,
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) {
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) {
    return d.toLocaleDateString('es-AR', { weekday: 'short' })
  }
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function formatMessageTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function truncate(str, len = 45) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

function getLeadPhone(lead) {
  return lead.whatsapp || lead.phone || lead.telefono || ''
}

function getLeadName(lead) {
  return lead.name || lead.nombre || lead.business_name || lead.empresa || 'Sin nombre'
}

function getAIKey(leadId) {
  return `whatsapp_ai_${leadId}`
}

function getAIState(leadId) {
  try {
    const val = localStorage.getItem(getAIKey(leadId))
    if (val === null) return true // default ON
    return val === 'true'
  } catch { return true }
}

function setAIState(leadId, value) {
  try {
    localStorage.setItem(getAIKey(leadId), String(value))
  } catch { /* ignore */ }
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function WhatsAppOutreachPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Admin guard
  const isAdmin = user?.role === 'admin' || user?.email === 'contacto@adbize.com'
  useEffect(() => {
    if (!isAdmin) navigate('/dashboard')
  }, [isAdmin, navigate])

  // ── State ──
  const [leads, setLeads] = useState([])
  const [messages, setMessages] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState('todos') // todos | con_ia | sin_ia
  const [showNewChat, setShowNewChat] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [newName, setNewName] = useState('')
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected')
  const [statusLoading, setStatusLoading] = useState(true)
  const [qrCode, setQrCode] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)

  // ── Data Loading ───────────────────────────────────────────────────────────

  const loadLeads = useCallback(async () => {
    try {
      setLeadsLoading(true)
      const { data } = await api.get('/api/scraping-engine/leads?limit=200')
      const allLeads = data.leads || data.data || data || []
      const withPhone = allLeads.filter(l => getLeadPhone(l))
      setLeads(withPhone)
    } catch (err) {
      console.error('Error loading leads:', err)
      setLeads([])
    } finally {
      setLeadsLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async () => {
    try {
      setMessagesLoading(true)
      const { data } = await api.get('/api/outreach/messages?channel=WHATSAPP')
      setMessages(data.messages || data.data || data || [])
    } catch (err) {
      console.error('Error loading messages:', err)
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  const checkWhatsappStatus = useCallback(async () => {
    try {
      setStatusLoading(true)
      const { data } = await api.get('/api/outreach/whatsapp/status')
      setWhatsappStatus(data.status || 'disconnected')
      if (data.qrCode || data.qr) setQrCode(data.qrCode || data.qr)
    } catch {
      setWhatsappStatus('disconnected')
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLeads()
    loadMessages()
    checkWhatsappStatus()
  }, [loadLeads, loadMessages, checkWhatsappStatus])

  // ── Conversations (grouped messages by lead) ──────────────────────────────

  const conversations = useMemo(() => {
    const convMap = new Map()

    // Initialize from leads
    leads.forEach(lead => {
      const id = lead.id || lead._id
      if (!id) return
      convMap.set(String(id), {
        leadId: String(id),
        lead,
        messages: [],
        lastMessage: null,
        lastTime: null,
        unreadCount: 0,
        aiEnabled: getAIState(id),
      })
    })

    // Add messages to conversations
    messages.forEach(msg => {
      const leadId = String(msg.lead_id || msg.leadId)
      if (convMap.has(leadId)) {
        const conv = convMap.get(leadId)
        conv.messages.push(msg)
      } else {
        // Message for lead not in current list, create placeholder
        convMap.set(leadId, {
          leadId,
          lead: { id: leadId, name: msg.lead_name || 'Desconocido', phone: msg.to || msg.phone },
          messages: [msg],
          lastMessage: null,
          lastTime: null,
          unreadCount: 0,
          aiEnabled: getAIState(leadId),
        })
      }
    })

    // Sort messages within each conversation, compute last message
    const result = []
    convMap.forEach(conv => {
      conv.messages.sort((a, b) => new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0))
      const last = conv.messages[conv.messages.length - 1]
      if (last) {
        conv.lastMessage = last.message || last.content || last.body || ''
        conv.lastTime = last.created_at || last.createdAt || last.sent_at
      }
      conv.unreadCount = conv.messages.filter(m =>
        (m.direction === 'incoming' || m.direction === 'INCOMING') && !m.read
      ).length
      result.push(conv)
    })

    // Sort: conversations with messages first, then by name
    result.sort((a, b) => {
      if (a.lastTime && b.lastTime) return new Date(b.lastTime) - new Date(a.lastTime)
      if (a.lastTime) return -1
      if (b.lastTime) return 1
      return getLeadName(a.lead).localeCompare(getLeadName(b.lead))
    })

    // Deduplicate by normalized phone number
    const seenPhones = new Set()
    const deduped = result.filter(conv => {
      const phone = getLeadPhone(conv.lead)?.replace(/\D/g, '')
      if (!phone) return conv.messages.length > 0 // keep if has messages even without phone
      if (seenPhones.has(phone)) return false
      seenPhones.add(phone)
      return true
    })

    // Limit: show all with messages + max 30 without messages
    const withMessages = deduped.filter(c => c.messages.length > 0)
    const withoutMessages = deduped.filter(c => c.messages.length === 0).slice(0, 30)
    return [...withMessages, ...withoutMessages]
  }, [leads, messages])

  // ── Filtered conversations ────────────────────────────────────────────────

  const filteredConversations = useMemo(() => {
    let filtered = conversations

    // Filter by AI mode
    if (filterMode === 'con_ia') {
      filtered = filtered.filter(c => c.aiEnabled)
    } else if (filterMode === 'sin_ia') {
      filtered = filtered.filter(c => !c.aiEnabled)
    }

    // Filter by search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c => {
        const name = getLeadName(c.lead).toLowerCase()
        const phone = getLeadPhone(c.lead).toLowerCase()
        return name.includes(term) || phone.includes(term)
      })
    }

    return filtered
  }, [conversations, filterMode, searchTerm])

  // ── Selected conversation ─────────────────────────────────────────────────

  const selectedConv = useMemo(() => {
    if (!selectedLeadId) return null
    return conversations.find(c => c.leadId === String(selectedLeadId)) || null
  }, [conversations, selectedLeadId])

  // ── Scroll to bottom when messages change ─────────────────────────────────

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedConv?.messages?.length])

  // ── Focus input when conversation selected ────────────────────────────────

  useEffect(() => {
    if (selectedLeadId && inputRef.current) {
      inputRef.current.focus()
    }
  }, [selectedLeadId])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSelectConversation = (leadId) => {
    setSelectedLeadId(leadId)
    setInputText('')
    setShowMobileChat(true)
  }

  const handleToggleAI = (leadId) => {
    const current = getAIState(leadId)
    setAIState(leadId, !current)

    // Add a system message locally
    const systemMsg = {
      id: `sys_${Date.now()}`,
      lead_id: leadId,
      message: current ? 'IA desactivada para esta conversacion' : 'IA activada para esta conversacion',
      direction: 'system',
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, systemMsg])
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedLeadId || sending) return

    const text = inputText.trim()
    setInputText('')
    setSending(true)

    // Optimistic local message
    const tempMsg = {
      id: `temp_${Date.now()}`,
      lead_id: selectedLeadId,
      message: text,
      direction: 'outgoing',
      status: 'sending',
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      await api.post('/api/outreach/whatsapp/generate', {
        leadId: selectedLeadId,
        message: text,
      })
      // Update the temp message status
      setMessages(prev =>
        prev.map(m => m.id === tempMsg.id ? { ...m, status: 'sent' } : m)
      )
    } catch (err) {
      console.error('Error sending:', err)
      setMessages(prev =>
        prev.map(m => m.id === tempMsg.id ? { ...m, status: 'failed' } : m)
      )
    } finally {
      setSending(false)
    }
  }

  const handleGenerateAI = async () => {
    if (!selectedLeadId || generatingAI) return
    setGeneratingAI(true)

    try {
      const { data } = await api.post('/api/outreach/whatsapp/generate', {
        leadId: selectedLeadId,
      })
      const generated = data.message || data.content || data.text || ''
      if (generated) {
        setInputText(generated)
        inputRef.current?.focus()
      }
    } catch (err) {
      console.error('Error generating AI message:', err)
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleConnectWhatsApp = async () => {
    if (connecting) return
    setConnecting(true)
    try {
      const { data } = await api.post('/api/outreach/whatsapp/connect')
      const qr = data.qrCode || data.qr
      if (qr) setQrCode(qr)
      if (data.status) setWhatsappStatus(data.status)
      if (data.phone) setWhatsappStatus('connected')

      // Start polling for status updates
      const interval = setInterval(async () => {
        try {
          const res = await api.get('/api/outreach/whatsapp/status')
          const s = res.data
          if (s.qrCode) setQrCode(s.qrCode)
          if (s.status) setWhatsappStatus(s.status)
          if (s.status === 'connected') {
            clearInterval(interval)
            setConnecting(false)
          }
        } catch {}
      }, 3000)
      // Stop polling after 2 min
      setTimeout(() => { clearInterval(interval); setConnecting(false) }, 120000)
      return // don't setConnecting(false) yet
    } catch (err) {
      console.error('Error connecting WhatsApp:', err)
    }
    setConnecting(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalConversaciones = conversations.filter(c => c.messages.length > 0).length
    const totalMensajes = messages.filter(m => m.direction !== 'system').length
    const conIA = conversations.filter(c => c.aiEnabled).length
    return { totalConversaciones, totalMensajes, conIA }
  }, [conversations, messages])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isAdmin) return null

  return (
    <div style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column', background: '#f0f2f5', margin: '-32px', borderRadius: 12, overflow: 'hidden' }}>
      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 20px',
        background: '#075E54',
        color: '#fff',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 18, marginRight: 'auto' }}>
          <MessageCircle size={22} />
          WhatsApp Inbox
        </div>
        <StatPill icon={<MessageSquare size={14} />} label="Conversaciones" value={stats.totalConversaciones} />
        <StatPill icon={<Send size={14} />} label="Mensajes" value={stats.totalMensajes} />
        <StatPill icon={<Bot size={14} />} label="Con IA" value={stats.conIA} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 20,
          background: whatsappStatus === 'connected' ? 'rgba(37,211,102,0.25)' : 'rgba(255,255,255,0.15)',
          fontSize: 13,
          fontWeight: 500,
        }}>
          {whatsappStatus === 'connected'
            ? <><Wifi size={14} /> Conectado</>
            : <><WifiOff size={14} /> Desconectado</>
          }
        </div>
      </div>

      {/* ── WhatsApp Connection Banner ────────────────────────────────────── */}
      {whatsappStatus !== 'connected' && (
        <div style={{
          padding: '16px 20px',
          background: '#fff3cd',
          borderBottom: '1px solid #ffc107',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 600, color: '#856404', marginBottom: 4 }}>
              WhatsApp no conectado
            </div>
            <div style={{ fontSize: 13, color: '#856404' }}>
              Conecta tu WhatsApp para enviar y recibir mensajes en tiempo real.
              Mientras tanto, puedes generar mensajes con IA.
            </div>
          </div>
          <button
            onClick={handleConnectWhatsApp}
            disabled={connecting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: '#25D366',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: connecting ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {connecting ? <Loader2 size={16} className="spin" /> : <QrCode size={16} />}
            {connecting ? 'Conectando...' : 'Conectar WhatsApp'}
          </button>
          {qrCode && (
            <div style={{
              padding: 12,
              background: '#fff',
              borderRadius: 8,
              border: '1px solid #ddd',
            }}>
              <img src={qrCode} alt="QR Code" style={{ width: 150, height: 150 }} />
              <div style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: 4 }}>
                Escanea con WhatsApp
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main Layout ───────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* ── Left Sidebar ──────────────────────────────────────────────── */}
        <div style={{
          width: '35%',
          minWidth: 280,
          maxWidth: 420,
          borderRight: '1px solid #e0e0e0',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          ...(showMobileChat ? { display: 'none' } : {}),
        }}
          className="inbox-sidebar"
        >
          {/* Search + New */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: '#f0f2f5',
                borderRadius: 8,
              }}>
                <Search size={16} color="#999" />
                <input
                  type="text"
                  placeholder="Buscar conversacion..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    flex: 1,
                    fontSize: 14,
                    color: '#333',
                  }}
                />
              </div>
              <button
                onClick={() => setShowNewChat(true)}
                title="Nueva Conversacion"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 38,
                  height: 38,
                  background: '#25D366',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'con_ia', label: 'Con IA' },
                { key: 'sin_ia', label: 'Sin IA' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterMode(f.key)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: 12,
                    fontWeight: filterMode === f.key ? 600 : 400,
                    background: filterMode === f.key ? '#e7fce9' : '#f5f5f5',
                    color: filterMode === f.key ? '#075E54' : '#666',
                    border: filterMode === f.key ? '1px solid #25D366' : '1px solid transparent',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {leadsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Loader2 size={24} color="#25D366" className="spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#999', fontSize: 14 }}>
                {searchTerm ? 'Sin resultados' : 'No hay conversaciones'}
              </div>
            ) : (
              filteredConversations.map(conv => (
                <ConversationItem
                  key={conv.leadId}
                  conv={conv}
                  isActive={selectedLeadId === conv.leadId}
                  onClick={() => handleSelectConversation(conv.leadId)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right Panel (Chat) ────────────────────────────────────────── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#efeae2',
          minWidth: 0,
          ...((!showMobileChat && !selectedLeadId) ? {} : {}),
        }}
          className="inbox-chat"
        >
          {!selectedConv ? (
            /* Empty state */
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              color: '#8696a0',
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: '#f0f2f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MessageCircle size={36} color="#bfc8d0" />
              </div>
              <div style={{ fontSize: 20, fontWeight: 300, color: '#41525d' }}>
                WhatsApp Inbox
              </div>
              <div style={{ fontSize: 14, textAlign: 'center', maxWidth: 400, lineHeight: 1.5 }}>
                Selecciona una conversacion del panel izquierdo o inicia una nueva para comenzar a enviar mensajes.
              </div>
            </div>
          ) : (
            <>
              {/* ── Chat Header ──────────────────────────────────────────── */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                background: '#075E54',
                color: '#fff',
                flexShrink: 0,
              }}>
                {/* Back button (mobile) */}
                <button
                  onClick={() => { setShowMobileChat(false); setSelectedLeadId(null) }}
                  className="mobile-back-btn"
                  style={{
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: 0,
                    marginRight: 4,
                  }}
                >
                  <ArrowLeft size={20} />
                </button>

                {/* Avatar */}
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#25D366',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {getLeadName(selectedConv.lead).charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getLeadName(selectedConv.lead)}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {getLeadPhone(selectedConv.lead)}
                  </div>
                </div>

                {/* AI Toggle */}
                <button
                  onClick={() => handleToggleAI(selectedConv.leadId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    background: getAIState(selectedConv.leadId) ? 'rgba(37,211,102,0.3)' : 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    whiteSpace: 'nowrap',
                  }}
                  title={getAIState(selectedConv.leadId) ? 'Desactivar IA' : 'Activar IA'}
                >
                  {getAIState(selectedConv.leadId)
                    ? <><ToggleRight size={16} /> IA Auto</>
                    : <><ToggleLeft size={16} /> IA Off</>
                  }
                </button>

                {/* View Lead */}
                <button
                  onClick={() => navigate(`/admin/lead/${selectedConv.leadId}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Eye size={14} />
                  Ver Lead
                </button>
              </div>

              {/* ── Messages Area ─────────────────────────────────────────── */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1\' fill=\'%23d4ccbb\' opacity=\'0.3\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill=\'url(%23p)\' width=\'200\' height=\'200\'/%3E%3C/svg%3E")',
              }}>
                {selectedConv.messages.length === 0 ? (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.9)',
                      padding: '12px 20px',
                      borderRadius: 10,
                      fontSize: 13,
                      color: '#667781',
                      textAlign: 'center',
                    }}>
                      No hay mensajes aun. Escribe un mensaje o genera uno con IA.
                    </div>
                  </div>
                ) : (
                  selectedConv.messages.map(msg => (
                    <ChatBubble key={msg.id} msg={msg} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ── AI Badge (when AI is ON) ──────────────────────────────── */}
              {getAIState(selectedConv.leadId) && (
                <div style={{
                  padding: '6px 16px',
                  background: '#e7fce9',
                  borderTop: '1px solid #c8eacc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: '#075E54',
                  flexShrink: 0,
                }}>
                  <Bot size={14} />
                  <span style={{ fontWeight: 500 }}>La IA responde automaticamente</span>
                  <span style={{ opacity: 0.6 }}>| Puedes enviar mensajes manuales tambien</span>
                </div>
              )}

              {/* ── Input Area ────────────────────────────────────────────── */}
              <div style={{
                padding: '10px 16px',
                background: '#f0f2f5',
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                flexShrink: 0,
              }}>
                {/* Attach (future) */}
                <button
                  disabled
                  title="Adjuntar (proximamente)"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'transparent',
                    color: '#8696a0',
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    opacity: 0.5,
                  }}
                >
                  <Paperclip size={18} />
                </button>

                {/* Generate AI */}
                <button
                  onClick={handleGenerateAI}
                  disabled={generatingAI}
                  title="Generar mensaje con IA"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: 'none',
                    background: generatingAI ? '#ccc' : '#25D366',
                    color: '#fff',
                    cursor: generatingAI ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {generatingAI ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                </button>

                {/* Text input */}
                <div style={{
                  flex: 1,
                  background: '#fff',
                  borderRadius: 20,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 36,
                }}>
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje..."
                    rows={1}
                    style={{
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                      flex: 1,
                      fontSize: 14,
                      lineHeight: '20px',
                      maxHeight: 100,
                      overflow: 'auto',
                      fontFamily: 'inherit',
                      background: 'transparent',
                    }}
                  />
                </div>

                {/* Send */}
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || sending}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: 'none',
                    background: inputText.trim() ? '#25D366' : '#ccc',
                    color: '#fff',
                    cursor: inputText.trim() && !sending ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.2s',
                  }}
                >
                  {sending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Inline Styles ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        .inbox-sidebar {
          display: flex !important;
        }

        /* Scrollbar styling */
        .inbox-sidebar > div:last-child::-webkit-scrollbar,
        .inbox-chat > div:nth-child(2)::-webkit-scrollbar {
          width: 6px;
        }
        .inbox-sidebar > div:last-child::-webkit-scrollbar-thumb,
        .inbox-chat > div:nth-child(2)::-webkit-scrollbar-thumb {
          background: #c5c5c5;
          border-radius: 3px;
        }
        .inbox-sidebar > div:last-child::-webkit-scrollbar-track,
        .inbox-chat > div:nth-child(2)::-webkit-scrollbar-track {
          background: transparent;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .inbox-sidebar {
            width: 100% !important;
            max-width: 100% !important;
            border-right: none !important;
          }
          .inbox-chat {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10;
          }
          .mobile-back-btn {
            display: flex !important;
          }
        }
      `}</style>

      {/* ── New Chat Modal ──────────────────────────────────────────────── */}
      {showNewChat && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setShowNewChat(false)} />
          <div style={{
            position: 'relative', background: '#fff', borderRadius: 16,
            width: 400, maxWidth: '90vw', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 4 }}>
              Nueva Conversacion
            </h3>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
              Ingresa un numero de WhatsApp para iniciar una conversacion
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 4 }}>
                Nombre (opcional)
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nombre del contacto"
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 4 }}>
                Numero de WhatsApp *
              </label>
              <input
                type="text"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="+5491112345678"
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                Incluir codigo de pais (ej: +54 para Argentina)
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowNewChat(false); setNewPhone(''); setNewName('') }}
                style={{
                  padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8,
                  background: '#fff', color: '#666', fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!newPhone.trim()) return
                  const phone = newPhone.replace(/[^\d+]/g, '')
                  // Add as a new conversation locally
                  const newConv = {
                    leadId: `manual-${Date.now()}`,
                    leadName: newName || phone,
                    leadPhone: phone,
                    messages: [],
                    aiEnabled: true,
                    isManual: true,
                  }
                  setSelectedLeadId(newConv.leadId)
                  setShowNewChat(false)
                  setNewPhone('')
                  setNewName('')
                  // Open WhatsApp link directly
                  window.open(`https://wa.me/${phone.replace('+', '')}`, '_blank')
                }}
                disabled={!newPhone.trim()}
                style={{
                  padding: '10px 20px', border: 'none', borderRadius: 8,
                  background: newPhone.trim() ? '#25D366' : '#ccc',
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: newPhone.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Iniciar Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 12px',
      background: 'rgba(255,255,255,0.12)',
      borderRadius: 20,
      fontSize: 13,
    }}>
      {icon}
      <span style={{ opacity: 0.8 }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  )
}

function ConversationItem({ conv, isActive, onClick }) {
  const name = getLeadName(conv.lead)
  const phone = getLeadPhone(conv.lead)
  const aiOn = getAIState(conv.leadId)

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        cursor: 'pointer',
        background: isActive ? '#e7fce9' : '#fff',
        borderBottom: '1px solid #f5f5f5',
        borderLeft: isActive ? '3px solid #25D366' : '3px solid transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f5f6f6' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#fff' }}
    >
      {/* Avatar */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: isActive ? '#25D366' : '#dfe5e7',
        color: isActive ? '#fff' : '#8696a0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 17,
        fontWeight: 700,
        flexShrink: 0,
      }}>
        {name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <div style={{
            fontWeight: 600,
            fontSize: 14,
            color: '#111b21',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            marginRight: 8,
          }}>
            {name}
          </div>
          <div style={{ fontSize: 11, color: conv.unreadCount > 0 ? '#25D366' : '#8696a0', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {conv.lastTime ? formatTime(conv.lastTime) : ''}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            fontSize: 13,
            color: '#667781',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            marginRight: 8,
          }}>
            {conv.lastMessage
              ? truncate(conv.lastMessage)
              : <span style={{ fontStyle: 'italic', opacity: 0.6 }}>{phone}</span>
            }
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {aiOn && (
              <div style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Bot size={10} color="#fff" />
              </div>
            )}
            {conv.unreadCount > 0 && (
              <div style={{
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                background: '#25D366',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 5px',
              }}>
                {conv.unreadCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ msg }) {
  const direction = msg.direction || 'outgoing'
  const text = msg.message || msg.content || msg.body || ''
  const time = formatMessageTime(msg.created_at || msg.createdAt || msg.sent_at)
  const status = msg.status

  // System message
  if (direction === 'system') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '8px 0',
      }}>
        <div style={{
          background: 'rgba(225,218,208,0.88)',
          color: '#54656f',
          fontSize: 12,
          padding: '5px 12px',
          borderRadius: 8,
          maxWidth: '80%',
          textAlign: 'center',
          boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
        }}>
          {text}
        </div>
      </div>
    )
  }

  const isOutgoing = direction === 'outgoing' || direction === 'OUTGOING' || direction === 'sent'
  const isIncoming = !isOutgoing

  return (
    <div style={{
      display: 'flex',
      justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
      marginBottom: 2,
    }}>
      <div style={{
        maxWidth: '65%',
        minWidth: 80,
        padding: '6px 8px 4px 9px',
        borderRadius: isOutgoing ? '8px 0 8px 8px' : '0 8px 8px 8px',
        background: isOutgoing ? '#dcf8c6' : '#fff',
        boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
        position: 'relative',
      }}>
        <div style={{
          fontSize: 14,
          color: '#111b21',
          lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {text}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 3,
          marginTop: 2,
        }}>
          <span style={{ fontSize: 11, color: '#8696a0' }}>{time}</span>
          {isOutgoing && (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              {status === 'sending' && <Loader2 size={12} color="#8696a0" className="spin" />}
              {status === 'sent' && <Check size={13} color="#8696a0" />}
              {status === 'delivered' && <CheckCheck size={13} color="#8696a0" />}
              {status === 'read' && <CheckCheck size={13} color="#53bdeb" />}
              {status === 'failed' && <span style={{ color: '#e74c3c', fontSize: 11 }}>Error</span>}
              {!status && <Check size={13} color="#8696a0" />}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
