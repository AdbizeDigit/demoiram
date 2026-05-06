import { useState } from 'react'
import { Wand2, Loader2, Check } from 'lucide-react'
import api from '../../services/api'

export default function EnrichButton({ leadId, onDone }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [insight, setInsight] = useState(null)

  async function run() {
    setLoading(true)
    try {
      const { data } = await api.post(`/api/seller/leads/${leadId}/enrich`)
      setInsight(data?.ai_insight || null)
      setDone(true)
      onDone?.(data)
      setTimeout(() => setDone(false), 3000)
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al enriquecer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={run} disabled={loading}
        className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-semibold">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : done ? <Check className="w-3.5 h-3.5" /> : <Wand2 className="w-3.5 h-3.5" />}
        {loading ? 'Enriqueciendo...' : done ? 'Listo' : 'Enriquecer datos'}
      </button>
      {insight && (
        <div className="mt-3 p-3 bg-violet-50 ring-1 ring-violet-200 rounded-xl text-xs space-y-1">
          <p><strong>Tamaño:</strong> {insight.size_estimate}</p>
          {insight.tech_signals?.length > 0 && <p><strong>Señales tech:</strong> {insight.tech_signals.join(', ')}</p>}
          <p><strong>Decisor probable:</strong> {insight.likely_decision_maker}</p>
          <p><strong>Mejor canal:</strong> {insight.best_channel}</p>
          {insight.insight && <p className="text-violet-800 italic mt-1">"{insight.insight}"</p>}
        </div>
      )}
    </div>
  )
}
