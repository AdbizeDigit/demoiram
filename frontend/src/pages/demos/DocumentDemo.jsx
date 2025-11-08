import { useState } from 'react'
import { ArrowLeft, FileText, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function DocumentDemo() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleAnalyze = async () => {
    if (!file) {
      alert('Por favor selecciona un documento')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('document', file)

    try {
      const response = await axios.post('/python-api/document/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setResult(response.data)
    } catch (error) {
      console.error('Error al analizar documento:', error)
      alert('Error al procesar el documento')
    }
    setLoading(false)
  }

  const getCategoryColor = (category) => {
    const colors = {
      'invoice': 'bg-blue-100 text-blue-700',
      'contract': 'bg-purple-100 text-purple-700',
      'report': 'bg-green-100 text-green-700',
      'letter': 'bg-yellow-100 text-yellow-700',
      'other': 'bg-gray-100 text-gray-700'
    }
    return colors[category] || colors.other
  }

  return (
    <div>
      <Link to="/" className="flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft size={20} className="mr-2" />
        Volver al inicio
      </Link>

      <div className="card max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mr-4">
            <FileText className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Análisis de Documentos</h2>
            <p className="text-gray-600">Clasifica y extrae información de documentos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <FileText className="mx-auto text-yellow-500 mb-4" size={64} />

              {file ? (
                <div className="mb-4">
                  <p className="font-semibold text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              ) : (
                <p className="text-gray-600 mb-4">No se ha seleccionado ningún documento</p>
              )}

              <label className="cursor-pointer inline-block">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="btn-secondary inline-flex items-center space-x-2">
                  <Upload size={20} />
                  <span>Seleccionar Documento</span>
                </div>
              </label>

              <p className="text-xs text-gray-500 mt-4">
                Formatos soportados: PDF, DOC, DOCX, TXT
              </p>
            </div>

            {file && (
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full mt-4 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <FileText size={20} />
                <span>{loading ? 'Analizando...' : 'Analizar Documento'}</span>
              </button>
            )}
          </div>

          <div>
            <div className="bg-gray-50 rounded-xl p-6 h-full overflow-y-auto max-h-[600px]">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados</h3>

              {!result ? (
                <p className="text-gray-500 text-center py-12">
                  Los resultados aparecerán aquí
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Clasificación</h4>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getCategoryColor(result.category)}`}>
                      {result.categoryLabel}
                    </span>
                    <p className="text-sm text-gray-600 mt-2">
                      Confianza: {(result.confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Resumen</h4>
                    <p className="text-gray-700 text-sm">{result.summary}</p>
                  </div>

                  {result.entities && result.entities.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">Entidades Extraídas</h4>
                      <div className="space-y-2">
                        {result.entities.map((entity, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="font-medium">{entity.type}:</span>
                            <span className="text-gray-700">{entity.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.keyPhrases && result.keyPhrases.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">Frases Clave</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.keyPhrases.map((phrase, idx) => (
                          <span key={idx} className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                            {phrase}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.metadata && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">Información del Documento</h4>
                      <div className="text-sm space-y-1 text-gray-600">
                        <p><span className="font-semibold">Páginas:</span> {result.metadata.pages}</p>
                        <p><span className="font-semibold">Palabras:</span> {result.metadata.wordCount}</p>
                        <p><span className="font-semibold">Idioma:</span> {result.metadata.language}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentDemo
