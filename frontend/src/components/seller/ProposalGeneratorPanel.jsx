import { useState, useEffect } from 'react'
import { FileText, Loader2, Sparkles, Copy, Check, Calendar, DollarSign } from 'lucide-react'
import api from '../../services/api'

export default function ProposalGeneratorPanel({ leadId }) {
  const [proposals, setProposals] = useState([])
  const [generating, setGenerating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [serviceType, setServiceType] = useState('IA aplicada al negocio')
  const [customInstructions, setCustomInstructions] = useState('')
  const [active, setActive] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get(`/api/seller/leads/${leadId}/proposals`)
      .then(r => setProposals(r.data?.proposals || []))
      .catch(() => {})
  }, [leadId])

  async function generate() {
    setGenerating(true)
    try {
      const { data } = await api.post(`/api/seller/leads/${leadId}/proposal`, {
        service_type: serviceType,
        custom_instructions: customInstructions
      })
      const p = data?.proposal
      setActive(p)
      setShowForm(false)
      // Refresh list
      const r = await api.get(`/api/seller/leads/${leadId}/proposals`)
      setProposals(r.data?.proposals || [])
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al generar propuesta')
    } finally {
      setGenerating(false)
    }
  }

  function copyMarkdown() {
    if (!active?.body_md) return
    navigator.clipboard.writeText(active.body_md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-1.5 rounded-lg">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Propuesta IA <span className="text-[10px] font-normal text-gray-500">({proposals.length})</span></h3>
          </div>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Nueva
        </button>
      </div>

      {showForm && (
        <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/30 space-y-3">
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Servicio a proponer</label>
            <input value={serviceType} onChange={e => setServiceType(e.target.value)}
              className="mt-1 w-full px-3 py-2 ring-1 ring-gray-200 rounded-lg text-sm focus:ring-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Instrucciones específicas (opcional)</label>
            <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)}
              rows={2} placeholder="Ej: enfocar en automatización del área de atención al cliente"
              className="mt-1 w-full px-3 py-2 ring-1 ring-gray-200 rounded-lg text-sm focus:ring-blue-400 focus:outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-xs ring-1 ring-gray-300 px-3 py-1.5 rounded-lg">Cancelar</button>
            <button onClick={generate} disabled={generating}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-50">
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Generar
            </button>
          </div>
        </div>
      )}

      <div className="px-5 py-4">
        {proposals.length === 0 && !active ? (
          <p className="text-center text-xs text-gray-400 py-6">Sin propuestas generadas todavía</p>
        ) : (
          <div className="space-y-2">
            {proposals.map(p => (
              <button key={p.id} onClick={() => setActive(p)}
                className={`w-full text-left p-3 rounded-xl ring-1 transition ${active?.id === p.id ? 'ring-blue-400 bg-blue-50' : 'ring-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800 truncate flex-1">{p.title}</p>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {new Date(p.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{p.status}</p>
              </button>
            ))}
          </div>
        )}

        {active && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-gray-800">{active.title}</h4>
              <button onClick={copyMarkdown} className="text-[11px] flex items-center gap-1 text-blue-600 hover:underline">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? 'Copiado' : 'Copiar markdown'}
              </button>
            </div>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">
              {active.body_md}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
