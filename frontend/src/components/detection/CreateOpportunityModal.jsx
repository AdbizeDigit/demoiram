import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { OPPORTUNITY_TYPES } from './shared';

const inputClass =
  'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 placeholder:text-gray-400';
const selectClass =
  'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

export default function CreateOpportunityModal({ onClose, onCreate }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'OFICINA_NUEVA',
    priority: 'MEDIA',
    company: '',
    location: '',
    value: '',
  });

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        name: form.name,
        summary: form.description,
        opportunity_type: form.type,
        priority: form.priority,
        company_mentioned: form.company,
        location_mentioned: form.location,
        estimated_value: Number(form.value) || 0,
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter out the empty-value "Todos los tipos" option
  const typeOptions = OPPORTUNITY_TYPES.filter((t) => t.value);

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-100 rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Crear Oportunidad Manual</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className={labelClass}>Nombre / Titulo *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
              className={inputClass}
              placeholder="Nombre de la oportunidad"
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Descripcion / Resumen</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Descripcion detallada de la oportunidad..."
            />
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tipo</label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className={selectClass}
              >
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Prioridad</label>
              <select
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
                className={selectClass}
              >
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
          </div>

          {/* Company + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Empresa</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                className={inputClass}
                placeholder="Nombre de la empresa"
              />
            </div>
            <div>
              <label className={labelClass}>Ubicacion</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                className={inputClass}
                placeholder="Ciudad, Estado"
              />
            </div>
          </div>

          {/* Estimated value */}
          <div>
            <label className={labelClass}>Valor Estimado (MXN)</label>
            <input
              type="number"
              value={form.value}
              onChange={(e) => set('value', e.target.value)}
              className={inputClass}
              placeholder="0"
              min="0"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!form.name.trim() || saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Crear Oportunidad
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
