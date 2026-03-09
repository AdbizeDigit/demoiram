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
    companyName: '',
    industry: '',
    botName: '',
    objective: '',
    targetAudience: '',
    responseStyle: 'profesional',
    language: 'español',
    includeServices: '',
    specialInstructions: '',
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

      // Generar el system prompt automáticamente basado en las respuestas
      const systemPrompt = `Eres ${formData.botName}, el asistente virtual de ${formData.companyName}, una empresa del rubro de ${formData.industry}.

Tu objetivo principal es: ${formData.objective}

Público objetivo: ${formData.targetAudience}

${formData.includeServices ? `Servicios/Productos que ofrece la empresa: ${formData.includeServices}` : ''}

Estilo de comunicación: ${formData.responseStyle === 'profesional' ? 'Mantén un tono profesional y formal' : formData.responseStyle === 'amigable' ? 'Sé amigable y cercano' : formData.responseStyle === 'casual' ? 'Usa un tono casual y relajado' : 'Sé empático y comprensivo'}

Idioma: Responde siempre en ${formData.language}

${formData.specialInstructions ? `Instrucciones especiales: ${formData.specialInstructions}` : ''}

Recuerda siempre:
- Ser útil y preciso en tus respuestas
- Mantener el tono apropiado según el contexto
- Representar profesionalmente a ${formData.companyName}
- Si no sabes algo, sé honesto y ofrece ayuda alternativa`

      const chatbotData = {
        name: formData.botName,
        description: `Asistente virtual para ${formData.companyName} - ${formData.industry}`,
        systemPrompt: systemPrompt,
        personality: formData.responseStyle,
        tone: formData.responseStyle,
        temperature: formData.temperature,
        maxTokens: formData.maxTokens
      }

      const response = await api.post('/api/custom-chatbot/create', chatbotData)

      setChatbots([response.data.chatbot, ...chatbots])
      setStats(prev => ({
        ...prev,
        count: prev.count + 1,
        remaining: prev.remaining - 1
      }))

      setShowCreateForm(false)
      setFormData({
        companyName: '',
        industry: '',
        botName: '',
        objective: '',
        targetAudience: '',
        responseStyle: 'profesional',
        language: 'español',
        includeServices: '',
        specialInstructions: '',
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

  const responseStyles = [
    { value: 'profesional', label: 'Profesional y Formal' },
    { value: 'amigable', label: 'Amigable y Cercano' },
    { value: 'casual', label: 'Casual y Relajado' },
    { value: 'empatico', label: 'Empático y Comprensivo' }
  ]

  const languages = [
    { value: 'español', label: 'Español' },
    { value: 'inglés', label: 'Inglés' },
    { value: 'portugués', label: 'Portugués' },
    { value: 'bilingüe (español-inglés)', label: 'Bilingüe (Español-Inglés)' }
  ]

  const industries = [
    'Tecnología',
    'Salud y Medicina',
    'Educación',
    'Retail y Comercio',
    'Servicios Financieros',
    'Hospitalidad y Turismo',
    'Inmobiliaria',
    'Marketing y Publicidad',
    'Legal',
    'Manufactura',
    'Alimentos y Bebidas',
    'Deportes y Fitness',
    'Otro'
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Futuristic Header */}
      <div className="mb-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span>VOLVER</span>
        </button>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-8 mb-8">
          {/* Animated grid background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '30px 30px',
              animation: 'slide 15s linear infinite'
            }}></div>
          </div>

          {/* Floating orbs */}
          <div className="absolute top-5 right-20 w-24 h-24 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-5 left-20 w-32 h-32 bg-cyan-300/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>

          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-black mb-3 bg-gradient-to-r from-yellow-200 via-pink-200 to-cyan-200 bg-clip-text text-transparent">
                CHATBOTS PERSONALIZADOS
              </h1>
              <p className="text-white/90 text-lg flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                {stats.remaining} de {stats.limit} disponibles
              </p>
            </div>
            {stats.remaining > 0 && !showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl text-white font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <Plus size={20} />
                <span>CREAR NUEVO</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm backdrop-blur-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Lista de chatbots */}
        <div className="lg:col-span-1">
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 sticky top-4 shadow-2xl">
            {/* Glowing effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 opacity-50"></div>

            <h2 className="relative text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-5">MIS CHATBOTS</h2>

            {loading && chatbots.length === 0 ? (
              <div className="relative text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mx-auto"></div>
              </div>
            ) : chatbots.length === 0 ? (
              <div className="relative text-center py-12 text-gray-400">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-sm">No tienes chatbots</p>
                <p className="text-xs text-gray-500 mt-2">Crea tu primer chatbot IA</p>
              </div>
            ) : (
              <div className="relative space-y-3">
                {chatbots.map(chatbot => (
                  <div
                    key={chatbot.id}
                    className={`relative p-4 rounded-xl border transition-all duration-300 cursor-pointer group ${
                      selectedChatbot?.id === chatbot.id
                        ? 'bg-gradient-to-br from-purple-600/30 to-cyan-600/30 border-cyan-400 shadow-lg shadow-cyan-500/20'
                        : 'bg-gray-800/50 border-gray-700 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        onClick={() => handleSelectChatbot(chatbot)}
                        className="flex-1"
                      >
                        <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                          <MessageSquare size={14} className="text-cyan-400" />
                          {chatbot.name}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {chatbot.description || 'Sin descripción'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteChatbot(chatbot.id)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Selection indicator */}
                    {selectedChatbot?.id === chatbot.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-gradient-to-b from-purple-400 to-cyan-400 rounded-r-full"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main content - Formulario o Chat */}
        <div className="lg:col-span-2">
          {showCreateForm ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 opacity-50"></div>

              <h2 className="relative text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-6">
                CREAR NUEVO CHATBOT
              </h2>

              <form onSubmit={handleCreateChatbot} className="relative space-y-6">
                {/* Información de la Empresa */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-cyan-400 rounded-full"></div>
                    Información de la Empresa
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ¿Cuál es el nombre de tu empresa? *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 focus:outline-none focus:border-cyan-500 text-white text-sm placeholder-gray-500 transition-all"
                      placeholder="Ej: Adbize Solutions"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ¿A qué rubro pertenece tu empresa? *
                    </label>
                    <select
                      required
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 focus:outline-none focus:border-cyan-500 text-white text-sm transition-all"
                    >
                      <option value="">Selecciona un rubro</option>
                      {industries.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Configuración del Bot */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-cyan-400 rounded-full"></div>
                    Configuración del Chatbot
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ¿Cómo se llamará tu chatbot? *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.botName}
                      onChange={(e) => setFormData({ ...formData, botName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 focus:outline-none focus:border-cyan-500 text-white text-sm placeholder-gray-500 transition-all"
                      placeholder="Ej: Sofia, Asistente Virtual, Bot de Ventas"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ¿Cuál es el objetivo principal del chatbot? *
                    </label>
                    <textarea
                      required
                      value={formData.objective}
                      onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 focus:outline-none focus:border-cyan-500 text-white text-sm placeholder-gray-500 transition-all"
                      rows="3"
                      placeholder="Ej: Atender consultas de clientes, proporcionar información sobre productos, agendar citas, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ¿A quién está dirigido? (Público objetivo) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.targetAudience}
                      onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 focus:outline-none focus:border-cyan-500 text-white text-sm placeholder-gray-500 transition-all"
                      placeholder="Ej: Clientes potenciales, usuarios actuales, empresas B2B"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ¿Qué servicios o productos ofrece tu empresa? (Opcional)
                    </label>
                    <textarea
                      value={formData.includeServices}
                      onChange={(e) => setFormData({ ...formData, includeServices: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 focus:outline-none focus:border-cyan-500 text-white text-sm placeholder-gray-500 transition-all"
                      rows="2"
                      placeholder="Ej: Desarrollo web, consultoría, diseño gráfico, etc."
                    />
                  </div>
                </div>

                {/* Personalización */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-cyan-400 rounded-full"></div>
                    Personalización
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Estilo de comunicación *
                      </label>
                      <select
                        value={formData.responseStyle}
                        onChange={(e) => setFormData({ ...formData, responseStyle: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 focus:outline-none focus:border-cyan-500 text-white text-sm transition-all"
                      >
                        {responseStyles.map(style => (
                          <option key={style.value} value={style.value}>{style.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Idioma *
                      </label>
                      <select
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 focus:outline-none focus:border-cyan-500 text-white text-sm transition-all"
                      >
                        {languages.map(lang => (
                          <option key={lang.value} value={lang.value}>{lang.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Instrucciones especiales (Opcional)
                    </label>
                    <textarea
                      value={formData.specialInstructions}
                      onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 focus:outline-none focus:border-cyan-500 text-white text-sm placeholder-gray-500 transition-all"
                      rows="2"
                      placeholder="Ej: Siempre mencionar promociones, nunca discutir precios, incluir enlaces a recursos"
                    />
                  </div>
                </div>

                {/* Configuración Avanzada */}
                <div className="space-y-4 pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-cyan-400 rounded-full"></div>
                    Configuración Avanzada (Opcional)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Creatividad: <span className="text-cyan-400">{formData.temperature}</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={formData.temperature}
                        onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Preciso</span>
                        <span>Creativo</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Longitud de respuesta: <span className="text-cyan-400">{formData.maxTokens}</span>
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="2000"
                        step="100"
                        value={formData.maxTokens}
                        onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Corta</span>
                        <span>Larga</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-6 border-t border-gray-700">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-6 py-4 rounded-xl hover:from-purple-700 hover:to-cyan-700 transition-all disabled:opacity-50 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>CREANDO TU CHATBOT...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        <span>CREAR MI CHATBOT</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-8 py-4 rounded-xl border border-gray-600 hover:bg-gray-800 hover:border-gray-500 transition-all text-sm font-medium text-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          ) : selectedChatbot ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 h-[600px] flex flex-col shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 opacity-50"></div>

              {/* Chat header */}
              <div className="relative border-b border-gray-700 pb-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <MessageSquare size={20} className="text-cyan-400" />
                      {selectedChatbot.name}
                    </h2>
                    <p className="text-sm text-gray-400">{selectedChatbot.description}</p>
                  </div>
                  <button
                    onClick={() => setMessages([])}
                    className="px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-600 hover:bg-gray-700 text-xs font-medium text-gray-300 transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="relative flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div className="flex flex-col items-start max-w-[80%]">
                      <div
                        className={`w-full px-4 py-3 rounded-2xl text-sm shadow-lg ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-purple-600 to-cyan-600 text-white'
                            : msg.error
                            ? 'bg-red-500/20 text-red-200 border border-red-500/50'
                            : 'bg-gray-800/80 text-gray-100 border border-gray-700'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-gray-800/80 border border-gray-700 px-4 py-3 rounded-2xl shadow-lg">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="relative flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 focus:outline-none focus:border-cyan-500 text-white text-sm placeholder-gray-500 transition-all"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !inputMessage.trim()}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          ) : (
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 h-[600px] flex items-center justify-center shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5"></div>
              <div className="relative text-center">
                <MessageSquare size={64} className="mx-auto mb-4 text-gray-700" />
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  Selecciona un Chatbot
                </h3>
                <p className="text-sm text-gray-500">
                  Elige un chatbot de la lista para comenzar a chatear
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
