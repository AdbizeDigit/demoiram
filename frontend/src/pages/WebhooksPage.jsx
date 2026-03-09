import { useState, useEffect } from 'react'
import { Webhook, Plus, Edit2, Trash2, Power, CheckCircle, XCircle, Clock, Key, Zap, AlertCircle } from 'lucide-react'

const WebhooksPage = () => {
  const [webhooks, setWebhooks] = useState([])
  const [webhookLogs, setWebhookLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState(null)
  const [selectedWebhookId, setSelectedWebhookId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: {
      new_lead: false,
      lead_qualified: false,
      meeting_scheduled: false,
      deal_won: false,
      deal_lost: false,
      email_sent: false,
      email_replied: false
    },
    secret: ''
  })

  const availableEvents = [
    { key: 'new_lead', label: 'Nuevo Lead Capturado', description: 'Se activa cuando un nuevo lead es capturado por el sistema' },
    { key: 'lead_qualified', label: 'Lead Calificado', description: 'Se activa cuando un lead alcanza el estado "Calificado"' },
    { key: 'meeting_scheduled', label: 'Reunión Agendada', description: 'Se activa cuando se agenda una reunión con un lead' },
    { key: 'deal_won', label: 'Deal Ganado', description: 'Se activa cuando un deal es marcado como ganado' },
    { key: 'deal_lost', label: 'Deal Perdido', description: 'Se activa cuando un deal es marcado como perdido' },
    { key: 'email_sent', label: 'Email Enviado', description: 'Se activa cuando se envía un email a un lead' },
    { key: 'email_replied', label: 'Email Respondido', description: 'Se activa cuando un lead responde a un email' }
  ]

  useEffect(() => {
    loadWebhooks()
  }, [])

  useEffect(() => {
    if (selectedWebhookId) {
      loadWebhookLogs(selectedWebhookId)
    }
  }, [selectedWebhookId])

  const loadWebhooks = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/automation/webhooks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setWebhooks(data.webhooks || [])
      if (data.webhooks?.length > 0 && !selectedWebhookId) {
        setSelectedWebhookId(data.webhooks[0].id)
      }
    } catch (error) {
      console.error('Error loading webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWebhookLogs = async (webhookId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5000/api/automation/webhooks/${webhookId}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setWebhookLogs(data.logs || [])
    } catch (error) {
      console.error('Error loading webhook logs:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const url = editingWebhook
        ? `http://localhost:5000/api/automation/webhooks/${editingWebhook.id}`
        : 'http://localhost:5000/api/automation/webhooks'

      const method = editingWebhook ? 'PUT' : 'POST'

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
        setEditingWebhook(null)
        resetForm()
        loadWebhooks()
      }
    } catch (error) {
      console.error('Error saving webhook:', error)
    }
  }

  const toggleWebhook = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`http://localhost:5000/api/automation/webhooks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: !currentStatus })
      })
      loadWebhooks()
    } catch (error) {
      console.error('Error toggling webhook:', error)
    }
  }

  const deleteWebhook = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este webhook?')) return

    try {
      const token = localStorage.getItem('token')
      await fetch(`http://localhost:5000/api/automation/webhooks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (selectedWebhookId === id) {
        setSelectedWebhookId(null)
      }
      loadWebhooks()
    } catch (error) {
      console.error('Error deleting webhook:', error)
    }
  }

  const openEditModal = (webhook) => {
    setEditingWebhook(webhook)
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      events: {
        new_lead: false,
        lead_qualified: false,
        meeting_scheduled: false,
        deal_won: false,
        deal_lost: false,
        email_sent: false,
        email_replied: false
      },
      secret: ''
    })
  }

  const generateSecret = () => {
    const secret = 'whsec_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    setFormData({ ...formData, secret })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando webhooks...</p>
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Webhooks e Integraciones</h1>
            <p className="text-gray-600">Conecta tu sistema con herramientas externas en tiempo real</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setEditingWebhook(null)
              setShowModal(true)
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
          >
            <Plus className="w-5 h-5" />
            Nuevo Webhook
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Webhooks</span>
              <Webhook className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{webhooks.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Activos</span>
              <Power className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              {webhooks.filter(w => w.enabled).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Eventos Hoy</span>
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {webhookLogs.filter(log => {
                const today = new Date().toDateString()
                return new Date(log.created_at).toDateString() === today
              }).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Tasa de Éxito</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              {webhookLogs.length > 0
                ? `${((webhookLogs.filter(l => l.status === 'success').length / webhookLogs.length) * 100).toFixed(1)}%`
                : '100%'
              }
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Webhooks List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Webhooks Configurados</h2>
            </div>

            {webhooks.length === 0 ? (
              <div className="text-center py-12">
                <Webhook className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No tienes webhooks configurados</p>
                <button
                  onClick={() => {
                    resetForm()
                    setEditingWebhook(null)
                    setShowModal(true)
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crear Primer Webhook
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedWebhookId === webhook.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                    onClick={() => setSelectedWebhookId(webhook.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{webhook.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            webhook.enabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {webhook.enabled ? 'Activo' : 'Pausado'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 font-mono truncate">{webhook.url}</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(webhook.events).filter(key => webhook.events[key]).map(eventKey => (
                            <span key={eventKey} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                              {availableEvents.find(e => e.key === eventKey)?.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleWebhook(webhook.id, webhook.enabled)
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            webhook.enabled
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(webhook)
                          }}
                          className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteWebhook(webhook.id)
                          }}
                          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Webhook Logs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Logs de Eventos</h2>
            </div>

            {selectedWebhookId ? (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {webhookLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay eventos registrados aún</p>
                  </div>
                ) : (
                  webhookLogs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span className="font-medium text-gray-900">{log.event}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString('es-ES')}
                        </span>
                      </div>
                      {log.error && (
                        <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">
                          {log.error}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Webhook className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Selecciona un webhook para ver sus logs</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingWebhook ? 'Editar Webhook' : 'Nuevo Webhook'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del webhook *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ej: Integración con Slack"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL del endpoint *
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      placeholder="https://tu-servidor.com/webhook"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Eventos a escuchar *
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                      {availableEvents.map((event) => (
                        <label key={event.key} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.events[event.key] || false}
                            onChange={(e) => setFormData({
                              ...formData,
                              events: { ...formData.events, [event.key]: e.target.checked }
                            })}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{event.label}</div>
                            <div className="text-xs text-gray-500">{event.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secret (opcional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.secret}
                        onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        placeholder="whsec_..."
                      />
                      <button
                        type="button"
                        onClick={generateSecret}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                      >
                        <Key className="w-4 h-4" />
                        Generar
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Se incluirá en el header X-Webhook-Signature para verificar la autenticidad
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    {editingWebhook ? 'Guardar Cambios' : 'Crear Webhook'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingWebhook(null)
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

export default WebhooksPage
