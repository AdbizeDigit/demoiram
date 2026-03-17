import { useState } from 'react';
import {
  Radar, Hand, Zap, Shuffle, RefreshCw, Plus, Settings2,
  Radio, Target, Globe, Cpu, GitBranch, Activity, Users,
  ToggleLeft, ToggleRight, Timer, Shield, Play, Pause, Loader2,
  AlertTriangle, X,
} from 'lucide-react';
import { formatCompact } from './shared';

const MODES = [
  { id: 'manual', label: 'Manual', icon: Hand, color: 'blue' },
  { id: 'automatic', label: 'Auto', icon: Zap, color: 'purple' },
  { id: 'hybrid', label: 'Hibrido', icon: Shuffle, color: 'emerald' },
];

const TABS = [
  { id: 'radar', label: 'Radar', icon: Radio },
  { id: 'sources', label: 'Fuentes', icon: Globe },
  { id: 'opportunities', label: 'Oportunidades', icon: Target },
  { id: 'rules', label: 'Reglas', icon: Cpu },
  { id: 'pipeline', label: 'Pipeline', icon: GitBranch },
  { id: 'leads', label: 'Leads', icon: Users },
];

export default function DetectionHeader({
  mode,
  onModeChange,
  activeTab,
  onTabChange,
  opportunities,
  activeEngines,
  sources,
  onRefresh,
  onCreateManual,
  automation,
  onAutomationChange,
  scrapingActive,
  scrapingProgress,
  onToggleScraping,
  leadsCount,
  scrapingError,
  onClearError,
  scanStatus,
}) {
  const [togglingScrap, setTogglingScrap] = useState(false);
  const [showAutoPanel, setShowAutoPanel] = useState(false);

  const handleScrapingClick = async () => {
    setTogglingScrap(true);
    try {
      await onToggleScraping();
    } finally {
      setTogglingScrap(false);
    }
  };

  const total = opportunities.length;
  const highPriority = opportunities.filter(o => o.priority === 'ALTA').length;
  const inPipeline = opportunities.filter(o => o.addedToPipeline).length;
  const totalValue = opportunities.reduce((s, o) => s + Number(o.value || 0), 0);
  const activeSources = sources.filter(s => s.enabled).length;

  const scrapingPct = scrapingProgress && scrapingProgress.totalZones > 0
    ? (scrapingProgress.completedZones / scrapingProgress.totalZones) * 100
    : 0;

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Radar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Motor de Deteccion</h1>
              <p className="text-xs text-blue-100">Ecosistema de deteccion inteligente</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center bg-white/10 backdrop-blur rounded-xl p-1">
            {MODES.map(m => {
              const MIcon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => onModeChange(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    mode === m.id
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <MIcon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Scraping toggle button */}
            <button
              onClick={handleScrapingClick}
              disabled={togglingScrap}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm ${
                scrapingActive
                  ? 'bg-amber-400 text-amber-900 hover:bg-amber-300'
                  : 'bg-emerald-400 text-emerald-900 hover:bg-emerald-300'
              } disabled:opacity-60`}
            >
              {togglingScrap ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : scrapingActive ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {scrapingActive ? 'Pausar Scraping' : 'Iniciar Scraping'}
            </button>

            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors duration-200"
              title="Recargar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {(mode === 'manual' || mode === 'hybrid') && (
              <button
                onClick={onCreateManual}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-colors duration-200 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Crear Manual
              </button>
            )}

            {(mode === 'automatic' || mode === 'hybrid') && (
              <button
                onClick={() => setShowAutoPanel(!showAutoPanel)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
                  showAutoPanel
                    ? 'bg-white text-purple-700'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" /> Auto
              </button>
            )}

            <div className="flex items-center gap-1.5 px-3 py-2 bg-white/10 backdrop-blur rounded-lg">
              <span className="relative flex h-2 w-2">
                {scrapingActive ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400" />
                )}
              </span>
              <span className="text-xs text-white/90 font-medium">{activeSources} fuentes</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="px-4 pb-3 flex gap-3 flex-wrap">
          <Stat label="Detectadas" value={total} icon={Target} />
          <Stat label="Alta Prioridad" value={highPriority} icon={Shield} />
          <Stat label="Pipeline" value={inPipeline} icon={GitBranch} />
          <Stat label="Valor Total" value={formatCompact(totalValue)} icon={Activity} />
          <Stat label="Leads" value={leadsCount} icon={Users} />
          <Stat label="Motores" value={activeEngines} icon={Cpu} />
        </div>

        {/* Scraping progress bar */}
        {scrapingActive && scrapingProgress && (
          <div className="px-4 pb-3">
            <div className="bg-white/10 backdrop-blur rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="text-[11px] font-semibold text-white">Scraping en curso</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-white/70">
                  <span>{scrapingProgress.completedZones}/{scrapingProgress.totalZones} zonas</span>
                  <span>{scrapingProgress.totalLeadsFound} leads</span>
                </div>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div
                  className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${scrapingPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Scraping Error Banner */}
        {scrapingError && (
          <div className="px-4 pb-3">
            <div className="bg-red-500/20 border border-red-400/30 backdrop-blur rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-300 flex-shrink-0" />
                <span className="text-xs text-red-200">{scrapingError}</span>
              </div>
              {onClearError && (
                <button onClick={onClearError} className="text-red-300 hover:text-red-100 transition-colors duration-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Automation Panel */}
        {showAutoPanel && (mode === 'automatic' || mode === 'hybrid') && (
          <div className="px-4 pb-4 border-t border-white/10">
            <div className="pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <AutoToggle
                label="Auto-Scan"
                desc={`Cada ${automation.scanIntervalMinutes}m`}
                enabled={automation.autoScan}
                onChange={v => onAutomationChange({ ...automation, autoScan: v })}
                icon={Timer}
              />
              <AutoToggle
                label="Auto-Score"
                desc="Calificacion IA"
                enabled={automation.autoScore}
                onChange={v => onAutomationChange({ ...automation, autoScore: v })}
                icon={Target}
              />
              <AutoToggle
                label="Auto-Pipeline"
                desc={`Score >= ${automation.minScoreForPipeline}`}
                enabled={automation.autoPipeline}
                onChange={v => onAutomationChange({ ...automation, autoPipeline: v })}
                icon={GitBranch}
              />
              <AutoToggle
                label="Auto-Enrich"
                desc="Enriquecimiento"
                enabled={automation.autoEnrich}
                onChange={v => onAutomationChange({ ...automation, autoEnrich: v })}
                icon={Cpu}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
        {TABS.map(tab => {
          const TIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur rounded-lg">
      <Icon className="w-3.5 h-3.5 text-white/70" />
      <span className="text-xs text-white/60">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function AutoToggle({ label, desc, enabled, onChange, icon: Icon }) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors duration-200 ${
        enabled ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10'
      }`}
      onClick={() => onChange(!enabled)}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${enabled ? 'text-white' : 'text-white/40'}`} />
        <div>
          <p className={`text-xs font-medium ${enabled ? 'text-white' : 'text-white/50'}`}>{label}</p>
          <p className="text-[10px] text-white/40">{desc}</p>
        </div>
      </div>
      {enabled ? (
        <ToggleRight className="w-5 h-5 text-white" />
      ) : (
        <ToggleLeft className="w-5 h-5 text-white/30" />
      )}
    </div>
  );
}
