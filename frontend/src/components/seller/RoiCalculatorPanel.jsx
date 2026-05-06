import { useState } from 'react'
import { Calculator, Loader2, DollarSign, Copy, Check } from 'lucide-react'
import api from '../../services/api'

function formatARS(n) {
  if (!n) return '$0'
  return '$' + Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

export default function RoiCalculatorPanel({ leadId }) {
  const [inputs, setInputs] = useState({ employees: '', hours_manual_per_week: '', avg_hourly_cost: '', monthly_proposal_cost: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function calc() {
    setLoading(true)
    try {
      const { data } = await api.post(`/api/seller/leads/${leadId}/roi`, inputs)
      setResult(data?.roi || null)
    } catch (err) {
      alert(err?.response?.data?.message || 'Error')
    } finally { setLoading(false) }
  }

  function copyPitch() {
    if (!result?.pitch) return
    const text = `Estimación inicial:
- Ahorro mensual: ${formatARS(result.monthly_savings_ars)}
- Ahorro anual: ${formatARS(result.annual_savings_ars)}
- Payback: ${result.payback_months} meses
- ROI año 1: ${result.roi_year_1_pct}%

${result.pitch}`
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <div className="bg-emerald-100 p-1.5 rounded-lg"><Calculator className="w-4 h-4 text-emerald-600" /></div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">Calculadora ROI</h3>
          <p className="text-[10px] text-gray-500">Inputs simples → ahorro anual y payback</p>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Empleados</label>
            <input type="number" value={inputs.employees} onChange={e => setInputs({ ...inputs, employees: e.target.value })}
              className="mt-1 w-full px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Hrs manuales/sem</label>
            <input type="number" value={inputs.hours_manual_per_week} onChange={e => setInputs({ ...inputs, hours_manual_per_week: e.target.value })}
              className="mt-1 w-full px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Costo hr (ARS)</label>
            <input type="number" value={inputs.avg_hourly_cost} onChange={e => setInputs({ ...inputs, avg_hourly_cost: e.target.value })}
              className="mt-1 w-full px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Propuesta mensual</label>
            <input type="number" value={inputs.monthly_proposal_cost} onChange={e => setInputs({ ...inputs, monthly_proposal_cost: e.target.value })}
              className="mt-1 w-full px-2 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs" />
          </div>
        </div>
        <button onClick={calc} disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
          Calcular ROI
        </button>

        {result && (
          <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-xl p-4 space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase">Ahorro mensual</p>
                <p className="text-base font-bold text-emerald-900">{formatARS(result.monthly_savings_ars)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase">Ahorro anual</p>
                <p className="text-base font-bold text-emerald-900">{formatARS(result.annual_savings_ars)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase">Payback</p>
                <p className="text-base font-bold text-emerald-900">{result.payback_months} meses</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase">ROI año 1</p>
                <p className="text-base font-bold text-emerald-900">{result.roi_year_1_pct}%</p>
              </div>
            </div>
            {result.pitch && (
              <div className="bg-white rounded-lg p-3 ring-1 ring-emerald-100">
                <p className="text-xs text-gray-700 italic">"{result.pitch}"</p>
              </div>
            )}
            {result.assumptions?.length > 0 && (
              <div className="text-[10px] text-emerald-700">
                <strong>Asunciones:</strong> {result.assumptions.join(' · ')}
              </div>
            )}
            <button onClick={copyPitch} className="w-full text-xs ring-1 ring-emerald-300 text-emerald-700 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-emerald-100">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado al portapapeles' : 'Copiar pitch'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
