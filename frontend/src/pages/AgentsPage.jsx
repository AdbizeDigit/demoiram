import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Bot, Play, Square, Plus, Trash2, Search, Users, Building2,
  Star, Landmark, Rocket, Briefcase, Loader2, Radio, X, ChevronDown,
  Mail, MessageCircle, Globe, User, MapPin, Sparkles, AlertCircle,
  CheckCircle, Eye, Zap, ArrowRight, Clock, ChevronRight, ChevronLeft,
  ExternalLink, Phone, Send, Pencil,
} from 'lucide-react'
import api from '../services/api'

// ── Constants ───────────────────────────────────────────────────────────────────

const TARGET_TYPES = [
  { value: 'business_owners', label: 'Empresarios', icon: Building2, color: 'blue' },
  { value: 'celebrities', label: 'Celebridades', icon: Star, color: 'amber' },
  { value: 'politicians', label: 'Politicos', icon: Landmark, color: 'purple' },
  { value: 'startups', label: 'Startups', icon: Rocket, color: 'emerald' },
  { value: 'enterprises', label: 'Corporativos', icon: Briefcase, color: 'indigo' },
]

const COUNTRIES = [
  'Mexico','Argentina','Colombia','Chile','Peru','Ecuador','Uruguay','Paraguay',
  'Bolivia','Venezuela','Costa Rica','Panama','Guatemala','Republica Dominicana',
  'Honduras','El Salvador','Nicaragua','Cuba','España','Estados Unidos','Brasil','Canada',
]

const TOOLS = [
  { id: 'wikipedia', label: 'Wikipedia', icon: Globe },
  { id: 'ai_network', label: 'IA Red', icon: Users },
  { id: 'scraping', label: 'Scraping', icon: Eye },
  { id: 'hunter', label: 'Hunter', icon: Zap },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
]

