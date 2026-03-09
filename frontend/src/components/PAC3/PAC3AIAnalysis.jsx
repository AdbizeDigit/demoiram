import { useState } from 'react'
import { Brain, Zap, Users, Mail, TrendingUp } from 'lucide-react'

export default function PAC3AIAnalysis({ prospects, onAnalysisComplete }) {
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)

  const handleAnalyze = async (prospectId) => {
    setIsAnalyzing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/pac-3.0/analyze-prospect/${prospectId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.analysis)
        onAnalysisComplete()
      }
    } catch (error) {
      console.error('Error analyzing prospect:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Brain className="text-purple-400" />
        Módulo de Análisis y Calificación (IA)
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prospects List */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-white mb-4">Prospectos</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {prospects.length === 0 ? (
              <p className="text-slate-400 text-sm">No hay prospectos disponibles</p>
            ) : (
              prospects.map(prospect => (
                <button
                  key={prospect.id}
                  onClick={() => setSelectedProspect(prospect)}
                  className={`w-full text-left p-3 rounded transition border ${
                    selectedProspect?.id === prospect.id
                      ? 'bg-purple-600/30 border-purple-500 text-white'
                      : 'bg-slate-600/30 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <p className="font-medium truncate">{prospect.company_name}</p>
                  <p className="text-xs text-slate-400 mt-1">{prospect.industry}</p>
                  {prospect.ai_score && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                        <div
                          className="bg-green-400 h-1.5 rounded-full"
                          style={{ width: `${prospect.ai_score * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-green-400">
                        {(prospect.ai_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Analysis Details */}
        <div className="lg:col-span-2">
          {selectedProspect ? (
            <div className="space-y-4">
              {/* Prospect Header */}
              <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-4">
                <h3 className="text-xl font-bold text-white">{selectedProspect.company_name}</h3>
                <p className="text-slate-400 text-sm mt-1">{selectedProspect.description}</p>
                <button
                  onClick={() => handleAnalyze(selectedProspect.id)}
                  disabled={isAnalyzing}
                  className="mt-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-semibold py-2 px-4 rounded transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      Ejecutar Análisis IA
                    </>
                  )}
                </button>
              </div>

              {/* Analysis Results */}
              {analysis && (
                <div className="space-y-4">
                  {/* Classification */}
                  <div className="bg-gradient-to-br from-purple-600/20 to-purple-400/10 border border-purple-500/30 rounded-lg p-4">
                    <h4 className="text-white font-semibold flex items-center gap-2 mb-2">
                      <TrendingUp size={18} className="text-purple-400" />
                      Clasificación
                    </h4>
                    <p className="text-purple-300 text-lg font-bold">
                      {analysis.classification}
                    </p>
                  </div>

                  {/* Thesis Versions */}
                  {analysis.thesis_versions && (
                    <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3">📝 Tesis de Venta Generadas</h4>
                      <div className="space-y-3">
                        {JSON.parse(analysis.thesis_versions).map((thesis, idx) => (
                          <div key={idx} className="bg-slate-700/50 rounded p-3">
                            <p className="text-blue-400 font-semibold text-sm">Para: {thesis.version}</p>
                            <p className="text-slate-300 text-sm mt-2">{thesis.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Contacts */}
                  {analysis.key_contacts && (
                    <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Users size={18} className="text-blue-400" />
                        Contactos Clave Identificados
                      </h4>
                      <div className="space-y-2">
                        {JSON.parse(analysis.key_contacts).map((contact, idx) => (
                          <div key={idx} className="bg-slate-700/50 rounded p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-medium">{contact.name}</p>
                                <p className="text-slate-400 text-sm">{contact.role}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-green-400 text-sm font-semibold">
                                  {(contact.confidence * 100).toFixed(0)}% confianza
                                </p>
                              </div>
                            </div>
                            <p className="text-blue-400 text-sm mt-2">{contact.email}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scores */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-green-600/20 to-green-400/10 border border-green-500/30 rounded-lg p-4">
                      <p className="text-slate-300 text-sm">Sentimiento</p>
                      <p className="text-3xl font-bold text-green-400 mt-2">
                        {(analysis.sentiment_score * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-600/20 to-blue-400/10 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-slate-300 text-sm">Confianza</p>
                      <p className="text-3xl font-bold text-blue-400 mt-2">
                        {(analysis.confidence_score * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-8 text-center">
              <Brain className="mx-auto text-slate-400 mb-4" size={48} />
              <p className="text-slate-400">Selecciona un prospecto para analizar</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
        <h4 className="text-white font-semibold mb-2">🧠 Capacidades de IA</h4>
        <ul className="text-slate-300 text-sm space-y-1">
          <li>✓ Clasificación semántica de prospectos (Cero-Shot/Few-Shot)</li>
          <li>✓ Generación de múltiples tesis de venta optimizadas por rol</li>
          <li>✓ Identificación de contactos clave (NER Avanzado)</li>
          <li>✓ Verificación probabilística de emails</li>
          <li>✓ Análisis de sentimiento y confianza</li>
        </ul>
      </div>
    </div>
  )
}
