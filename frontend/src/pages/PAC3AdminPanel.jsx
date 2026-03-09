import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { MapPin, Search, BarChart3, Mail, Brain, Eye, Play, Square, Download, RefreshCw } from 'lucide-react'
import PAC3Dashboard from '../components/PAC3/PAC3Dashboard'
import PAC3Scraper from '../components/PAC3/PAC3Scraper'
import PAC3AIAnalysis from '../components/PAC3/PAC3AIAnalysis'
import PAC3EmailSequence from '../components/PAC3/PAC3EmailSequence'
import PAC3MapView from '../components/PAC3/PAC3MapView'

export default function PAC3AdminPanel() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [prospects, setProspects] = useState([])
  const [selectedProspect, setSelectedProspect] = useState(null)

  // Verificar si es admin
  useEffect(() => {
    if (user?.role !== 'admin') {
      window.location.href = '/dashboard'
    }
  }, [user])

  // Cargar estadísticas
  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/pac-3.0/dashboard-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadProspects = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/pac-3.0/prospects', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setProspects(data)
      }
    } catch (error) {
      console.error('Error loading prospects:', error)
    }
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    await loadStats()
    await loadProspects()
    setIsLoading(false)
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'scraper', label: 'Rastreador', icon: Search },
    { id: 'analysis', label: 'Análisis IA', icon: Brain },
    { id: 'email', label: 'Email Sequences', icon: Mail },
    { id: 'map', label: 'Mapa', icon: MapPin }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">🚀 PAC 3.0 - Panel de Administración</h1>
              <p className="text-blue-100 mt-2">Motor de Crecimiento Open Source y Basado en IA</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-800 border-b border-slate-700">
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
                  <Icon size={20} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Total Prospectos</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalProspects}</p>
            </div>
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Emails Enviados</p>
              <p className="text-3xl font-bold text-blue-400 mt-2">{stats.emailsSent}</p>
            </div>
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Análisis Completados</p>
              <p className="text-3xl font-bold text-purple-400 mt-2">{stats.analysisCompleted}</p>
            </div>
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Score Promedio</p>
              <p className="text-3xl font-bold text-green-400 mt-2">{stats.averageScore}</p>
            </div>
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Estado</p>
              <p className="text-lg font-bold text-green-400 mt-2">🟢 Activo</p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-slate-700/30 border border-slate-600 rounded-lg">
          {activeTab === 'dashboard' && <PAC3Dashboard stats={stats} onRefresh={loadStats} />}
          {activeTab === 'scraper' && <PAC3Scraper onProspectsFound={loadProspects} />}
          {activeTab === 'analysis' && <PAC3AIAnalysis prospects={prospects} onAnalysisComplete={loadProspects} />}
          {activeTab === 'email' && <PAC3EmailSequence prospects={prospects} />}
          {activeTab === 'map' && <PAC3MapView prospects={prospects} />}
        </div>
      </div>
    </div>
  )
}
