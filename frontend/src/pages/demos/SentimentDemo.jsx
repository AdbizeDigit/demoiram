import { useState } from 'react'
import { ArrowLeft, Heart, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function SentimentDemo() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!text.trim()) {
      alert('Por favor ingresa un texto para analizar')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('/python-api/sentiment/analyze', {
        text
      })

      setResult(response.data)
    } catch (error) {
      console.error('Error al analizar sentimiento:', error)
      alert('Error al analizar el sentimiento')
    }
    setLoading(false)
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100'
      case 'negative': return 'text-red-600 bg-red-100'
      case 'neutral': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSentimentEmoji = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '😊'
      case 'negative': return '😞'
      case 'neutral': return '😐'
      default: return '🤔'
    }
  }

  return (
    <div>
      <Link to="/" className="flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft size={20} className="mr-2" />
        Volver al inicio
      </Link>

      <div className="card max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
            <Heart className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Análisis de Sentimientos</h2>
            <p className="text-gray-600">Detecta emociones en texto en tiempo real</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Texto para analizar
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="input-field h-64"
              placeholder="Escribe o pega el texto que quieres analizar..."
            />
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full mt-4 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Send size={20} />
              <span>{loading ? 'Analizando...' : 'Analizar Sentimiento'}</span>
            </button>
          </div>

          <div>
            <div className="bg-gray-50 rounded-xl p-6 h-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados</h3>

              {!result ? (
                <p className="text-gray-500 text-center py-12">
                  Los resultados aparecerán aquí
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                    <div className="text-6xl mb-4">
                      {getSentimentEmoji(result.sentiment)}
                    </div>
                    <div className={`inline-block px-4 py-2 rounded-full font-semibold text-lg ${getSentimentColor(result.sentiment)}`}>
                      {result.sentiment === 'positive' ? 'Positivo' : result.sentiment === 'negative' ? 'Negativo' : 'Neutral'}
                    </div>
                    <p className="text-gray-600 mt-4">
                      Confianza: <span className="font-semibold">{(result.confidence * 100).toFixed(1)}%</span>
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Desglose de Emociones</h4>
                    <div className="space-y-2">
                      {Object.entries(result.emotions || {}).map(([emotion, score]) => (
                        <div key={emotion}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{emotion}</span>
                            <span className="font-semibold">{(score * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-pink-600 h-2 rounded-full transition-all"
                              style={{ width: `${score * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.keywords && result.keywords.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">Palabras Clave</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.keywords.map((keyword, idx) => (
                          <span key={idx} className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm">
                            {keyword}
                          </span>
                        ))}
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

export default SentimentDemo
