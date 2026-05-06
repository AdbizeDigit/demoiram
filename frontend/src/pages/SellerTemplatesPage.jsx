import { useState, useEffect, useCallback } from 'react'
import { FileText, Plus, Loader2, X, Trash2, Edit3, Mail, MessageCircle, Phone, Hash } from 'lucide-react'
import api from '../services/api'

const CHANNELS = [
  { key: 'EMAIL',    label: 'Email', icon: Mail },
  { key: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle },
  { key: 'CALL',     label: 'Script llamada', icon: Phone },
]

export default function SellerTemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/seller/templates')
      setTemplates(data?.templates || [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function save() {
    if (!editing.body) return alert('Body requerido')
    try {
      if (editing.id) await api.patch(`/api/seller/templates/${editing.id}`, editing)
      else await api.post('/api/seller/templates', editing)
      setEditing(null)
      load()
    } catch (err) { alert(err?.response?.data?.message || 'Error') }
  }

  async function remove(id) {
    if (!confirm('¿Eliminar plantilla?')) return
    await api.delete(`/api/seller/templates/${id}`)
    load()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" /> Plantillas
          </h1>
          <p className="text-sm text-gray-500 mt-1">Mensajes reusables. Variables: <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code> <code className="bg-gray-100 px-1 rounded">{'{{first_name}}'}</code> <code className="bg-gray-100 px-1 rounded">{'{{sector}}'}</code> <code className="bg-gray-100 px-1 rounded">{'{{city}}'}</code></p>
        </div>
        <button onClick={() => setEditing({ name: '', shortcut: '', body: '', channel: 'EMAIL' })}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1">
          <Plus className="w-4 h-4" /> Nueva plantilla
        </button>
      </div>

      {editing && (
        <div className="bg-blue-50 ring-1 ring-blue-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-blue-900">{editing.id ? 'Editar' : 'Nueva'} plantilla</h2>
            <button onClick={() => setEditing(null)}><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <input value={editing.shortcut || ''} onChange={e => setEditing({ ...editing, shortcut: e.target.value })}
                placeholder="/saludo" className="px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm" />
              <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })}
                placeholder="Nombre" className="px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm" />
              <select value={editing.channel} onChange={e => setEditing({ ...editing, channel: e.target.value })}
                className="px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm">
                {CHANNELS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            {editing.channel === 'EMAIL' && (
              <input value={editing.subject || ''} onChange={e => setEditing({ ...editing, subject: e.target.value })}
                placeholder="Asunto (acepta variables {{name}})"
                className="w-full px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm" />
            )}
            <textarea value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })}
              rows={8} placeholder="Cuerpo del mensaje. Usá {{name}} {{first_name}} {{sector}} {{city}} {{seller_name}}"
              className="w-full px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm resize-y" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="text-sm ring-1 ring-gray-300 px-4 py-2 rounded-lg">Cancelar</button>
              <button onClick={save} className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div> :
       templates.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center ring-1 ring-gray-200">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Sin plantillas. Crea la primera para reusar mensajes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map(t => {
            const cfg = CHANNELS.find(c => c.key === t.channel) || CHANNELS[0]
            const Icon = cfg.icon
            return (
              <div key={t.id} className="bg-white rounded-2xl p-4 ring-1 ring-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{t.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-bold">
                        <Icon className="w-2.5 h-2.5" /> {cfg.label}
                      </span>
                      {t.shortcut && (
                        <span className="text-[10px] text-blue-600 font-mono flex items-center gap-0.5">
                          <Hash className="w-2.5 h-2.5" />{t.shortcut}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">usado {t.use_count}x</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditing(t)} className="p-1 hover:bg-gray-100 rounded"><Edit3 className="w-3.5 h-3.5 text-gray-500" /></button>
                    <button onClick={() => remove(t.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                </div>
                {t.subject && <p className="text-[11px] font-semibold text-gray-700 truncate">{t.subject}</p>}
                <p className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap">{t.body}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
