import { useState } from 'react'
import { Brain, Calendar, TrendingUp, Code, Globe, Zap, Target, FileText, Download, Sparkles } from 'lucide-react'

const AdvancedScrapingPage = () => {
  const [activeTab, setActiveTab] = useState('intelligent')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  // Estados para cada tipo de scraping
  const [intelligentForm, setIntelligentForm] = useState({ url: '' })
  const [eventsForm, setEventsForm] = useState({ industry: '', location: '' })
  const [changesForm, setChangesForm] = useState({ companyDomain: '' })
  const [multilingualForm, setMultilingualForm] = useState({ url: '', targetLanguages: ['es', 'en'] })
  const [techStackForm, setTechStackForm] = useState({ url: '' })
  const [enrichForm, setEnrichForm] = useState({ companyName: '', companyDomain: '', location: '' })

  const handleIntelligentScrape = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResults(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/advanced-scraping/intelligent-scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(intelligentForm)
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setResults({ error: 'Error en el scraping inteligente' })
    } finally {
      setLoading(false)
    }
  }

  const handleEventsScrape = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResults(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/advanced-scraping/scrape-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventsForm)
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setResults({ error: 'Error extrayendo eventos' })
    } finally {
      setLoading(false)
    }
  }

  const handleChangeDetection = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResults(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/advanced-scraping/detect-company-changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(changesForm)
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setResults({ error: 'Error detectando cambios' })
    } finally {
      setLoading(false)
    }
  }

  const handleMultilingualScrape = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResults(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/advanced-scraping/multilingual-scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(multilingualForm)
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setResults({ error: 'Error en scraping multiidioma' })
    } finally {
      setLoading(false)
    }
  }

  const handleTechStackDetection = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResults(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/advanced-scraping/detect-tech-stack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(techStackForm)
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setResults({ error: 'Error detectando tecnologías' })
    } finally {
      setLoading(false)
    }
  }

  const handleEnrichLead = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResults(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/advanced-scraping/enrich-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(enrichForm)
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setResults({ error: 'Error enriqueciendo lead' })
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'intelligent', label: 'Scraping con IA', icon: Brain },
    { id: 'events', label: 'Eventos & Conferencias', icon: Calendar },
    { id: 'changes', label: 'Detector de Cambios', icon: TrendingUp },
    { id: 'multilingual', label: 'Multi-idioma', icon: Globe },
    { id: 'techstack', label: 'Stack Técnico', icon: Code },
    { id: 'enrich', label: 'Enriquecimiento', icon: Sparkles }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Zap className="w-10 h-10 text-blue-600" />
            Scraping Avanzado con IA
          </h1>
          <p className="text-gray-600">
            Herramientas potenciadas por inteligencia artificial para extraer información valiosa
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-wrap gap-2 p-4 border-b border-gray-100">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setResults(null)
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Intelligent Scraping Tab */}
            {activeTab === 'intelligent' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Brain className="w-6 h-6 text-purple-600" />
                    Scraping Inteligente con IA
                  </h3>
                  <p className="text-gray-600">
                    La IA analiza cualquier página web y extrae automáticamente información estructurada sobre la empresa
                  </p>
                </div>

                <form onSubmit={handleIntelligentScrape} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL de la página web
                    </label>
                    <input
                      type="url"
                      required
                      value={intelligentForm.url}
                      onChange={(e) => setIntelligentForm({ ...intelligentForm, url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Analizando con IA...' : 'Analizar Página'}
                  </button>
                </form>
              </div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-green-600" />
                    Scraping de Eventos y Conferencias
                  </h3>
                  <p className="text-gray-600">
                    Encuentra eventos relevantes donde hay potenciales clientes y decision makers
                  </p>
                </div>

                <form onSubmit={handleEventsScrape} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Industria
                      </label>
                      <input
                        type="text"
                        required
                        value={eventsForm.industry}
                        onChange={(e) => setEventsForm({ ...eventsForm, industry: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="ej: Technology, Marketing"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ubicación
                      </label>
                      <input
                        type="text"
                        required
                        value={eventsForm.location}
                        onChange={(e) => setEventsForm({ ...eventsForm, location: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="ej: Madrid, Barcelona"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Buscando eventos...' : 'Buscar Eventos'}
                  </button>
                </form>
              </div>
            )}

            {/* Changes Detection Tab */}
            {activeTab === 'changes' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                    Detector de Cambios en Empresas
                  </h3>
                  <p className="text-gray-600">
                    Monitorea cambios importantes (funding, hiring, nuevos productos) para identificar oportunidades
                  </p>
                </div>

                <form onSubmit={handleChangeDetection} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dominio de la empresa
                    </label>
                    <input
                      type="text"
                      required
                      value={changesForm.companyDomain}
                      onChange={(e) => setChangesForm({ ...changesForm, companyDomain: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Detectando cambios...' : 'Detectar Cambios'}
                  </button>
                </form>
              </div>
            )}

            {/* Multilingual Tab */}
            {activeTab === 'multilingual' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Globe className="w-6 h-6 text-indigo-600" />
                    Scraping Multi-idioma
                  </h3>
                  <p className="text-gray-600">
                    Extrae y traduce contenido automáticamente a múltiples idiomas usando IA
                  </p>
                </div>

                <form onSubmit={handleMultilingualScrape} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL de la página
                    </label>
                    <input
                      type="url"
                      required
                      value={multilingualForm.url}
                      onChange={(e) => setMultilingualForm({ ...multilingualForm, url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Idiomas objetivo
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['es', 'en', 'pt', 'fr', 'de', 'it'].map(lang => (
                        <label key={lang} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                          <input
                            type="checkbox"
                            checked={multilingualForm.targetLanguages.includes(lang)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMultilingualForm({
                                  ...multilingualForm,
                                  targetLanguages: [...multilingualForm.targetLanguages, lang]
                                })
                              } else {
                                setMultilingualForm({
                                  ...multilingualForm,
                                  targetLanguages: multilingualForm.targetLanguages.filter(l => l !== lang)
                                })
                              }
                            }}
                          />
                          <span className="text-sm font-medium">{lang.toUpperCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Traduciendo...' : 'Scrapear y Traducir'}
                  </button>
                </form>
              </div>
            )}

            {/* Tech Stack Tab */}
            {activeTab === 'techstack' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Code className="w-6 h-6 text-red-600" />
                    Detector de Stack Técnico
                  </h3>
                  <p className="text-gray-600">
                    Identifica las tecnologías que usa una empresa para personalizar tu pitch de venta
                  </p>
                </div>

                <form onSubmit={handleTechStackDetection} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL de la empresa
                    </label>
                    <input
                      type="url"
                      required
                      value={techStackForm.url}
                      onChange={(e) => setTechStackForm({ ...techStackForm, url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Detectando tecnologías...' : 'Detectar Stack Técnico'}
                  </button>
                </form>
              </div>
            )}

            {/* Enrich Lead Tab */}
            {activeTab === 'enrich' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-yellow-600" />
                    Enriquecimiento Automático de Leads
                  </h3>
                  <p className="text-gray-600">
                    Toma datos básicos y enriquécelos automáticamente con múltiples fuentes e IA
                  </p>
                </div>

                <form onSubmit={handleEnrichLead} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de empresa
                      </label>
                      <input
                        type="text"
                        required
                        value={enrichForm.companyName}
                        onChange={(e) => setEnrichForm({ ...enrichForm, companyName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="Acme Corp"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dominio
                      </label>
                      <input
                        type="text"
                        value={enrichForm.companyDomain}
                        onChange={(e) => setEnrichForm({ ...enrichForm, companyDomain: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="acme.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ubicación
                      </label>
                      <input
                        type="text"
                        value={enrichForm.location}
                        onChange={(e) => setEnrichForm({ ...enrichForm, location: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="Madrid, España"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Enriqueciendo lead...' : 'Enriquecer Lead'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-600" />
                Resultados
              </h3>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(results, null, 2)
                  const dataBlob = new Blob([dataStr], { type: 'application/json' })
                  const url = URL.createObjectURL(dataBlob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `scraping-results-${Date.now()}.json`
                  link.click()
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Exportar JSON
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>

            {results.success && results.ai_insights && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Insights de IA
                </h4>
                <div className="text-sm text-blue-800">
                  {Object.entries(results.ai_insights).map(([key, value]) => (
                    <div key={key} className="mb-2">
                      <span className="font-medium">{key}: </span>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdvancedScrapingPage
