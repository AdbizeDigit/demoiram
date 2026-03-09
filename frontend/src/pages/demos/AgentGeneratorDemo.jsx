import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Send, Users, Network, Building2, Sparkles, Bot, User, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

function AgentGeneratorDemo() {
  const [step, setStep] = useState('start') // 'start', 'chat', 'hierarchy'
  const [organizationName, setOrganizationName] = useState('')
  const [description, setDescription] = useState('')
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [hierarchy, setHierarchy] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleStart = async (e) => {
    e.preventDefault()
    if (!organizationName.trim()) return

    setLoading(true)
    try {
      const response = await api.post('/api/agent-generator/create', {
        organizationName,
        description
      })

      setSession(response.data.session)
      setMessages([{
        role: 'assistant',
        content: response.data.message
      }])
      setStep('chat')
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Error al crear la sesión')
    }
    setLoading(false)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || !session) return

    const userMessage = { role: 'user', content: inputMessage }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)

    try {
      const response = await api.post(`/api/agent-generator/${session.id}/chat`, {
        message: inputMessage
      })

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response
      }])

      if (response.data.hierarchy) {
        setHierarchy(response.data.hierarchy)
        setStep('hierarchy')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje.',
        error: true
      }])
    }
    setLoading(false)
  }

  const handleReset = () => {
    setStep('start')
    setOrganizationName('')
    setDescription('')
    setSession(null)
    setMessages([])
    setHierarchy(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 md:p-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-8 transition-colors group"
        >
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold">Volver al Dashboard</span>
        </Link>

        {/* Header */}
        <div className="relative mb-12 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 p-8">
          <div className="relative z-10">
            <div className="flex items-center mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4 border border-white/30">
                <Network className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
                  GENERADOR DE AGENTES
                </h1>
                <p className="text-white/90 text-lg flex items-center gap-2">
                  <Sparkles size={18} />
                  Sistema Vanthal - Creación inteligente de jerarquías organizacionales
                </p>
              </div>
            </div>
          </div>

          {/* Decorative grid */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto">
          {step === 'start' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-700/50">
                <div className="text-center mb-8">
                  <Building2 className="w-20 h-20 text-cyan-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-white mb-2">Bienvenido al Generador de Agentes</h2>
                  <p className="text-gray-400">Nuestro Agente Ejecutivo te ayudará a crear una estructura organizacional completa</p>
                </div>

                <form onSubmit={handleStart} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Nombre de la Organización *
                    </label>
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="Ej: TechCorp Solutions"
                      className="w-full px-4 py-3 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Descripción (Opcional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Breve descripción de tu organización..."
                      rows="3"
                      className="w-full px-4 py-3 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Iniciando...
                      </>
                    ) : (
                      <>
                        <Bot size={20} />
                        Iniciar con Agente Ejecutivo
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {step === 'chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chat Panel */}
              <div className="lg:col-span-2">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-gray-700/50 h-[calc(100vh-300px)] flex flex-col">
                  {/* Chat Header */}
                  <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                        <Bot className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Agente Ejecutivo</h3>
                        <p className="text-sm text-green-400">En línea</p>
                      </div>
                    </div>
                    <button
                      onClick={handleReset}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Nueva sesión"
                    >
                      <Trash2 className="text-gray-400" size={20} />
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                      >
                        <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.role === 'user' ? 'bg-cyan-500' : 'bg-blue-500'
                          }`}>
                            {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                          </div>
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              msg.role === 'user'
                                ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white'
                                : msg.error
                                ? 'bg-red-500/20 text-red-200 border border-red-500/50'
                                : 'bg-gray-700/80 text-gray-100 border border-gray-600'
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start animate-fade-in">
                        <div className="flex gap-3 max-w-[80%]">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <Bot size={16} className="text-white" />
                          </div>
                          <div className="bg-gray-700/80 border border-gray-600 px-4 py-3 rounded-2xl">
                            <div className="flex gap-2">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-700/50">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Escribe tu respuesta..."
                        className="flex-1 px-4 py-3 bg-gray-900/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
                        disabled={loading}
                      />
                      <button
                        type="submit"
                        disabled={loading || !inputMessage.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Info Panel */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="text-cyan-400" size={24} />
                  Información
                </h3>
                <div className="space-y-4">
                  <div className="bg-gray-700/50 rounded-xl p-4">
                    <p className="text-sm text-gray-400 mb-1">Organización</p>
                    <p className="text-white font-semibold">{session?.organization_name}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-xl p-4">
                    <p className="text-sm text-gray-400 mb-1">Estado</p>
                    <p className="text-cyan-400 font-semibold capitalize">{session?.status === 'in_progress' ? 'En progreso' : 'Completado'}</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-sm text-blue-300 mb-2">Consejo</p>
                    <p className="text-xs text-gray-300">
                      El agente te guiará paso a paso. Responde con detalle para obtener una estructura más precisa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'hierarchy' && hierarchy && (
            <HierarchyVisualization
              hierarchy={hierarchy}
              onReset={handleReset}
              organizationName={session?.organization_name}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Component for visualizing the hierarchy
function HierarchyVisualization({ hierarchy, onReset, organizationName }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">¡Jerarquía Completada!</h2>
            <p className="text-gray-400">Tu estructura organizacional ha sido generada</p>
          </div>
          <button
            onClick={onReset}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <Trash2 size={20} />
            Nueva Organización
          </button>
        </div>

        {/* Organization Overview */}
        <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-6 mb-6">
          <h3 className="text-2xl font-bold text-white mb-2">{hierarchy.organization || organizationName}</h3>
          <p className="text-cyan-400">{hierarchy.type}</p>
        </div>

        {/* Departments */}
        <div className="space-y-4">
          {hierarchy.departments?.map((dept, idx) => (
            <DepartmentCard key={idx} department={dept} index={idx} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Department Card Component
function DepartmentCard({ department, index }) {
  const [isExpanded, setIsExpanded] = useState(true)

  const colors = [
    { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-400' },
    { bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-400' },
    { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-400' },
    { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-400' },
    { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-400' },
  ]

  const colorSet = colors[index % colors.length]

  return (
    <div className={`bg-gray-700/50 rounded-2xl border-2 ${colorSet.border} overflow-hidden`}>
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-700/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 ${colorSet.bg} rounded-full`}></div>
          <h4 className="text-xl font-bold text-white">{department.name}</h4>
        </div>
        <svg
          className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {department.description && (
            <p className="text-gray-300 text-sm">{department.description}</p>
          )}

          {department.roles && department.roles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-400 mb-2">Roles:</p>
              {department.roles.map((role, rIdx) => (
                <div key={rIdx} className="bg-gray-800/50 rounded-lg p-3">
                  <p className="font-semibold text-white mb-1">{role.title}</p>
                  {role.responsibilities && role.responsibilities.length > 0 && (
                    <ul className="text-sm text-gray-400 space-y-1 ml-4">
                      {role.responsibilities.map((resp, respIdx) => (
                        <li key={respIdx} className="list-disc">{resp}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {department.subdepartments && department.subdepartments.length > 0 && (
            <div className="ml-6 space-y-2 border-l-2 border-gray-600 pl-4">
              <p className="text-sm font-semibold text-gray-400 mb-2">Subdepartamentos:</p>
              {department.subdepartments.map((subdept, subIdx) => (
                <DepartmentCard key={subIdx} department={subdept} index={index + subIdx + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AgentGeneratorDemo
