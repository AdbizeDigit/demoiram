import { useState, useEffect, useCallback } from 'react'
import { GitBranch, Loader2, RefreshCw } from 'lucide-react'
import api from '../services/api'
import PipelineTab from '../components/detection/PipelineTab'

export default function PipelinePage() {
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/detection/opportunities', { params: { limit: 200 } })
      const data = res.data
      const opps = data.opportunities || data.data || (Array.isArray(data) ? data : [])
      setOpportunities(opps.map(o => ({
        id: o.id || o._id,
        name: o.title || o.name || '',
        description: o.summary || o.description || '',
        fitScore: o.relevance_score || o.fitScore || 0,
        priority: o.priority || 'BAJA',
        type: o.opportunity_type || o.type || 'OTRO',
        region: o.location_mentioned || o.region || '',
        value: Number(o.estimated_value || o.value) || 0,
        detectedAt: o.created_at || o.createdAt || new Date().toISOString(),
        source: o.source || 'Deteccion IA',
        contactName: o.company_mentioned || o.contactName || '',
        addedToPipeline: true,
        pipelineStage: o.pipelineStage || o.status || 'NEW',
        status: o.status || 'NEW',
      })))
    } catch {
      setOpportunities([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleViewDetails = (opp) => {
    // Could open a modal - for now just log
    console.log('View details:', opp)
  }

  const handleMoveStage = async (id, newStage) => {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, pipelineStage: newStage } : o))
    try {
      await api.patch(`/api/detection/opportunities/${id}`, { status: newStage })
    } catch { /* silent */ }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm text-gray-400">Cargando pipeline...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-emerald-600" /> Pipeline de Ventas
          </h1>
          <p className="text-gray-500 mt-1">{opportunities.length} oportunidades en el pipeline</p>
        </div>
        <button onClick={loadData} className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
          <RefreshCw className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <PipelineTab
        opportunities={opportunities}
        onViewDetails={handleViewDetails}
        onMoveStage={handleMoveStage}
      />
    </div>
  )
}
