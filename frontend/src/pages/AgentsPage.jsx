import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Bot, Play, Square, Plus, Trash2, Search, Users, Building2,
  Star, Landmark, Rocket, Briefcase, Loader2, Radio, X, ChevronDown,
  Mail, MessageCircle, Globe, User, MapPin, Sparkles, AlertCircle,
  CheckCircle, Eye, Zap, ArrowRight, Clock,
} from 'lucide-react'
import api from '../services/api'

const TARGET_TYPES = [
  { value: 'business_owners', label: 'Dueños de Empresas', icon: Building2, color: 'blue' },
  { value: 'celebrities', label: 'Celebridades / Influencers', icon: Star, color: 'amber' },
  { value: 'politicians', label: 'Politicos / Gobierno', icon: Landmark, color: 'purple' },
  { value: 'startups', label: 'Startups / Emprendedores', icon: Rocket, color: 'emerald' },
  { value: 'enterprises', label: 'Grandes Empresas', icon: Briefcase, color: 'indigo' },
]

const STATUS_CONFIG = {
  idle: { label: 'Inactivo', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  running: { label: 'En Ejecucion', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  completed: { label: 'Completado', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  error: { label: 'Error', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

const ACTION_ICONS = {
  started: { icon: Play, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  stopped: { icon: Square, color: 'text-gray-600', bg: 'bg-gray-50' },
  searching: { icon: Search, color: 'text-blue-600', bg: 'bg-blue-50' },
  search_results: { icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50' },
  analyzing: { icon: Eye, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  found_target: { icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  no_contact: { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-50' },
  generating_message: { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
  message_ready: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  email_queued: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
  whatsapp_queued: { icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-50' },
  completed: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
  error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 5) return 'Justo ahora'
  if (secs < 60) return `Hace ${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `Hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  return `Hace ${Math.floor(hrs / 24)}d`
}

// ── Create Agent Modal ─────────────────────────────────────────────────────────
function CreateAgentModal({ onClose, onCreate, avatars }) {
  const [form, setForm] = useState({
    name: '',
    avatar_id: '',
    target_type: 'business_owners',
    search_keywords: '',
    strategy: '',
    max_contacts_per_run: 10,
  })
  const [saving, setSaving] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMessage, setAiMessage] = useState('')
  const [showAiChat, setShowAiChat] = useState(false)

  const handleAiAutocomplete = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    setAiMessage('')
    try {
      const { data } = await api.post('/api/agent-runner/ai-autocomplete', {
        prompt: aiPrompt,
        current_form: form,
      })
      if (data.success) {
        const f = data.form || data
        setForm(prev => ({
          ...prev,
          ...(f.name && { name: f.name }),
          ...(f.avatar_id !== undefined && { avatar_id: f.avatar_id || '' }),
          ...(f.target_type && { target_type: f.target_type }),
          ...(f.search_keywords !== undefined && {
            search_keywords: Array.isArray(f.search_keywords) ? f.search_keywords.join(', ') : (f.search_keywords || '')
          }),
          ...(f.strategy && { strategy: f.strategy }),
          ...(f.max_contacts_per_run && { max_contacts_per_run: f.max_contacts_per_run }),
        }))
        setAiMessage(data.ai_message || f.ai_message || 'Formulario completado con IA')
      }
    } catch (err) {
      setAiMessage('Error al procesar con IA. Intenta de nuevo.')
    }
    setAiLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onCreate({
        ...form,
        search_keywords: form.search_keywords
          ? form.search_keywords.split(',').map(k => k.trim()).filter(Boolean)
          : [],
      })
      onClose()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Nuevo Agente</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        {/* AI Autocomplete Chat */}
        <div className="px-5 pt-4">
          <button
            type="button"
            onClick={() => setShowAiChat(!showAiChat)}
            className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all ${
              showAiChat
                ? 'border-purple-300 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-purple-700">Completar con IA</span>
              <span className="text-[11px] text-purple-400">— Decile que queres y completa todo automatico</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform ${showAiChat ? 'rotate-180' : ''}`} />
          </button>

          {showAiChat && (
            <div className="mt-3 p-3 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAiAutocomplete() } }}
                  placeholder="Ej: Quiero buscar startups fintech en Mexico que necesiten una app..."
                  className="flex-1 bg-white border border-purple-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 placeholder:text-gray-400"
                  disabled={aiLoading}
                />
                <button
                  type="button"
                  onClick={handleAiAutocomplete}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all flex-shrink-0"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                </button>
              </div>
              {aiMessage && (
                <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-white/80 rounded-lg border border-purple-100">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-purple-700 leading-relaxed">{aiMessage}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del Agente</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Hunter de Startups"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              required
            />
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Avatar Asignado</label>
            <select
              value={form.avatar_id}
              onChange={e => setForm(f => ({ ...f, avatar_id: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Sin avatar (usa Adbize generico)</option>
              {avatars.map(a => (
                <option key={a.id} value={a.id}>{a.name} — {a.role}</option>
              ))}
            </select>
          </div>

          {/* Target Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Tipo de Objetivo</label>
            <div className="grid grid-cols-2 gap-2">
              {TARGET_TYPES.map(t => {
                const Icon = t.icon
                const sel = form.target_type === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, target_type: t.value }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all text-sm ${
                      sel
                        ? `border-${t.color}-400 bg-${t.color}-50 text-${t.color}-700`
                        : 'border-gray-100 hover:border-gray-200 text-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Keywords Personalizados <span className="text-gray-400">(opcional, separados por coma)</span>
            </label>
            <input
              type="text"
              value={form.search_keywords}
              onChange={e => setForm(f => ({ ...f, search_keywords: e.target.value }))}
              placeholder="Ej: fintech Mexico, ecommerce LATAM, startup SaaS"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Strategy */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estrategia / Instrucciones</label>
            <textarea
              value={form.strategy}
              onChange={e => setForm(f => ({ ...f, strategy: e.target.value }))}
              rows={2}
              placeholder="Ej: Enfocarse en empresas que estan levantando ronda de inversion..."
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          {/* Max contacts */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Max Contactos por Ejecucion</label>
            <input
              type="number"
              min={1}
              max={50}
              value={form.max_contacts_per_run}
              onChange={e => setForm(f => ({ ...f, max_contacts_per_run: parseInt(e.target.value) || 10 }))}
              className="w-24 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            {saving ? 'Creando...' : 'Crear Agente'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Live Activity Feed ─────────────────────────────────────────────────────────
function LiveActivityFeed({ agentId, isRunning }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const feedRef = useRef(null)
  const lastTimestamp = useRef(null)

  const loadLogs = useCallback(async (since) => {
    try {
      const params = { limit: 80 }
      if (since) params.since = since
      const { data } = await api.get(`/api/agent-runner/${agentId}/activity`, { params })
      const newLogs = data.logs || []
      if (newLogs.length > 0) {
        setLogs(prev => {
          const existingIds = new Set(prev.map(l => l.id))
          const fresh = newLogs.filter(l => !existingIds.has(l.id))
          if (fresh.length === 0) return prev
          const merged = [...fresh, ...prev].slice(0, 200)
          lastTimestamp.current = merged[0]?.created_at
          return merged
        })
      }
    } catch {}
    setLoading(false)
  }, [agentId])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Poll every 2s when running
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      loadLogs(lastTimestamp.current)
    }, 2000)
    return () => clearInterval(interval)
  }, [isRunning, loadLogs])

  // Auto-scroll
  useEffect(() => {
    if (feedRef.current && isRunning) {
      feedRef.current.scrollTop = 0
    }
  }, [logs.length, isRunning])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando actividad...
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Radio className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Sin actividad aun</p>
        <p className="text-xs mt-1">Presiona Play para iniciar el agente</p>
      </div>
    )
  }

  return (
    <div ref={feedRef} className="space-y-1 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
      {isRunning && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200 mb-2 animate-pulse">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-medium text-emerald-700">Agente en ejecucion — actualizacion en vivo</span>
        </div>
      )}
      {logs.map(log => {
        const config = ACTION_ICONS[log.action] || ACTION_ICONS.searching
        const Icon = config.icon
        return (
          <div key={log.id} className={`flex gap-2.5 p-2.5 rounded-xl ${config.bg} transition-all duration-300`}>
            <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center`}>
              <Icon className={`w-3.5 h-3.5 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-800 leading-relaxed">{log.detail}</p>
              <div className="flex items-center gap-3 mt-1">
                {log.target_name && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    <User className="w-2.5 h-2.5" />{log.target_name}
                  </span>
                )}
                {log.target_company && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Building2 className="w-2.5 h-2.5" />{log.target_company}
                  </span>
                )}
                <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{timeAgo(log.created_at)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Agent Card ─────────────────────────────────────────────────────────────────
function AgentCard({ agent, onStart, onStop, onDelete, onSelect, isSelected }) {
  const target = TARGET_TYPES.find(t => t.value === agent.target_type) || TARGET_TYPES[0]
  const TargetIcon = target.icon
  const statusConf = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle
  const isRunning = agent.status === 'running'

  return (
    <div
      onClick={() => onSelect(agent.id)}
      className={`bg-white rounded-2xl border-2 p-4 transition-all cursor-pointer ${
        isSelected ? 'border-blue-400 shadow-lg shadow-blue-100' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {agent.avatar_photo ? (
            <img src={agent.avatar_photo} alt="" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-gray-900">{agent.name}</h3>
            {agent.avatar_name && (
              <p className="text-[11px] text-gray-500">Avatar: {agent.avatar_name}</p>
            )}
          </div>
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusConf.color}`}>
          <span className="relative flex h-1.5 w-1.5">
            {isRunning && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusConf.dot} opacity-75`} />}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusConf.dot}`} />
          </span>
          {statusConf.label}
        </span>
      </div>

      {/* Target + Stats */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-${target.color}-50 text-${target.color}-700 border border-${target.color}-200`}>
          <TargetIcon className="w-3 h-3" />{target.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-gray-50 rounded-xl">
          <p className="text-lg font-bold text-gray-900">{agent.contacts_found || 0}</p>
          <p className="text-[10px] text-gray-500">Encontrados</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-xl">
          <p className="text-lg font-bold text-gray-900">{agent.messages_sent || 0}</p>
          <p className="text-[10px] text-gray-500">Mensajes</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-xl">
          <p className="text-lg font-bold text-gray-900">{agent.responses_received || 0}</p>
          <p className="text-[10px] text-gray-500">Respuestas</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isRunning ? (
          <button
            onClick={e => { e.stopPropagation(); onStop(agent.id) }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
          >
            <Square className="w-3.5 h-3.5" /> Detener
          </button>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onStart(agent.id) }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> Ejecutar
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete(agent.id) }}
          className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const [agents, setAgents] = useState([])
  const [avatars, setAvatars] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const loadAgents = useCallback(async () => {
    try {
      const { data } = await api.get('/api/agent-runner')
      setAgents(data.agents || [])
    } catch (err) {
      console.error('Error loading agents:', err)
    }
    setLoading(false)
  }, [])

  const loadAvatars = useCallback(async () => {
    try {
      const { data } = await api.get('/api/avatars')
      setAvatars(data.avatars || data || [])
    } catch {}
  }, [])

  useEffect(() => {
    loadAgents()
    loadAvatars()
  }, [loadAgents, loadAvatars])

  // Poll agents status every 3s when any is running
  useEffect(() => {
    const hasRunning = agents.some(a => a.status === 'running')
    if (!hasRunning) return
    const interval = setInterval(loadAgents, 3000)
    return () => clearInterval(interval)
  }, [agents, loadAgents])

  const handleCreate = async (data) => {
    const { data: res } = await api.post('/api/agent-runner', data)
    if (res.success) {
      await loadAgents()
    }
  }

  const handleStart = async (id) => {
    await api.post(`/api/agent-runner/${id}/start`)
    await loadAgents()
    setSelectedId(id)
  }

  const handleStop = async (id) => {
    await api.post(`/api/agent-runner/${id}/stop`)
    await loadAgents()
  }

  const handleDelete = async (id) => {
    await api.delete(`/api/agent-runner/${id}`)
    if (selectedId === id) setSelectedId(null)
    await loadAgents()
  }

  const selectedAgent = agents.find(a => a.id === selectedId)

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Agentes Autonomos</h1>
            <p className="text-xs text-gray-500">Agentes de IA que buscan oportunidades de negocio automaticamente</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="w-4 h-4" /> Nuevo Agente
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Agents list */}
        <div className="w-[380px] border-r border-gray-100 bg-white overflow-y-auto p-4 space-y-3 flex-shrink-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-16">
              <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500 font-medium">No hay agentes</p>
              <p className="text-xs text-gray-400 mt-1">Crea tu primer agente para empezar a buscar oportunidades</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 flex items-center gap-1.5 mx-auto px-4 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Crear Agente
              </button>
            </div>
          ) : (
            agents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onStart={handleStart}
                onStop={handleStop}
                onDelete={handleDelete}
                onSelect={setSelectedId}
                isSelected={selectedId === agent.id}
              />
            ))
          )}
        </div>

        {/* Right: Live Activity Feed */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedAgent ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selectedAgent.avatar_photo ? (
                    <img src={selectedAgent.avatar_photo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Actividad en Vivo — {selectedAgent.name}</h2>
                    <p className="text-[11px] text-gray-500">
                      {selectedAgent.avatar_name && `Avatar: ${selectedAgent.avatar_name} · `}
                      Objetivo: {TARGET_TYPES.find(t => t.value === selectedAgent.target_type)?.label}
                    </p>
                  </div>
                </div>
                {selectedAgent.status === 'running' ? (
                  <button
                    onClick={() => handleStop(selectedAgent.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100"
                  >
                    <Square className="w-3 h-3" /> Detener
                  </button>
                ) : (
                  <button
                    onClick={() => handleStart(selectedAgent.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                  >
                    <Play className="w-3 h-3" /> Ejecutar
                  </button>
                )}
              </div>
              <LiveActivityFeed
                agentId={selectedAgent.id}
                isRunning={selectedAgent.status === 'running'}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Radio className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Selecciona un agente</p>
              <p className="text-xs mt-1">para ver su actividad en vivo</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateAgentModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          avatars={avatars}
        />
      )}
    </div>
  )
}
