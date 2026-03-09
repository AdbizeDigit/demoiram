import { useState } from 'react'
import { ArrowLeft, Search, AlertTriangle, Users, Zap, ChevronDown, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

function ScrapingIntelDemo() {
  const [companyInput, setCompanyInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    pains: true,
    tech: true,
    contacts: true,
    events: true
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!companyInput.trim()) {
      setError('Ingresa el nombre o sitio web de la empresa.')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/api/scraping/intel', {
        companyName: companyInput.includes('.') ? null : companyInput,
        website: companyInput.includes('.') ? companyInput : null,
        industry: null,
        focus: {
          pains: true,
          tech: true,
          contacts: true,
          events: true
        }
      })
      setResult(response.data)
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError('Error al ejecutar el scrapping inteligente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-8 transition-colors group text-sm"
        >
          <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Volver al Dashboard
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 p-8 mb-8">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                      <Search size={26} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl md:text-4xl font-black tracking-tight">Scrapping Inteligente de Prospectos</h1>
                      <p className="text-sm md:text-base text-white/80">Diseñado para alimentar tu sistema de IA y personalización</p>
                    </div>
                  </div>
                  <p className="text-sm md:text-base text-white/90 max-w-2xl">
                    Extrae señales de dolor, tech stack y contactos clave de empresas objetivo. Esta herramienta está optimizada
                    para identificar compañías con alta probabilidad de necesitar soluciones de IA y automatización.
                  </p>
                </div>
                <div className="space-y-2 text-xs md:text-sm bg-black/15 rounded-2xl p-4 border border-white/20 max-w-xs">
                  <p className="font-semibold text-white/90 flex items-center gap-2">
                    <Activity size={16} className="text-emerald-300" />
                    Bucle de crecimiento
                  </p>
                  <p className="text-white/80">
                    1. Scrapping detecta señales de necesidad.
                    2. El modelo de scoring prioriza leads.
                    3. El sistema de email y agentes cierra oportunidades.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 mb-10">
              <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                    <Globe2 size={22} className="text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Configurar scrapping</h2>
                    <p className="text-sm text-slate-400">Define el objetivo y el tipo de inteligencia que quieres obtener.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex rounded-full border border-slate-700 bg-slate-950/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleModeChange('automatic')}
                      className={`px-3 py-1.5 font-semibold transition-colors ${
                        mode === 'automatic'
                          ? 'bg-emerald-500/20 text-emerald-200 border-r border-slate-700'
                          : 'text-slate-300 hover:bg-slate-800/60 border-r border-slate-700'
                      }`}
                    >
                      Automático
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange('manual')}
                      className={`px-3 py-1.5 font-semibold transition-colors ${
                        mode === 'manual'
                          ? 'bg-sky-500/20 text-sky-200'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                  <p className="hidden md:block text-[11px] text-slate-400 max-w-xs">
                    {mode === 'automatic'
                      ? 'Modo automático: configuración recomendada para encontrar potenciales clientes de forma rápida.'
                      : 'Modo manual: ajusta a mano qué señales quieres priorizar para este objetivo concreto.'}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  <AlertTriangle size={18} className="mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Nombre de la empresa</label>
                    <input
                      type="text"
                      name="companyName"
                      value={form.companyName}
                      onChange={handleChange}
                      placeholder="Ej: LogiChain Corp"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Sitio web principal</label>
                    <input
                      type="text"
                      name="website"
                      value={form.website}
                      onChange={handleChange}
                      placeholder="Ej: https://www.logichain.com"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Industria / sector</label>
                    <input
                      type="text"
                      name="industry"
                      value={form.industry}
                      onChange={handleChange}
                      placeholder="Ej: Logística, SaaS B2B, Retail..."
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-semibold text-slate-400">Qué inteligencia quieres obtener</p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleToggle('focusPain')}
                      className={`w-full flex items-start gap-3 rounded-2xl border px-3 py-2.5 text-left text-xs transition-colors ${
                        form.focusPain ? 'border-emerald-500/70 bg-emerald-500/5' : 'border-slate-700 bg-slate-950/40'
                      } ${mode === 'automatic' ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="mt-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                      <div>
                        <p className="font-semibold text-emerald-200">Señales de dolor y problemas</p>
                        <p className="text-slate-300">
                          Palabras clave como ineficiencias, retrasos, altos costos o necesidad de automatización.
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle('focusTech')}
                      className={`w-full flex items-start gap-3 rounded-2xl border px-3 py-2.5 text-left text-xs transition-colors ${
                        form.focusTech ? 'border-cyan-500/70 bg-cyan-500/5' : 'border-slate-700 bg-slate-950/40'
                      } ${mode === 'automatic' ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="mt-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
                      <div>
                        <p className="font-semibold text-cyan-200">Tech stack y madurez digital</p>
                        <p className="text-slate-300">
                          Herramientas de datos, nubes, roles técnicos publicados, señales de uso de IA actual.
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle('focusContacts')}
                      className={`w-full flex items-start gap-3 rounded-2xl border px-3 py-2.5 text-left text-xs transition-colors ${
                        form.focusContacts ? 'border-purple-500/70 bg-purple-500/5' : 'border-slate-700 bg-slate-950/40'
                      } ${mode === 'automatic' ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="mt-0.5 w-2.5 h-2.5 rounded-full bg-purple-400"></div>
                      <div>
                        <p className="font-semibold text-purple-200">Contactos decisores</p>
                        <p className="text-slate-300">
                          Nombres y cargos clave (CTO, CIO, Head of Data, Innovation Lead) para outreach preciso.
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle('focusEvents')}
                      className={`w-full flex items-start gap-3 rounded-2xl border px-3 py-2.5 text-left text-xs transition-colors ${
                        form.focusEvents ? 'border-amber-500/70 bg-amber-500/5' : 'border-slate-700 bg-slate-950/40'
                      } ${mode === 'automatic' ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="mt-0.5 w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                      <div>
                        <p className="font-semibold text-amber-200">Eventos de compra</p>
                        <p className="text-slate-300">
                          Nombramiento de CTO/CIO, rondas de inversión, fusiones, lanzamientos que disparen urgencia.
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Ejecutando scrapping...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Search size={16} />
                          {mode === 'automatic' ? 'Play (modo automático)' : 'Play (modo manual)'}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleStop}
                      disabled={!loading}
                      className="inline-flex items-center justify-center rounded-2xl border border-red-500/60 px-4 py-2.5 text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Stop
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {result && (
              <div className="space-y-6 mb-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-1 md:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 flex items-center justify-center">
                        <Building2 size={20} className="text-cyan-300" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Empresa objetivo</p>
                        <p className="text-base font-semibold">
                          {result.company?.name || 'Empresa objetivo'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                      <div>
                        <p className="text-slate-500 mb-1">Sitio web</p>
                        <p className="break-all">
                          {result.company?.website || 'No especificado'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Industria</p>
                        <p>{result.company?.industry || 'No especificada'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-emerald-200">Lead Scoring ML (simulado)</p>
                      <Database size={18} className="text-emerald-300" />
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <p className="text-3xl font-black text-emerald-300">{Math.round((result.leadScore?.score || 0.84) * 100)}</p>
                      <p className="text-sm text-emerald-200">/ 100</p>
                    </div>
                    <p className="text-xs text-emerald-100 mb-2">Probabilidad estimada de cierre: {result.leadScore?.tier || 'Alta'}</p>
                    <ul className="text-[11px] text-emerald-50 space-y-1 list-disc list-inside">
                      {(result.leadScore?.reasons || []).map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {result.painSignals && result.painSignals.length > 0 && (
                  <div className="rounded-3xl border border-rose-500/30 bg-rose-500/5 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                        <AlertTriangle size={20} className="text-rose-300" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-rose-100">Señales de dolor detectadas</h3>
                        <p className="text-xs text-rose-100/80">Frases y eventos que sugieren ineficiencias o cuellos de botella.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {result.painSignals.map((item, idx) => (
                        <div key={idx} className="rounded-2xl bg-slate-950/50 border border-rose-500/20 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-rose-300 mb-1">{item.label}</p>
                          <p className="text-slate-100 mb-2">{item.description}</p>
                          <p className="text-[10px] text-rose-200/80">Fuente: {item.source}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.techStack && (
                  <div className="rounded-3xl border border-cyan-500/30 bg-cyan-500/5 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                        <Database size={20} className="text-cyan-300" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-cyan-100">Perfil tecnológico estimado</h3>
                        <p className="text-xs text-cyan-100/80">Herramientas e infraestructura que condicionan la propuesta técnica.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {result.techStack.web && (
                        <div className="rounded-2xl bg-slate-950/50 border border-cyan-500/20 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-cyan-300 mb-1">Capa web</p>
                          <ul className="space-y-1 text-slate-100 list-disc list-inside">
                            {result.techStack.web.map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.techStack.data && (
                        <div className="rounded-2xl bg-slate-950/50 border border-cyan-500/20 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-cyan-300 mb-1">Datos y analítica</p>
                          <ul className="space-y-1 text-slate-100 list-disc list-inside">
                            {result.techStack.data.map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.techStack.ai && (
                        <div className="rounded-2xl bg-slate-950/50 border border-cyan-500/20 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-cyan-300 mb-1">IA y automatización</p>
                          <ul className="space-y-1 text-slate-100 list-disc list-inside">
                            {result.techStack.ai.map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {result.contacts && result.contacts.length > 0 && (
                  <div className="rounded-3xl border border-purple-500/30 bg-purple-500/5 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                        <Users size={20} className="text-purple-200" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-purple-100">Contactos clave sugeridos</h3>
                        <p className="text-xs text-purple-100/80">Perfiles con alta probabilidad de ser decisores o influenciadores.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {result.contacts.map((contact, idx) => (
                        <div key={idx} className="rounded-2xl bg-slate-950/60 border border-purple-500/20 p-3">
                          <p className="font-semibold text-sm text-slate-50 mb-0.5">{contact.name}</p>
                          <p className="text-[11px] text-purple-100 mb-1">{contact.role}</p>
                          <p className="text-[11px] text-slate-300 mb-2">Tipo: {contact.type}</p>
                          <p className="text-[10px] text-slate-400">Confianza estimada: {Math.round((contact.confidence || 0.8) * 100)}%</p>
                          {contact.notes && (
                            <p className="text-[11px] text-slate-200 mt-1">{contact.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.buyEvents && result.buyEvents.length > 0 && (
                  <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                        <Activity size={20} className="text-amber-200" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-amber-100">Eventos de compra detectados</h3>
                        <p className="text-xs text-amber-100/80">Situaciones que justifican un pitch con urgencia contextual.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {result.buyEvents.map((event, idx) => (
                        <div key={idx} className="rounded-2xl bg-slate-950/60 border border-amber-500/20 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-amber-300 mb-1">{event.type}</p>
                          <p className="text-slate-100 mb-1">{event.description}</p>
                          <p className="text-[10px] text-amber-100/80 mb-1">Ventana: {event.window}</p>
                          <p className="text-[11px] text-slate-200">Playbook sugerido: {event.playbook}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.emailSuggestions && (
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-2xl bg-sky-500/20 flex items-center justify-center">
                        <Search size={18} className="text-sky-200" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold">Propuesta de email personalizado</h3>
                        <p className="text-xs text-slate-400">Sujetos y ángulos basados en el dolor y contexto detectado.</p>
                      </div>
                    </div>
                    <div className="space-y-3 text-xs text-slate-200">
                      <div>
                        <p className="text-slate-500 mb-1 text-[11px]">Asunto sugerido</p>
                        <p className="font-semibold">{result.emailSuggestions.subject}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1 text-[11px]">Apertura</p>
                        <p>{result.emailSuggestions.opener}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1 text-[11px]">Ángulo principal</p>
                        <p>{result.emailSuggestions.angle}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1 text-[11px]">Ventana recomendada de seguimiento</p>
                        <p>{result.emailSuggestions.followUpWindow}</p>
                      </div>
                    </div>
                  </div>
                )}

                {result.riskNotes && (
                  <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-xs text-slate-300">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-2xl bg-slate-800 flex items-center justify-center">
                        <AlertTriangle size={18} className="text-slate-200" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-100">Notas de cumplimiento y robustez</h3>
                        <p className="text-[11px] text-slate-400">Puntos clave para que el scrapping escale sin romperse.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">Legalidad y datos</p>
                        <p>{result.riskNotes.compliance}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">Gestión de IPs</p>
                        <p>{result.riskNotes.ipRotation}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">Resiliencia técnica</p>
                        <p>{result.riskNotes.selectors}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-xs text-slate-300">
              <p className="text-[11px] font-semibold text-slate-400 mb-2">Cómo se integra en tu sistema</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>El scrapping genera datos crudos sobre dolor, tecnología y contactos.</li>
                <li>Un modelo de Lead Scoring (LSM) prioriza qué cuentas atacar primero.</li>
                <li>Las respuestas de los prospectos se analizan con NLP para entender el sentimiento.</li>
                <li>Los eventos de compra disparan secuencias de outreach con urgencia contextual.</li>
                <li>Los resultados de campañas se usan para un bucle continuo de optimización.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-xs text-slate-300">
              <p className="text-[11px] font-semibold text-slate-400 mb-2">Ideas para siguientes etapas</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Conectar este módulo con scrapers reales (news, LinkedIn, builtwith, etc.).</li>
                <li>Entrenar un modelo de scoring propio con históricos de cierre de clientes.</li>
                <li>Integrar directamente con tu secuencia de emails y agentes.</li>
                <li>Generar mini-casos de estudio automáticos por vertical e industria.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScrapingIntelDemo
