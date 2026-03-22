import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Plus, Trash2, Eye, GitBranch, ChevronDown, ChevronLeft, ChevronRight,
  AlertCircle, Sparkles, Building2, MapPin,
  ExternalLink, ArrowRightCircle, XCircle, Loader2, Radar,
} from 'lucide-react';
import api from '../../services/api';

const OPP_TYPE_LABELS = {
  APP_WEB: 'App Web',
  APP_MOVIL: 'App Movil',
  IA_ML: 'IA / Machine Learning',
  CHATBOT_LLM: 'Chatbot / LLM',
  AUTOMATIZACION: 'Automatizacion',
  ECOMMERCE: 'Ecommerce',
  LICITACION_TECH: 'Licitacion Tech',
  NEARSHORING_TECH: 'Nearshoring Tech',
  TRANSFORMACION_DIGITAL: 'Transformacion Digital',
  OTRO: 'Otro',
};

const OPP_TYPE_COLORS = {
  APP_WEB: 'bg-blue-50 text-blue-700 border-blue-200',
  APP_MOVIL: 'bg-purple-50 text-purple-700 border-purple-200',
  IA_ML: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CHATBOT_LLM: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  AUTOMATIZACION: 'bg-amber-50 text-amber-700 border-amber-200',
  ECOMMERCE: 'bg-orange-50 text-orange-700 border-orange-200',
  LICITACION_TECH: 'bg-red-50 text-red-700 border-red-200',
  NEARSHORING_TECH: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  TRANSFORMACION_DIGITAL: 'bg-teal-50 text-teal-700 border-teal-200',
  OTRO: 'bg-gray-100 text-gray-600 border-gray-200',
};

const PRIORITY_COLORS = {
  ALTA: 'bg-red-50 text-red-700 border-red-200',
  MEDIA: 'bg-amber-50 text-amber-700 border-amber-200',
  BAJA: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_COLORS = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  REVIEWED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  CONVERTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISMISSED: 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_LABELS = {
  NEW: 'Nueva',
  REVIEWED: 'Revisada',
  CONVERTED: 'Convertida',
  DISMISSED: 'Descartada',
};

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Justo ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days}d`;
}

function ScoreBadge({ score }) {
  const color = score >= 90 ? 'from-emerald-500 to-green-400'
    : score >= 70 ? 'from-blue-500 to-cyan-400'
    : score >= 50 ? 'from-amber-500 to-yellow-400'
    : 'from-gray-400 to-gray-300';

  return (
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex flex-col items-center justify-center text-white flex-shrink-0`}>
      <span className="text-sm font-bold">{score}</span>
      <span className="text-[7px] font-medium opacity-80">score</span>
    </div>
  );
}

function ScoreBar({ score }) {
  const color = score >= 90 ? 'bg-emerald-500'
    : score >= 70 ? 'bg-blue-500'
    : score >= 50 ? 'bg-amber-500'
    : 'bg-gray-400';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all duration-300 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{score}%</span>
    </div>
  );
}

export default function OpportunitiesTab({
  opportunities: propOpportunities = [],
  mode,
  updatingId: propUpdatingId,
  onViewDetails,
  onAddToPipeline,
  onCreateManual,
  onDelete,
}) {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [stats, setStats] = useState(null);
  const [converting, setConverting] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 12;

  const loadDetections = useCallback(async () => {
    setLoading(true);
    try {
      const [oppsRes, statsRes] = await Promise.allSettled([
        api.get('/api/detection/opportunities', { params: { limit: 100 } }),
        api.get('/api/detection/opportunities/stats'),
      ]);
      if (oppsRes.status === 'fulfilled') {
        setDetections(oppsRes.value.data.opportunities || []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDetections();
  }, [loadDetections]);

  const handleScan = async () => {
    setScanning(true);
    try {
      await api.post('/api/detection/scan');
      await loadDetections();
    } catch { /* silent */ }
    setScanning(false);
  };

  const handleConvert = async (id) => {
    setConverting(id);
    try {
      await api.post(`/api/detection/opportunities/${id}/convert`);
      setDetections(prev => prev.map(d => d.id === id ? { ...d, status: 'CONVERTED' } : d));
    } catch { /* silent */ }
    setConverting(null);
  };

  const handleDismiss = async (id) => {
    try {
      await api.patch(`/api/detection/opportunities/${id}`, { status: 'DISMISSED' });
      setDetections(prev => prev.map(d => d.id === id ? { ...d, status: 'DISMISSED' } : d));
    } catch { /* silent */ }
  };

  const handleDeleteOpp = async (id) => {
    try {
      await api.patch(`/api/detection/opportunities/${id}`, { status: 'DISMISSED' });
      setDetections(prev => prev.map(d => d.id === id ? { ...d, status: 'DISMISSED' } : d));
      if (onDelete) onDelete(id);
    } catch { /* silent */ }
  };

  const handleAddToPipeline = async (id) => {
    if (onAddToPipeline) {
      onAddToPipeline(id);
    } else {
      await handleConvert(id);
    }
  };

  const filtered = useMemo(() => {
    return detections.filter(d => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !(d.title || '').toLowerCase().includes(q) &&
          !(d.summary || '').toLowerCase().includes(q) &&
          !(d.companyMentioned || '').toLowerCase().includes(q) &&
          !(d.locationMentioned || '').toLowerCase().includes(q)
        ) return false;
      }
      if (typeFilter && d.opportunityType !== typeFilter) return false;
      if (statusFilter && d.status !== statusFilter) return false;
      if (minScore > 0 && (d.relevanceScore || 0) < minScore) return false;
      return true;
    });
  }, [detections, search, typeFilter, statusFilter, minScore]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const oppTypeOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 'APP_WEB', label: 'App Web' },
    { value: 'APP_MOVIL', label: 'App Movil' },
    { value: 'IA_ML', label: 'IA / Machine Learning' },
    { value: 'CHATBOT_LLM', label: 'Chatbot / LLM' },
    { value: 'AUTOMATIZACION', label: 'Automatizacion' },
    { value: 'ECOMMERCE', label: 'Ecommerce' },
    { value: 'LICITACION_TECH', label: 'Licitacion Tech' },
    { value: 'NEARSHORING_TECH', label: 'Nearshoring Tech' },
    { value: 'TRANSFORMACION_DIGITAL', label: 'Transformacion Digital' },
  ];

  const statusOptions = [
    { value: '', label: 'Todos los status' },
    { value: 'NEW', label: 'Nuevas' },
    { value: 'REVIEWED', label: 'Revisadas' },
    { value: 'CONVERTED', label: 'Convertidas' },
    { value: 'DISMISSED', label: 'Descartadas' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">Total Detecciones</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">Nuevas</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.byStatus?.NEW || 0}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">Convertidas</p>
            <p className="text-2xl font-bold text-indigo-700">{stats.byStatus?.CONVERTED || 0}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">Score Promedio</p>
            <p className="text-2xl font-bold text-amber-700">{stats.avgScore || 0}%</p>
          </div>
        </div>
      )}

      {/* Filters + Scan button */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por empresa, servicio, tecnologia..."
            className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-9 pr-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-400"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {oppTypeOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {statusOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Min Score:</span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={minScore}
            onChange={e => { setMinScore(Number(e.target.value)); setPage(1); }}
            className="w-24 h-1.5 accent-blue-600"
          />
          <span className="text-xs font-medium text-gray-700 w-8">{minScore}%</span>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
          {scanning ? 'Escaneando...' : 'Escanear Ahora'}
        </button>
        {onCreateManual && (mode === 'manual' || mode === 'hybrid') && (
          <button
            onClick={onCreateManual}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Crear Manual
          </button>
        )}
      </div>

      <span className="text-xs text-gray-500">{filtered.length} detecciones</span>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {paged.map((d, i) => {
          const isExpanded = expandedId === d.id;
          return (
            <div
              key={d.id}
              className={`bg-white border rounded-2xl p-4 shadow-sm transition-all duration-200 ${
                d.status === 'DISMISSED' ? 'opacity-50 border-gray-200' :
                d.status === 'CONVERTED' ? 'border-emerald-200' : 'border-gray-200 hover:shadow-md'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate pr-2">{d.title}</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">{formatTimeAgo(d.createdAt)}</p>
                </div>
                <ScoreBadge score={d.relevanceScore || 0} />
              </div>

              {/* Score Bar */}
              <div className="mb-2">
                <ScoreBar score={d.relevanceScore || 0} />
              </div>

              {/* Type + Priority + Status badges */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${OPP_TYPE_COLORS[d.opportunityType] || OPP_TYPE_COLORS.OTRO}`}>
                  {OPP_TYPE_LABELS[d.opportunityType] || d.opportunityType}
                </span>
                {d.priority && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${PRIORITY_COLORS[d.priority] || PRIORITY_COLORS.BAJA}`}>
                    {d.priority}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${STATUS_COLORS[d.status] || STATUS_COLORS.NEW}`}>
                  {STATUS_LABELS[d.status] || d.status}
                </span>
              </div>

              {/* Summary */}
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{d.summary}</p>

              {/* Metadata */}
              <div className="flex items-center gap-3 mb-3 text-[11px] text-gray-500">
                {d.companyMentioned && (
                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{d.companyMentioned}</span>
                )}
                {d.locationMentioned && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{d.locationMentioned}</span>
                )}
              </div>

              {/* Expand/collapse toggle */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
                className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
              >
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                {isExpanded ? 'Menos detalles' : 'Mas detalles'}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-gray-100 pt-3 mt-1 space-y-2 transition-all duration-200">
                  {d.estimatedValue && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium text-gray-700">Valor estimado:</span> ${Number(d.estimatedValue).toLocaleString()}
                    </p>
                  )}
                  {/* Source articles */}
                  {d.articles && d.articles.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-gray-500">Fuentes:</p>
                      {d.articles.map(a => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-700 truncate"
                        >
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{a.sourceName}: {a.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-2">
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(d)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-medium hover:bg-gray-100 transition-colors"
                  >
                    <Eye className="w-3 h-3" /> Ver
                  </button>
                )}
                {d.status === 'NEW' && (
                  <>
                    <button
                      onClick={() => handleAddToPipeline(d.id)}
                      disabled={converting === d.id || propUpdatingId === d.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {(converting === d.id || propUpdatingId === d.id) ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ArrowRightCircle className="w-3 h-3" />
                      )}
                      Pipeline
                    </button>
                    <button
                      onClick={() => handleDismiss(d.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
                    >
                      <XCircle className="w-3 h-3" /> Descartar
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDeleteOpp(d.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-500 hover:bg-red-50 text-xs font-medium transition-colors ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {paged.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay detecciones aun</p>
          <p className="text-xs mt-1">Presiona &quot;Escanear Ahora&quot; para buscar oportunidades</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-3 h-3" /> Anterior
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = page <= 3 ? i + 1 : page + i - 2;
            if (p < 1 || p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  p === page ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors"
          >
            Siguiente <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
