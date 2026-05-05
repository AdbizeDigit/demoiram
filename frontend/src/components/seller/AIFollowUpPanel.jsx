import { useState } from 'react'
import { Brain, Loader2, Mail, MessageCircle, Phone, Copy, Check, Send } from 'lucide-react'
import api from '../../services/api'

const CHANNEL_CFG = {
  EMAIL: { icon: Mail, label: 'Email', color: 'bg-blue-100 text-blue-700' },
  WHATSAPP: { icon: MessageCircle, label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-700' },
  CALL: { icon: Phone, label: 'Llamada', color: 'bg-violet-100 text-violet-700' },
}

export default function AIFollowUpPanel({ leadId }) {
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [marking, setMarking] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    setCopied(false)
    try {
      const { data } = await api.post(`/api/seller/leads/${leadId}/ai-followup`)
      setSuggestion(data?.suggestion || null)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo generar la sugerencia')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard() {
    if (!suggestion) return
    const text = suggestion.subject ? `${suggestion.subject}\n\n${suggestion.body}` : suggestion.body
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function markUsed() {
    if (!suggestion?.id) return
    setMarking(true)
    try {
      await api.patch(`/api/seller/suggestions/${suggestion.id}/use`)
    } finally {
      setMarking(false)
    }
  }

  const channelKey = (suggestion?.channel || 'EMAIL').toUpperCase()
  const cfg = CHANNEL_CFG[channelKey] || CHANNEL_CFG.EMAIL
  const ChannelIcon = cfg.icon

  return (
    <div className="bg-gradient-to-br from-violet-50 via-white to-blue-50 rounded-2xl border border-violet-100 shadow-sm">
      <div className="px-6 py-4 border-b border-violet-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-violet-600 p-1.5 rounded-lg">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Seguimiento sugerido por IA</h3>
            <p className="text-[10px] text-gray-500">Personalizado con histórico del lead</p>
          </div>
        </div>
        <button onClick={generate} disabled={loading}
          className="text-[11px] bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-50">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
          {suggestion ? 'Regenerar' : 'Generar sugerencia'}
        </button>
      </div>

      <div className="px-6 py-5">
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {!suggestion ? (
          <div className="text-center py-8">
            <Brain className="w-10 h-10 text-violet-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">La IA analiza el histórico del lead y sugiere el mejor próximo movimiento.</p>
            <p className="text-[11px] text-gray-400 mt-1">Hacé click en "Generar sugerencia" arriba.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${cfg.color}`}>
                <ChannelIcon className="w-3 h-3" /> {cfg.label}
              </span>
              {suggestion.subject && <span className="text-xs font-semibold text-gray-700">{suggestion.subject}</span>}
            </div>
            <div className="bg-white ring-1 ring-violet-100 rounded-xl p-4">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{suggestion.body}</p>
            </div>
            {suggestion.reasoning && (
              <div className="bg-violet-50/60 rounded-lg p-2 text-[11px] text-violet-700">
                <strong>Razón:</strong> {suggestion.reasoning}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={copyToClipboard}
                className="text-xs ring-1 ring-violet-300 text-violet-700 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 hover:bg-violet-50">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button onClick={markUsed} disabled={marking}
                className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-50">
                {marking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Marcar como usada
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
