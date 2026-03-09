import { useState } from 'react'
import { Users, Filter, Zap, TrendingUp } from 'lucide-react'

export default function ProspectionAdvanced() {
  const [selectedSegment, setSelectedSegment] = useState('high-value')
  const [showFilters, setShowFilters] = useState(false)

  const segments = [
    {
      id: 'high-value',
      name: 'Alto Valor',
      count: 234,
      value: '$2.1M',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'mid-market',
      name: 'Mid-Market',
      count: 567,
      value: '$1.8M',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'startup',
      name: 'Startups',
      count: 892,
      value: '$0.9M',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      count: 45,
      value: '$3.5M',
      color: 'from-orange-500 to-red-500'
    }
  ]

  const prospects = [
    {
      id: 1,
      name: 'Tech Innovations Inc',
      industry: 'SaaS',
      location: 'San Francisco, CA',
      score: 0.95,
      stage: 'Qualified',
      value: '$150K',
      lastContact: '2 días'
    },
    {
      id: 2,
      name: 'Digital Solutions LLC',
      industry: 'Consulting',
      location: 'New York, NY',
      score: 0.88,
      stage: 'Engaged',
      value: '$120K',
      lastContact: '5 días'
    },
    {
      id: 3,
      name: 'Cloud Systems Corp',
      industry: 'Infrastructure',
      location: 'Seattle, WA',
      score: 0.92,
      stage: 'Qualified',
      value: '$200K',
      lastContact: '1 día'
    },
    {
      id: 4,
      name: 'AI Ventures',
      industry: 'AI/ML',
      location: 'Boston, MA',
      score: 0.85,
      stage: 'Interested',
      value: '$180K',
      lastContact: '3 días'
    }
  ]

  const getScoreColor = (score) => {
    if (score >= 0.9) return 'text-green-400'
    if (score >= 0.8) return 'text-blue-400'
    if (score >= 0.7) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getStageColor = (stage) => {
    switch (stage) {
      case 'Qualified':
        return 'bg-green-500/20 text-green-400'
      case 'Engaged':
        return 'bg-blue-500/20 text-blue-400'
      case 'Interested':
        return 'bg-purple-500/20 text-purple-400'
      default:
        return 'bg-slate-500/20 text-slate-400'
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Users className="text-purple-400" />
        Prospección Avanzada
      </h2>

      {/* Segments */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {segments.map(segment => (
          <button
            key={segment.id}
            onClick={() => setSelectedSegment(segment.id)}
            className={`p-4 rounded-lg border transition ${
              selectedSegment === segment.id
                ? `border-blue-500 bg-blue-500/10`
                : 'border-slate-600 bg-slate-600/30 hover:border-slate-500'
            }`}
          >
            <p className="text-slate-400 text-sm">{segment.name}</p>
            <p className="text-2xl font-bold text-white mt-2">{segment.count}</p>
            <p className="text-green-400 text-sm mt-1">Valor: {segment.value}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 bg-slate-600/50 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded transition"
        >
          <Filter size={18} />
          Filtros Avanzados
        </button>

        {showFilters && (
          <div className="mt-4 bg-slate-600/30 border border-slate-600 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Score Mínimo</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                defaultValue="0.7"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Industria</label>
              <select className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white">
                <option>Todas</option>
                <option>SaaS</option>
                <option>AI/ML</option>
                <option>Fintech</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Ubicación</label>
              <select className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white">
                <option>Todas</option>
                <option>USA</option>
                <option>LATAM</option>
                <option>Europa</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Etapa</label>
              <select className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white">
                <option>Todas</option>
                <option>Qualified</option>
                <option>Engaged</option>
                <option>Interested</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Prospects Table */}
      <div className="bg-slate-600/30 border border-slate-600 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-600 bg-slate-700/50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Prospecto</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Industria</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Score</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Etapa</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Valor</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Último Contacto</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((prospect) => (
                <tr key={prospect.id} className="border-b border-slate-600 hover:bg-slate-700/20 transition">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{prospect.name}</p>
                      <p className="text-slate-400 text-sm">{prospect.location}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{prospect.industry}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-6 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                          style={{ width: `${prospect.score * 100}%` }}
                        />
                      </div>
                      <span className={`font-semibold text-sm ${getScoreColor(prospect.score)}`}>
                        {(prospect.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStageColor(prospect.stage)}`}>
                      {prospect.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-semibold">{prospect.value}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{prospect.lastContact}</td>
                  <td className="px-6 py-4">
                    <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                      Ver →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-600/20 to-green-400/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-300 text-sm">Tasa de Conversión</p>
          <p className="text-3xl font-bold text-green-400 mt-2">3.8%</p>
          <p className="text-green-200 text-xs mt-1">↑ 0.5% vs mes anterior</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-400/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-300 text-sm">Ciclo de Venta Promedio</p>
          <p className="text-3xl font-bold text-blue-400 mt-2">45 días</p>
          <p className="text-blue-200 text-xs mt-1">↓ 5 días vs mes anterior</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-400/10 border border-purple-500/30 rounded-lg p-4">
          <p className="text-purple-300 text-sm">Valor Promedio por Deal</p>
          <p className="text-3xl font-bold text-purple-400 mt-2">$125K</p>
          <p className="text-purple-200 text-xs mt-1">↑ $15K vs mes anterior</p>
        </div>
      </div>
    </div>
  )
}
