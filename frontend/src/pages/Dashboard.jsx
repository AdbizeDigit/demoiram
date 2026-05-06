import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Eye, Users, ShoppingCart, Heart, Mic, FileText, TrendingUp, Radar, Briefcase, ArrowRight, Shield } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const demos = [
  {
    id: 'custom-chatbot',
    serviceKey: 'customChatbot',
    title: 'Chatbot Personalizado',
    description: 'Crea tus propios chatbots con IA personalizada',
    icon: MessageSquare,
    gradient: 'from-cyan-400 via-blue-500 to-purple-600',
    shadow: 'rgba(79, 172, 254, 0.4)',
    path: '/dashboard/demo/custom-chatbot',
    available: true
  },
  {
    id: 'vision',
    serviceKey: 'vision',
    title: 'Detección de Poses',
    description: 'Reconocimiento de personas y partes del cuerpo con IA',
    icon: Eye,
    gradient: 'from-purple-500 via-pink-500 to-red-500',
    shadow: 'rgba(168, 85, 247, 0.4)',
    path: '/dashboard/demo/vision',
    available: true
  },
  {
    id: 'agent-generator',
    serviceKey: 'agentGenerator',
    title: 'Generador de Agentes',
    description: 'Sistema Vanthal: Diseña jerarquías organizacionales con IA',
    icon: Users,
    gradient: 'from-green-400 via-emerald-500 to-teal-600',
    shadow: 'rgba(52, 211, 153, 0.4)',
    path: '/dashboard/demo/agent-generator',
    available: true
  },
  {
    id: 'opportunity-detection',
    serviceKey: 'opportunityDetection',
    title: 'Detección de Oportunidades',
    description: 'Encuentra menciones y oportunidades en redes sociales',
    icon: ShoppingCart,
    gradient: 'from-orange-400 via-red-500 to-pink-600',
    shadow: 'rgba(251, 146, 60, 0.4)',
    path: '/dashboard/demo/opportunity-detection',
    available: true
  },
  {
    id: 'scraping-intel',
    serviceKey: 'scrapingIntel',
    title: 'Scrapping Inteligente',
    description: 'Extrae señales de dolor, tech stack y contactos clave de empresas objetivo',
    icon: FileText,
    gradient: 'from-emerald-400 via-cyan-500 to-blue-600',
    shadow: 'rgba(52, 211, 153, 0.4)',
    path: '/dashboard/demo/scraping-intel',
    available: true
  },
  {
    id: 'sentiment',
    serviceKey: 'sentiment',
    title: 'Análisis de Sentimientos',
    description: 'Detecta emociones y sentimientos en texto en tiempo real',
    icon: Heart,
    gradient: 'from-pink-400 via-fuchsia-500 to-purple-600',
    shadow: 'rgba(244, 114, 182, 0.4)',
    path: '#',
    available: false
  },
  {
    id: 'transcription',
    serviceKey: 'transcription',
    title: 'Transcripción de Audio',
    description: 'Convierte audio y video a texto con resumen automático',
    icon: Mic,
    gradient: 'from-indigo-400 via-blue-500 to-cyan-600',
    shadow: 'rgba(129, 140, 248, 0.4)',
    path: '#',
    available: false
  },
  {
    id: 'document',
    serviceKey: 'documentAnalysis',
    title: 'Análisis de Documentos',
    description: 'Clasifica y extrae información de documentos',
    icon: FileText,
    gradient: 'from-yellow-400 via-orange-500 to-red-600',
    shadow: 'rgba(251, 191, 36, 0.4)',
    path: '#',
    available: false
  },
  {
    id: 'predictor',
    serviceKey: 'predictor',
    title: 'Predictor de Tendencias',
    description: 'Análisis predictivo y forecasting de datos',
    icon: TrendingUp,
    gradient: 'from-red-400 via-pink-500 to-purple-600',
    shadow: 'rgba(248, 113, 113, 0.4)',
    path: '#',
    available: false
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

  const isServiceAvailable = (demo) => {
    return demo.available !== false
  }

  const isSeller = user?.role === 'seller'
  const isAdmin = user?.role === 'admin'

  return (
    <div>
      {/* Acceso al panel de vendedor (solo para sellers/admin) */}
      {(isSeller || isAdmin) && (
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <Link
            to="/vendedor"
            className="group flex-1 flex items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white px-5 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-white/20 p-2.5 rounded-xl flex-shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">Panel del Vendedor</p>
                <p className="text-xs text-white/80 leading-tight">Leads, pipeline, prospección IA y métricas personales</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold flex-shrink-0">
              Entrar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="group flex items-center justify-between gap-4 bg-white hover:bg-gray-50 ring-1 ring-gray-200 text-gray-800 px-5 py-4 rounded-2xl shadow-sm hover:shadow-md transition-all sm:w-72"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-emerald-100 p-2.5 rounded-xl flex-shrink-0">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight">Panel Admin</p>
                  <p className="text-xs text-gray-500 leading-tight">Detección, scraping, vendedores</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* Mini Hero Section */}
      <div className="relative mb-12 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-8 md:p-12">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            animation: 'slide 20s linear infinite'
          }}></div>
        </div>

        {/* Floating orbs */}
        <div className="absolute top-10 right-20 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 left-20 w-40 h-40 bg-cyan-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Text content */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 bg-gradient-to-r from-yellow-200 via-pink-200 to-cyan-200 bg-clip-text text-transparent animate-gradient">
              HOLA, {(user?.name?.split(' ')[0] || 'USUARIO').toUpperCase()}
            </h1>
            <p className="text-white/90 text-lg md:text-xl font-medium">
              Explora el futuro de la inteligencia artificial
            </p>
            <div className="mt-6 flex items-center gap-3 justify-center md:justify-start">
              <div className="h-1 w-12 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-full"></div>
              <span className="text-white/80 text-sm font-semibold">TECNOLOGÍA AVANZADA</span>
            </div>
          </div>

          {/* Character Image */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 via-pink-400/30 to-cyan-400/30 rounded-full blur-2xl animate-pulse"></div>
            <img
              src="/personajes/Generated Image November 08, 2025 - 3_35PM.png"
              alt="AI Character"
              className="relative w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* Demos Grid */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Servicios Disponibles</h2>
        <p className="text-gray-600">Selecciona una demo para comenzar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {demos.map((demo, index) => {
          if (demo.id === 'scraping-intel') {
            return null
          }

          const Icon = demo.icon
          const available = isServiceAvailable(demo)
          const isScrapingService = demo.id === 'scraping-intel'
          const usageCount = isScrapingService ? null : (available ? getUsageCount(demo.serviceKey) : 0)
          const isDisabled = isScrapingService ? false : (!available || usageCount === 0)

          return (
            <Link
              key={demo.id}
              to={isDisabled ? '#' : demo.path}
              className={`group relative bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-transparent'}`}
              style={{
                boxShadow: isDisabled ? 'none' : '0 0 0 0 rgba(0,0,0,0)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isDisabled) {
                  e.currentTarget.style.boxShadow = `0 20px 60px -15px ${demo.shadow}`
                }
              }}
              onMouseLeave={(e) => {
                if (!isDisabled) {
                  e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'
                }
              }}
              onClick={(e) => {
                if (!available) {
                  e.preventDefault()
                  alert('Este servicio estará disponible próximamente.')
                } else if (isDisabled) {
                  e.preventDefault()
                  alert('Has agotado tus usos gratuitos para este servicio.')
                }
              }}
            >
              {/* Gradient border effect on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${demo.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} style={{ padding: '2px' }}>
                <div className="absolute inset-[2px] bg-white rounded-2xl"></div>
              </div>

              {/* Content */}
              <div className="relative z-10">
                {/* Usage badge */}
                <div className="absolute -top-6 -right-6">
                  {!available ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg">
                      PRÓXIMAMENTE
                    </span>
                  ) : isScrapingService ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg">
                      INTERNO ADBIZE
                    </span>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                      usageCount === 0 ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                      usageCount === 1 ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white' :
                      usageCount === 2 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                      'bg-gradient-to-r from-green-400 to-green-500 text-white'
                    }`}>
                      {usageCount} USOS
                    </span>
                  )}
                </div>

                {/* Icon with gradient */}
                <div className="mb-5 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${demo.gradient} rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-300`}></div>
                  <div className={`relative w-16 h-16 bg-gradient-to-br ${demo.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="text-white" size={28} />
                  </div>
                </div>

                {/* Title */}
                <h3 className={`text-xl font-bold mb-3 bg-gradient-to-r ${demo.gradient} bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 origin-left`}>
                  {demo.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {demo.description}
                </p>

                {/* Action indicator */}
                {available && !isDisabled && (
                  <div className={`mt-5 pt-4 border-t border-gray-200 flex items-center justify-between text-sm font-bold bg-gradient-to-r ${demo.gradient} bg-clip-text text-transparent`}>
                    <span>ACCEDER</span>
                    <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {(user?.role === 'admin' || user?.email === 'contacto@adbize.com') && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sistema interno Adbize</h2>
          <p className="text-gray-600 mb-4">Herramientas internas para operaciones, growth y prospección avanzada.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Link
              to="/dashboard/demo/scraping-intel"
              className="group relative bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:border-transparent"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{ padding: '2px' }}>
                <div className="absolute inset-[2px] bg-white rounded-2xl"></div>
              </div>

              <div className="relative z-10">
                <div className="absolute -top-6 -right-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg">
                    INTERNO ADBIZE
                  </span>
                </div>

                <div className="mb-5 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <FileText className="text-white" size={28} />
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 origin-left">
                  Scrapping Inteligente
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Sistema interno de Adbize para extraer señales de dolor, tech stack, contactos clave y eventos de compra
                  en empresas objetivo. Optimizado para alimentar tu motor de IA y modelos de lead scoring.
                </p>
                <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between text-sm font-bold bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
                  <span>ABRIR SISTEMA</span>
                  <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
            <Link
              to="/dashboard/scraping-map"
              className="group relative bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:border-transparent"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{ padding: '2px' }}>
                <div className="absolute inset-[2px] bg-white rounded-2xl"></div>
              </div>

              <div className="relative z-10">
                <div className="absolute -top-6 -right-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-lg">
                    MAPA GLOBAL
                  </span>
                </div>

                <div className="mb-5 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="text-white" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 origin-left">
                  Mapa de Territorios
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Visualiza en un mapa global todas las zonas donde se ha ejecutado scraping. Muestra intensidad, leads encontrados y historial por territorio.
                </p>
                <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between text-sm font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                  <span>VER MAPA</span>
                  <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
            <Link
              to="/admin"
              className="group relative bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:border-transparent"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{ padding: '2px' }}>
                <div className="absolute inset-[2px] bg-white rounded-2xl"></div>
              </div>

              <div className="relative z-10">
                <div className="absolute -top-6 -right-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg">
                    ADMIN
                  </span>
                </div>

                <div className="mb-5 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Radar className="text-white" size={28} />
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 origin-left">
                  Motor de Detección
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Detección automática de oportunidades comerciales. Escanea fuentes RSS, noticias y búsquedas web con análisis de IA.
                </p>
                <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between text-sm font-bold bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 bg-clip-text text-transparent">
                  <span>ABRIR MOTOR</span>
                  <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
