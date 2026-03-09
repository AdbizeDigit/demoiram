import { useState, useEffect } from 'react'
import { Users, Search, Filter, Mail, Phone, Linkedin, Building, MapPin, TrendingUp, Calendar, MessageSquare, Tag, ChevronDown, X, Eye } from 'lucide-react'

const CRMPage = () => {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [qualityFilter, setQualityFilter] = useState('all')
  const [selectedLead, setSelectedLead] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [newNote, setNewNote] = useState('')

  const statuses = [
    { value: 'new', label: 'Nuevo', color: 'blue' },
    { value: 'contacted', label: 'Contactado', color: 'purple' },
    { value: 'qualified', label: 'Calificado', color: 'yellow' },
    { value: 'meeting_scheduled', label: 'Reunión Agendada', color: 'orange' },
    { value: 'proposal_sent', label: 'Propuesta Enviada', color: 'indigo' },
    { value: 'closed_won', label: 'Ganado', color: 'green' },
    { value: 'closed_lost', label: 'Perdido', color: 'red' }
  ]

  const qualities = [
    { value: 'HOT', label: 'HOT', color: 'red' },
    { value: 'WARM', label: 'WARM', color: 'orange' },
    { value: 'COLD', label: 'COLD', color: 'blue' }
  ]

  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/crm/leads', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`http://localhost:5000/api/crm/leads/${leadId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })
      loadLeads()
    } catch (error) {
      console.error('Error updating lead status:', error)
    }
  }

  const addNote = async () => {
    if (!newNote.trim() || !selectedLead) return

    try {
      const token = localStorage.getItem('token')
      await fetch(`http://localhost:5000/api/crm/leads/${selectedLead.id}/interaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          interaction_type: 'note',
          content: newNote
        })
      })
      setNewNote('')
      setShowNoteModal(false)
      loadLeads()
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.lead_data?.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lead_data?.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lead_data?.email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesQuality = qualityFilter === 'all' || lead.lead_quality === qualityFilter

    return matchesSearch && matchesStatus && matchesQuality
  })

  const getStatusColor = (status) => {
    const statusObj = statuses.find(s => s.value === status)
    return statusObj?.color || 'gray'
  }

  const getQualityColor = (quality) => {
    const qualityObj = qualities.find(q => q.value === quality)
    return qualityObj?.color || 'gray'
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-orange-600 bg-orange-100'
    return 'text-blue-600 bg-blue-100'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando leads...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gestión de Leads</h1>
          <p className="text-gray-600">Administra y da seguimiento a tus leads potenciales</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Leads</span>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{leads.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">HOT</span>
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">
              {leads.filter(l => l.lead_quality === 'HOT').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">WARM</span>
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-600">
              {leads.filter(l => l.lead_quality === 'WARM').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Ganados</span>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              {leads.filter(l => l.status === 'closed_won').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por empresa, contacto o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              {statuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>

            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las calidades</option>
              {qualities.map(quality => (
                <option key={quality.value} value={quality.value}>{quality.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Calidad
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No se encontraron leads con los filtros aplicados
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                            {lead.lead_data?.company?.[0] || 'C'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{lead.lead_data?.company || 'Sin nombre'}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {lead.lead_data?.location || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{lead.lead_data?.contact_name || 'N/A'}</div>
                          <div className="text-gray-500 flex items-center gap-2 mt-1">
                            {lead.lead_data?.email && (
                              <span className="flex items-center gap-1 text-xs">
                                <Mail className="w-3 h-3" />
                                {lead.lead_data.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(lead.lead_score)}`}>
                          {lead.lead_score || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${getQualityColor(lead.lead_quality)}-100 text-${getQualityColor(lead.lead_quality)}-700`}>
                          {lead.lead_quality || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border-0 cursor-pointer bg-${getStatusColor(lead.status)}-100 text-${getStatusColor(lead.status)}-700`}
                        >
                          {statuses.map(status => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedLead(lead)
                              setShowDetailModal(true)
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLead(lead)
                              setShowNoteModal(true)
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Agregar nota"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Detalles del Lead</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-3">Información de la Empresa</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{selectedLead.lead_data?.company}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{selectedLead.lead_data?.location}</span>
                      </div>
                      {selectedLead.lead_data?.industry && (
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{selectedLead.lead_data.industry}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-3">Información de Contacto</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{selectedLead.lead_data?.contact_name}</span>
                      </div>
                      {selectedLead.lead_data?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <a href={`mailto:${selectedLead.lead_data.email}`} className="text-sm text-blue-600 hover:underline">
                            {selectedLead.lead_data.email}
                          </a>
                        </div>
                      )}
                      {selectedLead.lead_data?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{selectedLead.lead_data.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedLead.lead_data?.description && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Descripción</h3>
                    <p className="text-sm text-gray-700">{selectedLead.lead_data.description}</p>
                  </div>
                )}

                {selectedLead.lead_data?.buying_signals && selectedLead.lead_data.buying_signals.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Señales de Compra</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedLead.lead_data.buying_signals.map((signal, idx) => (
                        <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Score</div>
                    <div className="text-2xl font-bold text-gray-900">{selectedLead.lead_score}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Calidad</div>
                    <div className="text-2xl font-bold text-gray-900">{selectedLead.lead_quality}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Estado</div>
                    <div className="text-sm font-semibold text-gray-900">{statuses.find(s => s.value === selectedLead.status)?.label}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Note Modal */}
        {showNoteModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Agregar Nota</h2>
                <button
                  onClick={() => {
                    setShowNoteModal(false)
                    setNewNote('')
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Escribe una nota sobre este lead..."
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={addNote}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Guardar Nota
                  </button>
                  <button
                    onClick={() => {
                      setShowNoteModal(false)
                      setNewNote('')
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CRMPage
