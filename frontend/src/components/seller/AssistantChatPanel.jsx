import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, Send, Loader2, User, Sparkles } from 'lucide-react'
import api from '../../services/api'

const SUGGESTIONS = [
  '¿Qué le digo si dice que es caro?',
  'Armame un mensaje para reactivar a este lead',
  'Resumime el histórico en 3 líneas',
  '¿Qué casos de éxito puedo mencionar?',
]

export default function AssistantChatPanel({ leadId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/api/seller/leads/${leadId}/assistant`)
      setMessages(data?.messages || [])
    } catch (err) {
      console.error('Error chat:', err)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => { load() }, [load])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(text) {
    const q = (text || input).trim()
    if (!q || sending) return
    setInput('')
    setSending(true)
    setMessages(prev => [...prev, { role: 'user', content: q, at: new Date().toISOString() }])
    try {
      const { data } = await api.post(`/api/seller/leads/${leadId}/assistant`, { question: q })
      setMessages(data?.messages || [])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error al consultar la IA. Reintentá.', at: new Date().toISOString() }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col" style={{ maxHeight: 480 }}>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <div className="bg-gradient-to-br from-violet-500 to-blue-500 p-1.5 rounded-lg">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">Asistente IA</h3>
          <p className="text-[10px] text-gray-500">Te ayuda con este lead específico</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0" style={{ minHeight: 240 }}>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-violet-500 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 text-center py-2">Probá una de estas preguntas:</p>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="w-full text-left text-xs px-3 py-2 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-800 ring-1 ring-violet-100 flex items-start gap-2">
                <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" /> {s}
              </button>
            ))}
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <div className="bg-gray-100 px-3 py-2 rounded-xl">
                  <Loader2 className="w-3 h-3 text-violet-500 animate-spin" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </>
        )}
      </div>

      <div className="px-3 py-3 border-t border-gray-100">
        <form onSubmit={e => { e.preventDefault(); send() }} className="flex gap-2">
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Pregúntale al asistente..."
            disabled={sending}
            className="flex-1 px-3 py-2 ring-1 ring-gray-200 rounded-lg text-xs focus:ring-violet-400 focus:outline-none"
          />
          <button type="submit" disabled={sending || !input.trim()}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg flex items-center">
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </form>
      </div>
    </div>
  )
}
