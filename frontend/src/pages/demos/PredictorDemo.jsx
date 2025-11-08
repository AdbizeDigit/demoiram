import { useState } from 'react'
import { ArrowLeft, TrendingUp, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function PredictorDemo() {
  const [dataType, setDataType] = useState('sales')
  const [period, setPeriod] = useState('monthly')
  const [forecast, setForecast] = useState(6)
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

  const handlePredict = async () => {
    if (!file) {
      alert('Por favor selecciona un archivo de datos')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('data', file)
    formData.append('dataType', dataType)
    formData.append('period', period)
    formData.append('forecast', forecast)

    try {
      const response = await axios.post('/python-api/predictor/forecast', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setResult(response.data)
    } catch (error) {
      console.error('Error al predecir:', error)
      alert('Error al procesar los datos')
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
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mr-4">
            <TrendingUp className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Predictor de Tendencias</h2>
            <p className="text-gray-600">Análisis predictivo y forecasting de datos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Datos
                </label>
                <select
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value)}
                  className="input-field"
                >
                  <option value="sales">Ventas</option>
                  <option value="traffic">Tráfico</option>
                  <option value="revenue">Ingresos</option>
                  <option value="users">Usuarios</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Período
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="input-field"
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Períodos a Predecir
                </label>
                <input
                  type="number"
                  value={forecast}
                  onChange={(e) => setForecast(parseInt(e.target.value))}
                  min="1"
                  max="24"
                  className="input-field"
                />
              </div>

              <div className="bg-gray-50 rounded-xl p-6 text-center">
                {file ? (
                  <div className="mb-4">
                    <p className="font-semibold text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                ) : (
                  <p className="text-gray-600 mb-4">No se ha seleccionado ningún archivo</p>
                )}

                <label className="cursor-pointer inline-block">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="btn-secondary inline-flex items-center space-x-2">
                    <Upload size={20} />
                    <span>Seleccionar Datos</span>
                  </div>
                </label>

                <p className="text-xs text-gray-500 mt-4">
                  Formatos: CSV, XLSX, XLS
                </p>
              </div>

              {file && (
                <button
                  onClick={handlePredict}
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <TrendingUp size={20} />
                  <span>{loading ? 'Prediciendo...' : 'Generar Predicción'}</span>
                </button>
              )}
            </div>
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
                    <h4 className="font-semibold text-gray-900 mb-3">Métricas del Modelo</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-gray-600 mb-1">Precisión</p>
                        <p className="text-xl font-bold text-red-600">{(result.accuracy * 100).toFixed(1)}%</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-gray-600 mb-1">Error Medio</p>
                        <p className="text-xl font-bold text-red-600">{result.mse?.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Tendencia General</h4>
                    <div className={`flex items-center space-x-2 ${result.trend === 'up' ? 'text-green-600' : result.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                      <TrendingUp size={24} className={result.trend === 'down' ? 'rotate-180' : ''} />
                      <span className="text-lg font-semibold">
                        {result.trend === 'up' ? 'Tendencia Alcista' : result.trend === 'down' ? 'Tendencia Bajista' : 'Tendencia Estable'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Cambio proyectado: <span className="font-semibold">{result.changePercent > 0 ? '+' : ''}{result.changePercent?.toFixed(1)}%</span>
                    </p>
                  </div>

                  {result.predictions && result.predictions.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">Predicciones</h4>
                      <div className="space-y-2">
                        {result.predictions.map((pred, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                            <span className="text-gray-600">{pred.period}</span>
                            <span className="font-semibold text-gray-900">{pred.value.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.insights && result.insights.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">Insights</h4>
                      <ul className="space-y-2">
                        {result.insights.map((insight, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700">
                            <span className="text-red-500 mt-1">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Gráfico Simplificado</h4>
                    <div className="flex items-end space-x-1 h-32">
                      {result.chartData?.map((value, idx) => (
                        <div
                          key={idx}
                          className="flex-1 bg-red-500 rounded-t transition-all hover:bg-red-600"
                          style={{ height: `${(value / Math.max(...result.chartData)) * 100}%` }}
                          title={`${value.toFixed(2)}`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PredictorDemo
