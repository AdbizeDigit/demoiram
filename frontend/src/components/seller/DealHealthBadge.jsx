import { useState, useEffect } from 'react'
import { Activity, Loader2, Flame, Snowflake } from 'lucide-react'
import api from '../../services/api'

const TIER_CFG = {
  hot:  { label: 'Caliente', bg: 'bg-red-100',     text: 'text-red-700',     icon: Flame, color: '#dc2626' },
  warm: { label: 'Tibio',    bg: 'bg-amber-100',   text: 'text-amber-700',   icon: Activity, color: '#d97706' },
  cool: { label: 'Templado', bg: 'bg-blue-100',    text: 'text-blue-700',    icon: Activity, color: '#2563eb' },
  cold: { label: 'Frío',     bg: 'bg-gray-200',    text: 'text-gray-700',    icon: Snowflake, color: '#6b7280' },
}

export default function DealHealthBadge({ leadId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    let mounted = true
    api.get(`/api/seller/leads/${leadId}/health`)
      .then(r => { if (mounted) { setData(r.data); setLoading(false) } })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [leadId])

  if (loading) return <div className="inline-flex items-center gap-1 text-[10px] text-gray-400"><Loader2 className="w-2.5 h-2.5 animate-spin" /> Health...</div>
  if (!data) return null

  const cfg = TIER_CFG[data.tier] || TIER_CFG.cool
  const Icon = cfg.icon

  return (
    <div className="relative">
      <button onClick={() => setShowDetails(s => !s)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text} hover:ring-2 ring-offset-1 ring-gray-200`}>
        <Icon className="w-3 h-3" />
        Health {data.health}/100 · {cfg.label}
      </button>
      {showDetails && (
        <div className="absolute z-50 right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl ring-1 ring-gray-200 p-4">
          <p className="text-xs font-bold text-gray-800 mb-2">Cómo se calcula</p>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between"><span className="text-gray-600">Etapa</span><span className="font-bold">+{data.breakdown.stageScore}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Respuestas</span><span className="font-bold text-emerald-600">+{data.breakdown.replyBonus}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Aperturas email</span><span className="font-bold text-blue-600">+{data.breakdown.opensBonus}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Score IA</span><span className="font-bold">+{data.breakdown.scoreBoost}</span></div>
            {data.breakdown.cooldownPenalty > 0 && (
              <div className="flex justify-between"><span className="text-gray-600">Inactividad</span><span className="font-bold text-red-600">-{data.breakdown.cooldownPenalty}</span></div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-1 mt-1"><span className="font-bold">Total</span><span className="font-bold">{data.health}</span></div>
          </div>
          {data.reasons?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Razones</p>
              <ul className="space-y-0.5">
                {data.reasons.map((r, i) => <li key={i} className="text-[11px] text-gray-700">• {r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
