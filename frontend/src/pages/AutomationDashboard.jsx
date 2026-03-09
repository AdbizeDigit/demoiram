import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Calendar, Users, TrendingUp, Mail, Zap,
  Target, BarChart3, Settings, Play, Pause, CheckCircle,
  AlertCircle, Clock, Sparkles, Bot, FileText, Webhook
} from 'lucide-react'
import api from '../services/api'

function AutomationDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [scheduledSearches, setScheduledSearches] = useState([])
  const [priorityLeads, setPriorityLeads] = useState([])
  const [upcomingActions, setUpcomingActions] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Cargar métricas
      const metricsRes = await api.get('/api/metrics/overview?period=30')
      setMetrics(metricsRes.data.metrics)

      // Cargar búsquedas programadas
      const searchesRes = await api.get('/api/automation/scheduled-search/list')
      setScheduledSearches(searchesRes.data.scheduledSearches || [])

      // Cargar leads prioritarios
      const leadsRes = await api.get('/api/metrics/priority-leads')
      setPriorityLeads(leadsRes.data.priorityLeads || [])

      // Cargar próximas acciones
      const actionsRes = await api.get('/api/metrics/upcoming-actions')
      setUpcomingActions(actionsRes.data.upcomingActions || [])

      // Cargar campañas
      const campaignsRes = await api.get('/api/campaigns/list')
      setCampaigns(campaignsRes.data.campaigns || [])

    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSearch = async (searchId, enabled) => {
    try {
      await api.put(`/api/automation/scheduled-search/${searchId}`, { enabled: !enabled })
      loadDashboardData()
    } catch (error) {
      console.error('Error actualizando búsqueda:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="text-white mt-4">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-4 transition-colors group text-sm"
          >
            <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Volver
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black mb-2">
                🤖 Centro de Automatización
              </h1>
              <p className="text-slate-400">Sistema completo de captación automática de clientes</p>
            </div>

            <div className="flex gap-3">
              <Link
                to="/automation/scheduled-searches"
                className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
              >
                <Calendar size={18} />
                Búsquedas Programadas
              </Link>
              <Link
                to="/automation/crm"
                className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center gap-2"
              >
                <Users size={18} />
                CRM
              </Link>
              <Link
                to="/automation/metrics"
                className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2"
              >
                <BarChart3 size={18} />
                Métricas
              </Link>
            </div>
          </div>
        </div>

        {/* Métricas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={Users}
            label="Total Leads"
            value={metrics?.leads?.total_leads || 0}
            change="+15%"
            positive={true}
            color="cyan"
          />
          <MetricCard
            icon={Target}
            label="Hot Leads"
            value={metrics?.leads?.hot_leads || 0}
            change="+25%"
            positive={true}
            color="red"
          />
          <MetricCard
            icon={Calendar}
            label="Reuniones Agendadas"
            value={metrics?.leads?.meetings_scheduled || 0}
            change="+12%"
            positive={true}
            color="green"
          />
          <MetricCard
            icon={TrendingUp}
            label="Deals Cerrados"
            value={metrics?.leads?.deals_won || 0}
            change="+18%"
            positive={true}
            color="purple"
          />
        </div>

        {/* Grid de 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Búsquedas Programadas */}
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="text-cyan-400" size={24} />
                Búsquedas Programadas
              </h2>
              <Link
                to="/automation/scheduled-searches/new"
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-semibold transition-colors"
              >
                + Nueva Búsqueda
              </Link>
            </div>

            {scheduledSearches.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                <p>No hay búsquedas programadas</p>
                <Link
                  to="/automation/scheduled-searches/new"
                  className="text-cyan-400 hover:text-cyan-300 text-sm mt-2 inline-block"
                >
                  Crear tu primera búsqueda →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledSearches.slice(0, 5).map(search => (
                  <div
                    key={search.id}
                    className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{search.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            search.enabled
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {search.enabled ? 'Activa' : 'Pausada'}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded">
                            {search.schedule}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">
                          📍 {search.location}
                          {search.industry && ` • ${search.industry}`}
                          {search.min_lead_score && ` • Score mín: ${search.min_lead_score}`}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleSearch(search.id, search.enabled)}
                        className={`p-2 rounded-lg transition-colors ${
                          search.enabled
                            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                      >
                        {search.enabled ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximas Acciones */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Clock className="text-orange-400" size={24} />
              Próximas Acciones
            </h2>

            {upcomingActions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Todo al día</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingActions.slice(0, 5).map(action => (
                  <div
                    key={action.id}
                    className="bg-slate-950/50 border border-slate-800 rounded-lg p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className={`p-1.5 rounded ${
                        action.action_type === 'email' ? 'bg-blue-500/20 text-blue-300' :
                        action.action_type === 'call' ? 'bg-green-500/20 text-green-300' :
                        'bg-purple-500/20 text-purple-300'
                      }`}>
                        {action.action_type === 'email' ? <Mail size={14} /> :
                         action.action_type === 'call' ? <Phone size={14} /> :
                         <Settings size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{action.subject}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(action.scheduled_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Grid de Leads y Campañas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads Prioritarios */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap className="text-yellow-400" size={24} />
                Leads Prioritarios
              </h2>
              <Link
                to="/automation/crm"
                className="text-cyan-400 hover:text-cyan-300 text-sm"
              >
                Ver todos →
              </Link>
            </div>

            {priorityLeads.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Target size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay leads urgentes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {priorityLeads.slice(0, 5).map(lead => {
                  const leadData = typeof lead.lead_data === 'string'
                    ? JSON.parse(lead.lead_data)
                    : lead.lead_data

                  return (
                    <div
                      key={lead.id}
                      className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 hover:border-cyan-500/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm">
                              {leadData.name || leadData.author || leadData.company}
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              lead.lead_quality === 'hot' ? 'bg-red-500/20 text-red-300' :
                              lead.lead_quality === 'warm' ? 'bg-orange-500/20 text-orange-300' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              {lead.lead_score}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">
                            {leadData.company || leadData.industry || ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Campañas Activas */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="text-purple-400" size={24} />
                Campañas Activas
              </h2>
              <Link
                to="/automation/campaigns/new"
                className="text-cyan-400 hover:text-cyan-300 text-sm"
              >
                + Nueva
              </Link>
            </div>

            {campaigns.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Mail size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay campañas activas</p>
                <Link
                  to="/automation/campaigns/new"
                  className="text-cyan-400 hover:text-cyan-300 text-sm mt-2 inline-block"
                >
                  Crear tu primera campaña →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.filter(c => c.status === 'running').slice(0, 5).map(campaign => {
                  const stats = typeof campaign.stats === 'string'
                    ? JSON.parse(campaign.stats)
                    : campaign.stats || {}

                  return (
                    <div
                      key={campaign.id}
                      className="bg-slate-950/50 border border-slate-800 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm">{campaign.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-300 rounded">
                          Activa
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">Leads</p>
                          <p className="font-semibold">{stats.totalLeads || 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Enviados</p>
                          <p className="font-semibold">{stats.emailsSent || 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Abiertos</p>
                          <p className="font-semibold">{stats.emailsOpened || 0}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            icon={Bot}
            title="AI Assistant"
            description="Analiza leads con IA"
            to="/automation/ai-assistant"
            color="purple"
          />
          <QuickActionCard
            icon={FileText}
            title="Templates"
            description="Gestiona plantillas de email"
            to="/automation/templates"
            color="blue"
          />
          <QuickActionCard
            icon={Webhook}
            title="Webhooks"
            description="Configura integraciones"
            to="/automation/webhooks"
            color="green"
          />
          <QuickActionCard
            icon={Settings}
            title="Configuración"
            description="Ajusta automatización"
            to="/automation/settings"
            color="cyan"
          />
        </div>
      </div>
    </div>
  )
}

// Componente MetricCard
function MetricCard({ icon: Icon, label, value, change, positive, color }) {
  const colors = {
    cyan: 'from-cyan-500 to-blue-600',
    red: 'from-red-500 to-orange-600',
    green: 'from-green-500 to-emerald-600',
    purple: 'from-purple-500 to-pink-600'
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          <Icon size={24} className="text-white" />
        </div>
        {change && (
          <span className={`text-xs px-2 py-1 rounded ${
            positive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
          }`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}

// Componente QuickActionCard
function QuickActionCard({ icon: Icon, title, description, to, color }) {
  const colors = {
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:border-purple-500/50',
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-500/50',
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30 hover:border-green-500/50',
    cyan: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 hover:border-cyan-500/50'
  }

  return (
    <Link
      to={to}
      className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4 transition-all hover:scale-105`}
    >
      <Icon size={32} className="mb-3" />
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-xs text-slate-400">{description}</p>
    </Link>
  )
}

export default AutomationDashboard
