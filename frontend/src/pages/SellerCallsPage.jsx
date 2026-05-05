import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Loader2, Calendar, CheckCircle2, XCircle, Clock, Plus } from 'lucide-react'
import api from '../services/api'

const OUTCOMES = {
  'connected': { label: 'Conectado', color: 'bg-emerald-100 text-emerald-700' },
  'voicemail': { label: 'Buzón', color: 'bg-amber-100 text-amber-700' },
  'no_answer': { label: 'No respondió', color: 'bg-gray-100 text-gray-700' },
  'wrong_number': { label: 'Nº incorrecto', color: 'bg-red-100 text-red-700' },
  'not_interested': { label: 'No interesado', color: 'bg-red-100 text-red-700' },
  'callback_scheduled': { label: 'Recall agendado', color: 'bg-blue-100 text-blue-700' },
  'meeting_booked': { label: 'Reunión agendada', color: 'bg-violet-100 text-violet-700' },
}

export default function SellerCallsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [calls, setCalls] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Pedimos las próximas acciones del vendedor para las llamadas agendadas, y un listado general.
      // Backend no expone aún listado global de llamadas del vendedor — uso next-actions como base.
      const { data } = await api.get('/api/seller/me/next-actions')
      setCalls(data?.scheduledCalls || [])
    } catch (err) {
      console.error('Error cargando llamadas:', err)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Phone className="w-6 h-6 text-violet-600" /> Llamadas
          </h1>
          <p className="text-sm text-gray-500 mt-1">Llamadas agendadas y pendientes de seguimiento</p>
        </div>
      </div>

      <div className="bg-blue-50 ring-1 ring-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
          <Plus className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">Cómo registrar una llamada</p>
          <p className="text-xs text-blue-700 mt-1">
            Entrá al detalle del lead y usá el botón <strong>"Registrar llamada"</strong> para guardar duración, resultado y agendar el siguiente contacto.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-violet-600 animate-spin" /></div>
      ) : calls.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center ring-1 ring-gray-200">
          <Phone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No tenés llamadas agendadas en los próximos días.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {calls.map(c => (
              <button key={c.id} onClick={() => navigate(`/vendedor/lead/${c.lead_id}`)}
                className="w-full text-left p-4 hover:bg-gray-50 transition flex items-center gap-4">
                <div className="bg-violet-100 p-2.5 rounded-xl flex-shrink-0">
                  <Calendar className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 truncate">{c.next_action}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-violet-700">
                    {new Date(c.next_action_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(c.next_action_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { OUTCOMES }
