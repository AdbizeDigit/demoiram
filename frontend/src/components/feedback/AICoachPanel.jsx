import { useState, useEffect, useCallback } from 'react'
import { Brain, Sparkles, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import api from '../../services/api'

/**
 * AI Coach Panel
 *
 * Self-contained panel that loads the active playbook + metrics from
 * /api/outreach/insights and lets the user regenerate on demand. Used on
 * both the Pipeline and Sales Dashboard pages.
 */
export default function AICoachPanel() {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/outreach/insights')
      if (data?.success) setInsights(data)
    } catch {}
  }, [])

  const regenerate = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/api/outreach/insights/regenerate', {}, { timeout: 120000 })
      if (data?.success) setInsights(data)
    } catch (err) {
      console.error('Regenerate insights failed:', err?.response?.data?.error || err.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const m = insights?.metrics || {}
  const total = m.total || {}
  const email = m.channels?.EMAIL || {}
  const wa = m.channels?.WHATSAPP || {}
  const funnel = m.funnel || {}
  const winRate = funnel.contacted > 0 ? +((funnel.won / funnel.contacted) * 100).toFixed(1) : 0
  const cells = [
    { label: 'Tasa respuesta', value: `${total.reply_rate ?? 0}%`, sub: `${total.replied ?? 0} / ${total.sent ?? 0}` },
    { label: 'Email', value: `${email.reply_rate ?? 0}%`, sub: `${email.sent ?? 0} enviados` },
    { label: 'WhatsApp', value: `${wa.reply_rate ?? 0}%`, sub: `${wa.sent ?? 0} enviados` },
    { label: 'Conversión a ganado', value: `${winRate}%`, sub: `${funnel.won ?? 0} de ${funnel.contacted ?? 0}` },
  ]

  return (
    <div className="bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 border border-violet-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-violet-100 bg-white/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-800">AI Coach</h3>
              {insights?.version > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">v{insights.version}</span>
              )}
              {insights?.is_active && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">activo</span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 truncate">
              {insights?.generated_at
                ? `Playbook generado ${new Date(insights.generated_at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${insights.sample_size} mensajes analizados`
                : 'Aprendizaje continuo a partir de tus respuestas y conversiones reales'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={regenerate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:opacity-90 rounded-lg disabled:opacity-50 transition-opacity">
            {loading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analizando...</>) : (<><Sparkles className="w-3.5 h-3.5" /> Regenerar</>)}
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-violet-100">
        {cells.map((c, i) => (
          <div key={i} className="bg-white px-4 py-2.5">
            <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">{c.label}</p>
            <p className="text-lg font-bold text-gray-800 leading-tight">{c.value}</p>
            <p className="text-[10px] text-gray-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {expanded && (
        <div className="px-5 py-4 bg-white/70 border-t border-violet-100 space-y-4">
          {insights?.playbook ? (
            <div>
              <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider mb-1.5">Playbook activo (se inyecta en cada mensaje generado)</p>
              <pre className="text-[12px] text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-violet-50/50 border border-violet-100 rounded-lg p-3">{insights.playbook}</pre>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-gray-500">
              Todavía no se generó ningún playbook. Tocá <span className="font-semibold text-violet-600">Regenerar</span> para que el coach analice tus mensajes pasados y genere uno.
            </div>
          )}

          {insights?.metrics?.by_sector?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider mb-1.5">Sectores con mejor tasa de respuesta</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {insights.metrics.by_sector.slice(0, 6).map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-violet-50/50 border border-violet-100 rounded-lg">
                    <span className="text-[12px] text-gray-700 truncate">{s.sector}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 h-1.5 bg-violet-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${Math.min(100, s.reply_rate)}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-violet-700 w-10 text-right">{s.reply_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights?.metrics?.by_length?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider mb-1.5">Longitud vs respuesta</p>
              <div className="flex flex-wrap gap-1.5">
                {insights.metrics.by_length.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50/50 border border-violet-100 rounded-lg">
                    <span className="text-[11px] text-gray-600">{b.bucket}</span>
                    <span className="text-[11px] font-bold text-violet-700">{b.reply_rate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
