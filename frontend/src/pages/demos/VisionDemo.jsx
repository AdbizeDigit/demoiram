import { useState, useRef } from 'react'
import { ArrowLeft, Camera, Upload, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import Webcam from 'react-webcam'
import axios from 'axios'

function VisionDemo() {
  const [mode, setMode] = useState('upload') // 'upload' or 'webcam'
  const [image, setImage] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const webcamRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result)
        setResults(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const captureWebcam = () => {
    const imageSrc = webcamRef.current.getScreenshot()
    setImage(imageSrc)
    setResults(null)
  }

  const analyzeImage = async () => {
    if (!image) return

    setLoading(true)
    try {
      const response = await axios.post('/python-api/vision/detect', {
        image: image
      })

      setResults(response.data)
    } catch (error) {
      console.error('Error al analizar imagen:', error)
      alert('Error al analizar la imagen')
    }
    setLoading(false)
  }

  return (
    <div>
      <Link to="/" className="flex items-center text-primary-600 hover:text-primary-700 mb-6">
        <ArrowLeft size={20} className="mr-2" />
        Volver al inicio
      </Link>

      <div className="card max-w-5xl mx-auto">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
            <Eye className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Visión Artificial</h2>
            <p className="text-gray-600">Detección de objetos en tiempo real</p>
          </div>
        </div>

        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              mode === 'upload'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Upload className="inline mr-2" size={20} />
            Subir Imagen
          </button>
          <button
            onClick={() => setMode('webcam')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              mode === 'webcam'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Camera className="inline mr-2" size={20} />
            Usar Cámara
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
              {mode === 'upload' ? (
                <div className="w-full h-full">
                  {image ? (
                    <img src={image} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <div
                      onClick={() => fileInputRef.current.click()}
                      className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors"
                    >
                      <Upload className="text-gray-400 mb-4" size={48} />
                      <p className="text-gray-400">Haz clic para subir una imagen</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full relative">
                  {image ? (
                    <img src={image} alt="Captured" className="w-full h-full object-contain" />
                  ) : (
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex space-x-2">
              {mode === 'webcam' && !image && (
                <button onClick={captureWebcam} className="btn-primary flex-1">
                  <Camera className="inline mr-2" size={20} />
                  Capturar
                </button>
              )}
              {image && (
                <>
                  <button
                    onClick={() => setImage(null)}
                    className="btn-secondary flex-1"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={analyzeImage}
                    disabled={loading}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    <Eye className="inline mr-2" size={20} />
                    {loading ? 'Analizando...' : 'Analizar'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="bg-gray-50 rounded-xl p-4 h-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados</h3>

              {!results ? (
                <p className="text-gray-500 text-center py-12">
                  Los resultados aparecerán aquí después del análisis
                </p>
              ) : (
                <div className="space-y-3">
                  {results.detections?.map((detection, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900">{detection.label}</span>
                        <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                          {(detection.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${detection.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}

                  {results.detections?.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      No se detectaron objetos en la imagen
                    </p>
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

export default VisionDemo
