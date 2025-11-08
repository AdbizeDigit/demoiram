import { useState } from 'react'
import { ArrowLeft, Users, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function AgentGeneratorDemo() {
  const [agentName, setAgentName] = useState('')
  const [role, setRole] = useState('')
  const [skills, setSkills] = useState('')
  const [personality, setPersonality] = useState('professional')
  const [generatedAgent, setGeneratedAgent] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!agentName || !role || !skills) {
      alert('Por favor completa todos los campos')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('/api/agent/generate', {
        name: agentName,
        role,
        skills: skills.split(',').map(s => s.trim()),
        personality
      })

      setGeneratedAgent(response.data.agent)
    } catch (error) {
      console.error('Error al generar agente:', error)
      alert('Error al generar el agente')
    }
    setLoading(false)
  }

  return (
    <div>
      <Link to="/" className="flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft size={20} className="mr-2" />
        Volver al inicio
      </Link>

      <div className="card max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4">
            <Users className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Generador de Agentes</h2>
            <p className="text-gray-600">Crea agentes de IA personalizados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Agente
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="input-field"
                  placeholder="Ej: Asistente de Ventas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol / Función
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input-field"
                  placeholder="Ej: Atención al cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Habilidades (separadas por comas)
                </label>
                <textarea
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="input-field h-24"
                  placeholder="Ej: responder preguntas, procesar pagos, gestionar reclamos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personalidad
                </label>
                <select
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  className="input-field"
                >
                  <option value="professional">Profesional</option>
                  <option value="friendly">Amigable</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                  <option value="technical">Técnico</option>
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Sparkles size={20} />
                <span>{loading ? 'Generando...' : 'Generar Agente'}</span>
              </button>
            </div>
          </div>

          <div>
            <div className="bg-gray-50 rounded-xl p-6 h-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agente Generado</h3>

              {!generatedAgent ? (
                <p className="text-gray-500 text-center py-12">
                  El agente generado aparecerá aquí
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Nombre</h4>
                    <p className="text-gray-700">{generatedAgent.name}</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Rol</h4>
                    <p className="text-gray-700">{generatedAgent.role}</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Prompt del Sistema</h4>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{generatedAgent.systemPrompt}</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Habilidades</h4>
                    <div className="flex flex-wrap gap-2">
                      {generatedAgent.skills?.map((skill, idx) => (
                        <span key={idx} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Ejemplo de Conversación</h4>
                    <div className="space-y-2 text-sm">
                      {generatedAgent.exampleConversation?.map((msg, idx) => (
                        <div key={idx} className={`p-2 rounded ${msg.role === 'user' ? 'bg-blue-50' : 'bg-gray-100'}`}>
                          <span className="font-semibold">{msg.role === 'user' ? 'Usuario:' : 'Agente:'}</span> {msg.content}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgentGeneratorDemo
