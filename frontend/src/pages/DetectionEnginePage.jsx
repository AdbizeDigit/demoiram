import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, RefreshCw, Globe } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'

import { DEFAULT_SOURCES, DEFAULT_RULES, DEFAULT_AUTOMATION } from '../components/detection/shared'

import DetectionHeader from '../components/detection/DetectionHeader'
import RadarTab from '../components/detection/RadarTab'
import SourcesTab from '../components/detection/SourcesTab'
import OpportunitiesTab from '../components/detection/OpportunitiesTab'
import RulesTab from '../components/detection/RulesTab'
import PipelineTab from '../components/detection/PipelineTab'
import LeadsTab from '../components/detection/LeadsTab'
import OpportunityDetailModal from '../components/detection/OpportunityDetailModal'
import CreateOpportunityModal from '../components/detection/CreateOpportunityModal'
import RuleEditorModal from '../components/detection/RuleEditorModal'
import ActivityLog from '../components/detection/ActivityLog'
import DebugConsole from '../components/detection/DebugConsole'

export default function DetectionEnginePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // ── Core data ──
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Mode & navigation ──
  const [mode, setMode] = useState('hybrid')
  const [activeTab, setActiveTab] = useState('radar')

  // ── Local config state ──
  const [sources, setSources] = useState(DEFAULT_SOURCES)
  const [rules, setRules] = useState(DEFAULT_RULES)
  const [automation, setAutomation] = useState(DEFAULT_AUTOMATION)

  // ── Modals ──
  const [selectedOpportunity, setSelectedOpportunity] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRule, setEditingRule] = useState(null) // null=closed, 'new'=new, object=editing
  const [updatingId, setUpdatingId] = useState(null)

  // ── Activity log ──
  const [logs, setLogs] = useState([
    { id: '1', timestamp: new Date().toISOString(), type: 'scan', message: 'Sistema de deteccion iniciado', severity: 'info' },
  ])

  // ── Scan status ──
  const [scanStatus, setScanStatus] = useState(null)
  const [activeEngines, setActiveEngines] = useState(0)

  // ── Scraping state ──
  const [scrapingActive, setScrapingActive] = useState(false)
  const [scrapingProgress, setScrapingProgress] = useState({ totalZones: 0, completedZones: 0, totalLeadsFound: 0 })
  const [scrapingError, setScrapingError] = useState(null)

  // ── Leads count ──
  const [leadsCount, setLeadsCount] = useState(0)

  // ── Country selector ──
  const [countries, setCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [seedingCountry, setSeedingCountry] = useState(false)

  // ── Redirect non-admin ──
  const isAdmin = user?.role === 'admin' || user?.email === 'contacto@adbize.com'
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard')
    }
  }, [isAdmin, navigate])

  useEffect(() => {
    api.get('/api/scraping-engine/countries')
      .then(r => setCountries(r.data?.available || []))
      .catch(() => {})
  }, [])

  const handleSeedCountry = async (country) => {
    setSeedingCountry(true)
    try {
      await api.post('/api/scraping-engine/zones/seed', { country })
      addLog('auto', `Zonas creadas para ${country}`, 'success')
      loadAll()
    } catch (err) {
      addLog('auto', `Error creando zonas: ${err.message}`, 'error')
    }
    setSeedingCountry(false)
  }

  const addLog = useCallback((type, message, severity = 'info') => {
    setLogs(prev => [
      { id: Date.now().toString(), timestamp: new Date().toISOString(), type, message, severity },
      ...prev,
    ].slice(0, 100))
  }, [])

  // ── Load all data ──
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [oppsRes, statsRes, statusRes, sourcesRes, logsRes, leadsStatsRes] = await Promise.allSettled([
      api.get('/api/detection/opportunities', { params: { limit: 100 } }),
      api.get('/api/detection/opportunities/stats'),
      api.get('/api/detection/scan/status'),
      api.get('/api/detection/sources'),
      api.get('/api/detection/logs', { params: { limit: 20 } }),
      api.get('/api/scraping-engine/leads/stats'),
    ])

    if (oppsRes.status === 'fulfilled') {
      const data = oppsRes.value.data
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
        addedToPipeline: o.status === 'CONVERTED' || o.addedToPipeline || false,
        pipelineStage: o.pipelineStage || (o.status === 'CONVERTED' ? 'QUALIFIED' : 'NEW'),
        status: o.status || 'NEW',
        company_mentioned: o.company_mentioned,
        location_mentioned: o.location_mentioned,
        relevance_score: o.relevance_score,
        opportunity_type: o.opportunity_type,
        summary: o.summary,
        created_at: o.created_at,
        estimated_value: o.estimated_value,
      })))
      addLog('scan', `${opps.length} oportunidades cargadas`, 'success')
    } else {
      setError('Error al cargar oportunidades')
      addLog('scan', 'Error al cargar oportunidades', 'error')
    }

    if (statusRes.status === 'fulfilled') {
      const status = statusRes.value.data
      setScanStatus(status)
      setScrapingActive(status.autoScanActive || status.isAutoScanning || false)
      setActiveEngines(status.isScanning ? 1 : 0)
    }

    if (statsRes.status === 'fulfilled') {
      const stats = statsRes.value.data
      setLeadsCount(stats.total || 0)
    }

    if (leadsStatsRes.status === 'fulfilled') {
      const ld = leadsStatsRes.value.data?.data || leadsStatsRes.value.data
      if (ld?.total) setLeadsCount(ld.total)
    }

    if (sourcesRes.status === 'fulfilled') {
      const apiSources = sourcesRes.value.data.sources || sourcesRes.value.data || []
      if (apiSources.length > 0) {
        // Merge API sources into local sources display
        const mapped = apiSources.map(s => ({
          id: s.id?.toString() || s._id,
          name: s.name,
          category: s.type === 'RSS' ? 'empresarial' : s.type === 'DUCKDUCKGO' ? 'empresarial' : 'gubernamental',
          enabled: s.enabled,
          schedule: 'Automatico',
          lastRun: s.last_run_at || s.lastRunAt || null,
          status: s.enabled ? 'active' : 'idle',
          totalDetected: s.total_articles || s.totalArticles || 0,
          last24h: s.last_run_articles || s.lastRunArticles || 0,
          description: `Fuente ${s.type}: ${s.name}`,
          type: s.type,
          last_run_error: s.last_run_error || s.lastRunError,
        }))
        setSources(mapped)
      }
    }

    if (logsRes.status === 'fulfilled') {
      const apiLogs = logsRes.value.data.logs || logsRes.value.data || []
      if (apiLogs.length > 0) {
        const mappedLogs = apiLogs.map(l => ({
          id: l.id?.toString() || Date.now().toString(),
          timestamp: l.started_at || l.startedAt || new Date().toISOString(),
          type: 'scan',
          message: `Escaneo ${l.status}: ${l.articles_found || 0} articulos, ${l.opportunities_created || 0} oportunidades`,
          severity: l.status === 'COMPLETED' ? 'success' : l.status === 'ERROR' ? 'error' : 'info',
        }))
        setLogs(prev => [...mappedLogs, ...prev].slice(0, 100))
      }
    }

    setLoading(false)
  }, [addLog])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Actions ──
  const handleAddToPipeline = async (id, stage) => {
    try {
      setUpdatingId(id)
      await api.patch(`/api/detection/opportunities/${id}`, { status: 'CONVERTED' })
      setOpportunities(prev => prev.map(o => o.id === id ? { ...o, addedToPipeline: true, pipelineStage: stage || 'QUALIFIED', status: 'CONVERTED' } : o))
      addLog('pipeline', `Oportunidad agregada al pipeline`, 'success')
    } catch {
      addLog('pipeline', 'Error al agregar al pipeline', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleUpdateOpportunity = async (id, data) => {
    try {
      await api.patch(`/api/detection/opportunities/${id}`, data)
      setOpportunities(prev => prev.map(o => o.id === id ? { ...o, ...data } : o))
      addLog('manual', 'Oportunidad actualizada', 'success')
    } catch {
      addLog('manual', 'Error al actualizar', 'error')
    }
  }

  const handleDeleteOpportunity = async (id) => {
    try {
      await api.patch(`/api/detection/opportunities/${id}`, { status: 'DISMISSED' })
      setOpportunities(prev => prev.map(o => o.id === id ? { ...o, status: 'DISMISSED' } : o))
      setSelectedOpportunity(null)
      addLog('manual', 'Oportunidad descartada', 'warning')
    } catch {
      addLog('manual', 'Error al descartar', 'error')
    }
  }

  const handleCreateOpportunity = async (data) => {
    try {
      // Use the scan endpoint or direct creation isn't available, so we add to log
      const newOpp = {
        id: `manual-${Date.now()}`,
        name: data.name || data.title,
        description: data.description || data.summary || '',
        fitScore: 70,
        priority: data.priority || 'MEDIA',
        type: data.type || data.opportunity_type || 'OTRO',
        region: data.location || data.location_mentioned || '',
        value: Number(data.value || data.estimated_value) || 0,
        detectedAt: new Date().toISOString(),
        source: 'Manual',
        contactName: data.company || data.company_mentioned || '',
        addedToPipeline: false,
        pipelineStage: 'NEW',
        status: 'NEW',
        company_mentioned: data.company || data.company_mentioned,
        location_mentioned: data.location || data.location_mentioned,
        relevance_score: 70,
        opportunity_type: data.type || data.opportunity_type || 'OTRO',
        summary: data.description || data.summary || '',
        created_at: new Date().toISOString(),
      }
      setOpportunities(prev => [newOpp, ...prev])
      setShowCreateModal(false)
      addLog('manual', `Oportunidad "${data.name || data.title}" creada manualmente`, 'success')
    } catch {
      addLog('manual', 'Error al crear oportunidad', 'error')
    }
  }

  const handleToggleSource = (id) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled, status: !s.enabled ? 'active' : 'idle' } : s))
    const src = sources.find(s => s.id === id)
    addLog('scan', `Fuente ${src?.name || id} ${src?.enabled ? 'desactivada' : 'activada'}`, 'info')

    // Also toggle on backend if it's a real source
    api.patch(`/api/detection/sources/${id}`, { enabled: !src?.enabled }).catch(() => {})
  }

  const handleScanSource = (id) => {
    const src = sources.find(s => s.id === id)
    if (!src) return
    setSources(prev => prev.map(s => s.id === id ? { ...s, status: 'scanning' } : s))
    addLog('scan', `Escaneando fuente: ${src.name}...`, 'info')

    // Trigger real scan
    api.post('/api/detection/scan').then(res => {
      const result = res.data
      setSources(prev => prev.map(s => s.id === id ? {
        ...s,
        status: 'active',
        lastRun: new Date().toISOString(),
        totalDetected: s.totalDetected + (result.articlesFound || 0),
        last24h: result.articlesFound || 0,
      } : s))
      addLog('scan', `Escaneo completado: ${src.name} — ${result.articlesFound || 0} articulos, ${result.opportunitiesCreated || 0} oportunidades`, 'success')
      loadAll()
    }).catch(() => {
      setSources(prev => prev.map(s => s.id === id ? { ...s, status: 'error' } : s))
      addLog('scan', `Error escaneando ${src.name}`, 'error')
    })
  }

  const handleSaveRule = (rule) => {
    setRules(prev => {
      const exists = prev.find(r => r.id === rule.id)
      if (exists) return prev.map(r => r.id === rule.id ? rule : r)
      return [...prev, rule]
    })
    setEditingRule(null)
    addLog('rule', `Regla "${rule.name}" guardada`, 'success')
  }

  const handleDeleteRule = (id) => {
    setRules(prev => prev.filter(r => r.id !== id))
    addLog('rule', 'Regla eliminada', 'warning')
  }

  const handleMovePipelineStage = async (id, newStage) => {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, pipelineStage: newStage } : o))
    addLog('pipeline', `Oportunidad movida a etapa: ${newStage}`, 'info')
  }

  const handleToggleScraping = async () => {
    try {
      setScrapingError(null)
      if (scrapingActive) {
        // Stop both systems
        await Promise.allSettled([
          api.post('/api/detection/scan/auto/stop'),
          api.post('/api/scraping-engine/auto/stop'),
        ])
        setScrapingActive(false)
        setScrapingProgress({ totalZones: 0, completedZones: 0, totalLeadsFound: 0 })
        addLog('auto', 'Scraping detenido', 'warning')
      } else {
        // Start both: detection scan + zone scraping
        const [detRes, scrRes] = await Promise.allSettled([
          api.post('/api/detection/scan'),
          api.post('/api/scraping-engine/auto/start'),
        ])
        setScrapingActive(true)
        if (scrRes.status === 'fulfilled') {
          const d = scrRes.value.data?.data || scrRes.value.data
          setScrapingProgress({ totalZones: d.totalZones || 0, completedZones: 0, totalLeadsFound: 0 })
          addLog('auto', `Scraping iniciado: ${d.totalZones || 0} zonas + deteccion de oportunidades`, 'success')
        } else {
          addLog('auto', 'Deteccion de oportunidades iniciada', 'success')
        }
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Error al cambiar estado del scraping'
      setScrapingError(errorMsg)
      addLog('auto', errorMsg, 'error')
    }
  }

  // Poll scraping status when active
  useEffect(() => {
    if (!scrapingActive) return
    const interval = setInterval(async () => {
      try {
        const [detRes, scrRes] = await Promise.allSettled([
          api.get('/api/detection/scan/status'),
          api.get('/api/scraping-engine/auto/status'),
        ])

        const detStatus = detRes.status === 'fulfilled' ? detRes.value.data : {}
        const scrStatus = scrRes.status === 'fulfilled' ? (scrRes.value.data?.data || scrRes.value.data) : {}

        const isActive = detStatus.isScanning || detStatus.autoScanActive || scrStatus.isActive || false
        setScrapingActive(isActive)
        setScanStatus({ ...detStatus, ...scrStatus })

        if (scrStatus.totalZones) {
          setScrapingProgress({
            totalZones: scrStatus.totalZones || 0,
            completedZones: scrStatus.completedZones || 0,
            totalLeadsFound: scrStatus.totalLeadsFound || 0,
          })
          setLeadsCount(scrStatus.totalLeadsFound || leadsCount)
        }

        if (!isActive && scrapingActive) {
          addLog('auto', `Scraping completado: ${scrStatus.totalLeadsFound || 0} leads encontrados`, 'success')
          loadAll()
        }
      } catch { /* silent */ }
    }, 10000)
    return () => clearInterval(interval)
  }, [scrapingActive])

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm text-gray-400">Iniciando motor de deteccion...</p>
      </div>
    )
  }

  // ── Error state ──
  if (error && opportunities.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={loadAll} className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 inline-flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Country Selector */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-gray-700">Paises de Scraping</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {countries.map(c => (
            <button key={c} onClick={() => handleSeedCountry(c)} disabled={seedingCountry}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors disabled:opacity-50">
              {c}
            </button>
          ))}
        </div>
        {seedingCountry && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
      </div>

      <DetectionHeader
        mode={mode}
        onModeChange={setMode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        opportunities={opportunities}
        activeEngines={activeEngines}
        sources={sources}
        onRefresh={loadAll}
        onCreateManual={() => setShowCreateModal(true)}
        automation={automation}
        onAutomationChange={setAutomation}
        scrapingActive={scrapingActive}
        scrapingProgress={scrapingProgress}
        onToggleScraping={handleToggleScraping}
        leadsCount={leadsCount}
        scrapingError={scrapingError}
        onClearError={() => setScrapingError(null)}
        scanStatus={scanStatus}
      />

      <div className="min-h-[600px]">
        {activeTab === 'radar' && (
          <RadarTab
            opportunities={opportunities}
            sources={sources}
            logs={logs}
            mode={mode}
            onViewDetails={setSelectedOpportunity}
            scrapingActive={scrapingActive}
            scrapingProgress={scrapingProgress}
            onTabChange={setActiveTab}
          />
        )}
        {activeTab === 'sources' && (
          <SourcesTab
            sources={sources}
            mode={mode}
            onToggle={handleToggleSource}
            onScan={handleScanSource}
            onViewLeads={() => setActiveTab('leads')}
          />
        )}
        {activeTab === 'opportunities' && (
          <OpportunitiesTab
            opportunities={opportunities}
            mode={mode}
            updatingId={updatingId}
            onViewDetails={setSelectedOpportunity}
            onAddToPipeline={handleAddToPipeline}
            onCreateManual={() => setShowCreateModal(true)}
            onDelete={handleDeleteOpportunity}
          />
        )}
        {activeTab === 'rules' && (
          <RulesTab
            rules={rules}
            mode={mode}
            onToggle={(id) => setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))}
            onEdit={setEditingRule}
            onDelete={handleDeleteRule}
            onCreate={() => setEditingRule('new')}
          />
        )}
        {activeTab === 'pipeline' && (
          <PipelineTab
            opportunities={opportunities.filter(o => o.addedToPipeline)}
            onViewDetails={setSelectedOpportunity}
            onMoveStage={handleMovePipelineStage}
          />
        )}
        {activeTab === 'leads' && (
          <LeadsTab />
        )}
      </div>

      <ActivityLog logs={logs} />

      <DebugConsole
        logs={logs}
        sources={sources}
        rules={rules}
        automation={automation}
        opportunities={opportunities}
        activeEngines={activeEngines}
      />

      {selectedOpportunity && (
        <OpportunityDetailModal
          opportunity={selectedOpportunity}
          onClose={() => setSelectedOpportunity(null)}
          onAddToPipeline={handleAddToPipeline}
          onUpdate={handleUpdateOpportunity}
          onDelete={handleDeleteOpportunity}
          updatingId={updatingId}
          mode={mode}
        />
      )}

      {showCreateModal && (
        <CreateOpportunityModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateOpportunity}
        />
      )}

      {editingRule !== null && (
        <RuleEditorModal
          rule={editingRule === 'new' ? null : editingRule}
          onClose={() => setEditingRule(null)}
          onSave={handleSaveRule}
        />
      )}
    </div>
  )
}