const STATUS_CFG = {
  idle: { label: 'Inactivo', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  running: { label: 'En Vivo', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  completed: { label: 'Completado', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  error: { label: 'Error', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

const ACT = {
  started: { icon: Play, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  stopped: { icon: Square, color: 'text-gray-600', bg: 'bg-gray-50' },
  phase: { icon: Zap, color: 'text-indigo-700', bg: 'bg-indigo-100' },
  tool_active: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  searching: { icon: Search, color: 'text-blue-600', bg: 'bg-blue-50' },
  search_results: { icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50' },
  analyzing: { icon: Eye, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  found_target: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  no_contact: { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-50' },
  network_mapped: { icon: Users, color: 'text-indigo-700', bg: 'bg-indigo-100' },
  enriching: { icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-50' },
  hunter_found: { icon: Zap, color: 'text-orange-700', bg: 'bg-orange-100' },
  email_sent: { icon: Mail, color: 'text-blue-700', bg: 'bg-blue-100' },
  email_error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
  email_invalid: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
  whatsapp_sent: { icon: MessageCircle, color: 'text-green-700', bg: 'bg-green-100' },
  whatsapp_found: { icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-50' },
  whatsapp_error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
  generating_message: { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
  warning: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  completed: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
  error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
}

function timeAgo(d) {
  if (!d) return ''
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 5) return 'Ahora'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ── Create Modal ────────────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreate, avatars, editData }) {
  const isEdit = !!editData
  const [form, setForm] = useState({
    name: editData?.name || '',
    avatar_id: editData?.avatar_id || '',
    target_type: editData?.target_type || 'business_owners',
    country: editData?.country || 'Mexico',
    search_keywords: editData?.search_keywords ? (Array.isArray(editData.search_keywords) ? editData.search_keywords.join(', ') : editData.search_keywords) : '',
    strategy: editData?.strategy || '',
    max_contacts_per_run: editData?.max_contacts_per_run || 10,
    tools: editData?.tools || TOOLS.map(t => t.id),
  })
  const [saving, setSaving] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMsg, setAiMsg] = useState('')
  const [showAi, setShowAi] = useState(false)

  const aiComplete = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true); setAiMsg('')
    try {
      const { data } = await api.post('/api/agent-runner/ai-autocomplete', { prompt: aiPrompt, current_form: form })
      if (data.success) {
        const f = data.form || data
        setForm(p => ({ ...p, ...(f.name && { name: f.name }), ...(f.target_type && { target_type: f.target_type }),
          ...(f.country && { country: f.country }),
          ...(f.search_keywords !== undefined && { search_keywords: Array.isArray(f.search_keywords) ? f.search_keywords.join(', ') : (f.search_keywords || '') }),
          ...(f.strategy && { strategy: f.strategy }), ...(f.max_contacts_per_run && { max_contacts_per_run: f.max_contacts_per_run }) }))
        setAiMsg(data.ai_message || f.ai_message || 'Listo')
      }
    } catch { setAiMsg('Error. Intenta de nuevo.') }
    setAiLoading(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onCreate({ ...form, search_keywords: form.search_keywords ? form.search_keywords.split(',').map(k => k.trim()).filter(Boolean) : [], tools: form.tools, country: form.country })
      onClose()
    } catch { setSaving(false) }
  }

  const inp = 'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-base font-bold flex items-center gap-2"><Bot className="w-5 h-5 text-blue-600" /> {isEdit ? 'Editar Agente' : 'Nuevo Agente'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        {/* AI */}
        <div className="px-4 pt-3">
          <button type="button" onClick={() => setShowAi(!showAi)} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed text-sm transition-all ${showAi ? 'border-purple-300 bg-purple-50' : 'border-gray-200 hover:border-purple-200'}`}>
            <Sparkles className="w-4 h-4 text-purple-500" /><span className="font-semibold text-purple-700">Completar con IA</span>
            <ChevronDown className={`w-3 h-3 ml-auto text-purple-400 transition-transform ${showAi ? 'rotate-180' : ''}`} />
          </button>
          {showAi && (
            <div className="mt-2 flex gap-2">
              <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), aiComplete())}
                placeholder="Ej: Buscar politicos de Colombia..." className={`${inp} flex-1`} disabled={aiLoading} />
              <button onClick={aiComplete} disabled={aiLoading || !aiPrompt.trim()} className="px-3 py-2 rounded-lg bg-purple-600 text-white disabled:opacity-50">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              </button>
            </div>
          )}
          {aiMsg && <p className="mt-1 text-xs text-purple-600 px-1">{aiMsg}</p>}
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Ej: Hunter LATAM" className={inp} required />
            </div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Pais</label>
              <select value={form.country} onChange={e => setForm(f => ({...f, country: e.target.value}))} className={inp}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Avatar</label>
            <select value={form.avatar_id} onChange={e => setForm(f => ({...f, avatar_id: e.target.value}))} className={inp}>
              <option value="">Adbize generico</option>
              {avatars.map(a => <option key={a.id} value={a.id}>{a.name} — {a.role}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Objetivo</label>
            <div className="flex flex-wrap gap-1.5">
              {TARGET_TYPES.map(t => {
                const I = t.icon; const s = form.target_type === t.value
                return <button key={t.value} type="button" onClick={() => setForm(f => ({...f, target_type: t.value}))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${s ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <I className="w-3 h-3" />{t.label}
                </button>
              })}
            </div>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Keywords <span className="text-gray-400">(opcional)</span></label>
            <input value={form.search_keywords} onChange={e => setForm(f => ({...f, search_keywords: e.target.value}))} placeholder="fintech, ecommerce, SaaS..." className={inp} />
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Estrategia</label>
            <textarea value={form.strategy} onChange={e => setForm(f => ({...f, strategy: e.target.value}))} rows={2} placeholder="Enfocarse en..." className={`${inp} resize-none`} />
          </div>
          <div className="flex items-center gap-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Max contactos</label>
              <input type="number" min={1} max={50} value={form.max_contacts_per_run} onChange={e => setForm(f => ({...f, max_contacts_per_run: parseInt(e.target.value)||10}))} className={`${inp} w-20`} />
            </div>
            <div className="flex-1"><label className="block text-xs font-medium text-gray-500 mb-1">Herramientas</label>
              <div className="flex flex-wrap gap-1">
                {TOOLS.map(t => { const I = t.icon; const on = form.tools.includes(t.id)
                  return <button key={t.id} type="button" onClick={() => setForm(f => ({...f, tools: on ? f.tools.filter(x => x !== t.id) : [...f.tools, t.id]}))}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-all ${on ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400'}`}>
                    <I className="w-2.5 h-2.5" />{t.label}
                  </button>
                })}
              </div>
            </div>
          </div>
          <button type="submit" disabled={saving || !form.name.trim()} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isEdit ? 'Guardar Cambios' : 'Crear Agente'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Contact Detail Panel ────────────────────────────────────────────────────────

function ContactDetail({ contact, onClose }) {
  if (!contact) return null
  const msgs = contact.messages || []
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-sm">{contact.name || 'Contacto'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
              {(contact.name || '?')[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{contact.name}</p>
              <p className="text-xs text-gray-500">{contact.sector?.replace('ai-agent:', '') || ''}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {contact.email && <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-xs"><Mail className="w-3.5 h-3.5 text-blue-600" /><span className="text-blue-800">{contact.email}</span></div>}
            {contact.phone && <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg text-xs"><Phone className="w-3.5 h-3.5 text-green-600" /><span className="text-green-800">{contact.phone}</span></div>}
            {contact.social_linkedin && <a href={contact.social_linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg text-xs hover:bg-indigo-100"><ExternalLink className="w-3.5 h-3.5 text-indigo-600" /><span className="text-indigo-800 truncate">{contact.social_linkedin}</span></a>}
            {contact.website && <a href={contact.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs hover:bg-gray-100"><Globe className="w-3.5 h-3.5 text-gray-600" /><span className="text-gray-700 truncate">{contact.website}</span></a>}
          </div>
          {/* Messages */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Mensajes ({msgs.length})</p>
            {msgs.length === 0 && <p className="text-xs text-gray-400">Sin mensajes aun</p>}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {msgs.map((m, i) => (
                <div key={m.id || i} className={`p-3 rounded-xl text-xs ${m.channel === 'WHATSAPP' ? 'bg-green-50 border border-green-100' : 'bg-blue-50 border border-blue-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold flex items-center gap-1">
                      {m.channel === 'WHATSAPP' ? <MessageCircle className="w-3 h-3 text-green-600" /> : <Mail className="w-3 h-3 text-blue-600" />}
                      {m.channel} — {m.status}
                    </span>
                    <span className="text-gray-400">{m.sent_at ? timeAgo(m.sent_at) : 'Pendiente'}</span>
                  </div>
                  {m.subject && <p className="font-medium text-gray-700 mb-1">{m.subject}</p>}
                  <p className="text-gray-600 leading-relaxed">{m.body?.slice(0, 300)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Network Map Visual ──────────────────────────────────────────────────────────

function NetworkView({ networks, onSelectPerson }) {
  if (!networks || networks.length === 0) return (
    <div className="text-center py-8 text-gray-400">
      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-xs">El mapa de red aparecera cuando el agente encuentre targets</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {networks.map(net => {
        const data = typeof net.network === 'string' ? JSON.parse(net.network) : net.network
        const contacts = data.contacts || []
        return (
          <div key={net.id} className="bg-white border border-gray-100 rounded-2xl p-4">
            {/* Root node */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {(net.root_name || '?')[0]}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">{net.root_name}</p>
                <p className="text-[11px] text-gray-500">{net.root_role} · {net.country}</p>
              </div>
            </div>
            {/* Network branches */}
            <div className="ml-5 border-l-2 border-indigo-200 pl-4 space-y-2">
              {contacts.map((c, i) => (
                <button key={i} onClick={() => onSelectPerson(c.name)}
                  className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 transition-all group">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-all">
                    {(c.name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{c.role || c.relationship || ''} · {c.org || ''}</p>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-indigo-500" />
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Live Feed ───────────────────────────────────────────────────────────────────

function LiveFeed({ agentId, isRunning }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const lastTs = useRef(null)

  const load = useCallback(async (since) => {
    try {
      const { data } = await api.get(`/api/agent-runner/${agentId}/activity`, { params: { limit: 100, ...(since && { since }) } })
      const fresh = data.logs || []
      if (fresh.length > 0) {
        setLogs(prev => {
          const ids = new Set(prev.map(l => l.id))
          const neu = fresh.filter(l => !ids.has(l.id))
          if (!neu.length) return prev
          const merged = [...neu, ...prev].slice(0, 200)
          lastTs.current = merged[0]?.created_at
          return merged
        })
      }
    } catch {}
    setLoading(false)
  }, [agentId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!isRunning) return
    const i = setInterval(() => load(lastTs.current), 2000)
    return () => clearInterval(i)
  }, [isRunning, load])

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
  if (!logs.length) return <div className="text-center py-8 text-gray-400"><Radio className="w-6 h-6 mx-auto mb-2 opacity-30" /><p className="text-xs">Ejecuta el agente para ver actividad</p></div>

  return (
    <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
      {isRunning && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200 mb-2">
          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
          <span className="text-xs font-medium text-emerald-700">En vivo</span>
        </div>
      )}
      {logs.map(l => {
        const c = ACT[l.action] || ACT.searching
        const I = c.icon
        return (
          <div key={l.id} className={`flex gap-2 px-2.5 py-2 rounded-xl ${c.bg} transition-all`}>
            <I className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${c.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-800 leading-relaxed">{l.detail}</p>
              <div className="flex gap-2 mt-0.5">
                {l.target_name && <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{l.target_name}</span>}
                <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(l.created_at)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Contacts Grid ───────────────────────────────────────────────────────────────

function ContactsGrid({ agentId, onSelect }) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/agent-runner/${agentId}/contacts`).then(({ data }) => {
      setContacts(data.contacts || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [agentId])

  // Poll for updates
  useEffect(() => {
    const i = setInterval(() => {
      api.get(`/api/agent-runner/${agentId}/contacts`).then(({ data }) => setContacts(data.contacts || [])).catch(() => {})
    }, 5000)
    return () => clearInterval(i)
  }, [agentId])

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
  if (!contacts.length) return <div className="text-center py-8 text-gray-400"><Users className="w-6 h-6 mx-auto mb-2 opacity-30" /><p className="text-xs">Los contactos apareceran aqui</p></div>

  return (
    <div className="grid grid-cols-1 gap-2">
      {contacts.map(c => {
        const msgs = c.messages || []
        const sent = msgs.filter(m => m.status === 'SENT').length
        const replied = msgs.filter(m => m.status === 'REPLIED').length
        return (
          <button key={c.id} onClick={() => onSelect(c)} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:shadow-md hover:border-gray-200 transition-all text-left w-full">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {(c.name || '?')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{c.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {c.email && <span className="text-[10px] text-blue-600 flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />Email</span>}
                {c.phone && <span className="text-[10px] text-green-600 flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />Tel</span>}
                {c.social_linkedin && <span className="text-[10px] text-indigo-600 flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" />LI</span>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              {sent > 0 && <span className="text-[10px] text-blue-600 font-medium">{sent} enviado{sent > 1 ? 's' : ''}</span>}
              {replied > 0 && <span className="block text-[10px] text-emerald-600 font-semibold">{replied} respuesta{replied > 1 ? 's' : ''}</span>}
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          </button>
        )
      })}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [agents, setAgents] = useState([])
  const [avatars, setAvatars] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [tab, setTab] = useState('feed') // feed | network | contacts
  const [selectedContact, setSelectedContact] = useState(null)
  const [networks, setNetworks] = useState([])
  const [editAgent, setEditAgent] = useState(null)

  const loadAgents = useCallback(async () => {
    try { const { data } = await api.get('/api/agent-runner'); setAgents(data.agents || []) } catch {} setLoading(false)
  }, [])

  useEffect(() => {
    loadAgents()
    api.get('/api/avatars').then(({ data }) => setAvatars(data.avatars || data || [])).catch(() => {})
  }, [loadAgents])

  // Poll agents status
  useEffect(() => {
    const has = agents.some(a => a.status === 'running')
    if (!has) return
    const i = setInterval(loadAgents, 3000)
    return () => clearInterval(i)
  }, [agents, loadAgents])

  // Load networks when agent selected
  useEffect(() => {
    if (!selectedId) return
    api.get(`/api/agent-runner/${selectedId}/network`).then(({ data }) => setNetworks(data.networks || [])).catch(() => {})
    const i = setInterval(() => {
      api.get(`/api/agent-runner/${selectedId}/network`).then(({ data }) => setNetworks(data.networks || [])).catch(() => {})
    }, 5000)
    return () => clearInterval(i)
  }, [selectedId])

  const selected = agents.find(a => a.id === selectedId)

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Agentes Autonomos</h1>
            <p className="text-[11px] text-gray-500">IA que busca, mapea redes y contacta automaticamente</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-purple-700">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: agents list */}
        <div className="w-[300px] border-r bg-white overflow-y-auto p-3 space-y-2 flex-shrink-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          : agents.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-xs text-gray-500">Crea tu primer agente</p>
            </div>
          ) : agents.map(a => {
            const t = TARGET_TYPES.find(x => x.value === a.target_type) || TARGET_TYPES[0]
            const TI = t.icon
            const st = STATUS_CFG[a.status] || STATUS_CFG.idle
            const sel = selectedId === a.id
            const run = a.status === 'running'
            return (
              <div key={a.id} onClick={() => setSelectedId(a.id)}
                className={`rounded-xl border-2 p-3 cursor-pointer transition-all ${sel ? 'border-blue-400 shadow-md bg-blue-50/30' : 'border-gray-100 hover:border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {a.avatar_photo ? <img src={a.avatar_photo} className="w-7 h-7 rounded-lg object-cover" />
                    : <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-white" /></div>}
                    <div>
                      <p className="text-xs font-bold text-gray-900 leading-tight">{a.name}</p>
                      <p className="text-[10px] text-gray-400">{a.country || 'Mexico'}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>
                    <span className="relative flex h-1.5 w-1.5">{run && <span className={`animate-ping absolute h-full w-full rounded-full ${st.dot} opacity-75`} />}<span className={`relative rounded-full h-1.5 w-1.5 ${st.dot}`} /></span>
                    {st.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium flex items-center gap-0.5"><TI className="w-2.5 h-2.5" />{t.label}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-2">
                  <span><strong className="text-gray-900">{a.contacts_found || 0}</strong> encontrados</span>
                  <span><strong className="text-gray-900">{a.messages_sent || 0}</strong> enviados</span>
                </div>
                <div className="flex gap-1.5">
                  {run ? (
                    <button onClick={e => { e.stopPropagation(); api.post(`/api/agent-runner/${a.id}/stop`).then(loadAgents) }}
                      className="flex-1 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold hover:bg-red-100 flex items-center justify-center gap-1"><Square className="w-3 h-3" />Detener</button>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); api.post(`/api/agent-runner/${a.id}/start`).then(loadAgents); setSelectedId(a.id); setTab('feed') }}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 flex items-center justify-center gap-1"><Play className="w-3 h-3" />Ejecutar</button>
                  )}
                  <button onClick={e => { e.stopPropagation(); setEditAgent(a) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50"><Pencil className="w-3 h-3" /></button>
                  <button onClick={e => { e.stopPropagation(); api.delete(`/api/agent-runner/${a.id}`).then(loadAgents); if(selectedId===a.id) setSelectedId(null) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Main: tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selected ? (
            <>
              {/* Tab bar */}
              <div className="flex items-center gap-1 px-4 py-2 bg-white border-b flex-shrink-0">
                {[
                  { id: 'feed', label: 'Actividad en Vivo', icon: Radio },
                  { id: 'network', label: 'Mapa de Red', icon: Users },
                  { id: 'contacts', label: 'Contactos', icon: Mail },
                ].map(t => {
                  const I = t.icon; const sel = tab === t.id
                  return <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sel ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <I className="w-3.5 h-3.5" />{t.label}
                    {t.id === 'network' && networks.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">{networks.length}</span>}
                  </button>
                })}
                <div className="ml-auto text-[11px] text-gray-400">
                  {selected.name} · {selected.country || 'Mexico'}
                </div>
              </div>
              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4">
                {tab === 'feed' && <LiveFeed agentId={selected.id} isRunning={selected.status === 'running'} />}
                {tab === 'network' && <NetworkView networks={networks} onSelectPerson={(name) => { setTab('contacts') }} />}
                {tab === 'contacts' && <ContactsGrid agentId={selected.id} onSelect={setSelectedContact} />}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Bot className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Selecciona un agente</p>
              <p className="text-xs mt-1">o crea uno nuevo para empezar</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={async d => { await api.post('/api/agent-runner', d); loadAgents() }} avatars={avatars} />}
      {editAgent && <CreateModal editData={editAgent} onClose={() => setEditAgent(null)} onCreate={async d => { await api.put(`/api/agent-runner/${editAgent.id}`, d); setEditAgent(null); loadAgents() }} avatars={avatars} />}
      {selectedContact && <ContactDetail contact={selectedContact} onClose={() => setSelectedContact(null)} />}
    </div>
  )
}
