import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Calendar, Clock, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import axios from 'axios'

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function timeStrToMinutes(s) {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

function generateSlots(date, weeklyHours, durationMin, bufferMin, takenSlots) {
  // weeklyHours: { '1': [{start,end}], ... } where 1=Mon..7=Sun (ISO)
  // JS Date.getDay(): 0=Sun..6=Sat. Convertir.
  const jsDow = date.getDay()
  const isoDow = jsDow === 0 ? 7 : jsDow
  const ranges = weeklyHours?.[String(isoDow)] || []
  if (!ranges.length) return []
  const slots = []
  const taken = takenSlots.map(t => ({ start: new Date(t.start).getTime(), end: new Date(t.end).getTime() }))
  for (const r of ranges) {
    const startMin = timeStrToMinutes(r.start)
    const endMin = timeStrToMinutes(r.end)
    for (let m = startMin; m + durationMin <= endMin; m += durationMin + bufferMin) {
      const slot = new Date(date)
      slot.setHours(Math.floor(m / 60), m % 60, 0, 0)
      const slotEnd = slot.getTime() + durationMin * 60000
      if (slot.getTime() < Date.now()) continue
      const overlaps = taken.some(t => slot.getTime() < t.end && slotEnd > t.start)
      if (!overlaps) slots.push(slot)
    }
  }
  return slots
}

export default function PublicBookingPage() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [form, setForm] = useState({ guest_name: '', guest_email: '', guest_phone: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    axios.get(`/api/public/booking/${slug}`)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(err => { setError(err?.response?.data?.message || 'No disponible'); setLoading(false) })
  }, [slug])

  // Próximos 14 días
  const days = useMemo(() => {
    const arr = []
    const today = new Date(); today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 14; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i)
      arr.push(d)
    }
    return arr
  }, [])

  const slots = useMemo(() => {
    if (!data) return []
    return generateSlots(
      selectedDate,
      data.settings.weekly_hours || {},
      data.settings.duration_min || 30,
      data.settings.buffer_min || 15,
      data.taken_slots || []
    )
  }, [data, selectedDate])

  async function submit() {
    if (!selectedSlot || !form.guest_name || !form.guest_email) return
    setSubmitting(true)
    try {
      const { data: result } = await axios.post(`/api/public/booking/${slug}`, {
        starts_at: selectedSlot.toISOString(),
        ...form
      })
      setSuccess({ slot: selectedSlot, meeting: result?.meeting })
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al reservar')
    } finally { setSubmitting(false) }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-violet-50">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
    </div>
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl p-8 ring-1 ring-gray-200 text-center max-w-md">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  }
  if (success) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 p-6">
      <div className="bg-white rounded-2xl p-8 ring-1 ring-emerald-200 max-w-md text-center">
        <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Reunión agendada!</h1>
        <p className="text-gray-600 text-sm">
          Te confirmé la reunión con <strong>{data.seller.name}</strong> para el{' '}
          <strong>{success.slot.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>{' '}
          a las <strong>{success.slot.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</strong>.
        </p>
        <p className="text-xs text-gray-500 mt-4">Recibirás un mail de confirmación a {form.guest_email}.</p>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl ring-1 ring-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-violet-600 text-white p-6">
            <p className="text-xs uppercase font-bold opacity-80 mb-1">Reuní con</p>
            <h1 className="text-2xl font-bold">{data.seller.name}</h1>
            <p className="text-sm opacity-90 mt-2">{data.settings.title}</p>
            {data.settings.description && <p className="text-xs opacity-75 mt-1">{data.settings.description}</p>}
            <div className="mt-3 inline-flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full text-xs font-semibold">
              <Clock className="w-3 h-3" /> {data.settings.duration_min} min
            </div>
          </div>

          <div className="p-6">
            {!selectedSlot ? (
              <>
                <h2 className="text-sm font-bold text-gray-700 mb-3">Elegí día</h2>
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                  {days.map(d => {
                    const sel = d.toDateString() === selectedDate.toDateString()
                    return (
                      <button key={d.toISOString()} onClick={() => setSelectedDate(d)}
                        className={`flex-shrink-0 px-3 py-2 rounded-xl ring-1 transition ${
                          sel ? 'bg-blue-600 text-white ring-blue-600' : 'ring-gray-200 hover:bg-gray-50'
                        }`}>
                        <p className="text-[10px] font-bold uppercase">{DAY_NAMES[d.getDay()]}</p>
                        <p className="text-lg font-bold">{d.getDate()}</p>
                        <p className="text-[10px]">{MONTH_NAMES[d.getMonth()]}</p>
                      </button>
                    )
                  })}
                </div>

                <h2 className="text-sm font-bold text-gray-700 mb-3">Elegí horario</h2>
                {slots.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">No hay horarios disponibles este día</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map(s => (
                      <button key={s.toISOString()} onClick={() => setSelectedSlot(s)}
                        className="px-3 py-2 ring-1 ring-blue-200 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-50">
                        {s.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <button onClick={() => setSelectedSlot(null)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3">
                  <ArrowLeft className="w-3 h-3" /> Cambiar horario
                </button>
                <div className="bg-blue-50 rounded-xl p-4 mb-5">
                  <p className="text-xs text-blue-700 font-bold uppercase">Reservaste</p>
                  <p className="text-lg font-bold text-blue-900 mt-1">
                    {selectedSlot.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-sm text-blue-800">
                    {selectedSlot.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs · {data.settings.duration_min} min
                  </p>
                </div>
                <div className="space-y-3">
                  <input value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })}
                    placeholder="Nombre completo *" required
                    className="w-full px-3 py-2.5 ring-1 ring-gray-300 rounded-lg text-sm focus:ring-blue-400 focus:outline-none" />
                  <input type="email" value={form.guest_email} onChange={e => setForm({ ...form, guest_email: e.target.value })}
                    placeholder="Email *" required
                    className="w-full px-3 py-2.5 ring-1 ring-gray-300 rounded-lg text-sm focus:ring-blue-400 focus:outline-none" />
                  <input value={form.guest_phone} onChange={e => setForm({ ...form, guest_phone: e.target.value })}
                    placeholder="Teléfono / WhatsApp"
                    className="w-full px-3 py-2.5 ring-1 ring-gray-300 rounded-lg text-sm focus:ring-blue-400 focus:outline-none" />
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={3} placeholder="¿Algo que querés que sepa antes? (opcional)"
                    className="w-full px-3 py-2.5 ring-1 ring-gray-300 rounded-lg text-sm focus:ring-blue-400 focus:outline-none resize-none" />
                  <button onClick={submit} disabled={submitting || !form.guest_name || !form.guest_email}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmar reunión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">Powered by Adbize</p>
      </div>
    </div>
  )
}
