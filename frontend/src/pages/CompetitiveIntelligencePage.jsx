import { useState } from 'react'
import { Target, DollarSign, Star, FileText, Users, TrendingUp, Download, AlertCircle } from 'lucide-react'

const CompetitiveIntelligencePage = () => {
  const [activeTab, setActiveTab] = useState('analysis')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  // Estados para cada función
  const [analysisForm, setAnalysisForm] = useState({ competitorDomain: '', yourDomain: '' })
  const [pricingForm, setPricingForm] = useState({ competitorDomain: '', pricingPagePath: '/pricing' })
  const [reviewsForm, setReviewsForm] = useState({ competitorName: '' })
  const [customersForm, setCustomersForm] = useState({ competitorDomain: '' })
  const [contentForm, setContentForm] = useState({ competitorDomain: '' })

  const handleCompetitiveAnalysis = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResults(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/competitive-intelligence/analyze-competitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(analysisForm)
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setResults({ error: 'Error en análisis competitivo' })
    } finally {
      setLoading(false)
    }
  }

  const handlePricingMonitor = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResults(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/competitive-intelligence/monitor-competitor-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pricingForm)
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setResults({ error: 'Error monitoreando precios' })
    } finally {
      setLoading(false)
    }
  }

  const handleReviewsAnalysis = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResults(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/competitive-intelligence/analyze-competitor-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reviewsForm)
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setResults({ error: 'Error analizando reviews' })
    } finally {
      setLoading(false)
    }
  }

  const handleCustomersScrape = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResults(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/competitive-intelligence/scrape-competitor-customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(customersForm)
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setResults({ error: 'Error extrayendo clientes' })
    } finally {
      setLoading(false)
    }
  }

  const handleContentAnalysis = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResults(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/competitive-intelligence/analyze-competitor-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(contentForm)
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setResults({ error: 'Error analizando contenido' })
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'analysis', label: 'Análisis Competitivo', icon: Target },
    { id: 'pricing', label: 'Monitor de Precios', icon: DollarSign },
    { id: 'reviews', label: 'Análisis de Reviews', icon: Star },
    { id: 'customers', label: 'Clientes del Competidor', icon: Users },
    { id: 'content', label: 'Contenido & SEO', icon: FileText }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <TrendingUp className="w-10 h-10 text-purple-600" />
            Competitive Intelligence
          </h1>
          <p className="text-gray-600">
            Analiza competidores, encuentra sus debilidades y gana más deals
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
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Competitive Analysis Tab */}
            {activeTab === 'analysis' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Target className="w-6 h-6 text-purple-600" />
                    Análisis Competitivo con IA
                  </h3>
                  <p className="text-gray-600">
                    Compara tu producto con competidores y genera sales battle cards automáticas
                  </p>
                </div>

                <form onSubmit={handleCompetitiveAnalysis} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dominio del competidor *
                      </label>
                      <input
                        type="text"
                        required
                        value={analysisForm.competitorDomain}
                        onChange={(e) => setAnalysisForm({ ...analysisForm, competitorDomain: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="competitor.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tu dominio (opcional)
                      </label>
                      <input
                        type="text"
                        value={analysisForm.yourDomain}
                        onChange={(e) => setAnalysisForm({ ...analysisForm, yourDomain: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="yourcompany.com"
                      />
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-800">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      La IA generará: ventajas competitivas, gaps a explotar, posicionamiento recomendado y sales battle cards
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Analizando competidor...' : 'Analizar Competidor'}
                  </button>
                </form>
              </div>
            )}

            {/* Pricing Monitor Tab */}
            {activeTab === 'pricing' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-green-600" />
                    Monitor de Precios
                  </h3>
                  <p className="text-gray-600">
                    Rastrea cambios en precios de competidores y recibe alertas automáticas
                  </p>
                </div>

                <form onSubmit={handlePricingMonitor} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dominio del competidor *
                      </label>
                      <input
                        type="text"
                        required
                        value={pricingForm.competitorDomain}
                        onChange={(e) => setPricingForm({ ...pricingForm, competitorDomain: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="competitor.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ruta de pricing
                      </label>
                      <input
                        type="text"
                        value={pricingForm.pricingPagePath}
                        onChange={(e) => setPricingForm({ ...pricingForm, pricingPagePath: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="/pricing"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Monitoreando precios...' : 'Monitorear Precios'}
                  </button>
                </form>
              </div>
            )}

            {/* Reviews Analysis Tab */}
            {activeTab === 'reviews' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Star className="w-6 h-6 text-yellow-600" />
                    Análisis de Reviews
                  </h3>
                  <p className="text-gray-600">
                    Analiza reviews de competidores para encontrar pain points y oportunidades
                  </p>
                </div>

                <form onSubmit={handleReviewsAnalysis} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del producto/empresa *
                    </label>
                    <input
                      type="text"
                      required
                      value={reviewsForm.competitorName}
                      onChange={(e) => setReviewsForm({ ...reviewsForm, competitorName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="Competitor Product Name"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Se buscarán reviews en G2, Capterra y Trustpilot. La IA extraerá quejas comunes y gaps de features.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Analizando reviews...' : 'Analizar Reviews'}
                  </button>
                </form>
              </div>
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-600" />
                    Clientes del Competidor
                  </h3>
                  <p className="text-gray-600">
                    Identifica clientes de competidores para targeting directo con estrategia de migration
                  </p>
                </div>

                <form onSubmit={handleCustomersScrape} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dominio del competidor *
                    </label>
                    <input
                      type="text"
                      required
                      value={customersForm.competitorDomain}
                      onChange={(e) => setCustomersForm({ ...customersForm, competitorDomain: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="competitor.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Extrayendo clientes...' : 'Extraer Clientes'}
                  </button>
                </form>
              </div>
            )}

            {/* Content Analysis Tab */}
            {activeTab === 'content' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-indigo-600" />
                    Análisis de Contenido & SEO
                  </h3>
                  <p className="text-gray-600">
                    Encuentra content gaps y oportunidades SEO analizando el blog de tu competidor
                  </p>
                </div>

                <form onSubmit={handleContentAnalysis} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dominio del competidor *
                    </label>
                    <input
                      type="text"
                      required
                      value={contentForm.competitorDomain}
                      onChange={(e) => setContentForm({ ...contentForm, competitorDomain: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="competitor.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Analizando contenido...' : 'Analizar Contenido'}
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
              <h3 className="text-xl font-semibold text-gray-900">Resultados</h3>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(results, null, 2)
                  const dataBlob = new Blob([dataStr], { type: 'application/json' })
                  const url = URL.createObjectURL(dataBlob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `competitive-intel-${Date.now()}.json`
                  link.click()
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>

            {/* Special sections for different types of results */}
            {results.competitive_analysis && (
              <div className="mt-6 space-y-4">
                {results.competitive_analysis.sales_battle_cards && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-3">Sales Battle Cards</h4>
                    {results.competitive_analysis.sales_battle_cards.map((card, idx) => (
                      <div key={idx} className="mb-3 p-3 bg-white rounded border border-purple-100">
                        <p className="font-medium text-purple-800 mb-1">Objeción: {card.objection}</p>
                        <p className="text-sm text-gray-700 mb-1"><strong>Respuesta:</strong> {card.response}</p>
                        {card.proof_points && card.proof_points.length > 0 && (
                          <div className="text-sm text-gray-600">
                            <strong>Proof Points:</strong>
                            <ul className="list-disc list-inside ml-2">
                              {card.proof_points.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {results.price_changes && results.price_changes.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Cambios de Precio Detectados
                </h4>
                {results.price_changes.map((change, idx) => (
                  <div key={idx} className="text-sm text-red-800 mb-2">
                    {change.type === 'price_change' ? (
                      <p>Plan "{change.plan}": {change.old_price} → {change.new_price}</p>
                    ) : (
                      <p>Nuevo plan: "{change.plan}" - {change.price}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CompetitiveIntelligencePage
