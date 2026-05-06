import { useState, useEffect, useCallback } from 'react'
import { Calendar, Save, Loader2, Copy, Check, ExternalLink, Clock } from 'lucide-react'
import api from '../services/api'

const DAYS = [
  { key: '1', label: 'Lun' }, { key: '2', label: 'Mar' }, { key: '3', label: 'Mié' },
  { key: '4', label: 'Jue' }, { key: '5', label: 'Vie' }, { key: '6', label: 'Sáb' }, { key: '7', label: 'Dom' }
]

export default function SellerAgendaPage() {
  const [settings, setSettings] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, m] = await Promise.all([
        api.get('/api/seller/me/booking'),
        api.get('/api/seller/me/meetings')
      ])
      setSettings(s.data?.settings || {
        title: 'Agendar reunión', duration_min: 30, buffer_min: 15,
        timezone: 'America/Argentina/Buenos_Aires',
        weekly_hours: { '1': [{ start: '09:00', end: '18:00' }], '2': [{ start: '09:00', end: '18:00' }],
          '3': [{ start: '09:00', end: '18:00' }], '4': [{ start: '09:00', end: '18:00' }],
          '5': [{ start: '09:00', end: '18:00' }] },
        active: true
      })
      setMeetings(m.data?.meetings || [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    try {
      const { data } = await api.put('/api/seller/me/booking', settings)
      setSettings(data?.settings || settings)
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  function toggleDay(day) {
    const wh = { ...settings.weekly_hours }
    if (wh[day]?.length) delete wh[day]
    else wh[day] = [{ start: '09:00', end: '18:00' }]
    setSettings({ ...settings, weekly_hours: wh })
  }

  function setDayHours(day, idx, key, value) {
    const wh = { ...settings.weekly_hours }
    wh[day] = wh[day] || [{ start: '09:00', end: '18:00' }]
    wh[day][idx] = { ...wh[day][idx], [key]: value }
    setSettings({ ...settings, weekly_hours: wh })
  }

  const bookingUrl = settings?.slug ? `${window.location.origin}/agendar/${settings.slug}` : null

  function copyLink() {
    if (!bookingUrl) return
    navigator.clipboard.writeText(bookingUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" /> Mi agenda
        </h1>
        <p className="text-sm text-gray-500 mt-1">Definí tu horario y compartí el link para que los leads agenden solos.</p>
      </div>

      {bookingUrl && settings?.slug && (
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-2xl p-5">
          <p className="text-xs font-semibold text-white/80 mb-1 uppercase tracking-wide">Tu link público</p>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <a href={bookingUrl} target="_blank" rel="noreferrer" className="text-lg font-bold underline-offset-2 hover:underline truncate flex items-center gap-2">
              {bookingUrl} <ExternalLink className="w-4 h-4 flex-shrink-0" />
            </a>
            <button onClick={copyLink} className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl ring-1 ring-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-800">Configuración</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Título visible</label>
            <input value={settings.title || ''} onChange={e => setSettings({ ...settings, title: e.target.value })}
              className="mt-1 w-full px-3 py-2 ring-1 ring-gray-200 rounded-lg text-sm focus:ring-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Slug del link</label>
            <input value={settings.slug || ''} onChange={e => setSettings({ ...settings, slug: e.target.value })}
              placeholder="ignacio-medina"
              className="mt-1 w-full px-3 py-2 ring-1 ring-gray-200 rounded-lg text-sm focus:ring-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Duración (min)</label>
            <input type="number" value={settings.duration_min} onChange={e => setSettings({ ...settings, duration_min: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2 ring-1 ring-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Buffer entre reuniones (min)</label>
            <input type="number" value={settings.buffer_min} onChange={e => setSettings({ ...settings, buffer_min: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2 ring-1 ring-gray-200 rounded-lg text-sm" />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-600 uppercase">Descripción para el lead</label>
          <textarea rows={2} value={settings.description || ''} onChange={e => setSettings({ ...settings, description: e.target.value })}
            placeholder="Charla de 30 min para conocer tu negocio y ver si podemos ayudarte"
            className="mt-1 w-full px-3 py-2 ring-1 ring-gray-200 rounded-lg text-sm resize-none focus:ring-blue-400 focus:outline-none" />
        </div>

        <div>
          <p className="text-[11px] font-bold text-gray-600 uppercase mb-2">Horario semanal</p>
          <div className="space-y-2">
            {DAYS.map(d => {
              const day = settings.weekly_hours?.[d.key]
              const enabled = !!day?.length
              return (
                <div key={d.key} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-20">
                    <input type="checkbox" checked={enabled} onChange={() => toggleDay(d.key)} className="w-4 h-4" />
                    <span className="text-sm font-semibold text-gray-700">{d.label}</span>
                  </label>
                  {enabled && day[0] && (
                    <>
                      <input type="time" value={day[0].start} onChange={e => setDayHours(d.key, 0, 'start', e.target.value)}
                        className="px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs" />
                      <span className="text-xs text-gray-400">a</span>
                      <input type="time" value={day[0].end} onChange={e => setDayHours(d.key, 0, 'end', e.target.value)}
                        className="px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs" />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!settings.active} onChange={e => setSettings({ ...settings, active: e.target.checked })} className="w-4 h-4" />
            <span className="text-sm">Activar agenda pública</span>
          </label>
          <button onClick={save} disabled={saving}
            className="ml-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl ring-1 ring-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-violet-500" /> Próximas reuniones <span className="text-gray-400 font-normal">({meetings.length})</span>
        </h2>
        {meetings.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">Sin reuniones agendadas</p>
        ) : (
          <div className="space-y-1.5">
            {meetings.map(m => (
              <div key={m.id} className="p-3 rounded-xl bg-violet-50/50 ring-1 ring-violet-100">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{m.guest_name}</p>
                    <p className="text-xs text-gray-500 truncate">{m.guest_email}{m.lead_name && ` · Lead: ${m.lead_name}`}</p>
                    {m.notes && <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{m.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-violet-700">
                      {new Date(m.starts_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(m.starts_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(m.ends_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
