import { useState } from 'react'
import { ArrowLeft, Mic, Upload, FileAudio } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function TranscriptionDemo() {
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

  const handleTranscribe = async () => {
    if (!file) {
      alert('Por favor selecciona un archivo de audio')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('audio', file)

    try {
      const response = await axios.post('/python-api/transcription/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setResult(response.data)
    } catch (error) {
      console.error('Error al transcribir:', error)
      alert('Error al procesar el audio')
    }
    setLoading(false)
  }

  return (
    <div>
      <Link to="/" className="flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft size={20} className="mr-2" />
        Volver al inicio
      </Link>

      <div className="card max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
            <Mic className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Transcripción de Audio/Video</h2>
            <p className="text-gray-600">Convierte audio a texto con resumen automático</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <FileAudio className="mx-auto text-indigo-500 mb-4" size={64} />

              {file ? (
                <div className="mb-4">
                  <p className="font-semibold text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <p className="text-gray-600 mb-4">No se ha seleccionado ningún archivo</p>
              )}

              <label className="cursor-pointer inline-block">
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="btn-secondary inline-flex items-center space-x-2">
                  <Upload size={20} />
                  <span>Seleccionar Archivo</span>
                </div>
              </label>
            </div>

            {file && (
              <button
                onClick={handleTranscribe}
                disabled={loading}
                className="w-full mt-4 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Mic size={20} />
                <span>{loading ? 'Transcribiendo...' : 'Transcribir'}</span>
              </button>
            )}
          </div>

          <div>
            <div className="bg-gray-50 rounded-xl p-6 h-full overflow-y-auto max-h-[600px]">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados</h3>

              {!result ? (
                <p className="text-gray-500 text-center py-12">
                  La transcripción aparecerá aquí
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Resumen</h4>
                    <p className="text-gray-700">{result.summary}</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Transcripción Completa</h4>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{result.transcription}</p>
                  </div>

                  {result.metadata && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">Información</h4>
                      <div className="text-sm space-y-1 text-gray-600">
                        <p><span className="font-semibold">Duración:</span> {result.metadata.duration}</p>
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

export default TranscriptionDemo
