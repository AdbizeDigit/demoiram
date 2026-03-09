import { useState, useEffect } from 'react'
import { Activity, TrendingUp, Clock, AlertCircle } from 'lucide-react'

export default function PAC3Dashboard({ stats, onRefresh }) {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadEvents()
    const interval = setInterval(loadEvents, 5000) // Actualizar cada 5 segundos
    return () => clearInterval(interval)
  }, [])

  const loadEvents = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/pac-3.0/monitoring-events?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'search_started':
        return '🔍'
      case 'search_completed':
        return '✅'
      case 'ai_analysis_completed':
        return '🧠'
      case 'email_sent':
        return '📧'
      default:
        return '📌'
    }
  }

  const getEventColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-400'
      case 'in_progress':
        return 'text-blue-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-slate-400'
    }
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-blue-400" />
            Monitoreo en Tiempo Real
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-6 text-center">
                <AlertCircle className="mx-auto text-slate-400 mb-2" size={32} />
                <p className="text-slate-400">No hay eventos aún. Inicia una búsqueda para comenzar.</p>
              </div>
            ) : (
              events.map((event, idx) => (
                <div
                  key={idx}
                  className="bg-slate-600/30 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{getEventIcon(event.event_type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-white font-medium">{event.event_description}</p>
                        <span className={`text-xs font-semibold ${getEventColor(event.status)}`}>
                          {event.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm mt-1">
                        {new Date(event.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="text-purple-400" />
            Métricas Clave
          </h3>

          <div className="bg-gradient-to-br from-blue-600/20 to-blue-400/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-slate-300 text-sm">Tasa de Conversión</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">
              {stats && stats.emailsSent > 0 ? ((stats.analysisCompleted / stats.emailsSent) * 100).toFixed(1) : 0}%
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-400/10 border border-purple-500/30 rounded-lg p-4">
            <p className="text-slate-300 text-sm">Prospectos Activos</p>
            <p className="text-3xl font-bold text-purple-400 mt-2">{stats?.totalProspects || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-400/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-slate-300 text-sm">Calidad Promedio</p>
            <div className="mt-2">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-green-400">{stats?.averageScore || 0}</p>
                <p className="text-xs text-green-300">/1.00</p>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2 mt-2">
                <div
                  className="bg-green-400 h-2 rounded-full transition-all"
                  style={{ width: `${(parseFloat(stats?.averageScore || 0) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600/20 to-orange-400/10 border border-orange-500/30 rounded-lg p-4">
            <p className="text-slate-300 text-sm flex items-center gap-2">
              <Clock size={16} />
              Última Actualización
            </p>
            <p className="text-sm text-orange-400 mt-2">
              {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-8 bg-slate-600/30 border border-slate-600 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Estado del Sistema</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <span className="text-slate-300">Rastreador: Activo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <span className="text-slate-300">IA: Operativa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <span className="text-slate-300">Email: Listo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <span className="text-slate-300">BD: Conectada</span>
          </div>
        </div>
      </div>
    </div>
  )
}
