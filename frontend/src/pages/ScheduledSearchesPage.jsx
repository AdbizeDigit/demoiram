import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Users, TrendingUp, Plus, Edit2, Trash2, Power, Settings } from 'lucide-react'

const ScheduledSearchesPage = () => {
  const [searches, setSearches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSearch, setEditingSearch] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    industry: '',
    min_employees: '',
    max_employees: '',
    schedule: 'daily',
    min_lead_score: 70,
    notify_email: '',
    webhook_url: ''
  })

  useEffect(() => {
    loadScheduledSearches()
  }, [])

  const loadScheduledSearches = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/automation/scheduled-searches', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setSearches(data.searches || [])
    } catch (error) {
      console.error('Error loading scheduled searches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const url = editingSearch
        ? `http://localhost:5000/api/automation/scheduled-searches/${editingSearch.id}`
        : 'http://localhost:5000/api/automation/scheduled-searches'

      const method = editingSearch ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowModal(false)
        setEditingSearch(null)
        resetForm()
        loadScheduledSearches()
      }
    } catch (error) {
      console.error('Error saving search:', error)
    }
  }

  const toggleSearch = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`http://localhost:5000/api/automation/scheduled-searches/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: !currentStatus })
      })
      loadScheduledSearches()
    } catch (error) {
      console.error('Error toggling search:', error)
    }
  }

  const deleteSearch = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta búsqueda programada?')) return

    try {
      const token = localStorage.getItem('token')
      await fetch(`http://localhost:5000/api/automation/scheduled-searches/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      loadScheduledSearches()
    } catch (error) {
      console.error('Error deleting search:', error)
    }
  }

  const openEditModal = (search) => {
    setEditingSearch(search)
    setFormData({
      name: search.name,
      location: search.location,
      industry: search.industry || '',
      min_employees: search.min_employees || '',
      max_employees: search.max_employees || '',
      schedule: search.schedule,
      min_lead_score: search.min_lead_score,
      notify_email: search.notify_email || '',
      webhook_url: search.webhook_url || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      industry: '',
      min_employees: '',
      max_employees: '',
      schedule: 'daily',
      min_lead_score: 70,
      notify_email: '',
      webhook_url: ''
    })
  }

  const getScheduleLabel = (schedule) => {
    const labels = {
      'every_hour': 'Cada hora',
      'every_4_hours': 'Cada 4 horas',
      'daily': 'Diario',
      'weekly': 'Semanal',
      'monthly': 'Mensual'
    }
    return labels[schedule] || schedule
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando búsquedas programadas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Búsquedas Programadas</h1>
            <p className="text-gray-600">Automatiza la búsqueda de leads potenciales</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setEditingSearch(null)
              setShowModal(true)
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
          >
            <Plus className="w-5 h-5" />
            Nueva Búsqueda
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Búsquedas</span>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{searches.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Activas</span>
              <Power className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              {searches.filter(s => s.enabled).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Pausadas</span>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-600">
              {searches.filter(s => !s.enabled).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Leads/Día (Prom)</span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">47</p>
          </div>
        </div>

        {/* Searches List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Búsquedas Configuradas</h2>
          </div>

          {searches.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No tienes búsquedas programadas aún</p>
              <button
                onClick={() => {
                  resetForm()
                  setEditingSearch(null)
                  setShowModal(true)
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Crear Primera Búsqueda
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {searches.map((search) => (
                <div key={search.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{search.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          search.enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {search.enabled ? 'Activa' : 'Pausada'}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {getScheduleLabel(search.schedule)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          {search.location}
                        </div>
                        {search.industry && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Settings className="w-4 h-4" />
                            {search.industry}
                          </div>
                        )}
                        {(search.min_employees || search.max_employees) && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            {search.min_employees && search.max_employees
                              ? `${search.min_employees}-${search.max_employees} empleados`
                              : search.min_employees
                              ? `${search.min_employees}+ empleados`
                              : `Hasta ${search.max_employees} empleados`
                            }
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <TrendingUp className="w-4 h-4" />
                          Score mín: {search.min_lead_score}
                        </div>
                      </div>

                      {search.created_at && (
                        <p className="text-xs text-gray-500">
                          Creada: {new Date(search.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleSearch(search.id, search.enabled)}
                        className={`p-2 rounded-lg transition-colors ${
                          search.enabled
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={search.enabled ? 'Pausar' : 'Activar'}
                      >
                        <Power className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openEditModal(search)}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteSearch(search.id)}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingSearch ? 'Editar Búsqueda' : 'Nueva Búsqueda Programada'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la búsqueda *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ej: Empresas Tech en Madrid"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ubicación *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="ej: Madrid, España"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Industria
                      </label>
                      <input
                        type="text"
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="ej: Software, SaaS, E-commerce"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Empleados mínimos
                      </label>
                      <input
                        type="number"
                        value={formData.min_employees}
                        onChange={(e) => setFormData({ ...formData, min_employees: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="ej: 10"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Empleados máximos
                      </label>
                      <input
                        type="number"
                        value={formData.max_employees}
                        onChange={(e) => setFormData({ ...formData, max_employees: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="ej: 500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frecuencia *
                      </label>
                      <select
                        required
                        value={formData.schedule}
                        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="every_hour">Cada hora</option>
                        <option value="every_4_hours">Cada 4 horas</option>
                        <option value="daily">Diario</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Score mínimo (0-100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.min_lead_score}
                        onChange={(e) => setFormData({ ...formData, min_lead_score: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email de notificaciones
                    </label>
                    <input
                      type="email"
                      value={formData.notify_email}
                      onChange={(e) => setFormData({ ...formData, notify_email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Webhook URL
                    </label>
                    <input
                      type="url"
                      value={formData.webhook_url}
                      onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://tu-webhook.com/endpoint"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    {editingSearch ? 'Guardar Cambios' : 'Crear Búsqueda'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingSearch(null)
                      resetForm()
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScheduledSearchesPage
