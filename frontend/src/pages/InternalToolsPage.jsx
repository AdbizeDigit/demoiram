import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { Settings, Zap, TrendingUp, Users, BarChart3, Lock, AlertCircle } from 'lucide-react'
import IntelligentScraping from '../components/InternalTools/IntelligentScraping'
import GrowthOperations from '../components/InternalTools/GrowthOperations'
import ProspectionAdvanced from '../components/InternalTools/ProspectionAdvanced'
import InternalMetrics from '../components/InternalTools/InternalMetrics'

export default function InternalToolsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('scraping')
  const [isInternal, setIsInternal] = useState(false)

  // Verificar si es usuario interno de Adbize
  const isAdbizeInternal = user?.email?.endsWith('@adbize.com') || user?.role === 'internal'

  if (!isAdbizeInternal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <Lock className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h1>
          <p className="text-gray-600 mb-4">
            Esta sección es exclusiva para el equipo interno de Adbize.
          </p>
          <p className="text-sm text-gray-500">
            Si crees que deberías tener acceso, contacta con el administrador.
          </p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'scraping', label: '🔍 Scrapping Inteligente', icon: Zap },
    { id: 'growth', label: '📈 Growth & Operaciones', icon: TrendingUp },
    { id: 'prospection', label: '🎯 Prospección Avanzada', icon: Users },
    { id: 'metrics', label: '📊 Métricas Internas', icon: BarChart3 }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Settings className="text-blue-200" size={32} />
                <h1 className="text-3xl font-bold">🔒 Sistema Interno Adbize</h1>
              </div>
              <p className="text-blue-100">Herramientas exclusivas para operaciones, growth y prospección avanzada</p>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-sm">Usuario: {user?.name}</p>
              <p className="text-blue-100 text-xs">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400 bg-slate-700/50'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Warning Banner */}
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-yellow-200 font-semibold">Información Confidencial</p>
            <p className="text-yellow-100 text-sm mt-1">
              Esta sección contiene herramientas internas de Adbize. Toda la información es confidencial y de acceso restringido.
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-slate-700/30 border border-slate-600 rounded-lg">
          {activeTab === 'scraping' && <IntelligentScraping />}
          {activeTab === 'growth' && <GrowthOperations />}
          {activeTab === 'prospection' && <ProspectionAdvanced />}
          {activeTab === 'metrics' && <InternalMetrics />}
        </div>
      </div>
    </div>
  )
}
