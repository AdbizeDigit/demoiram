import { useState } from 'react';
import { GitBranch, Eye, ChevronRight, DollarSign, MoveRight } from 'lucide-react';
import { PIPELINE_STAGES, formatCompact, FitScoreBadge, PriorityTag } from './shared';

const stageStyles = {
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    head: 'bg-gray-100',
    text: 'text-gray-700',
    badge: 'bg-gray-200 text-gray-700',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    head: 'bg-blue-100',
    text: 'text-blue-700',
    badge: 'bg-blue-200 text-blue-700',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    head: 'bg-amber-100',
    text: 'text-amber-700',
    badge: 'bg-amber-200 text-amber-700',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    head: 'bg-purple-100',
    text: 'text-purple-700',
    badge: 'bg-purple-200 text-purple-700',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    head: 'bg-emerald-100',
    text: 'text-emerald-700',
    badge: 'bg-emerald-200 text-emerald-700',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    head: 'bg-red-100',
    text: 'text-red-700',
    badge: 'bg-red-200 text-red-700',
  },
};

export default function PipelineTab({ opportunities, onViewDetails, onMoveStage }) {
  const [movingId, setMovingId] = useState(null);

  const stages = PIPELINE_STAGES.map((stage) => {
    const stageOpps = opportunities.filter(
      (o) => (o.pipelineStage || o.pipeline_stage || 'NEW') === stage.id
    );
    return {
      ...stage,
      opportunities: stageOpps,
      totalValue: stageOpps.reduce((s, o) => s + Number(o.value || o.estimated_value || 0), 0),
    };
  });

  const totalPipelineValue = opportunities.reduce(
    (s, o) => s + Number(o.value || o.estimated_value || 0),
    0
  );

  const handleMove = (id, toStage) => {
    setMovingId(id);
    onMoveStage(id, toStage);
    setTimeout(() => setMovingId(null), 500);
  };

  const getNextStage = (current) => {
    const idx = PIPELINE_STAGES.findIndex((s) => s.id === current);
    // Don't allow moving past NEGOTIATION into WON/LOST via simple arrow
    if (idx < 0 || idx >= PIPELINE_STAGES.length - 2) return null;
    return PIPELINE_STAGES[idx + 1].id;
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
            <GitBranch className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-gray-500">En Pipeline:</span>
            <span className="text-sm font-bold text-emerald-700">{opportunities.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-gray-500">Valor Total:</span>
            <span className="text-sm font-bold text-amber-700">
              {formatCompact(totalPipelineValue)}
            </span>
          </div>
        </div>
        {/* Stage breadcrumbs */}
        <div className="flex items-center gap-1">
          {PIPELINE_STAGES.map((s, i) => {
            const st = stageStyles[s.color] || stageStyles.gray;
            return (
              <div key={s.id} className="flex items-center gap-1">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${st.badge}`}>
                  {s.name.split(' ')[0]}
                </span>
                {i < PIPELINE_STAGES.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {stages.map((stage) => {
          const s = stageStyles[stage.color] || stageStyles.gray;
          return (
            <div
              key={stage.id}
              className={`${s.bg} border ${s.border} rounded-xl overflow-hidden flex flex-col min-h-[300px]`}
            >
              {/* Column header */}
              <div className={`${s.head} px-3 py-2.5 border-b ${s.border}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${s.text}`}>{stage.name}</span>
                  <span
                    className={`text-xs font-bold ${s.badge} px-1.5 py-0.5 rounded`}
                  >
                    {stage.opportunities.length}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {formatCompact(stage.totalValue)}
                </p>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[400px]">
                {stage.opportunities.map((o) => {
                  const nextStage = getNextStage(stage.id);
                  const oppName = o.name || o.title || 'Sin nombre';
                  const oppScore = o.fitScore ?? o.relevance_score ?? 0;
                  const oppValue = Number(o.value || o.estimated_value || 0);

                  return (
                    <div
                      key={o.id}
                      className={`bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all ${
                        movingId === o.id ? 'opacity-50' : ''
                      }`}
                    >
                      <button
                        onClick={() => onViewDetails(o)}
                        className="text-left w-full"
                      >
                        <p className="text-xs font-medium text-gray-800 truncate mb-1.5">
                          {oppName}
                        </p>
                        <div className="flex items-center gap-1.5 mb-2">
                          <PriorityTag priority={o.priority || 'MEDIA'} />
                          <FitScoreBadge score={oppScore} />
                        </div>
                      </button>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                          {formatCompact(oppValue)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onViewDetails(o)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          {nextStage && (
                            <button
                              onClick={() => handleMove(o.id, nextStage)}
                              className={`p-1 rounded hover:bg-gray-100 ${s.text} transition-colors`}
                              title={`Mover a ${PIPELINE_STAGES.find((ps) => ps.id === nextStage)?.name}`}
                            >
                              <MoveRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {stage.opportunities.length === 0 && (
                  <div className="text-center py-6 text-gray-300">
                    <p className="text-[11px]">Sin oportunidades</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {opportunities.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay oportunidades en el pipeline</p>
          <p className="text-xs text-gray-300 mt-1">
            Agrega oportunidades desde la pestana Oportunidades
          </p>
        </div>
      )}
    </div>
  );
}
