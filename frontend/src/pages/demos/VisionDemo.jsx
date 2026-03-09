import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Upload, Eye, Sparkles, Scan } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function VisionDemo() {
  const [image, setImage] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result)
        setResults(null)
        setError(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const analyzeImage = async () => {
    if (!image) return

    setLoading(true)
    setError(null)

    try {
      const response = await axios.post('http://localhost:5001/python-api/vision/detect', {
        image: image
      })

      console.log('Response from API:', response.data)
      setResults(response.data)
    } catch (error) {
      console.error('Error al analizar imagen:', error)
      setError('Error al analizar la imagen. Asegúrate de que el servicio Python esté ejecutándose.')
    }
    setLoading(false)
  }

  // Draw bounding boxes on canvas
  useEffect(() => {
    if (results && results.detections && image && canvasRef.current) {
      console.log('Drawing detections:', results.detections)
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width
        canvas.height = img.height

        // Draw image
        ctx.drawImage(img, 0, 0)

        console.log('Canvas size:', canvas.width, 'x', canvas.height)

        // Draw bounding boxes and keypoints
        results.detections.forEach((detection, idx) => {
          console.log('Drawing detection:', detection)
          const { bbox, label, confidence, keypoints } = detection

          // Convert relative coordinates to absolute
          const x = bbox.x * img.width
          const y = bbox.y * img.height
          const width = bbox.width * img.width
          const height = bbox.height * img.height

          // Generate color based on index
          const colors = [
            '#8B5CF6', // purple
            '#06B6D4', // cyan
            '#EC4899', // pink
            '#F59E0B', // amber
            '#10B981', // emerald
            '#3B82F6', // blue
          ]
          const color = colors[idx % colors.length]

          // Draw box
          ctx.strokeStyle = color
          ctx.lineWidth = 3
          ctx.strokeRect(x, y, width, height)

          // Draw label background
          ctx.fillStyle = color
          const labelText = `${label} ${(confidence * 100).toFixed(0)}%`
          ctx.font = 'bold 16px Inter, sans-serif'
          const textMetrics = ctx.measureText(labelText)
          const textHeight = 24

          ctx.fillRect(x, y - textHeight, textMetrics.width + 12, textHeight)

          // Draw label text
          ctx.fillStyle = '#FFFFFF'
          ctx.fillText(labelText, x + 6, y - 6)

          // Draw keypoints (body parts)
          if (keypoints && keypoints.length > 0) {
            keypoints.forEach(kp => {
              const kpX = kp.x * img.width
              const kpY = kp.y * img.height

              // Draw keypoint circle
              ctx.beginPath()
              ctx.arc(kpX, kpY, 5, 0, 2 * Math.PI)
              ctx.fillStyle = '#00FF00'
              ctx.fill()
              ctx.strokeStyle = '#FFFFFF'
              ctx.lineWidth = 2
              ctx.stroke()

              // Draw keypoint label
              ctx.fillStyle = '#FFFFFF'
              ctx.font = 'bold 10px Inter, sans-serif'
              ctx.fillText(kp.name, kpX + 8, kpY - 8)
            })

            // Draw skeleton connections
            const connections = [
              [0, 1], [0, 2], [1, 3], [2, 4], // Face
              [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
              [5, 11], [6, 12], [11, 12], // Torso
              [11, 13], [13, 15], [12, 14], [14, 16] // Legs
            ]

            ctx.strokeStyle = '#00FF00'
            ctx.lineWidth = 2
            connections.forEach(([start, end]) => {
              const kp1 = keypoints.find((_, i) => i === start)
              const kp2 = keypoints.find((_, i) => i === end)

              if (kp1 && kp2) {
                ctx.beginPath()
                ctx.moveTo(kp1.x * img.width, kp1.y * img.height)
                ctx.lineTo(kp2.x * img.width, kp2.y * img.height)
                ctx.stroke()
              }
            })
          }
        })
      }

      img.src = image
    }
  }, [results, image])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 md:p-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-8 transition-colors group"
        >
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold">Volver al Dashboard</span>
        </Link>

        {/* Header */}
        <div className="relative mb-12 overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 p-8">
          <div className="relative z-10">
            <div className="flex items-center mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4 border border-white/30">
                <Eye className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
                  DETECCIÓN DE POSES
                </h1>
                <p className="text-white/90 text-lg flex items-center gap-2">
                  <Sparkles size={18} />
                  Reconocimiento de personas y partes del cuerpo
                </p>
              </div>
            </div>
          </div>

          {/* Decorative grid */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}></div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Image panel */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Scan className="text-cyan-400" size={24} />
              Imagen
            </h3>

            <div className="bg-gray-900/80 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border-2 border-gray-700/50 relative">
              <div className="w-full h-full">
                {image ? (
                  results ? (
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img src={image} alt="Preview" className="w-full h-full object-contain" />
                  )
                ) : (
                  <div
                    onClick={() => fileInputRef.current.click()}
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-800/50 transition-colors group"
                  >
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="text-white" size={40} />
                    </div>
                    <p className="text-gray-400 text-lg font-semibold">Haz clic para subir una imagen</p>
                    <p className="text-gray-500 text-sm mt-2">PNG, JPG hasta 10MB</p>
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
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex gap-3">
              {image && (
                <>
                  <button
                    onClick={() => {
                      setImage(null)
                      setResults(null)
                      setError(null)
                    }}
                    className="flex-1 py-3 px-6 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600 transition-all"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={analyzeImage}
                    disabled={loading}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-cyan-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye className="inline mr-2" size={20} />
                    {loading ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                        Analizando...
                      </>
                    ) : 'Analizar'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Results panel */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="text-cyan-400" size={24} />
              Resultados de Detección
            </h3>

            <div className="bg-gray-900/80 rounded-2xl p-6 h-[calc(100%-4rem)] overflow-y-auto border-2 border-gray-700/50">
              {error ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Eye className="text-red-400" size={32} />
                  </div>
                  <p className="text-red-400 font-semibold mb-2">Error</p>
                  <p className="text-gray-400 text-sm">{error}</p>
                </div>
              ) : !results ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Scan className="text-white" size={32} />
                  </div>
                  <p className="text-gray-400">Los resultados aparecerán aquí después del análisis</p>
                  <p className="text-gray-500 text-sm mt-2">Sube una imagen y haz clic en Analizar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.detections?.length > 0 ? (
                    <>
                      <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30 rounded-xl p-4 mb-4">
                        <p className="text-cyan-400 font-bold text-lg">
                          {results.count} persona{results.count !== 1 ? 's' : ''} detectada{results.count !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {results.detections.map((detection, idx) => {
                        const colors = [
                          { border: 'border-purple-500', bg: 'bg-purple-500', text: 'text-purple-400' },
                          { border: 'border-cyan-500', bg: 'bg-cyan-500', text: 'text-cyan-400' },
                          { border: 'border-pink-500', bg: 'bg-pink-500', text: 'text-pink-400' },
                          { border: 'border-amber-500', bg: 'bg-amber-500', text: 'text-amber-400' },
                          { border: 'border-emerald-500', bg: 'bg-emerald-500', text: 'text-emerald-400' },
                          { border: 'border-blue-500', bg: 'bg-blue-500', text: 'text-blue-400' },
                        ]
                        const colorSet = colors[idx % colors.length]

                        return (
                          <div
                            key={idx}
                            className={`bg-gray-800/80 rounded-xl p-4 border-2 ${colorSet.border} hover:shadow-lg transition-all`}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 ${colorSet.bg} rounded-full`}></div>
                                <span className="font-bold text-white text-lg">{detection.label} #{idx + 1}</span>
                              </div>
                              <span className={`text-sm ${colorSet.bg}/20 ${colorSet.text} px-3 py-1 rounded-full font-bold border ${colorSet.border}`}>
                                {(detection.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden mb-3">
                              <div
                                className={`${colorSet.bg} h-2 rounded-full transition-all duration-500`}
                                style={{ width: `${detection.confidence * 100}%` }}
                              ></div>
                            </div>
                            {detection.keypoints && detection.keypoints.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-700">
                                <p className="text-sm text-gray-400 mb-2">
                                  <span className="text-green-400 font-bold">{detection.keypoints.length}</span> partes del cuerpo detectadas
                                </p>
                                <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                                  {detection.keypoints.slice(0, 6).map((kp, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      {kp.name}
                                    </div>
                                  ))}
                                  {detection.keypoints.length > 6 && (
                                    <div className="text-gray-600 col-span-2">
                                      +{detection.keypoints.length - 6} más...
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Eye className="text-gray-500" size={32} />
                      </div>
                      <p className="text-gray-400">No se detectaron personas en la imagen</p>
                      <p className="text-gray-500 text-sm mt-2">Intenta con una imagen que contenga personas</p>
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

export default VisionDemo
