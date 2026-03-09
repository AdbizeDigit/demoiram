import { useState } from 'react'
import { BarChart3, TrendingUp, Activity, AlertCircle } from 'lucide-react'

export default function InternalMetrics() {
  const [timeRange, setTimeRange] = useState('month')

  const metrics = [
    {
      category: 'Prospección',
      items: [
        { label: 'Leads Generados', value: 1245, change: '+15%', status: 'up' },
        { label: 'Leads Calificados', value: 342, change: '+22%', status: 'up' },
        { label: 'Tasa de Calificación', value: '27.4%', change: '+3.2%', status: 'up' }
      ]
    },
    {
      category: 'Ventas',
      items: [
        { label: 'Deals Cerrados', value: 12, change: '+8%', status: 'up' },
        { label: 'Valor Total', value: '$1.5M', change: '+18%', status: 'up' },
        { label: 'Ciclo de Venta', value: '45 días', change: '-5 días', status: 'up' }
      ]
    },
    {
      category: 'Operaciones',
      items: [
        { label: 'Automatizaciones Activas', value: 24, change: '+4', status: 'up' },
        { label: 'Tiempo Ahorrado', value: '240 hrs', change: '+60 hrs', status: 'up' },
        { label: 'Eficiencia', value: '92%', change: '+5%', status: 'up' }
      ]
    }
  ]

  const alerts = [
    {
      type: 'warning',
      title: 'Pipeline bajo en Q4',
      description: 'El pipeline de Q4 está 15% por debajo de lo proyectado',
      action: 'Revisar'
    },
    {
      type: 'success',
      title: 'Meta de prospección alcanzada',
      description: 'Se alcanzó el 105% de la meta de leads para este mes',
      action: 'Ver detalles'
    },
    {
      type: 'info',
      title: 'Nueva integración disponible',
      description: 'Se agregó integración con HubSpot para sincronización automática',
      action: 'Configurar'
    }
  ]

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <BarChart3 className="text-blue-400" />
        Métricas Internas
      </h2>

      {/* Time Range Selector */}
      <div className="mb-6 flex gap-2">
        {['week', 'month', 'quarter', 'year'].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded transition ${
              timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-slate-600/50 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {range === 'week' && 'Esta Semana'}
            {range === 'month' && 'Este Mes'}
            {range === 'quarter' && 'Este Trimestre'}
            {range === 'year' && 'Este Año'}
          </button>
        ))}
      </div>

      {/* Metrics Grid */}
      <div className="space-y-6 mb-8">
        {metrics.map((category, idx) => (
          <div key={idx} className="bg-slate-600/30 border border-slate-600 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">{category.category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {category.items.map((item, itemIdx) => (
                <div key={itemIdx} className="bg-slate-700/50 rounded p-4">
                  <p className="text-slate-400 text-sm">{item.label}</p>
                  <p className="text-2xl font-bold text-white mt-2">{item.value}</p>
                  <p className={`text-sm mt-2 ${item.status === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    {item.change}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="text-yellow-400" />
          Alertas y Notificaciones
        </h3>
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border flex items-start justify-between ${
                alert.type === 'warning'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : alert.type === 'success'
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              <div className="flex-1">
                <p className={`font-semibold ${
                  alert.type === 'warning'
                    ? 'text-yellow-300'
                    : alert.type === 'success'
                    ? 'text-green-300'
                    : 'text-blue-300'
                }`}>
                  {alert.title}
                </p>
                <p className={`text-sm mt-1 ${
                  alert.type === 'warning'
                    ? 'text-yellow-200'
                    : alert.type === 'success'
                    ? 'text-green-200'
                    : 'text-blue-200'
                }`}>
                  {alert.description}
                </p>
              </div>
              <button className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ml-4 ${
                alert.type === 'warning'
                  ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                  : alert.type === 'success'
                  ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                  : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
              }`}>
                {alert.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Chart */}
      <div className="mt-8 bg-slate-600/30 border border-slate-600 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="text-green-400" />
          Tendencia de Rendimiento
        </h3>
        <div className="h-64 flex items-end justify-around gap-2">
          {[65, 72, 68, 85, 92, 88, 95, 98, 102, 105, 103, 108].map((value, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded-t transition-all hover:from-blue-600 hover:to-purple-600"
                style={{ height: `${(value / 110) * 100}%` }}
              />
              <p className="text-xs text-slate-400 mt-2">{['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][idx]}</p>
            </div>
          ))}
        </div>
        <p className="text-slate-400 text-sm mt-4">Crecimiento mensual: +8.5% promedio</p>
      </div>

      {/* Team Performance */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Top Performers</h3>
          <div className="space-y-3">
            {[
              { name: 'Carlos Mendez', deals: 8, value: '$450K' },
              { name: 'Ana García', deals: 6, value: '$380K' },
              { name: 'Juan López', deals: 5, value: '$320K' }
            ].map((person, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded">
                <div>
                  <p className="text-white font-medium">{person.name}</p>
                  <p className="text-slate-400 text-sm">{person.deals} deals</p>
                </div>
                <p className="text-green-400 font-semibold">{person.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Proyecciones</h3>
          <div className="space-y-3">
            {[
              { label: 'Ingresos Proyectados (Q4)', value: '$4.2M', status: 'on-track' },
              { label: 'Nuevos Clientes (Q4)', value: '28', status: 'on-track' },
              { label: 'Retención', value: '94%', status: 'above-target' }
            ].map((proj, idx) => (
              <div key={idx} className="p-3 bg-slate-700/50 rounded">
                <p className="text-slate-400 text-sm">{proj.label}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-white font-semibold">{proj.value}</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    proj.status === 'on-track'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {proj.status === 'on-track' ? 'En Camino' : 'Sobre Meta'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
