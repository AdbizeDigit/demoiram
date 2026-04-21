import { useState, useEffect, useCallback } from 'react'
import { Cpu, Activity, Loader2, ChevronUp, ChevronDown, Lock, Unlock, RotateCcw } from 'lucide-react'
import api from '../../services/api'

/**
 * Auto-Improve Panel
 *
 * Shows scoring distribution, active generation params per (channel, sector),
 * lets the user freeze/rollback versions, and shows the last tuning cycle
 * summary. Reads from /api/outreach/auto-improve/*.
 */
export default function AutoImprovePanel() {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [paramsHistory, setParamsHistory] = useState({})

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/outreach/auto-improve/summary')
      if (data?.success) setState(data)
    } catch {}
  }, [])

  const runNow = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/api/outreach/auto-improve/run-now', {}, { timeout: 180000 })
      if (data?.success) await load()
    } catch (err) {
      console.error('Run tuning failed:', err?.response?.data?.error || err.message)
    }
    setLoading(false)
  }, [load])

  const loadHistory = useCallback(async (channel, sector) => {
    const key = `${channel}::${sector}`
    try {
      const { data } = await api.get(`/api/outreach/auto-improve/params/${channel}/${sector}/history`)
      if (data?.success) setParamsHistory(prev => ({ ...prev, [key]: data.history }))
    } catch {}
  }, [])

  const toggleFreeze = useCallback(async (id, frozen) => {
    try {
      const endpoint = frozen ? 'unfreeze' : 'freeze'
      await api.post(`/api/outreach/auto-improve/params/${id}/${endpoint}`)
      await load()
    } catch (err) {
      console.error('Freeze toggle failed:', err?.response?.data?.error || err.message)
    }
  }, [load])

  const rollback = useCallback(async (id) => {
    if (!confirm('Restaurar esta versión como activa? La versión actual pasará a histórico.')) return
    try {
      await api.post(`/api/outreach/auto-improve/params/${id}/rollback`)
      await load()
    } catch (err) {
      console.error('Rollback failed:', err?.response?.data?.error || err.message)
    }
  }, [load])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const iv = setInterval(load, 60000)
    return () => clearInterval(iv)
  }, [load])

  const s = state?.scoring || { buckets: {} }
  const b = s.buckets || {}
  const cells = [
    { label: 'Score promedio', value: s.avg_score != null ? s.avg_score.toFixed(1) : '—', sub: `${s.scored || 0} scored · ${s.pending || 0} pend.` },
    { label: 'Ganados (100)', value: b.won || 0, sub: 'lead → GANADO', color: 'text-emerald-700' },
    { label: 'Calificados (80)', value: (b.qualified || 0) + (b.engaged || 0), sub: 'en propuesta/conversación', color: 'text-sky-700' },
    { label: 'Respondidos', value: (b.positive_reply || 0) + (b.neutral_reply || 0) + (b.negative_reply || 0), sub: `${b.positive_reply || 0} + / ${b.negative_reply || 0} −`, color: 'text-amber-700' },
    { label: 'Silenciosos', value: b.silent || 0, sub: `${b.opened_no_reply || 0} abiertos s/resp.`, color: 'text-gray-500' },
  ]

  return (
    <div className="bg-gradient-to-br from-sky-50 via-white to-emerald-50 border border-sky-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-sky-100 bg-white/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-800">Auto-Mejora</h3>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700">scoring + tuning</span>
              {state?.last_run?.at && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  último ciclo {new Date(state.last_run.at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 truncate">
              Una vez al día puntúa mensajes (0-100) y muta parámetros por sector. Si una versión nueva rinde peor, rollback automático.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={runNow}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-br from-sky-500 to-emerald-500 hover:opacity-90 rounded-lg disabled:opacity-50 transition-opacity">
            {loading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Corriendo...</>) : (<><Activity className="w-3.5 h-3.5" /> Correr ciclo</>)}
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-sky-100">
        {cells.map((c, i) => (
          <div key={i} className="bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-wider">{c.label}</p>
            <p className={`text-lg font-bold leading-tight ${c.color || 'text-gray-800'}`}>{c.value}</p>
            <p className="text-[10px] text-gray-400 truncate">{c.sub}</p>
          </div>
        ))}
      </div>

      {expanded && (
        <div className="px-5 py-4 bg-white/70 border-t border-sky-100 space-y-4">
          <div>
            <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-wider mb-2">Parámetros activos por canal + sector</p>
            {(state?.params || []).length === 0 ? (
              <p className="text-xs text-gray-500">Todavía no hay parámetros cargados. Se inicializan automáticamente al arrancar el backend.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-sky-100 text-left text-[10px] font-semibold text-sky-600 uppercase tracking-wider">
                      <th className="py-1.5 pr-3">Canal</th>
                      <th className="py-1.5 pr-3">Sector</th>
                      <th className="py-1.5 pr-3">v</th>
                      <th className="py-1.5 pr-3">Temp</th>
                      <th className="py-1.5 pr-3">Palabras</th>
                      <th className="py-1.5 pr-3">Tono</th>
                      <th className="py-1.5 pr-3">CTA</th>
                      <th className="py-1.5 pr-3">Apertura</th>
                      <th className="py-1.5 pr-3">Score</th>
                      <th className="py-1.5 pr-3">n</th>
                      <th className="py-1.5 pr-3">Origen</th>
                      <th className="py-1.5 pr-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(state?.params || []).flatMap(p => {
                      const key = `${p.channel}::${p.sector}`
                      const hist = paramsHistory[key]
                      const rows = [(
                        <tr key={p.id} className="border-b border-sky-50 hover:bg-sky-50/40">
                          <td className="py-1.5 pr-3 font-semibold text-gray-700">{p.channel}</td>
                          <td className="py-1.5 pr-3 text-gray-600">{p.sector}</td>
                          <td className="py-1.5 pr-3 font-mono text-gray-700">v{p.version}</td>
                          <td className="py-1.5 pr-3 font-mono text-gray-700">{p.temperature}</td>
                          <td className="py-1.5 pr-3 font-mono text-gray-700">{p.max_words}</td>
                          <td className="py-1.5 pr-3 text-gray-600 truncate max-w-[120px]">{(p.tone_keywords || []).join(', ')}</td>
                          <td className="py-1.5 pr-3 text-gray-600">{p.cta_intensity}</td>
                          <td className="py-1.5 pr-3 text-gray-600">{p.opening_style}</td>
                          <td className="py-1.5 pr-3 font-bold text-sky-700">{p.avg_score != null ? p.avg_score.toFixed(1) : '—'}</td>
                          <td className="py-1.5 pr-3 text-gray-500">{p.scored_count}</td>
                          <td className="py-1.5 pr-3">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.origin === 'exploit' ? 'bg-emerald-100 text-emerald-700' : p.origin === 'explore' ? 'bg-amber-100 text-amber-700' : p.origin === 'seed' ? 'bg-gray-100 text-gray-600' : 'bg-sky-100 text-sky-700'}`}>
                              {p.origin}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => toggleFreeze(p.id, p.frozen)}
                                title={p.frozen ? 'Reanudar exploración' : 'Congelar (pausar exploración)'}
                                className={`p-1 rounded hover:bg-white ${p.frozen ? 'text-amber-600' : 'text-gray-400 hover:text-gray-700'}`}>
                                {p.frozen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => {
                                  if (hist) {
                                    setParamsHistory(prev => { const n = { ...prev }; delete n[key]; return n })
                                  } else {
                                    loadHistory(p.channel, p.sector)
                                  }
                                }}
                                title="Ver historial de versiones"
                                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-white">
                                {hist ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )]
                      if (hist && hist.length > 0) {
                        rows.push(
                          <tr key={`${p.id}-hist`} className="bg-sky-50/30">
                            <td colSpan={12} className="py-2 px-3">
                              <p className="text-[10px] font-semibold text-sky-700 uppercase tracking-wider mb-1">Historial ({p.channel} · {p.sector})</p>
                              <div className="space-y-1">
                                {hist.map(h => (
                                  <div key={h.id} className="flex items-center gap-2 text-[10px] text-gray-600 font-mono">
                                    <span className={`inline-block w-12 font-bold ${h.is_active ? 'text-emerald-700' : 'text-gray-400'}`}>v{h.version}{h.is_active ? '★' : ''}</span>
                                    <span className="w-20">{h.origin}</span>
                                    <span className="w-14">t={h.temperature}</span>
                                    <span className="w-16">w={h.max_words}</span>
                                    <span className="w-14">cta={h.cta_intensity}</span>
                                    <span className="w-20 truncate">{h.opening_style}</span>
                                    <span className="w-16 font-bold text-sky-700">{h.avg_score != null ? `avg=${h.avg_score.toFixed(1)}` : 'avg=—'}</span>
                                    <span className="w-14">n={h.scored_count}</span>
                                    <span className="flex-1 truncate text-gray-400">{h.notes || ''}</span>
                                    {!h.is_active && (
                                      <button onClick={() => rollback(h.id)} title="Restaurar esta versión" className="p-0.5 text-gray-400 hover:text-sky-700">
                                        <RotateCcw className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )
                      }
                      return rows
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {state?.last_run && (
            <div>
              <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-wider mb-1.5">Último ciclo</p>
              <div className="bg-sky-50/50 border border-sky-100 rounded-lg p-3 text-[11px] text-gray-700 space-y-1">
                <div>
                  <span className="font-semibold">Scoring:</span> {state.last_run.scoring?.scored || 0} nuevos scored / {state.last_run.scoring?.considered || 0} considerados
                  {state.last_run.duration_ms ? ` · ${Math.round(state.last_run.duration_ms / 1000)}s` : ''}
                </div>
                {(state.last_run.buckets || []).filter(b => ['explore','exploit','rollback'].includes(b.action)).slice(0, 8).map((b, i) => (
                  <div key={i} className="font-mono text-[10px]">
                    <span className={`inline-block w-16 ${b.action === 'rollback' ? 'text-amber-700 font-bold' : b.action === 'exploit' ? 'text-emerald-700' : 'text-sky-700'}`}>{b.action}</span>
                    <span className="inline-block w-28">{b.channel} / {b.sector}</span>
                    {b.from_version != null && b.to_version != null && <span>v{b.from_version} → v{b.to_version} </span>}
                    {b.note && <span className="text-gray-500">· {b.note}</span>}
                  </div>
                ))}
                {(state.last_run.buckets || []).every(b => !['explore','exploit','rollback'].includes(b.action)) && (
                  <div className="text-gray-500">Ningún bucket con datos suficientes todavía. Se necesitan al menos 20 mensajes scored por bucket.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
