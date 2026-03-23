import { useState, useRef } from 'react'
import {
  FileText, Loader2, Download, Eye, RefreshCw, Send,
  Building2, Zap, CheckCircle2, Star, Palette, Type,
  Image, Layout, ChevronDown,
} from 'lucide-react'
import api from '../services/api'

const TEMPLATES = [
  { id: 'propuesta', label: 'Propuesta Comercial', desc: 'Para enviar una cotizacion o propuesta de servicios', color: 'emerald' },
  { id: 'presentacion', label: 'Presentacion Adbize', desc: 'Presentacion general de la empresa y servicios', color: 'blue' },
  { id: 'caso_exito', label: 'Caso de Exito', desc: 'Mostrar resultados obtenidos con un cliente', color: 'purple' },
  { id: 'cotizacion', label: 'Cotizacion Tecnica', desc: 'Detalle tecnico con precios y plazos', color: 'amber' },
]

const COLOR_SCHEMES = [
  { id: 'emerald', label: 'Adbize Verde', primary: '#059669', secondary: '#ecfdf5', accent: '#10b981' },
  { id: 'blue', label: 'Corporativo Azul', primary: '#2563eb', secondary: '#eff6ff', accent: '#3b82f6' },
  { id: 'dark', label: 'Elegante Oscuro', primary: '#1e293b', secondary: '#f8fafc', accent: '#6366f1' },
  { id: 'warm', label: 'Calido', primary: '#dc2626', secondary: '#fef2f2', accent: '#f59e0b' },
]

