import { useState, useEffect, useCallback } from 'react'
import { Phone, Loader2, Plus, Calendar, Clock, X } from 'lucide-react'
import api from '../../services/api'

const OUTCOMES = [
  { key: 'connected', label: 'Conectó', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'voicemail', label: 'Buzón', color: 'bg-amber-100 text-amber-700' },
  { key: 'no_answer', label: 'No respondió', color: 'bg-gray-100 text-gray-700' },
  { key: 'wrong_number', label: 'Nº incorrecto', color: 'bg-red-100 text-red-700' },
  { key: 'not_interested', label: 'No interesado', color: 'bg-red-100 text-red-700' },
  { key: 'callback_scheduled', label: 'Recall agendado', color: 'bg-blue-100 text-blue-700' },
  { key: 'meeting_booked', label: 'Reunión agendada', color: 'bg-violet-100 text-violet-700' },
]

function formatDuration(secs) {
  if (!secs) return '0s'
  const m = Math.floor(secs / 60), s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default function CallLogPanel({ leadId }) {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ duration: '', outcome: 'connected', notes: '', next_action: '', next_action_at: '' })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/api/seller/leads/${leadId}/calls`)
      setCalls(data?.calls || [])
    } catch (err) {
      console.error('Error cargando llamadas:', err)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    try {
      await api.post(`/api/seller/leads/${leadId}/calls`, {
        duration_seconds: parseInt(form.duration) || 0,
        outcome: form.outcome,
        notes: form.notes || null,
        next_action: form.next_action || null,
        next_action_at: form.next_action_at || null,
      })
      setForm({ duration: '', outcome: 'connected', notes: '', next_action: '', next_action_at: '' })
      setShowForm(false)
      await load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-violet-100 p-1.5 rounded-lg">
            <Phone className="w-4 h-4 text-violet-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Llamadas <span className="text-gray-400 font-normal">({calls.length})</span></h3>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="text-[11px] bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1"
        >
          {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showForm ? 'Cancelar' : 'Registrar llamada'}
        </button>
      </div>

      {showForm && (
        <div className="px-6 py-5 border-b border-gray-50 bg-violet-50/30 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Resultado</label>
              <select value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
                className="w-full px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs focus:ring-violet-400 focus:outline-none">
                {OUTCOMES.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Duración (segundos)</label>
              <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                placeholder="120" className="w-full px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs focus:ring-violet-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Notas</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3} placeholder="Hablamos con el dueño, le interesó la propuesta de valor..."
              className="w-full px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs focus:ring-violet-400 focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Próxima acción</label>
              <input type="text" value={form.next_action} onChange={e => setForm(f => ({ ...f, next_action: e.target.value }))}
                placeholder="Recall el martes" className="w-full px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs focus:ring-violet-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Cuándo</label>
              <input type="datetime-local" value={form.next_action_at} onChange={e => setForm(f => ({ ...f, next_action_at: e.target.value }))}
                className="w-full px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs focus:ring-violet-400 focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 rounded-lg ring-1 ring-gray-300 text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={save} disabled={saving}
              className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-50">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="px-6 py-5">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
        ) : calls.length === 0 ? (
          <div className="text-center py-8">
            <Phone className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Sin llamadas registradas todavía.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {calls.map(c => {
              const o = OUTCOMES.find(x => x.key === c.outcome) || OUTCOMES[0]
              return (
                <div key={c.id} className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.color}`}>{o.label}</span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{formatDuration(c.duration_seconds)}</span>
                      {c.seller_name && <span className="text-[10px] text-gray-400">por {c.seller_name}</span>}
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {c.notes && <p className="text-xs text-gray-700 mt-1">{c.notes}</p>}
                  {c.next_action && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-violet-700 bg-violet-50 rounded-lg px-2 py-1">
                      <Calendar className="w-3 h-3" />
                      <span className="font-medium">{c.next_action}</span>
                      {c.next_action_at && (
                        <span className="ml-auto text-violet-600 text-[10px]">
                          {new Date(c.next_action_at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
