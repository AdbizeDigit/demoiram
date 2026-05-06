import { useState, useEffect, useCallback } from 'react'
import { Zap, Plus, Loader2, X, Play, Pause, Mail, MessageCircle, Phone, Trash2, Edit3, ArrowRight } from 'lucide-react'
import api from '../services/api'

const CHANNEL_CFG = {
  EMAIL:    { icon: Mail, label: 'Email', color: 'bg-blue-100 text-blue-700' },
  WHATSAPP: { icon: MessageCircle, label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-700' },
  CALL:     { icon: Phone, label: 'Llamada', color: 'bg-violet-100 text-violet-700' },
}

function emptyStep() {
  return { channel: 'EMAIL', delay_days: 1, subject: '', body: '' }
}

function StepEditor({ step, idx, onChange, onRemove }) {
  return (
    <div className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-500 uppercase">Paso {idx + 1}</span>
        <button onClick={onRemove} className="p-1 text-red-500 hover:bg-red-50 rounded">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={step.channel} onChange={e => onChange({ ...step, channel: e.target.value })}
          className="px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs">
          {Object.entries(CHANNEL_CFG).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
        </select>
        <input type="number" min={0} value={step.delay_days} onChange={e => onChange({ ...step, delay_days: Number(e.target.value) })}
          placeholder="Días desde anterior" className="px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs" />
      </div>
      {step.channel === 'EMAIL' && (
        <input value={step.subject || ''} onChange={e => onChange({ ...step, subject: e.target.value })}
          placeholder="Asunto" className="w-full px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs" />
      )}
      <textarea value={step.body || ''} onChange={e => onChange({ ...step, body: e.target.value })}
        rows={3} placeholder="Cuerpo del mensaje. Variables: {{name}} {{first_name}} {{sector}} {{city}}"
        className="w-full px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs resize-none" />
    </div>
  )
}

export default function SellerSequencesPage() {
  const [sequences, setSequences] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | { id?, name, description, steps, active }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/seller/sequences')
      setSequences(data?.sequences || [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  function startNew() {
    setEditing({ name: '', description: '', steps: [emptyStep()], active: true })
  }

  async function save() {
    if (!editing.name) return alert('Nombre requerido')
    try {
      if (editing.id) {
        await api.patch(`/api/seller/sequences/${editing.id}`, editing)
      } else {
        await api.post('/api/seller/sequences', editing)
      }
      setEditing(null)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al guardar')
    }
  }

  async function remove(id) {
    if (!confirm('¿Eliminar secuencia?')) return
    await api.delete(`/api/seller/sequences/${id}`)
    load()
  }

  async function toggleActive(s) {
    await api.patch(`/api/seller/sequences/${s.id}`, { active: !s.active })
    load()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" /> Secuencias de follow-up
          </h1>
          <p className="text-sm text-gray-500 mt-1">Cadencias multi-canal automáticas. Si el lead responde, se detiene sola.</p>
        </div>
        <button onClick={startNew} className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Nueva secuencia
        </button>
      </div>

      {editing && (
        <div className="bg-amber-50 ring-1 ring-amber-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-amber-900">{editing.id ? 'Editar' : 'Nueva'} secuencia</h2>
            <button onClick={() => setEditing(null)} className="p-1 hover:bg-amber-100 rounded"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                placeholder="Nombre (ej: Frío B2B 7 días)"
                className="px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm focus:ring-amber-400 focus:outline-none" />
              <input value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })}
                placeholder="Descripción opcional"
                className="px-3 py-2 ring-1 ring-gray-300 rounded-lg text-sm focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2">Pasos</p>
              <div className="space-y-2">
                {editing.steps.map((s, i) => (
                  <StepEditor key={i} step={s} idx={i}
                    onChange={ns => setEditing({ ...editing, steps: editing.steps.map((x, j) => j === i ? ns : x) })}
                    onRemove={() => setEditing({ ...editing, steps: editing.steps.filter((_, j) => j !== i) })} />
                ))}
              </div>
              <button onClick={() => setEditing({ ...editing, steps: [...editing.steps, emptyStep()] })}
                className="mt-2 text-xs text-amber-700 font-semibold flex items-center gap-1">
                <Plus className="w-3 h-3" /> Agregar paso
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="text-sm ring-1 ring-gray-300 px-4 py-2 rounded-lg">Cancelar</button>
              <button onClick={save} className="text-sm bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-amber-600 animate-spin" /></div>
      ) : sequences.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center ring-1 ring-gray-200">
          <Zap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Sin secuencias todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sequences.map(s => (
            <div key={s.id} className="bg-white rounded-2xl p-4 ring-1 ring-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{s.name}</h3>
                  {s.description && <p className="text-xs text-gray-500 truncate">{s.description}</p>}
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.active ? 'ACTIVA' : 'PAUSADA'}
                </span>
              </div>
              <div className="flex items-center gap-1 mb-3 flex-wrap">
                {(s.steps || []).map((step, i) => {
                  const cfg = CHANNEL_CFG[String(step.channel || 'EMAIL').toUpperCase()] || CHANNEL_CFG.EMAIL
                  const Icon = cfg.icon
                  return (
                    <span key={i} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.color}`}>
                      <Icon className="w-2.5 h-2.5" /> +{step.delay_days || 0}d
                      {i < s.steps.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-gray-400 ml-0.5" />}
                    </span>
                  )
                })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>{s.active_runs || 0} en ejecución</span>
                <div className="flex gap-1">
                  <button onClick={() => toggleActive(s)} title={s.active ? 'Pausar' : 'Activar'}
                    className="p-1 hover:bg-gray-100 rounded">
                    {s.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setEditing({ ...s, steps: s.steps || [] })} className="p-1 hover:bg-gray-100 rounded">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(s.id)} className="p-1 hover:bg-red-50 text-red-500 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
