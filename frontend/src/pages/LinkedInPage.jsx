import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Linkedin, Zap, Send, Copy, Check, Loader2, Calendar, FileText,
  MessageSquare, Users, RefreshCw, Star, TrendingUp, Clock, Eye,
  ChevronRight, Plus, Trash2, Edit3, Save, X, Search, Hash,
} from 'lucide-react'
import api from '../services/api'

const POST_STYLES = [
  { id: 'informativo', label: 'Informativo', desc: 'Datos y tendencias del sector' },
  { id: 'storytelling', label: 'Storytelling', desc: 'Historia personal o caso de exito' },
  { id: 'opinion', label: 'Opinion', desc: 'Punto de vista sobre un tema' },
  { id: 'tutorial', label: 'Tutorial', desc: 'Paso a paso de como hacer algo' },
  { id: 'encuesta', label: 'Encuesta', desc: 'Pregunta para generar engagement' },
]

const TOPIC_IDEAS = [
  'Como la IA esta transformando las PyMEs argentinas',
  'Automatizacion de procesos: por donde empezar',
  '5 formas de usar chatbots para vender mas',
  'Machine Learning aplicado a la atencion al cliente',
  'El futuro del trabajo con inteligencia artificial',
  'Vision artificial para control de calidad',
  'Como conseguir clientes con LinkedIn',
  'Ventaja competitiva con IA en 2026',
]

