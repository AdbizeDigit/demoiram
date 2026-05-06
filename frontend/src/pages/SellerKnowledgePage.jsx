import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Plus, Loader2, X, Search, Trash2, Edit3 } from 'lucide-react'
import api from '../services/api'

const TYPES = [
  { key: 'general', label: 'General' },
  { key: 'caso_exito', label: 'Caso de éxito' },
  { key: 'faq', label: 'FAQ' },
  { key: 'objecion', label: 'Objeción' },
  { key: 'script', label: 'Script' },
  { key: 'producto', label: 'Producto' },
]

export default function SellerKnowledgePage() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/api/seller/knowledge${q ? '?q=' + encodeURIComponent(q) : ''}`)
      setDocs(data?.docs || [])
    } finally { setLoading(false) }
  }, [q])
  useEffect(() => { load() }, [load])

  async function save() {
    if (!editing.title || !editing.content) return alert('Título y contenido requeridos')
    try {
      if (editing.id) {
        await api.patch(`/api/seller/knowledge/${editing.id}`, editing)
      } else {
        await api.post('/api/seller/knowledge', editing)
      }
      setEditing(null)
      load()
    } catch (err) { alert(err?.response?.data?.message || 'Error') }
  }

  async function remove(id) {
    if (!confirm('¿Eliminar documento?')) return
    await api.delete(`/api/seller/knowledge/${id}`)
    load()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" /> Knowledge Base
          </h1>
          <p className="text-sm text-gray-500 mt-1">Casos de éxito, FAQs, scripts. El asistente IA los usa para responder.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..."
              className="pl-7 pr-3 py-2 ring-1 ring-gray-200 rounded-lg text-sm focus:ring-emerald-400 focus:outline-none w-56" />
          </div>
          <button onClick={() => setEditing({ title: '', content: '', doc_type: 'general' })}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1">
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        </div>
      </div>

      {editing && (
        <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-emerald-900">{editing.id ? 'Editar' : 'Nuevo'} documento</h2>
            <button onClick={() => setEditing(null)}><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })}
              placeholder="Título" className="w-full px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <select value={editing.doc_type || 'general'} onChange={e => setEditing({ ...editing, doc_type: e.target.value })}
                className="px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm">
                {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <input value={editing.sector || ''} onChange={e => setEditing({ ...editing, sector: e.target.value })}
                placeholder="Sector específico (opcional)"
                className="px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm" />
            </div>
            <textarea value={editing.content} onChange={e => setEditing({ ...editing, content: e.target.value })}
              rows={10} placeholder="Contenido del documento (case study, respuesta, script...)"
              className="w-full px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm resize-y" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="text-sm ring-1 ring-gray-300 px-4 py-2 rounded-lg">Cancelar</button>
              <button onClick={save} className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div> :
       docs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center ring-1 ring-gray-200">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Sin documentos. Cargá el primero — el asistente lo usará al responder.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {docs.map(d => (
            <div key={d.id} className="bg-white rounded-2xl p-4 ring-1 ring-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{d.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 capitalize">{d.doc_type} {d.sector && `· ${d.sector}`}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(d)} className="p-1 hover:bg-gray-100 rounded"><Edit3 className="w-3.5 h-3.5 text-gray-500" /></button>
                  <button onClick={() => remove(d.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                </div>
              </div>
              <p className="text-xs text-gray-700 line-clamp-3">{d.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
