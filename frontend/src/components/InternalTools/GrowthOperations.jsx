import { useState } from 'react'
import { TrendingUp, BarChart3, Users, Target, Zap } from 'lucide-react'

export default function GrowthOperations() {
  const [selectedMetric, setSelectedMetric] = useState('revenue')

  const metrics = [
    {
      id: 'revenue',
      label: 'Ingresos',
      value: '$125,450',
      change: '+12.5%',
      icon: '💰'
    },
    {
      id: 'clients',
      label: 'Clientes Activos',
      value: '48',
      change: '+8',
      icon: '👥'
    },
    {
      id: 'conversion',
      label: 'Tasa de Conversión',
      value: '3.2%',
      change: '+0.8%',
      icon: '📈'
    },
    {
      id: 'pipeline',
      label: 'Pipeline',
      value: '$450K',
      change: '+$50K',
      icon: '🎯'
    }
  ]

  const operations = [
    {
      name: 'Prospección Diaria',
      status: 'Activo',
      leads: 125,
      qualified: 32,
      efficiency: '25.6%'
    },
    {
      name: 'Seguimiento Automático',
      status: 'Activo',
      leads: 89,
      qualified: 24,
      efficiency: '27%'
    },
    {
      name: 'Análisis Competitivo',
      status: 'En Pausa',
      leads: 0,
      qualified: 0,
      efficiency: '-'
    },
    {
      name: 'Enriquecimiento de Datos',
      status: 'Activo',
      leads: 156,
      qualified: 45,
      efficiency: '28.8%'
    }
  ]

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <TrendingUp className="text-green-400" />
        Growth & Operaciones
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {metrics.map(metric => (
          <div
            key={metric.id}
            onClick={() => setSelectedMetric(metric.id)}
            className={`bg-slate-600/30 border rounded-lg p-4 cursor-pointer transition ${
              selectedMetric === metric.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <div className="text-3xl mb-2">{metric.icon}</div>
            <p className="text-slate-400 text-sm">{metric.label}</p>
            <p className="text-2xl font-bold text-white mt-2">{metric.value}</p>
            <p className="text-green-400 text-sm mt-1">↑ {metric.change}</p>
          </div>
        ))}
      </div>

      {/* Operations Table */}
      <div className="bg-slate-600/30 border border-slate-600 rounded-lg overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-600">
          <h3 className="text-lg font-bold text-white">Operaciones en Ejecución</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Operación</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Estado</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Leads Procesados</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Calificados</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Eficiencia</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((op, idx) => (
                <tr key={idx} className="border-b border-slate-600 hover:bg-slate-700/20 transition">
                  <td className="px-6 py-4 text-white font-medium">{op.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      op.status === 'Activo'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {op.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{op.leads}</td>
                  <td className="px-6 py-4 text-slate-300">{op.qualified}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: op.efficiency === '-' ? '0%' : op.efficiency }}
                        />
                      </div>
                      <span className="text-slate-300 text-sm">{op.efficiency}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Growth Strategies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target className="text-purple-400" />
            Estrategias Activas
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded">
              <span className="text-slate-300">Outbound Prospección</span>
              <span className="text-green-400 font-semibold">↑ 15%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded">
              <span className="text-slate-300">Content Marketing</span>
              <span className="text-green-400 font-semibold">↑ 8%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded">
              <span className="text-slate-300">Partnership</span>
              <span className="text-yellow-400 font-semibold">→ 0%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded">
              <span className="text-slate-300">Product-Led Growth</span>
              <span className="text-green-400 font-semibold">↑ 22%</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="text-yellow-400" />
            Próximas Acciones
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
              <p className="text-blue-300 font-semibold text-sm">Lanzar campaña de email</p>
              <p className="text-blue-200 text-xs mt-1">Hoy a las 14:00</p>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded">
              <p className="text-purple-300 font-semibold text-sm">Análisis competitivo</p>
              <p className="text-purple-200 text-xs mt-1">Mañana 10:00</p>
            </div>
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
              <p className="text-green-300 font-semibold text-sm">Reunión con equipo de ventas</p>
              <p className="text-green-200 text-xs mt-1">Viernes 11:00</p>
            </div>
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded">
              <p className="text-orange-300 font-semibold text-sm">Revisión de pipeline</p>
              <p className="text-orange-200 text-xs mt-1">Próxima semana</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
