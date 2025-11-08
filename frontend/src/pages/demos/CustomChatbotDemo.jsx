import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Plus, Trash2, Send, ArrowLeft, Edit2, Settings, Sparkles } from 'lucide-react'
import api from '../../services/api'

function CustomChatbotDemo() {
  const navigate = useNavigate()
  const [chatbots, setChatbots] = useState([])
  const [selectedChatbot, setSelectedChatbot] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ count: 0, limit: 3, remaining: 3 })

  // Chat state
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const chatEndRef = useRef(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    personality: 'profesional',
    tone: 'amigable',
    temperature: 0.7,
    maxTokens: 500
  })

  useEffect(() => {
    fetchChatbots()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchChatbots = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/custom-chatbot/list')
      setChatbots(response.data.chatbots)
      setStats({
        count: response.data.count,
        limit: response.data.limit,
        remaining: response.data.remaining
      })
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar los chatbots')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateChatbot = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)

      const response = await api.post('/api/custom-chatbot/create', formData)

      setChatbots([response.data.chatbot, ...chatbots])
      setStats(prev => ({
        ...prev,
        count: prev.count + 1,
        remaining: prev.remaining - 1
      }))

      setShowCreateForm(false)
      setFormData({
        name: '',
        description: '',
        systemPrompt: '',
        personality: 'profesional',
        tone: 'amigable',
        temperature: 0.7,
        maxTokens: 500
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el chatbot')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteChatbot = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este chatbot?')) return

    try {
      await api.delete(`/api/custom-chatbot/${id}`)
      setChatbots(chatbots.filter(bot => bot.id !== id))
      setStats(prev => ({
        ...prev,
        count: prev.count - 1,
        remaining: prev.remaining + 1
      }))
      if (selectedChatbot?.id === id) {
        setSelectedChatbot(null)
        setMessages([])
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar el chatbot')
    }
  }

  const handleSelectChatbot = (chatbot) => {
    setSelectedChatbot(chatbot)
    setMessages([
      {
        role: 'assistant',
        content: `¡Hola! Soy ${chatbot.name}. ${chatbot.description || '¿En qué puedo ayudarte hoy?'}`
      }
    ])
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || !selectedChatbot) return

    const userMessage = { role: 'user', content: inputMessage }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setChatLoading(true)

    try {
      const response = await api.post(`/api/custom-chatbot/${selectedChatbot.id}/chat`, {
        message: inputMessage,
        history: messages
      })

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        error: true
      }])
      setError(err.response?.data?.error || 'Error al enviar el mensaje')
    } finally {
      setChatLoading(false)
    }
  }

  const personalities = [
    { value: 'profesional', label: 'Profesional' },
    { value: 'creativo', label: 'Creativo' },
    { value: 'tecnico', label: 'Técnico' },
    { value: 'casual', label: 'Casual' },
    { value: 'academico', label: 'Académico' }
  ]

  const tones = [
    { value: 'amigable', label: 'Amigable' },
    { value: 'formal', label: 'Formal' },
    { value: 'divertido', label: 'Divertido' },
    { value: 'empatico', label: 'Empático' },
    { value: 'directo', label: 'Directo' }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Volver al Dashboard</span>
        </button>

        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          <span className="liquid-text">Chatbots Personalizados</span>
        </h1>
        <p className="text-gray-600 text-lg">
          Crea hasta {stats.limit} chatbots personalizados con IA de DeepSeek
        </p>

        <div className="mt-4 flex items-center space-x-4">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full glass-effect">
            <Sparkles className="text-purple-500" size={20} />
            <span className="text-sm font-semibold text-gray-700">
              {stats.remaining} de {stats.limit} chatbots disponibles
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Lista de chatbots */}
        <div className="lg:col-span-1">
          <div className="card sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Mis Chatbots</h2>
              {stats.remaining > 0 && (
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg transition-all"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>

            {loading && chatbots.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
              </div>
            ) : chatbots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare size={48} className="mx-auto mb-2 opacity-30" />
                <p>No tienes chatbots aún</p>
                <p className="text-sm">Crea tu primer chatbot</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatbots.map(chatbot => (
                  <div
                    key={chatbot.id}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedChatbot?.id === chatbot.id
                        ? 'bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        onClick={() => handleSelectChatbot(chatbot)}
                        className="flex-1"
                      >
                        <h3 className="font-bold text-gray-900">{chatbot.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {chatbot.description || 'Sin descripción'}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                            {chatbot.personality}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            {chatbot.tone}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteChatbot(chatbot.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main content - Formulario o Chat */}
        <div className="lg:col-span-2">
          {showCreateForm ? (
            <div className="card">
              <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                <Settings size={24} className="text-purple-500" />
                <span>Crear Nuevo Chatbot</span>
              </h2>

              <form onSubmit={handleCreateChatbot} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre del Chatbot *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ej: Asistente de Marketing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows="2"
                    placeholder="Breve descripción del chatbot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Instrucciones del Sistema (Prompt) *
                  </label>
                  <textarea
                    required
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows="6"
                    placeholder="Ej: Eres un experto en marketing digital. Ayudas a las empresas a crear estrategias efectivas..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Define cómo debe comportarse tu chatbot y qué conocimientos debe tener
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Personalidad
                    </label>
                    <select
                      value={formData.personality}
                      onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {personalities.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tono
                    </label>
                    <select
                      value={formData.tone}
                      onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {tones.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Temperatura ({formData.temperature})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Menor = más preciso, Mayor = más creativo
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tokens Máximos ({formData.maxTokens})
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="100"
                      value={formData.maxTokens}
                      onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Longitud máxima de la respuesta
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 btn-primary flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Creando...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        <span>Crear Chatbot</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          ) : selectedChatbot ? (
            <div className="card h-[600px] flex flex-col">
              {/* Chat header */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedChatbot.name}</h2>
                    <p className="text-sm text-gray-600">{selectedChatbot.description}</p>
                  </div>
                  <button
                    onClick={() => setMessages([])}
                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold transition-colors"
                  >
                    Limpiar Chat
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                          : msg.error
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !inputMessage.trim()}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          ) : (
            <div className="card h-[600px] flex items-center justify-center">
              <div className="text-center">
                <MessageSquare size={64} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">
                  Selecciona o crea un chatbot
                </h3>
                <p className="text-gray-500">
                  Elige un chatbot de la lista o crea uno nuevo para comenzar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomChatbotDemo
