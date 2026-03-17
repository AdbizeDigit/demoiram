import { useState } from 'react';
import {
  X, MapPin, Building2, TrendingUp, Clock, Trash2,
  GitBranch, ExternalLink, Loader2, CheckCircle, XCircle,
  ArrowRightCircle, Eye, AlertTriangle, Sparkles,
} from 'lucide-react';

const OPP_TYPE_LABELS = {
  NEARSHORING: 'Nearshoring',
  LICITACION: 'Licitacion',
  EXPANSION: 'Expansion',
  OFICINA_NUEVA: 'Oficina Nueva',
  COWORKING: 'Coworking',
  PARQUE_INDUSTRIAL: 'Parque Industrial',
  RENOVACION: 'Renovacion',
  OTRO: 'Otro',
};

const OPP_TYPE_COLORS = {
  NEARSHORING: 'bg-blue-50 text-blue-700 border-blue-200',
  LICITACION: 'bg-amber-50 text-amber-700 border-amber-200',
  EXPANSION: 'bg-purple-50 text-purple-700 border-purple-200',
  OFICINA_NUEVA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  COWORKING: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  PARQUE_INDUSTRIAL: 'bg-orange-50 text-orange-700 border-orange-200',
  RENOVACION: 'bg-teal-50 text-teal-700 border-teal-200',
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

function ScoreBadge({ score, size = 'md' }) {
  const color = score >= 90 ? 'from-emerald-500 to-green-400'
    : score >= 70 ? 'from-blue-500 to-cyan-400'
    : score >= 50 ? 'from-amber-500 to-yellow-400'
    : 'from-gray-400 to-gray-300';

  const sizeClasses = size === 'lg'
    ? 'w-14 h-14 rounded-2xl'
    : 'w-10 h-10 rounded-xl';
  const textSize = size === 'lg' ? 'text-lg' : 'text-sm';

  return (
    <div className={`${sizeClasses} bg-gradient-to-br ${color} flex flex-col items-center justify-center text-white flex-shrink-0`}>
      <span className={`${textSize} font-bold`}>{score}</span>
      <span className="text-[7px] font-medium opacity-80">score</span>
    </div>
  );
}

export default function OpportunityDetailModal({
  opportunity,
  onClose,
  onAddToPipeline,
  onUpdate,
  onDelete,
  updatingId,
  mode,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  if (!opportunity) return null;

  const handleAction = async (action, ...args) => {
    setActionLoading(action);
    try {
      if (action === 'pipeline' && onAddToPipeline) {
        await onAddToPipeline(opportunity.id);
      } else if (action === 'reviewed' && onUpdate) {
        await onUpdate(opportunity.id, { status: 'REVIEWED' });
      } else if (action === 'convert' && onUpdate) {
        await onUpdate(opportunity.id, { status: 'CONVERTED' });
      } else if (action === 'dismiss' && onUpdate) {
        await onUpdate(opportunity.id, { status: 'DISMISSED' });
      }
    } catch { /* silent */ }
    setActionLoading(null);
  };

  const handleDelete = async () => {
    setActionLoading('delete');
    try {
      if (onDelete) await onDelete(opportunity.id);
      onClose();
    } catch { /* silent */ }
    setActionLoading(null);
  };

  const score = opportunity.relevanceScore || opportunity.fitScore || 0;
  const articles = opportunity.articles || [];

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-transform duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {opportunity.opportunityType && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${OPP_TYPE_COLORS[opportunity.opportunityType] || OPP_TYPE_COLORS.OTRO}`}>
                    {OPP_TYPE_LABELS[opportunity.opportunityType] || opportunity.opportunityType}
                  </span>
                )}
                {opportunity.priority && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${PRIORITY_COLORS[opportunity.priority] || PRIORITY_COLORS.BAJA}`}>
                    {opportunity.priority}
                  </span>
                )}
                {opportunity.status && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${STATUS_COLORS[opportunity.status] || STATUS_COLORS.NEW}`}>
                    {STATUS_LABELS[opportunity.status] || opportunity.status}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{opportunity.title || opportunity.name}</h2>
              <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-400">
                <Clock className="w-3.5 h-3.5" /> {formatTimeAgo(opportunity.createdAt || opportunity.detectedAt)}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <ScoreBadge score={score} size="lg" />
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Summary */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Resumen</h3>
            <p className="text-sm text-gray-600">{opportunity.summary || opportunity.description || 'Sin descripcion disponible.'}</p>
          </div>

          {/* Score bar */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Relevancia</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    score >= 90 ? 'bg-emerald-500'
                    : score >= 70 ? 'bg-blue-500'
                    : score >= 50 ? 'bg-amber-500'
                    : 'bg-gray-400'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-700">{score}%</span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {opportunity.companyMentioned && (
              <InfoCard icon={Building2} label="Empresa" value={opportunity.companyMentioned} />
            )}
            {opportunity.locationMentioned && (
              <InfoCard icon={MapPin} label="Ubicacion" value={opportunity.locationMentioned} />
            )}
            {opportunity.estimatedValue && (
              <InfoCard icon={TrendingUp} label="Valor Estimado" value={`$${Number(opportunity.estimatedValue).toLocaleString()}`} />
            )}
            {opportunity.opportunityType && (
              <InfoCard icon={Sparkles} label="Tipo" value={OPP_TYPE_LABELS[opportunity.opportunityType] || opportunity.opportunityType} />
            )}
          </div>

          {/* Associated articles */}
          {articles.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Articulos Asociados ({articles.length})
              </h3>
              <div className="space-y-2">
                {articles.map(article => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors group"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 truncate">
                        {article.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                        <span>{article.sourceName || 'Fuente desconocida'}</span>
                        {article.publishedAt && (
                          <>
                            <span>-</span>
                            <span>{formatTimeAgo(article.publishedAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Action buttons */}
        <div className="p-5 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Add to Pipeline */}
            {opportunity.status !== 'CONVERTED' && onAddToPipeline && (
              <button
                onClick={() => handleAction('pipeline')}
                disabled={actionLoading === 'pipeline' || updatingId === opportunity.id}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {(actionLoading === 'pipeline' || updatingId === opportunity.id) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GitBranch className="w-4 h-4" />
                )}
                Agregar al Pipeline
              </button>
            )}

            {/* Mark Reviewed */}
            {opportunity.status === 'NEW' && onUpdate && (
              <button
                onClick={() => handleAction('reviewed')}
                disabled={actionLoading === 'reviewed'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'reviewed' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                Marcar Revisada
              </button>
            )}

            {/* Convert */}
            {opportunity.status !== 'CONVERTED' && opportunity.status !== 'DISMISSED' && onUpdate && (
              <button
                onClick={() => handleAction('convert')}
                disabled={actionLoading === 'convert'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium hover:bg-emerald-100 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'convert' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRightCircle className="w-4 h-4" />
                )}
                Convertir
              </button>
            )}

            {/* Dismiss */}
            {opportunity.status !== 'DISMISSED' && opportunity.status !== 'CONVERTED' && onUpdate && (
              <button
                onClick={() => handleAction('dismiss')}
                disabled={actionLoading === 'dismiss'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'dismiss' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Descartar
              </button>
            )}

            {/* Delete */}
            <div className="ml-auto">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Confirmar?
                  </span>
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading === 'delete'}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === 'delete' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Si, eliminar'
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
      <div className="flex items-center gap-2 text-gray-400 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}
