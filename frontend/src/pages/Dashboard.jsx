import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Eye, Users, ShoppingCart, Heart, Mic, FileText, TrendingUp } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const demos = [
  {
    id: 'chatbot',
    serviceKey: 'chatbot',
    title: 'Chatbot con IA',
    description: 'Asistente virtual inteligente con procesamiento de lenguaje natural',
    icon: MessageSquare,
    gradient: 'from-cyan-400 via-blue-500 to-purple-600',
    shadow: 'rgba(79, 172, 254, 0.4)',
    path: '/demo/chatbot'
  },
  {
    id: 'vision',
    serviceKey: 'vision',
    title: 'Visión Artificial',
    description: 'Detección y reconocimiento de objetos en tiempo real',
    icon: Eye,
    gradient: 'from-purple-500 via-pink-500 to-red-500',
    shadow: 'rgba(168, 85, 247, 0.4)',
    path: '/demo/vision'
  },
  {
    id: 'agent-generator',
    serviceKey: 'agentGenerator',
    title: 'Generador de Agentes',
    description: 'Crea agentes de IA personalizados automáticamente',
    icon: Users,
    gradient: 'from-green-400 via-emerald-500 to-teal-600',
    shadow: 'rgba(52, 211, 153, 0.4)',
    path: '/demo/agent-generator'
  },
  {
    id: 'marketplace',
    serviceKey: 'marketplace',
    title: 'Marketplace Inteligente',
    description: 'Búsqueda automática de compradores y vendedores',
    icon: ShoppingCart,
    gradient: 'from-orange-400 via-red-500 to-pink-600',
    shadow: 'rgba(251, 146, 60, 0.4)',
    path: '/demo/marketplace'
  },
  {
    id: 'sentiment',
    serviceKey: 'sentiment',
    title: 'Análisis de Sentimientos',
    description: 'Detecta emociones y sentimientos en texto en tiempo real',
    icon: Heart,
    gradient: 'from-pink-400 via-fuchsia-500 to-purple-600',
    shadow: 'rgba(244, 114, 182, 0.4)',
    path: '/demo/sentiment'
  },
  {
    id: 'transcription',
    serviceKey: 'transcription',
    title: 'Transcripción de Audio',
    description: 'Convierte audio y video a texto con resumen automático',
    icon: Mic,
    gradient: 'from-indigo-400 via-blue-500 to-cyan-600',
    shadow: 'rgba(129, 140, 248, 0.4)',
    path: '/demo/transcription'
  },
  {
    id: 'document',
    serviceKey: 'documentAnalysis',
    title: 'Análisis de Documentos',
    description: 'Clasifica y extrae información de documentos',
    icon: FileText,
    gradient: 'from-yellow-400 via-orange-500 to-red-600',
    shadow: 'rgba(251, 191, 36, 0.4)',
    path: '/demo/document'
  },
  {
    id: 'predictor',
    serviceKey: 'predictor',
    title: 'Predictor de Tendencias',
    description: 'Análisis predictivo y forecasting de datos',
    icon: TrendingUp,
    gradient: 'from-red-400 via-pink-500 to-purple-600',
    shadow: 'rgba(248, 113, 113, 0.4)',
    path: '/demo/predictor'
  }
]

function Dashboard() {
  const { user, fetchUserData } = useAuthStore()

  useEffect(() => {
    // Fetch user data when component mounts to get latest usage info
    fetchUserData()
  }, [])
  const getUsageCount = (serviceKey) => {
    return user?.serviceUsage?.[serviceKey] ?? 3
  }

  const getUsageBadgeColor = (count) => {
    if (count === 0) return 'bg-red-500'
    if (count === 1) return 'bg-orange-500'
    if (count === 2) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div>
      <div className="mb-12 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
          <span className="liquid-text">
            {user?.name ? `Hola, ${user.name.split(' ')[0]}` : 'Demos de IA'}
          </span>
        </h1>
        <p className="text-gray-700 text-xl font-medium max-w-2xl mx-auto">
          Explora nuestras demos interactivas de inteligencia artificial
        </p>
        <div className="mt-4 w-32 h-1 mx-auto liquid-gradient rounded-full"></div>

        {user?.serviceUsage && (
          <div className="mt-6 inline-flex items-center space-x-2 px-6 py-3 rounded-full glass-effect">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-700">
              Cada servicio incluye 3 usos gratuitos
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {demos.map((demo, index) => {
          const Icon = demo.icon
          const usageCount = getUsageCount(demo.serviceKey)
          const badgeColor = getUsageBadgeColor(usageCount)
          const isDisabled = usageCount === 0

          return (
            <Link
              key={demo.id}
              to={isDisabled ? '#' : demo.path}
              className={`card gooey-card group relative overflow-hidden ripple-effect ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault()
                  alert('Has agotado tus usos gratuitos para este servicio. Contacta con soporte para obtener más.')
                }
              }}
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${demo.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl viscous-element`}></div>

              {/* Usage badge */}
              <div className="absolute top-4 right-4 z-20">
                <div className={`${badgeColor} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-1`}>
                  <span>{usageCount}</span>
                  <span className="opacity-75">usos</span>
                </div>
              </div>

              {/* Icon with liquid gooey effect */}
              <div className="relative">
                <div
                  className={`w-20 h-20 bg-gradient-to-br ${demo.gradient} rounded-2xl flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 animate-float liquid-morph`}
                  style={{
                    boxShadow: `0 15px 35px -10px ${demo.shadow}`,
                    animationDelay: `${index * 0.2}s`
                  }}
                >
                  <Icon className="text-white relative z-10" size={36} />
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:animate-shimmer"></div>
                  {/* Gooey reflection */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:liquid-text transition-all duration-300">
                {demo.title}
              </h3>

              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                {demo.description}
              </p>

              <div className={`mt-auto pt-4 font-bold text-sm flex items-center bg-gradient-to-r ${demo.gradient} bg-clip-text text-transparent`}>
                {isDisabled ? 'Sin usos' : 'Ver demo'}
                {!isDisabled && (
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Decorative elements */}
      <div className="mt-16 text-center">
        <div className="inline-flex items-center space-x-2 px-6 py-3 rounded-full glass-effect">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-sm font-semibold text-gray-700">
            Todas las demos están en línea y funcionando
          </span>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
