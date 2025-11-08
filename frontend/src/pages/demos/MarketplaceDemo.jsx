import { useState } from 'react'
import { ArrowLeft, ShoppingCart, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function MarketplaceDemo() {
  const [searchType, setSearchType] = useState('buyers')
  const [product, setProduct] = useState('')
  const [budget, setBudget] = useState('')
  const [location, setLocation] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!product) {
      alert('Por favor ingresa un producto o servicio')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('/api/marketplace/search', {
        type: searchType,
        product,
        budget,
        location
      })

      setResults(response.data.results)
    } catch (error) {
      console.error('Error en búsqueda:', error)
      alert('Error al realizar la búsqueda')
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
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4">
            <ShoppingCart className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Marketplace Inteligente</h2>
            <p className="text-gray-600">Búsqueda automática de compradores y vendedores</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Búsqueda
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSearchType('buyers')}
                    className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                      searchType === 'buyers'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Compradores
                  </button>
                  <button
                    onClick={() => setSearchType('sellers')}
                    className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                      searchType === 'sellers'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Vendedores
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Producto o Servicio
                </label>
                <input
                  type="text"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  className="input-field"
                  placeholder="Ej: Software de gestión"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Presupuesto (opcional)
                </label>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="input-field"
                  placeholder="Ej: $1000 - $5000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ubicación (opcional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input-field"
                  placeholder="Ej: Ciudad de México"
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Search size={20} />
                <span>{loading ? 'Buscando...' : 'Buscar'}</span>
              </button>
            </div>
          </div>

          <div>
            <div className="bg-gray-50 rounded-xl p-6 h-full overflow-y-auto max-h-[600px]">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados</h3>

              {!results ? (
                <p className="text-gray-500 text-center py-12">
                  Los resultados aparecerán aquí
                </p>
              ) : (
                <div className="space-y-4">
                  {results.map((result, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">{result.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          result.matchScore > 80
                            ? 'bg-green-100 text-green-700'
                            : result.matchScore > 60
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {result.matchScore}% Match
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{result.description}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{result.location}</span>
                        {result.budget && (
                          <span className="font-semibold text-orange-600">{result.budget}</span>
                        )}
                      </div>
                      <button className="mt-3 w-full bg-orange-100 hover:bg-orange-200 text-orange-700 py-2 rounded-lg font-semibold transition-colors">
                        Contactar
                      </button>
                    </div>
                  ))}

                  {results.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      No se encontraron resultados para tu búsqueda
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

export default MarketplaceDemo