function Card({ title, icon: Icon, children, className = '', action }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
      {title && (
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-gray-400" />}
            <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          </div>
          {action}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

export default function LinkedInPage() {
  const navigate = useNavigate()
  const [avatars, setAvatars] = useState([])
  const [selectedAvatar, setSelectedAvatar] = useState(null)
  const [loading, setLoading] = useState(true)

  // Post generator
  const [postTopic, setPostTopic] = useState('')
  const [postStyle, setPostStyle] = useState('informativo')
  const [generatedPost, setGeneratedPost] = useState('')
  const [postHashtags, setPostHashtags] = useState([])
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Calendar
  const [calendar, setCalendar] = useState([])
  const [calLoading, setCalLoading] = useState(false)

  // DM generator
  const [dmTarget, setDmTarget] = useState({ name: '', role: '', company: '', purpose: '' })
  const [dmMessage, setDmMessage] = useState('')
  const [dmGenerating, setDmGenerating] = useState(false)
  const [dmCopied, setDmCopied] = useState(false)

  // Post history
  const [savedPosts, setSavedPosts] = useState([])

  // Load avatars
  useEffect(() => {
    api.get('/api/avatars').then(({ data }) => {
      const avs = data.avatars || data || []
      setAvatars(avs)
      if (avs.length > 0) setSelectedAvatar(avs[0])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Load saved posts when avatar changes
  useEffect(() => {
    if (!selectedAvatar?.id) return
    api.get(`/api/avatars/${selectedAvatar.id}/linkedin/posts`).then(({ data }) => {
      setSavedPosts(data.posts || [])
    }).catch(() => {})
  }, [selectedAvatar])

  async function generatePost() {
    if (!selectedAvatar?.id || !postTopic.trim()) return
    setGenerating(true)
    try {
      const { data } = await api.post(`/api/avatars/${selectedAvatar.id}/linkedin/generate-post`, { topic: postTopic, style: postStyle })
      if (data.post) { setGeneratedPost(data.post); setPostHashtags(data.hashtags || []) }
    } catch {}
    setGenerating(false)
  }

  async function generateCalendar() {
    if (!selectedAvatar?.id) return
    setCalLoading(true)
    try {
      const { data } = await api.post(`/api/avatars/${selectedAvatar.id}/linkedin/content-calendar`)
      if (data.calendar) setCalendar(data.calendar)
    } catch {}
    setCalLoading(false)
  }

  async function generateDM() {
    if (!selectedAvatar?.id || !dmTarget.name.trim()) return
    setDmGenerating(true)
    try {
      const { data } = await api.post(`/api/avatars/${selectedAvatar.id}/linkedin/generate-message`, dmTarget)
      if (data.message) setDmMessage(data.message)
    } catch {}
    setDmGenerating(false)
  }

  async function savePost() {
    if (!selectedAvatar?.id || !generatedPost) return
    await api.post(`/api/avatars/${selectedAvatar.id}/linkedin/save-post`, { post: generatedPost, hashtags: postHashtags, status: 'draft' })
    setSavedPosts(prev => [{ post: generatedPost, hashtags: postHashtags, status: 'draft', createdAt: new Date().toISOString() }, ...prev])
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Linkedin className="w-6 h-6 text-blue-600" /> LinkedIn Manager
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">Genera contenido, mensajes y gestiona tu presencia en LinkedIn con IA</p>
        </div>

        {/* Avatar selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Publicar como:</span>
          <div className="flex gap-1.5">
            {avatars.map(av => (
              <button
                key={av.id}
                onClick={() => setSelectedAvatar(av)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedAvatar?.id === av.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {av.photo_url ? (
                  <img src={av.photo_url} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-bold">{(av.name || '?')[0]}</div>
                )}
                {av.name?.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Column 1: Post Generator */}
        <div className="xl:col-span-2 space-y-5">
          <Card title="Generar Post" icon={Zap}>
            <div className="space-y-4">
              {/* Topic */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tema del post</label>
                <input
                  type="text"
                  value={postTopic}
                  onChange={e => setPostTopic(e.target.value)}
                  placeholder="Ej: Como la IA esta transformando las PyMEs..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                {/* Quick topic ideas */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {TOPIC_IDEAS.slice(0, 4).map((t, i) => (
                    <button key={i} onClick={() => setPostTopic(t)}
                      className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">{t.slice(0, 40)}...</button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Estilo</label>
                <div className="flex gap-2">
                  {POST_STYLES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setPostStyle(s.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        postStyle === s.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >{s.label}</button>
                  ))}
                </div>
              </div>

              {/* Generate */}
              <button
                onClick={generatePost}
                disabled={generating || !postTopic.trim()}
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Generar Post con IA
              </button>

              {/* Generated post */}
              {generatedPost && (
                <div className="space-y-3">
                  <div className="bg-white border-2 border-blue-200 rounded-xl p-5">
                    {/* Mock LinkedIn header */}
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                      {selectedAvatar?.photo_url ? (
                        <img src={selectedAvatar.photo_url} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">{(selectedAvatar?.name || '?')[0]}</div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-gray-900">{selectedAvatar?.name}</p>
                        <p className="text-xs text-gray-500">{selectedAvatar?.role} en {selectedAvatar?.company}</p>
                      </div>
                    </div>
                    {/* Post content */}
                    <textarea
                      value={generatedPost}
                      onChange={e => setGeneratedPost(e.target.value)}
                      rows={10}
                      className="w-full text-sm text-gray-800 leading-relaxed resize-none focus:outline-none"
                    />
                    {postHashtags.length > 0 && (
                      <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100">
                        {postHashtags.map((h, i) => <span key={i} className="text-xs text-blue-600 font-medium">#{h}</span>)}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => copyToClipboard(generatedPost + '\n\n' + postHashtags.map(h => '#' + h).join(' '))}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copiado!' : 'Copiar Post'}
                    </button>
                    <button onClick={savePost}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-200 transition-colors">
                      <Save className="w-3.5 h-3.5" /> Guardar Borrador
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* DM Generator */}
          <Card title="Generar Mensaje Directo" icon={MessageSquare}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                  <input type="text" value={dmTarget.name} onChange={e => setDmTarget(p => ({ ...p, name: e.target.value }))}
                    placeholder="Juan Perez" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Cargo</label>
                  <input type="text" value={dmTarget.role} onChange={e => setDmTarget(p => ({ ...p, role: e.target.value }))}
                    placeholder="CEO / Gerente / CTO" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Empresa</label>
                  <input type="text" value={dmTarget.company} onChange={e => setDmTarget(p => ({ ...p, company: e.target.value }))}
                    placeholder="Empresa SA" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Proposito</label>
                  <input type="text" value={dmTarget.purpose} onChange={e => setDmTarget(p => ({ ...p, purpose: e.target.value }))}
                    placeholder="Networking / Vender / Colaborar" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </div>
              </div>

              <button
                onClick={generateDM}
                disabled={dmGenerating || !dmTarget.name.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {dmGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Generar Mensaje
              </button>

              {dmMessage && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <textarea value={dmMessage} onChange={e => setDmMessage(e.target.value)} rows={4}
                    className="w-full text-sm text-gray-800 bg-transparent resize-none focus:outline-none leading-relaxed" />
                  <button onClick={() => { navigator.clipboard.writeText(dmMessage); setDmCopied(true); setTimeout(() => setDmCopied(false), 2000) }}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 border border-gray-200">
                    {dmCopied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    {dmCopied ? 'Copiado!' : 'Copiar Mensaje'}
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Column 2: Calendar + Saved Posts */}
        <div className="space-y-5">
          {/* Content Calendar */}
          <Card
            title="Calendario Semanal"
            icon={Calendar}
            action={
              <button onClick={generateCalendar} disabled={calLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 disabled:opacity-40">
                {calLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Generar
              </button>
            }
          >
            {calendar.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Genera un plan de contenido semanal</p>
              </div>
            ) : (
              <div className="space-y-2">
                {calendar.map((d, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => setPostTopic(d.topic)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-purple-600">{d.day}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{d.type}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{d.topic}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 italic">{d.hook}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Saved Posts */}
          <Card title={`Borradores (${savedPosts.length})`} icon={FileText}>
            {savedPosts.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Los posts guardados apareceran aqui</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedPosts.map((p, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-700 line-clamp-3">{p.post?.slice(0, 150)}...</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1">
                        {(p.hashtags || []).slice(0, 2).map((h, j) => (
                          <span key={j} className="text-[10px] text-blue-600">#{h}</span>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => { setGeneratedPost(p.post); setPostHashtags(p.hashtags || []) }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                        <button onClick={() => { navigator.clipboard.writeText(p.post + '\n\n' + (p.hashtags || []).map(h => '#' + h).join(' ')) }}
                          className="text-[10px] text-gray-500 hover:text-gray-700 font-medium">Copiar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Stats */}
          <Card title="Tips para LinkedIn" icon={TrendingUp}>
            <div className="space-y-2">
              {[
                { icon: Clock, text: 'Mejor horario: Mar-Jue 8-10hs', color: 'text-blue-600' },
                { icon: Hash, text: 'Usa 3-5 hashtags relevantes', color: 'text-purple-600' },
                { icon: Eye, text: 'Primera linea = hook que atrapa', color: 'text-emerald-600' },
                { icon: MessageSquare, text: 'Responde comentarios en 1 hora', color: 'text-amber-600' },
                { icon: Star, text: 'Publica 3-5 veces por semana', color: 'text-red-500' },
              ].map((tip, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5">
                  <tip.icon className={`w-3.5 h-3.5 ${tip.color} flex-shrink-0`} />
                  <span className="text-xs text-gray-600">{tip.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
