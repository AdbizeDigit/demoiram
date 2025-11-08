import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Send, Bot, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function ChatbotDemo() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await axios.post('/api/chatbot', {
        message: userMessage,
        history: messages
      })

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response
      }])
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, ha ocurrido un error. Por favor, intenta de nuevo.'
      }])
    }

    setLoading(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div>
      <Link to="/" className="inline-flex items-center px-4 py-2 rounded-xl glass-effect hover:bg-white/50 transition-all duration-300 mb-8 group">
        <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        <span className="font-semibold">Volver al inicio</span>
      </Link>

      <div className="card max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <div className="relative mr-5">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl blur-lg opacity-75 animate-pulse"></div>
            <div className="relative w-16 h-16 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center animate-float">
              <Bot className="text-white" size={32} />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold liquid-text mb-1">Chatbot con IA</h2>
            <p className="text-gray-600 font-medium">Asistente virtual inteligente</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 h-[500px] overflow-y-auto mb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center mr-2 flex-shrink-0 shadow-lg">
                  <Bot className="text-white" size={16} />
                </div>
              )}

              <div
                className={`max-w-[70%] p-4 rounded-2xl shadow-md ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                    : 'bg-white text-gray-800 border-2 border-transparent hover:border-gradient'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center ml-2 flex-shrink-0 shadow-lg">
                  <User className="text-white" size={16} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-2">
                <Bot className="text-white" size={16} />
              </div>
              <div className="bg-white border border-gray-200 p-3 rounded-lg">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            className="input-field flex-1"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="btn-primary px-6 disabled:opacity-50 flex items-center space-x-2"
          >
            <Send size={20} />
            <span>Enviar</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatbotDemo
