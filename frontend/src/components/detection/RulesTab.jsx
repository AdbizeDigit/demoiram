import {
  Cpu, Plus, Trash2, Edit, ToggleLeft, ToggleRight, Zap,
  AlertTriangle, GitBranch, Shield, Activity, Clock, Hand,
} from 'lucide-react';
import { formatTimeAgo, PriorityTag } from './shared';

const ACTION_ICONS = {
  add_to_pipeline: GitBranch,
  set_priority: Shield,
  send_alert: AlertTriangle,
  auto_enrich: Cpu,
};

const ACTION_COLORS = {
  add_to_pipeline: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  set_priority: 'text-amber-700 bg-amber-50 border-amber-200',
  send_alert: 'text-red-700 bg-red-50 border-red-200',
  auto_enrich: 'text-blue-700 bg-blue-50 border-blue-200',
};

const FIELD_LABELS = {
  type: 'Tipo',
  opportunity_type: 'Tipo',
  industry: 'Industria',
  region: 'Region',
  fitScore: 'Fit Score',
  relevance_score: 'Score',
  value: 'Valor',
  priority: 'Prioridad',
  size: 'Tamano',
};

const OP_LABELS = {
  equals: '=',
  not_equals: '\u2260',
  contains: 'contiene',
  greater_than: '>',
  less_than: '<',
};

export default function RulesTab({ rules, mode, onToggle, onEdit, onDelete, onCreate }) {
  const isManualOnly = mode === 'manual';
  const activeRules = rules.filter((r) => r.enabled).length;
  const totalTriggers = rules.reduce((s, r) => s + (r.triggerCount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header stats + create button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-gray-500">Reglas activas:</span>
            <span className="text-sm font-bold text-emerald-700">
              {activeRules}/{rules.length}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-gray-500">Triggers totales:</span>
            <span className="text-sm font-bold text-amber-700">{totalTriggers}</span>
          </div>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva Regla
        </button>
      </div>

      {/* Manual mode warning */}
      {isManualOnly && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Hand className="w-4 h-4 text-amber-700" />
          <span className="text-xs text-amber-700">
            Modo Manual activo — Las reglas no se ejecutaran automaticamente. Cambia a modo Auto o
            Hibrido para activar la ejecucion automatica.
          </span>
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-white border border-gray-200 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md ${
              !rule.enabled || isManualOnly ? 'opacity-70' : ''
            }`}
          >
            {/* Rule header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    rule.enabled
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">{rule.name}</h3>
                    <PriorityTag priority={rule.priority} />
                    {isManualOnly && rule.enabled && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        PAUSADA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{rule.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(rule)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(rule.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => onToggle(rule.id)} className="p-1">
                  {rule.enabled ? (
                    <ToggleRight className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-300" />
                  )}
                </button>
              </div>
            </div>

            {/* Conditions */}
            <div className="mb-3">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                Condiciones
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(rule.conditions || []).map((c, ci) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-700"
                  >
                    {ci > 0 && <span className="text-emerald-600 font-bold mr-1">Y</span>}
                    <span className="text-gray-400">
                      {FIELD_LABELS[c.field] || c.field}
                    </span>
                    <span className="text-emerald-600">
                      {OP_LABELS[c.operator] || c.operator}
                    </span>
                    <span className="font-medium">{String(c.value)}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Actions + stats footer */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {(rule.actions || []).map((a) => {
                  const Icon = ACTION_ICONS[a.type] || Activity;
                  const color =
                    ACTION_COLORS[a.type] || 'text-gray-600 bg-gray-50 border-gray-200';
                  return (
                    <span
                      key={a.id}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border ${color}`}
                    >
                      <Icon className="w-3 h-3" /> {a.label}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {rule.triggerCount || 0} triggers
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />{' '}
                  {rule.lastTriggered ? formatTimeAgo(rule.lastTriggered) : 'Nunca'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {rules.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Cpu className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-3">No hay reglas configuradas</p>
          <button
            onClick={onCreate}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
          >
            Crear Primera Regla
          </button>
        </div>
      )}
    </div>
  );
}