function PdfPreview({ data, colors, template }) {
  const scheme = COLOR_SCHEMES.find(c => c.id === colors) || COLOR_SCHEMES[0]

  return (
    <div className="bg-white shadow-2xl rounded-lg overflow-hidden" style={{ width: '100%', aspectRatio: '8.5/11' }}>
      {/* Header */}
      <div className="px-8 py-6" style={{ background: scheme.primary }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{data.title || 'Propuesta Comercial'}</h1>
            <p className="text-sm mt-1" style={{ color: `${scheme.accent}` }}>{data.subtitle || 'Adbize - Inteligencia Artificial Aplicada'}</p>
          </div>
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
            <Zap className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>

      {/* Client info bar */}
      <div className="px-8 py-3 flex items-center justify-between border-b" style={{ background: scheme.secondary }}>
        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4" style={{ color: scheme.primary }} />
          <span className="text-sm font-semibold" style={{ color: scheme.primary }}>{data.clientName || 'Nombre del Cliente'}</span>
        </div>
        <span className="text-xs text-gray-400">{new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
      </div>

      {/* Body */}
      <div className="px-8 py-5 space-y-4">
        {/* Intro */}
        <div>
          <h2 className="text-sm font-bold mb-1.5" style={{ color: scheme.primary }}>Estimado/a,</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            {data.intro || 'Es un placer presentarle nuestra propuesta de servicios de inteligencia artificial y desarrollo tecnologico. En Adbize nos especializamos en crear soluciones a medida que generan ventaja competitiva real para su negocio.'}
          </p>
        </div>

        {/* Services */}
        <div>
          <h2 className="text-sm font-bold mb-2" style={{ color: scheme.primary }}>Servicios Propuestos</h2>
          <div className="space-y-1.5">
            {(data.services || [
              { name: 'Chatbot IA personalizado', price: 'USD 500 - 1.500' },
              { name: 'App Web con IA integrada', price: 'USD 1.500 - 5.000' },
              { name: 'Automatizacion de procesos', price: 'USD 800 - 3.000' },
            ]).map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg" style={{ background: scheme.secondary }}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: scheme.accent }} />
                  <span className="text-xs font-medium text-gray-700">{s.name}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: scheme.primary }}>{s.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment terms */}
        <div className="p-3 rounded-lg border" style={{ borderColor: scheme.accent + '40' }}>
          <h3 className="text-xs font-bold mb-1" style={{ color: scheme.primary }}>Condiciones de Pago</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-start gap-1.5">
              <Star className="w-3 h-3 mt-0.5" style={{ color: scheme.accent }} />
              <span className="text-[10px] text-gray-600">Pago por hito al completar cada etapa</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Star className="w-3 h-3 mt-0.5" style={{ color: scheme.accent }} />
              <span className="text-[10px] text-gray-600">Opcion de cuotas mensuales</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Star className="w-3 h-3 mt-0.5" style={{ color: scheme.accent }} />
              <span className="text-[10px] text-gray-600">Contrato de servicio garantizado</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Star className="w-3 h-3 mt-0.5" style={{ color: scheme.accent }} />
              <span className="text-[10px] text-gray-600">Sin costos ocultos</span>
            </div>
          </div>
        </div>

        {/* Why Adbize */}
        <div>
          <h2 className="text-sm font-bold mb-1.5" style={{ color: scheme.primary }}>Por que Adbize</h2>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            {data.whyUs || 'Somos especialistas en IA, machine learning, deep learning, vision artificial, LLMs y automatizacion. Desarrollamos apps web y mobile a medida con tecnologia de punta. Trabajamos bajo contrato de servicio que garantiza el desarrollo y la entrega del producto.'}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-3 mt-auto border-t" style={{ background: scheme.primary + '08' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold" style={{ color: scheme.primary }}>Gian Franco Koch</p>
            <p className="text-[9px] text-gray-400">Adbize - IA Aplicada | contacto@adbize.com</p>
          </div>
          <p className="text-[9px]" style={{ color: scheme.accent }}>adbize.com</p>
        </div>
      </div>
    </div>
  )
}

export default function PdfDesignerPage() {
  const [template, setTemplate] = useState('propuesta')
  const [colors, setColors] = useState('emerald')
  const [generating, setGenerating] = useState(false)
  const [pdfData, setPdfData] = useState({
    title: '',
    subtitle: '',
    clientName: '',
    intro: '',
    services: [],
    whyUs: '',
  })
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  async function generateWithAI() {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      const { data } = await api.post('/api/pdf-designer/generate', {
        prompt: aiPrompt,
        template,
        clientName: pdfData.clientName,
      })
      if (data.pdfData) setPdfData(prev => ({ ...prev, ...data.pdfData }))
    } catch {}
    setAiLoading(false)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-600" /> Diseño de PDF
        </h1>
        <p className="text-gray-500 mt-0.5 text-sm">Diseña propuestas y documentos con IA para enviar a tus leads</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-5">

          {/* Template selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Layout className="w-4 h-4 text-gray-400" /> Plantilla
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    template === t.id ? `border-${t.color}-500 bg-${t.color}-50` : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-800">{t.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Color scheme */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-gray-400" /> Esquema de Color
            </h3>
            <div className="flex gap-2">
              {COLOR_SCHEMES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setColors(c.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                    colors === c.id ? 'border-gray-800 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full" style={{ background: c.primary }} />
                  <span className="text-xs font-medium text-gray-700">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Client info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-gray-400" /> Datos del Cliente
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={pdfData.clientName}
                onChange={e => setPdfData(prev => ({ ...prev, clientName: e.target.value }))}
                placeholder="Nombre de la empresa..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <input
                type="text"
                value={pdfData.title}
                onChange={e => setPdfData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titulo del documento..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* AI Generator */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" /> Generar con IA
            </h3>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="Describe que necesitas... Ej: Propuesta para una metalurgica en Bahia Blanca, chatbot + automatizacion de cotizaciones, presupuesto USD 3000"
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
            />
            <button
              onClick={generateWithAI}
              disabled={aiLoading || !aiPrompt.trim()}
              className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-40"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Generar Contenido con IA
            </button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-400" /> Vista Previa
            </h3>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                <Download className="w-3.5 h-3.5" /> Descargar PDF
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                <Send className="w-3.5 h-3.5" /> Enviar a Lead
              </button>
            </div>
          </div>

          <div className="bg-gray-200 rounded-2xl p-6">
            <PdfPreview data={pdfData} colors={colors} template={template} />
          </div>
        </div>
      </div>
    </div>
  )
}
