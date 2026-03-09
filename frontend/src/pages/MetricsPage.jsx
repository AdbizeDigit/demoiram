import { useState, useEffect } from 'react'
import { TrendingUp, Users, Mail, Calendar, DollarSign, Target, ArrowUp, ArrowDown, Download, RefreshCw } from 'lucide-react'

const MetricsPage = () => {
  const [metrics, setMetrics] = useState(null)
  const [funnel, setFunnel] = useState(null)
  const [performance, setPerformance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    loadMetrics()
  }, [timeRange])

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')

      // Load multiple metrics in parallel
      const [summaryRes, funnelRes, performanceRes] = await Promise.all([
        fetch(`http://localhost:5000/api/metrics/summary?days=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/metrics/conversion-funnel', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/metrics/performance-summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const [summaryData, funnelData, performanceData] = await Promise.all([
        summaryRes.json(),
        funnelRes.json(),
        performanceRes.json()
      ])

      setMetrics(summaryData.summary)
      setFunnel(funnelData.funnel)
      setPerformance(performanceData.performance)
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num) => {
    if (!num) return '0'
    return num.toLocaleString('es-ES')
  }

  const formatPercentage = (num) => {
    if (!num) return '0%'
    return `${num.toFixed(1)}%`
  }

  const formatCurrency = (num) => {
    if (!num) return '$0'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(num)
  }

  const getTrendIcon = (change) => {
    if (!change) return null
    return change > 0 ? (
      <ArrowUp className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-red-600" />
    )
  }

  const getTrendColor = (change) => {
    if (!change) return 'text-gray-600'
    return change > 0 ? 'text-green-600' : 'text-red-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando métricas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Métricas y Analytics</h1>
            <p className="text-gray-600">Monitorea el rendimiento de tu sistema de automatización</p>
          </div>
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
            </select>
            <button
              onClick={loadMetrics}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Exportar
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Total Leads</span>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {formatNumber(metrics?.total_leads || 0)}
            </p>
            {metrics?.leads_change && (
              <div className={`flex items-center gap-1 text-sm ${getTrendColor(metrics.leads_change)}`}>
                {getTrendIcon(metrics.leads_change)}
                <span>{formatPercentage(Math.abs(metrics.leads_change))} vs periodo anterior</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Leads HOT</span>
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600 mb-1">
              {formatNumber(metrics?.hot_leads || 0)}
            </p>
            {metrics?.hot_percentage && (
              <div className="text-sm text-gray-600">
                {formatPercentage(metrics.hot_percentage)} del total
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Emails Enviados</span>
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {formatNumber(metrics?.emails_sent || 0)}
            </p>
            {metrics?.open_rate && (
              <div className="text-sm text-gray-600">
                Tasa de apertura: {formatPercentage(metrics.open_rate)}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Reuniones</span>
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {formatNumber(metrics?.meetings_scheduled || 0)}
            </p>
            {metrics?.meeting_rate && (
              <div className="text-sm text-gray-600">
                {formatPercentage(metrics.meeting_rate)} de conversión
              </div>
            )}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Embudo de Conversión</h2>

          {funnel && (
            <div className="space-y-4">
              {[
                { label: 'Total Leads', count: funnel.total_leads, width: 100, color: 'bg-blue-500' },
                { label: 'Contactados', count: funnel.contacted, width: (funnel.contacted / funnel.total_leads) * 100, color: 'bg-purple-500' },
                { label: 'Calificados', count: funnel.qualified, width: (funnel.qualified / funnel.total_leads) * 100, color: 'bg-yellow-500' },
                { label: 'Reuniones Agendadas', count: funnel.meetings, width: (funnel.meetings / funnel.total_leads) * 100, color: 'bg-orange-500' },
                { label: 'Propuestas Enviadas', count: funnel.proposals, width: (funnel.proposals / funnel.total_leads) * 100, color: 'bg-indigo-500' },
                { label: 'Ganados', count: funnel.won, width: (funnel.won / funnel.total_leads) * 100, color: 'bg-green-500' }
              ].map((stage, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">{stage.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{formatNumber(stage.count)}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatPercentage(stage.width)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div
                      className={`${stage.color} h-full rounded-full transition-all duration-500 flex items-center justify-end px-3`}
                      style={{ width: `${stage.width}%` }}
                    >
                      {stage.width > 15 && (
                        <span className="text-white text-sm font-semibold">
                          {formatNumber(stage.count)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {funnel && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPercentage((funnel.won / funnel.total_leads) * 100)}
                </div>
                <div className="text-sm text-gray-600">Tasa de Conversión Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPercentage((funnel.qualified / funnel.contacted) * 100)}
                </div>
                <div className="text-sm text-gray-600">Contactado a Calificado</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPercentage((funnel.won / funnel.proposals) * 100)}
                </div>
                <div className="text-sm text-gray-600">Propuesta a Ganado</div>
              </div>
            </div>
          )}
        </div>

        {/* Performance Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Email Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
              Rendimiento de Emails
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-gray-600">Enviados</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatNumber(performance?.emails_sent || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-gray-600">Abiertos</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {formatNumber(performance?.emails_opened || 0)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatPercentage((performance?.emails_opened / performance?.emails_sent) * 100 || 0)}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-gray-600">Respondidos</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {formatNumber(performance?.emails_replied || 0)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatPercentage((performance?.emails_replied / performance?.emails_sent) * 100 || 0)}
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-purple-700 mb-1">Tasa de Respuesta Promedio</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {formatPercentage((performance?.emails_replied / performance?.emails_sent) * 100 || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lead Quality Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Distribución de Calidad
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Leads HOT</span>
                  <span className="text-xl font-bold text-red-600">
                    {formatNumber(metrics?.hot_leads || 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${((metrics?.hot_leads || 0) / (metrics?.total_leads || 1)) * 100}%`
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Leads WARM</span>
                  <span className="text-xl font-bold text-orange-600">
                    {formatNumber(metrics?.warm_leads || 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-orange-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${((metrics?.warm_leads || 0) / (metrics?.total_leads || 1)) * 100}%`
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Leads COLD</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatNumber(metrics?.cold_leads || 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${((metrics?.cold_leads || 0) / (metrics?.total_leads || 1)) * 100}%`
                    }}
                  ></div>
                </div>
              </div>

              <div className="pt-2">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-700 mb-1">Score Promedio</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {metrics?.avg_score?.toFixed(1) || '0'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue & Deals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Ingresos y Deals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-700 mb-2">Deals Ganados</div>
              <div className="text-3xl font-bold text-green-900">
                {formatNumber(performance?.deals_closed || 0)}
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-700 mb-2">Revenue Total</div>
              <div className="text-3xl font-bold text-blue-900">
                {formatCurrency(performance?.revenue || 0)}
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-700 mb-2">Valor Promedio</div>
              <div className="text-3xl font-bold text-purple-900">
                {formatCurrency((performance?.revenue || 0) / (performance?.deals_closed || 1))}
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-sm text-orange-700 mb-2">Tasa de Cierre</div>
              <div className="text-3xl font-bold text-orange-900">
                {formatPercentage((performance?.deals_closed / metrics?.total_leads) * 100 || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MetricsPage
