import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Snowflake, Loader2, Sparkles, Copy, Check, ChevronRight, RefreshCw } from 'lucide-react'
import api from '../services/api'

function timeAgo(d) {
  if (!d) return '-'
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}m`
}

export default function SellerReactivatePage() {
  const navigate = useNavigate()
  const [dormants, setDormants] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState({})
  const [generated, setGenerated] = useState({}) // leadId → message
  const [copied, setCopied] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/seller/me/dormants')
      setDormants(data?.dormants || [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function generate(leadId) {
    setGenerating(g => ({ ...g, [leadId]: true }))
    try {
      const { data } = await api.post(`/api/seller/leads/${leadId}/reactivate`)
      setGenerated(g => ({ ...g, [leadId]: data?.message || '' }))
    } catch (err) {
      alert(err?.response?.data?.message || 'Error')
    } finally {
      setGenerating(g => ({ ...g, [leadId]: false }))
    }
  }

  function copy(leadId, text) {
    navigator.clipboard.writeText(text)
    setCopied(leadId); setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Snowflake className="w-6 h-6 text-cyan-600" /> Reactivación de dormidos
          </h1>
          <p className="text-sm text-gray-500 mt-1">Leads sin movimiento hace 60+ días. La IA genera un mensaje específico para cada uno.</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 ring-1 ring-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div> :
       dormants.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center ring-1 ring-gray-200">
          <Snowflake className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No tenés leads dormidos. Buen trabajo manteniéndolos al día 🚀</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dormants.map(d => (
            <div key={d.id} className="bg-white rounded-2xl p-4 ring-1 ring-gray-200">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="flex-1 min-w-0">
                  <button onClick={() => navigate(`/vendedor/lead/${d.id}`)}
                    className="text-sm font-bold text-gray-900 hover:underline truncate flex items-center gap-1">
                    {d.name} <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {d.sector || 'sin sector'} · {d.city || ''} · etapa {d.stage} · score {d.score || 0}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[11px] bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-bold">
                    Dormido {timeAgo(d.last_contact || d.updated_at)}
                  </span>
                  {!generated[d.id] && (
                    <button onClick={() => generate(d.id)} disabled={generating[d.id]}
                      className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
                      {generating[d.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Generar mensaje IA
                    </button>
                  )}
                </div>
              </div>
              {generated[d.id] && (
                <div className="bg-cyan-50 ring-1 ring-cyan-200 rounded-xl p-3 mt-2">
                  <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{generated[d.id]}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => copy(d.id, generated[d.id])}
                      className="text-[11px] bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                      {copied === d.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === d.id ? 'Copiado' : 'Copiar'}
                    </button>
                    <button onClick={() => generate(d.id)} className="text-[11px] ring-1 ring-cyan-300 text-cyan-700 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Regenerar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
