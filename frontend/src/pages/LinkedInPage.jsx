import { useState, useEffect, useCallback } from 'react'
import {
  Linkedin, Zap, Send, Copy, Check, Loader2, Calendar, FileText,
  MessageSquare, Users, RefreshCw, Star, TrendingUp, Clock, Eye,
  Plus, Trash2, Save, X, Hash, Edit3, Link, ToggleLeft, ToggleRight,
  ChevronRight, User, Briefcase, Image, Settings, Shield, Play,
  AlertCircle, Target,
} from 'lucide-react'
import api from '../services/api'

const POST_STYLES = [
  { id: 'informativo', label: 'Informativo' },
  { id: 'storytelling', label: 'Storytelling' },
  { id: 'opinion', label: 'Opinion' },
  { id: 'tutorial', label: 'Tutorial' },
  { id: 'encuesta', label: 'Encuesta' },
]

const TOPICS = [
  'Como la IA esta transformando las PyMEs',
  'Automatizacion de procesos con IA',
  'Chatbots inteligentes para ventas',
  'Machine Learning aplicado a negocios',
  'Ventaja competitiva con IA en 2026',
  'Vision artificial para control de calidad',
  'El futuro del trabajo con IA',
  'LinkedIn como herramienta de ventas B2B',
]

export default function LinkedInPage() {
  const [profiles, setProfiles] = useState([])
  const [avatars, setAvatars] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', avatar_id: '', linkedin_url: '', username: '', headline: '' })
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('posts')

  // Post state
  const [postTopic, setPostTopic] = useState('')
  const [postStyle, setPostStyle] = useState('informativo')
  const [genPost, setGenPost] = useState('')
  const [genHashtags, setGenHashtags] = useState([])
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState('')

  // Calendar
  const [calendar, setCalendar] = useState([])
  const [calLoading, setCalLoading] = useState(false)

  // DM
  const [dm, setDm] = useState({ name: '', role: '', company: '', purpose: '' })
  const [dmMsg, setDmMsg] = useState('')
  const [dmGen, setDmGen] = useState(false)

  // Automation
  const [autoStatus, setAutoStatus] = useState(null)
  const [optimizing, setOptimizing] = useState(false)
  const [optimization, setOptimization] = useState(null)
  const [imgPrompt, setImgPrompt] = useState(null)
  const [imgLoading, setImgLoading] = useState(false)

  // LinkedIn connection
  const [liConnected, setLiConnected] = useState(false)
  const [liConnecting, setLiConnecting] = useState(false)
  const [liEmail, setLiEmail] = useState('')
  const [liPass, setLiPass] = useState('')
  const [liError, setLiError] = useState('')
  const [showLogin, setShowLogin] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, a] = await Promise.all([api.get('/api/linkedin-profiles'), api.get('/api/avatars')])
      setProfiles(p.data.profiles || [])
      setAvatars(a.data.avatars || a.data || [])
      if (!selected && (p.data.profiles || []).length) setSelected(p.data.profiles[0])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createProfile() {
    setSaving(true)
    try {
      await api.post('/api/linkedin-profiles', form)
      setShowCreate(false)
      setForm({ name: '', avatar_id: '', linkedin_url: '', username: '', headline: '' })
      load()
    } catch {}
    setSaving(false)
  }

  async function deleteProfile(id) {
    if (!confirm('Eliminar perfil?')) return
    await api.delete(`/api/linkedin-profiles/${id}`)
    if (selected?.id === id) setSelected(null)
    load()
  }

  async function toggleAuto(field) {
    if (!selected) return
    const updated = { ...selected, [field]: !selected[field] }
    setSelected(updated)
    setProfiles(prev => prev.map(p => p.id === selected.id ? updated : p))
    await api.put(`/api/linkedin-profiles/${selected.id}`, updated)
  }

  const avatarForProfile = selected ? avatars.find(a => a.id === selected.avatar_id) : null

  // Load automation + connection status
  useEffect(() => {
    if (!selected?.id) return
    api.get(`/api/linkedin-profiles/${selected.id}/automation/status`).then(({ data }) => setAutoStatus(data)).catch(() => {})
    api.get(`/api/linkedin-profiles/${selected.id}/connection-status`).then(({ data }) => setLiConnected(data.connected)).catch(() => setLiConnected(false))
  }, [selected?.id])

  async function genPostAI() {
    const avId = selected?.avatar_id || avatars[0]?.id
    if (!avId || !postTopic.trim()) return
    setGenerating(true)
    try {
      const { data } = await api.post(`/api/avatars/${avId}/linkedin/generate-post`, { topic: postTopic, style: postStyle })
      if (data.post) { setGenPost(data.post); setGenHashtags(data.hashtags || []) }
    } catch {}
    setGenerating(false)
  }

  async function genCalAI() {
    const avId = selected?.avatar_id || avatars[0]?.id
    if (!avId) return
    setCalLoading(true)
    try {
      const { data } = await api.post(`/api/avatars/${avId}/linkedin/content-calendar`)
      if (data.calendar) setCalendar(data.calendar)
    } catch {}
    setCalLoading(false)
  }

  async function genDmAI() {
    const avId = selected?.avatar_id || avatars[0]?.id
    if (!avId || !dm.name.trim()) return
    setDmGen(true)
    try {
      const { data } = await api.post(`/api/avatars/${avId}/linkedin/generate-message`, dm)
      if (data.message) setDmMsg(data.message)
    } catch {}
    setDmGen(false)
  }

  async function savePost() {
    if (!selected?.id || !genPost) return
    await api.post(`/api/linkedin-profiles/${selected.id}/save-post`, { post: genPost, hashtags: genHashtags, status: 'draft' })
    setSelected(prev => prev ? { ...prev, posts: [...(prev.posts || []), { post: genPost, hashtags: genHashtags, status: 'draft', createdAt: new Date().toISOString() }] } : prev)
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Linkedin className="w-6 h-6 text-blue-600" /> LinkedIn Manager</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Gestiona perfiles, genera contenido y automatiza tu presencia</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo Perfil
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Sidebar: Profile List */}
        <div className="space-y-2">
          {profiles.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <Linkedin className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Crea tu primer perfil</p>
            </div>
          )}
          {profiles.map(p => (
            <button key={p.id} onClick={() => { setSelected(p); setTab('posts') }}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${selected?.id === p.id ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
              <div className="flex items-center gap-3">
                {p.avatar_photo ? (
                  <img src={p.avatar_photo} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">{(p.name || '?')[0]}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{p.headline || p.avatar_role || 'Sin headline'}</p>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2">
                {p.auto_post && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Auto Post</span>}
                {p.auto_dm && <span className="text-[9px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Auto DM</span>}
                {p.auto_connect && <span className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">Auto Connect</span>}
                <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">{(p.posts || []).length} posts</span>
              </div>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="xl:col-span-3">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Linkedin className="w-16 h-16 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Selecciona o crea un perfil para empezar</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Profile Header */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {selected.avatar_photo ? (
                      <img src={selected.avatar_photo} className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-200" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">{(selected.name || '?')[0]}</div>
                    )}
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                      <p className="text-sm text-gray-500">{selected.headline || selected.avatar_role}</p>
                      {selected.linkedin_url && <a href={selected.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"><Link className="w-3 h-3" />{selected.username || 'LinkedIn'}</a>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Auto toggles */}
                    {[
                      { key: 'auto_post', label: 'Auto Post', color: 'emerald' },
                      { key: 'auto_dm', label: 'Auto DM', color: 'indigo' },
                      { key: 'auto_connect', label: 'Auto Connect', color: 'purple' },
                    ].map(t => (
                      <button key={t.key} onClick={() => toggleAuto(t.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors ${
                          selected[t.key] ? `bg-${t.color}-100 text-${t.color}-700` : 'bg-gray-100 text-gray-400'
                        }`}>
                        {selected[t.key] ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {t.label}
                      </button>
                    ))}
                    {/* LinkedIn connection status */}
                    {liConnected ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Conectado
                      </span>
                    ) : (
                      <button onClick={() => setShowLogin(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-bold hover:bg-blue-700">
                        <Linkedin className="w-3 h-3" /> Conectar LinkedIn
                      </button>
                    )}
                    <button onClick={() => { setForm({ name: selected.name, avatar_id: selected.avatar_id || '', linkedin_url: selected.linkedin_url || '', username: selected.username || '', headline: selected.headline || '' }); setShowCreate('edit') }}
                      className="p-2 text-gray-300 hover:text-blue-500 transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => deleteProfile(selected.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[
                  { key: 'posts', label: 'Posts', icon: Zap },
                  { key: 'calendar', label: 'Calendario', icon: Calendar },
                  { key: 'dm', label: 'Mensajes', icon: MessageSquare },
                  { key: 'profile', label: 'Optimizar Perfil', icon: Target },
                  { key: 'automation', label: 'Automatizacion', icon: Settings },
                  { key: 'saved', label: `(${(selected.posts || []).length})`, icon: FileText },
                ].map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${tab === t.key ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <t.icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                ))}
              </div>

              {/* Tab: Posts */}
              {tab === 'posts' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tema del post</label>
                    <input type="text" value={postTopic} onChange={e => setPostTopic(e.target.value)}
                      placeholder="Ej: Como la IA esta transformando las PyMEs..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {TOPICS.slice(0, 5).map((t, i) => (
                        <button key={i} onClick={() => setPostTopic(t)} className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100">{t.slice(0, 35)}...</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {POST_STYLES.map(s => (
                      <button key={s.id} onClick={() => setPostStyle(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${postStyle === s.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s.label}</button>
                    ))}
                  </div>
                  <button onClick={genPostAI} disabled={generating || !postTopic.trim()}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Generar Post
                  </button>

                  {genPost && (
                    <div className="space-y-3">
                      <div className="border-2 border-blue-200 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                          {selected.avatar_photo ? <img src={selected.avatar_photo} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">{(selected.name||'?')[0]}</div>}
                          <div><p className="text-sm font-bold text-gray-900">{selected.name}</p><p className="text-[10px] text-gray-400">{selected.headline || avatarForProfile?.role}</p></div>
                        </div>
                        <textarea value={genPost} onChange={e => setGenPost(e.target.value)} rows={8} className="w-full text-sm text-gray-800 leading-relaxed resize-none focus:outline-none" />
                        {genHashtags.length > 0 && <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100">{genHashtags.map((h,i) => <span key={i} className="text-xs text-blue-600">#{h}</span>)}</div>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => copy(genPost + '\n\n' + genHashtags.map(h=>'#'+h).join(' '), 'post')}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200">
                          {copied === 'post' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />} {copied === 'post' ? 'Copiado!' : 'Copiar'}
                        </button>
                        <button onClick={savePost} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-200">
                          <Save className="w-3.5 h-3.5" /> Guardar Borrador
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Calendar */}
              {tab === 'calendar' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Calendario de Contenido Semanal</h3>
                    <button onClick={genCalAI} disabled={calLoading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-40">
                      {calLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Generar Semana
                    </button>
                  </div>
                  {calendar.length === 0 ? (
                    <div className="text-center py-10"><Calendar className="w-12 h-12 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">Genera un plan semanal de contenido</p></div>
                  ) : (
                    <div className="space-y-3">
                      {calendar.map((d, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="w-16 text-center">
                            <p className="text-xs font-bold text-purple-600">{d.day}</p>
                            <span className="text-[9px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{d.type}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{d.topic}</p>
                            <p className="text-xs text-gray-400 italic mt-0.5">{d.hook}</p>
                          </div>
                          <button onClick={() => { setPostTopic(d.topic); setTab('posts') }}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Crear Post
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: DM */}
              {tab === 'dm' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Generar Mensaje Directo con IA</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                      <input type="text" value={dm.name} onChange={e => setDm(p=>({...p,name:e.target.value}))} placeholder="Juan Perez" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Cargo</label>
                      <input type="text" value={dm.role} onChange={e => setDm(p=>({...p,role:e.target.value}))} placeholder="CEO / Gerente" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Empresa</label>
                      <input type="text" value={dm.company} onChange={e => setDm(p=>({...p,company:e.target.value}))} placeholder="Empresa SA" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Proposito</label>
                      <input type="text" value={dm.purpose} onChange={e => setDm(p=>({...p,purpose:e.target.value}))} placeholder="Networking / Vender" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
                  </div>
                  <button onClick={genDmAI} disabled={dmGen || !dm.name.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
                    {dmGen ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Generar Mensaje
                  </button>
                  {dmMsg && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <textarea value={dmMsg} onChange={e => setDmMsg(e.target.value)} rows={4} className="w-full text-sm text-gray-800 bg-transparent resize-none focus:outline-none leading-relaxed" />
                      <button onClick={() => copy(dmMsg, 'dm')} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-xs font-medium hover:bg-gray-50 border border-gray-200">
                        {copied === 'dm' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />} {copied === 'dm' ? 'Copiado!' : 'Copiar Mensaje'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Saved */}
              {/* Tab: Profile Optimization */}
              {tab === 'profile' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Optimizar Perfil con IA</h3>
                    <button onClick={async () => {
                      if (!selected?.id) return
                      setOptimizing(true)
                      try {
                        const { data } = await api.post(`/api/linkedin-profiles/${selected.id}/optimize`)
                        if (data.optimization) setOptimization(data.optimization)
                      } catch {}
                      setOptimizing(false)
                    }} disabled={optimizing}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-40">
                      {optimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Optimizar
                    </button>
                  </div>

                  {optimization ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <p className="text-xs font-bold text-blue-700 mb-1">Headline Optimizado</p>
                        <p className="text-sm text-gray-800">{optimization.headline}</p>
                        <button onClick={() => copy(optimization.headline, 'hl')} className="mt-1 text-[10px] text-blue-600 hover:text-blue-800">
                          {copied === 'hl' ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-xl">
                        <p className="text-xs font-bold text-emerald-700 mb-1">Seccion "Acerca de"</p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{optimization.about}</p>
                        <button onClick={() => copy(optimization.about, 'about')} className="mt-1 text-[10px] text-emerald-600 hover:text-emerald-800">
                          {copied === 'about' ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-600 mb-2">Keywords Recomendadas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(optimization.keywords || []).map((k, i) => <span key={i} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">{k}</span>)}
                        </div>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-xl">
                        <p className="text-xs font-bold text-amber-700 mb-1">Sugerencia de Contenido</p>
                        <p className="text-sm text-gray-700">{optimization.contentSuggestion}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Target className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">La IA analizara tu perfil y generara sugerencias de optimizacion</p>
                    </div>
                  )}

                  {/* Image Generator for Posts */}
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Image className="w-4 h-4 text-purple-500" /> Generar Imagen para Post
                    </h3>
                    {genPost ? (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Basada en tu ultimo post generado:</p>
                        <button onClick={async () => {
                          setImgLoading(true)
                          try {
                            const { data } = await api.post(`/api/linkedin-profiles/${selected.id}/generate-image`, { postContent: genPost, style: 'professional' })
                            if (data.imagePrompt) setImgPrompt(data.imagePrompt)
                          } catch {}
                          setImgLoading(false)
                        }} disabled={imgLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-40">
                          {imgLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />} Generar Prompt de Imagen
                        </button>
                        {imgPrompt && (
                          <div className="mt-3 p-4 bg-purple-50 rounded-xl">
                            <p className="text-xs font-bold text-purple-700 mb-1">Prompt para generar imagen</p>
                            <p className="text-sm text-gray-700">{imgPrompt.prompt}</p>
                            <div className="flex gap-1.5 mt-2">
                              {(imgPrompt.colors || []).map((c, i) => <span key={i} className="text-[10px] px-2 py-0.5 bg-white rounded-full">{c}</span>)}
                            </div>
                            <button onClick={() => copy(imgPrompt.prompt, 'img')} className="mt-2 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800">
                              {copied === 'img' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied === 'img' ? 'Copiado!' : 'Copiar para usar en DALL-E, Midjourney, etc'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Genera un post primero para crear una imagen</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Automation */}
              {tab === 'automation' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" /> Limites Anti-Ban de LinkedIn
                    </h3>
                    <button onClick={async () => {
                      try {
                        const { data } = await api.get(`/api/linkedin-profiles/${selected.id}/automation/status`)
                        setAutoStatus(data)
                      } catch {}
                    }} className="text-xs text-gray-500 hover:text-gray-700"><RefreshCw className="w-3 h-3 inline" /> Actualizar</button>
                  </div>

                  {autoStatus ? (
                    <div className="space-y-4">
                      {/* Daily limits */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Conexiones', used: autoStatus.dailyCounts?.connections || 0, max: autoStatus.limits?.connectionsPerDay || 25, color: 'blue' },
                          { label: 'Mensajes', used: autoStatus.dailyCounts?.messages || 0, max: autoStatus.limits?.messagesPerDay || 30, color: 'indigo' },
                          { label: 'Posts', used: autoStatus.dailyCounts?.posts || 0, max: autoStatus.limits?.postsPerDay || 2, color: 'emerald' },
                          { label: 'Vistas', used: autoStatus.dailyCounts?.views || 0, max: autoStatus.limits?.profileViewsPerDay || 50, color: 'amber' },
                          { label: 'Likes', used: autoStatus.dailyCounts?.likes || 0, max: autoStatus.limits?.likesPerDay || 50, color: 'pink' },
                          { label: 'Comentarios', used: autoStatus.dailyCounts?.comments || 0, max: autoStatus.limits?.commentsPerDay || 15, color: 'purple' },
                        ].map((l, i) => (
                          <div key={i} className="p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-medium text-gray-500">{l.label}</span>
                              <span className="text-xs font-bold text-gray-700">{l.used}/{l.max}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full bg-${l.color}-500`} style={{ width: `${Math.min(100, (l.used / l.max) * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Safety rules */}
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Reglas de Seguridad Activas</p>
                        <ul className="text-[11px] text-amber-700 space-y-1">
                          <li>Delay aleatorio de 3-12s entre cada accion</li>
                          <li>Sesion maxima de 45 min, luego 15 min de descanso</li>
                          <li>Max 25 conexiones/dia, 30 DMs/dia, 2 posts/dia</li>
                          <li>Sin actividad entre 22:00 y 07:00</li>
                          <li>Patron de uso que imita comportamiento humano</li>
                        </ul>
                      </div>

                      {/* Queue info */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-sm text-gray-600">{autoStatus.queueSize || 0} acciones en cola</span>
                        {autoStatus.queueSize > 0 && (
                          <button onClick={async () => {
                            await api.delete(`/api/linkedin-profiles/${selected.id}/automation/queue`)
                            setAutoStatus(s => s ? { ...s, queueSize: 0 } : s)
                          }} className="text-xs text-red-500 hover:text-red-700">Limpiar cola</button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Settings className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Cargando estado de automatizacion...</p>
                    </div>
                  )}
                </div>
              )}

              {tab === 'saved' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  {(selected.posts || []).length === 0 ? (
                    <div className="text-center py-10"><FileText className="w-12 h-12 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">Los posts guardados apareceran aqui</p></div>
                  ) : (
                    <div className="space-y-3">
                      {(selected.posts || []).slice().reverse().map((p, i) => (
                        <div key={i} className="p-4 bg-gray-50 rounded-xl">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{p.post?.slice(0, 300)}{p.post?.length > 300 ? '...' : ''}</p>
                          {(p.hashtags || []).length > 0 && <div className="flex gap-1.5 mt-2">{p.hashtags.map((h,j) => <span key={j} className="text-xs text-blue-600">#{h}</span>)}</div>}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
                            <span className="text-[10px] text-gray-400">{p.createdAt ? new Date(p.createdAt).toLocaleString('es-AR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}</span>
                            <div className="flex gap-2">
                              <button onClick={() => { setGenPost(p.post); setGenHashtags(p.hashtags || []); setTab('posts') }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                              <button onClick={() => copy(p.post + '\n\n' + (p.hashtags||[]).map(h=>'#'+h).join(' '), 'saved'+i)} className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                                {copied === 'saved'+i ? 'Copiado!' : 'Copiar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Linkedin className="w-5 h-5 text-blue-600" /> {showCreate === 'edit' ? 'Editar Perfil' : 'Nuevo Perfil'}</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Nombre del perfil</label>
                <input type="text" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Ej: Gian Franco Koch" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Vincular Avatar</label>
                <select value={form.avatar_id} onChange={e => setForm(p=>({...p,avatar_id:e.target.value}))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                  <option value="">Sin avatar</option>
                  {avatars.map(a => <option key={a.id} value={a.id}>{a.name} - {a.role}</option>)}
                </select></div>
              <div><label className="text-xs text-gray-500 mb-1 block">URL de LinkedIn</label>
                <input type="text" value={form.linkedin_url} onChange={e => setForm(p=>({...p,linkedin_url:e.target.value}))} placeholder="https://linkedin.com/in/usuario" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block">Username</label>
                  <input type="text" value={form.username} onChange={e => setForm(p=>({...p,username:e.target.value}))} placeholder="@usuario" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Headline</label>
                  <input type="text" value={form.headline} onChange={e => setForm(p=>({...p,headline:e.target.value}))} placeholder="CEO en Adbize" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
              <button onClick={async () => {
                  if (showCreate === 'edit' && selected?.id) {
                    setSaving(true)
                    try { await api.put(`/api/linkedin-profiles/${selected.id}`, form); load() } catch {}
                    setSaving(false); setShowCreate(false)
                  } else { createProfile() }
                }} disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : showCreate === 'edit' ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showCreate === 'edit' ? 'Guardar' : 'Crear Perfil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LinkedIn Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowLogin(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Linkedin className="w-5 h-5 text-blue-600" /> Conectar LinkedIn</h3>
              <button onClick={() => setShowLogin(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[11px] text-amber-700 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Tus credenciales se guardan encriptadas. La sesion se mantiene con cookies para no volver a loguear.</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email de LinkedIn</label>
                <input type="email" value={liEmail} onChange={e => setLiEmail(e.target.value)} placeholder="tu@email.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Password</label>
                <input type="password" value={liPass} onChange={e => setLiPass(e.target.value)} placeholder="********"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>
              {liError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{liError}</p>}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowLogin(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
              <button
                onClick={async () => {
                  if (!selected?.id || !liEmail || !liPass) return
                  setLiConnecting(true); setLiError('')
                  try {
                    const { data } = await api.post(`/api/linkedin-profiles/${selected.id}/connect`, { email: liEmail, password: liPass })
                    if (data.success) {
                      setLiConnected(true); setShowLogin(false); setLiEmail(''); setLiPass('')
                    } else {
                      setLiError(data.message || 'Error al conectar')
                    }
                  } catch (err) {
                    setLiError(err.response?.data?.error || 'Error de conexion')
                  }
                  setLiConnecting(false)
                }}
                disabled={liConnecting || !liEmail || !liPass}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                {liConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Linkedin className="w-4 h-4" />} Conectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
