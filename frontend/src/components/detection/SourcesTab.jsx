import { useState, useEffect, useCallback } from 'react';
import {
  Globe, Search, Loader2, Sparkles, Newspaper,
  Clock, ToggleLeft, ToggleRight, RefreshCw,
  Rss, AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';

const SOURCE_TYPE_ICONS = {
  RSS: 'bg-orange-50 text-orange-600 border-orange-200',
  NEWS_API: 'bg-blue-50 text-blue-600 border-blue-200',
  GNEWS: 'bg-green-50 text-green-600 border-green-200',
  DUCKDUCKGO: 'bg-amber-50 text-amber-600 border-amber-200',
  COMPRANET: 'bg-red-50 text-red-600 border-red-200',
  SOCIAL: 'bg-purple-50 text-purple-600 border-purple-200',
};

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Nunca';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Justo ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days}d`;
}

export default function SourcesTab({ sources: localSources = [], mode, onToggle, onScan, onViewLeads }) {
  const [detSources, setDetSources] = useState([]);
  const [detLoading, setDetLoading] = useState(true);
  const [scanStatus, setScanStatus] = useState({ isScanning: false, isAutoScanning: false });
  const [search, setSearch] = useState('');
  const [scanningSourceId, setScanningSourceId] = useState(null);

  const loadDetectionSources = useCallback(async () => {
    setDetLoading(true);
    try {
      const [srcRes, statusRes] = await Promise.allSettled([
        api.get('/api/detection/sources'),
        api.get('/api/detection/scan/status'),
      ]);
      if (srcRes.status === 'fulfilled') {
        setDetSources(srcRes.value.data.sources || []);
      }
      if (statusRes.status === 'fulfilled') {
        setScanStatus(statusRes.value.data);
      }
    } catch { /* silent */ }
    setDetLoading(false);
  }, []);

  useEffect(() => {
    loadDetectionSources();
  }, [loadDetectionSources]);

  const handleToggleDetSource = async (id, enabled) => {
    try {
      await api.patch(`/api/detection/sources/${id}`, { enabled: !enabled });
      setDetSources(prev => prev.map(s => s.id === id ? { ...s, enabled: !enabled } : s));
    } catch { /* silent */ }
  };

  const handleToggleAutoScan = async () => {
    try {
      if (scanStatus.isAutoScanning) {
        await api.post('/api/detection/scan/auto/stop');
      } else {
        await api.post('/api/detection/scan/auto/start');
      }
      setScanStatus(prev => ({ ...prev, isAutoScanning: !prev.isAutoScanning }));
    } catch { /* silent */ }
  };

  const handleScanAll = async () => {
    setScanStatus(prev => ({ ...prev, isScanning: true }));
    try {
      await api.post('/api/detection/scan');
      await loadDetectionSources();
    } catch { /* silent */ }
    setScanStatus(prev => ({ ...prev, isScanning: false }));
  };

  const handleScanSource = async (id) => {
    setScanningSourceId(id);
    try {
      await api.post('/api/detection/scan');
      await loadDetectionSources();
    } catch { /* silent */ }
    setScanningSourceId(null);
  };

  // Merge local sources with API sources for display
  const allSources = [
    ...detSources,
    ...localSources.filter(ls => !detSources.find(ds => ds.id === ls.id)),
  ];

  const filtered = allSources.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) || (s.type || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Auto-scan control */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" /> Escaneo Automatico de Noticias
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Busca oportunidades en noticias, RSS, y redes sociales cada hora
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleScanAll}
              disabled={scanStatus.isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {scanStatus.isScanning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {scanStatus.isScanning ? 'Escaneando...' : 'Escanear Todo'}
            </button>
            <button
              onClick={handleToggleAutoScan}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                scanStatus.isAutoScanning
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {scanStatus.isAutoScanning ? (
                <><ToggleRight className="w-5 h-5" /> Activo</>
              ) : (
                <><ToggleLeft className="w-5 h-5" /> Inactivo</>
              )}
            </button>
          </div>
        </div>
        {scanStatus.isScanning && (
          <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
            <Loader2 className="w-3 h-3 animate-spin" /> Escaneo en progreso...
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar fuente..."
          className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-400"
        />
      </div>

      {/* Sources grid */}
      {detLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((src, i) => (
            <div
              key={src.id || i}
              className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${SOURCE_TYPE_ICONS[src.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {src.type === 'RSS' ? (
                      <Rss className="w-4 h-4" />
                    ) : src.type === 'DUCKDUCKGO' ? (
                      <Globe className="w-4 h-4" />
                    ) : (
                      <Newspaper className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{src.name}</h4>
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border font-medium mt-0.5 ${SOURCE_TYPE_ICONS[src.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {src.type}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleToggleDetSource(src.id, src.enabled);
                    if (onToggle) onToggle(src.id);
                  }}
                  className="flex-shrink-0"
                >
                  {src.enabled ? (
                    <ToggleRight className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-300" />
                  )}
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-gray-900">{src.totalArticles || 0}</p>
                  <p className="text-[10px] text-gray-500">Total Articulos</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-700">{src.lastRunArticles || 0}</p>
                  <p className="text-[10px] text-gray-500">Ultimo Escaneo</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-gray-400">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(src.lastRunAt)}
                </span>
                <div className="flex items-center gap-2">
                  {src.lastRunError && (
                    <span className="flex items-center gap-1 text-red-500" title={src.lastRunError}>
                      <AlertTriangle className="w-3 h-3" /> Error
                    </span>
                  )}
                  {!src.lastRunError && src.enabled && (
                    <span className="flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-emerald-600">Activo</span>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      handleScanSource(src.id);
                      if (onScan) onScan(src.id);
                    }}
                    disabled={scanningSourceId === src.id}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {scanningSourceId === src.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Escanear
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!detLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay fuentes configuradas</p>
          <p className="text-xs mt-1">Ejecuta un escaneo para crear las fuentes iniciales</p>
        </div>
      )}
    </div>
  );
}
