import { useState } from 'react'
import { Sparkles, Loader2, FileText, Target, AlertTriangle, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../services/api'

export default function BriefingPanel({ leadId }) {
  const [loading, setLoading] = useState(false)
  const [briefing, setBriefing] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(true)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post(`/api/seller/leads/${leadId}/briefing`)
      setBriefing(data?.briefing || null)
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al generar briefing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-2xl border border-amber-100 shadow-sm">
      <button onClick={() => setExpanded(e => !e)} className="w-full px-6 py-4 border-b border-amber-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-amber-600 p-1.5 rounded-lg">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-gray-800">Briefing pre-llamada</h3>
            <p className="text-[10px] text-gray-500">Empresa, decisor, dolor, objeciones — listo para arrancar</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-6 py-5">
          {!briefing && !loading && (
            <button onClick={generate} className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> Generar briefing con IA
            </button>
          )}
          {loading && <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-amber-500 animate-spin" /></div>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {briefing && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">La empresa</p>
                <p className="text-gray-800 leading-relaxed">{briefing.company_summary}</p>
              </div>
              <div className="bg-white p-3 rounded-xl ring-1 ring-amber-200">
                <p className="text-[10px] font-bold text-amber-700 uppercase mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Decisor</p>
                <p className="text-gray-800 text-xs">{briefing.decision_maker_hint}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Dolores probables</p>
                <ul className="space-y-1">
                  {(briefing.pain_points || []).map((p, i) => (
                    <li key={i} className="text-xs text-gray-700 pl-3 relative before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-red-400">{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Para abrir</p>
                <ul className="space-y-1">
                  {(briefing.opening_questions || []).map((q, i) => (
                    <li key={i} className="text-xs text-blue-700 italic">"{q}"</li>
                  ))}
                </ul>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-orange-700 uppercase mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Objeciones probables</p>
                <div className="space-y-2">
                  {(briefing.likely_objections || []).map((o, i) => (
                    <div key={i} className="text-xs">
                      <p className="font-bold text-gray-800">"{o.objection}"</p>
                      <p className="text-gray-600 mt-0.5">→ {o.response}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Por qué nosotros</p>
                <ul className="space-y-1">
                  {(briefing.value_props || []).map((v, i) => (
                    <li key={i} className="text-xs text-emerald-700 pl-3 relative before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-emerald-500">{v}</li>
                  ))}
                </ul>
              </div>
              <div className="text-[11px] text-gray-500 flex items-center gap-1">
                <span className="font-bold uppercase">Termómetro:</span> {briefing.urgency_indicator}
              </div>
              <button onClick={generate} className="text-xs text-amber-700 hover:underline">↻ Regenerar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
