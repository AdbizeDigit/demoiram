import { useState, useEffect, useMemo } from 'react'
import { Swords, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../services/api'

export default function BattlecardsPanel({ lead, leadId }) {
  const [battlecards, setBattlecards] = useState([])
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    api.get('/api/seller/battlecards').then(r => setBattlecards(r.data?.battlecards || [])).catch(() => {})
  }, [])

  // Detecta competidores en la descripción del lead, web, o histórico
  const text = useMemo(() => {
    return [lead?.description, lead?.website, lead?.name].filter(Boolean).join(' ').toLowerCase()
  }, [lead])

  const matches = useMemo(() => {
    if (!text || !battlecards.length) return []
    return battlecards.filter(b => {
      const names = [b.competitor_name, ...(b.aliases || [])].filter(Boolean).map(s => s.toLowerCase())
      return names.some(n => text.includes(n))
    })
  }, [text, battlecards])

  if (!matches.length) return null

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-200 shadow-sm">
      <div className="px-5 py-3 border-b border-red-100 flex items-center gap-2">
        <div className="bg-red-600 p-1.5 rounded-lg">
          <Swords className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">⚔️ Competidores detectados</h3>
          <p className="text-[10px] text-gray-500">Battlecards listas para usar en la conversación</p>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        {matches.map(b => {
          const isOpen = expanded[b.id]
          const diffs = Array.isArray(b.differentiators) ? b.differentiators : []
          const objs = Array.isArray(b.objection_responses) ? b.objection_responses : []
          return (
            <div key={b.id} className="bg-white rounded-xl ring-1 ring-red-100 overflow-hidden">
              <button onClick={() => setExpanded(e => ({ ...e, [b.id]: !e[b.id] }))}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-50">
                <span className="text-sm font-bold text-gray-800">vs {b.competitor_name}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                  {diffs.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Nuestros diferenciadores</p>
                      <ul className="space-y-1">
                        {diffs.map((d, i) => (
                          <li key={i} className="text-xs text-gray-700">
                            <strong>{d.point || d}</strong>
                            {d.proof && <span className="text-gray-500"> — {d.proof}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {objs.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-orange-700 uppercase mb-1">Respuestas a objeciones</p>
                      <div className="space-y-1.5">
                        {objs.map((o, i) => (
                          <div key={i} className="text-xs bg-orange-50 rounded-lg p-2">
                            <p className="font-bold text-gray-800">"{o.objection || o.q}"</p>
                            <p className="text-gray-700 mt-0.5">→ {o.response || o.a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {b.notes && <p className="text-[11px] text-gray-600 italic">{b.notes}</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
