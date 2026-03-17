import { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';

const FIELDS = [
  { value: 'opportunity_type', label: 'Tipo' },
  { value: 'industry', label: 'Industria' },
  { value: 'region', label: 'Region' },
  { value: 'relevance_score', label: 'Score' },
  { value: 'value', label: 'Valor' },
  { value: 'priority', label: 'Prioridad' },
  { value: 'size', label: 'Tamano' },
];

const OPERATORS = [
  { value: 'equals', label: 'Igual a' },
  { value: 'not_equals', label: 'Diferente de' },
  { value: 'contains', label: 'Contiene' },
  { value: 'greater_than', label: 'Mayor que' },
  { value: 'less_than', label: 'Menor que' },
];

const ACTIONS = [
  { value: 'add_to_pipeline', label: 'Agregar al pipeline' },
  { value: 'set_priority', label: 'Cambiar prioridad' },
  { value: 'send_alert', label: 'Enviar alerta' },
  { value: 'auto_enrich', label: 'Auto-enriquecer' },
];

const inputClass =
  'bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400';
const selectSmall =
  'bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 flex-1';

export default function RuleEditorModal({ rule, onClose, onSave }) {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [priority, setPriority] = useState(rule?.priority || 'MEDIA');
  const [conditions, setConditions] = useState(
    rule?.conditions || [
      { id: 'c-new-1', field: 'relevance_score', operator: 'greater_than', value: 80 },
    ]
  );
  const [actions, setActions] = useState(
    rule?.actions || [
      { id: 'a-new-1', type: 'add_to_pipeline', label: 'Agregar al pipeline' },
    ]
  );

  const handleSave = () => {
    if (!name.trim() || conditions.length === 0 || actions.length === 0) return;
    onSave({
      id: rule?.id || `rule-${Date.now()}`,
      name,
      description,
      priority,
      enabled: rule?.enabled ?? true,
      conditions,
      actions,
      createdAt: rule?.createdAt || new Date().toISOString(),
      lastTriggered: rule?.lastTriggered || null,
      triggerCount: rule?.triggerCount || 0,
    });
  };

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, field: 'opportunity_type', operator: 'equals', value: '' },
    ]);
  };

  const updateCondition = (id, field, value) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const removeCondition = (id) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const addAction = () => {
    setActions((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, type: 'send_alert', label: 'Enviar alerta' },
    ]);
  };

  const updateAction = (id, newType) => {
    const label = ACTIONS.find((a) => a.value === newType)?.label || newType;
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, type: newType, label } : a))
    );
  };

  const removeAction = (id) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-100 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {rule ? 'Editar Regla' : 'Nueva Regla'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form body */}
        <div className="p-5 space-y-4">
          {/* Name + Priority */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full ${inputClass}`}
                placeholder="Nombre de la regla"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={`w-full ${inputClass}`}
              >
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descripcion</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full ${inputClass}`}
              placeholder="Que hace esta regla"
            />
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Condiciones (AND)
              </label>
              <button
                onClick={addCondition}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
              >
                <Plus className="w-3 h-3" /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {conditions.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2"
                >
                  {i > 0 && (
                    <span className="text-[10px] text-emerald-600 font-bold px-1">Y</span>
                  )}
                  <select
                    value={c.field}
                    onChange={(e) => updateCondition(c.id, 'field', e.target.value)}
                    className={selectSmall}
                  >
                    {FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={c.operator}
                    onChange={(e) => updateCondition(c.id, 'operator', e.target.value)}
                    className={selectSmall}
                  >
                    {OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={String(c.value)}
                    onChange={(e) => updateCondition(c.id, 'value', e.target.value)}
                    className={selectSmall}
                    placeholder="Valor"
                  />
                  <button
                    onClick={() => removeCondition(c.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Acciones
              </label>
              <button
                onClick={addAction}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
              >
                <Plus className="w-3 h-3" /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {actions.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2"
                >
                  <select
                    value={a.type}
                    onChange={(e) => updateAction(a.id, e.target.value)}
                    className={selectSmall}
                  >
                    {ACTIONS.map((ac) => (
                      <option key={ac.value} value={ac.value}>
                        {ac.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeAction(a.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={!name.trim() || conditions.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" /> Guardar Regla
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
