import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, Edit3, Trash2, Star, Mail, MessageSquare,
  ToggleLeft, ToggleRight, X, Save, Eye, Send, Loader2,
  User, Briefcase, Building, Phone, Link, FileText, Palette,
  Smile, Hash, ChevronRight, RefreshCw, Copy, Check, AlertCircle,
  Calendar, Linkedin, Zap
} from 'lucide-react'
import api from '../services/api'

const TONE_CONFIG = {
  professional: { label: 'Profesional', gradient: 'from-blue-400 to-blue-600', bg: 'bg-blue-100 text-blue-700', color: 'blue' },
  friendly: { label: 'Amigable', gradient: 'from-emerald-400 to-emerald-600', bg: 'bg-emerald-100 text-emerald-700', color: 'emerald' },
  casual: { label: 'Casual', gradient: 'from-amber-400 to-amber-600', bg: 'bg-amber-100 text-amber-700', color: 'amber' },
  authoritative: { label: 'Autoritario', gradient: 'from-purple-400 to-purple-600', bg: 'bg-purple-100 text-purple-700', color: 'purple' },
  empathetic: { label: 'Empático', gradient: 'from-pink-400 to-pink-600', bg: 'bg-pink-100 text-pink-700', color: 'pink' },
}

const FORMALITY_OPTIONS = [
  { value: 'very_formal', label: 'Muy Formal' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'very_casual', label: 'Muy Casual' },
]

const EMOJI_OPTIONS = [
  { value: 'none', label: 'Ninguno' },
  { value: 'minimal', label: 'Mínimo' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'heavy', label: 'Abundante' },
]

const SIGNATURE_TEMPLATES = {
  simple: (a) => `<div style="font-family:Arial,sans-serif;font-size:13px;color:#333;">
<p style="margin:0;font-weight:bold;">${a.name || 'Nombre'}</p>
<p style="margin:0;color:#666;">${a.role || 'Sales Representative'} | ${a.company || 'Adbize'}</p>
<p style="margin:4px 0 0;color:#888;">${a.email || ''} ${a.phone ? '| ' + a.phone : ''}</p>
</div>`,
  with_photo: (a) => `<div style="font-family:Arial,sans-serif;font-size:13px;color:#333;display:flex;align-items:center;gap:12px;">
${a.photo_url ? `<img src="${a.photo_url}" alt="${a.name}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;" />` : ''}
<div>
<p style="margin:0;font-weight:bold;">${a.name || 'Nombre'}</p>
<p style="margin:0;color:#666;">${a.role || 'Sales Representative'} | ${a.company || 'Adbize'}</p>
<p style="margin:4px 0 0;color:#888;">${a.email || ''} ${a.phone ? '| ' + a.phone : ''}</p>
${a.linkedin_url ? `<p style="margin:2px 0 0;"><a href="${a.linkedin_url}" style="color:#0077B5;">LinkedIn</a></p>` : ''}
</div>
</div>`,
  corporate: (a) => `<div style="font-family:Arial,sans-serif;font-size:13px;color:#333;border-top:3px solid #2563eb;padding-top:12px;margin-top:12px;">
<p style="margin:0;font-weight:bold;font-size:15px;color:#1e40af;">${a.name || 'Nombre'}</p>
<p style="margin:2px 0;color:#666;">${a.role || 'Sales Representative'}</p>
<p style="margin:0;font-weight:600;color:#1e40af;">${a.company || 'Adbize'}</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0;" />
<p style="margin:0;font-size:12px;color:#888;">
${a.email ? `Email: ${a.email}` : ''}${a.phone ? ` | Tel: ${a.phone}` : ''}
</p>
${a.linkedin_url ? `<p style="margin:4px 0 0;font-size:12px;"><a href="${a.linkedin_url}" style="color:#0077B5;">LinkedIn</a></p>` : ''}
${a.calendar_url ? `<p style="margin:2px 0 0;font-size:12px;"><a href="${a.calendar_url}" style="color:#2563eb;">Agendar reunión</a></p>` : ''}
</div>`,
}

const EMPTY_AVATAR = {
  name: '',
  role: 'Sales Representative',
  company: 'Adbize',
  email: '',
  phone: '',
  photo_url: '',
  bio: '',
  linkedin_url: '',
  calendar_url: '',
  personality: '',
  system_prompt: '',
  tone: 'professional',
  formality: 'formal',
  emoji_usage: 'minimal',
  greeting_style: '',
  farewell_style: '',
  specialties: [],
  email_signature_html: '',
  is_active: true,
  is_default: false,
}

export default function AvatarsPage() {
  const [avatars, setAvatars] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAvatar, setEditingAvatar] = useState(null)
  const [formData, setFormData] = useState({ ...EMPTY_AVATAR })
  const [activeTab, setActiveTab] = useState('identity')
  const [saving, setSaving] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [notification, setNotification] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [specialtyInput, setSpecialtyInput] = useState('')

  // Preview & Test state
  const [previewSector, setPreviewSector] = useState('tecnologia')
  const [previewCompany, setPreviewCompany] = useState('Empresa Demo SA')
  const [emailPreview, setEmailPreview] = useState(null)
  const [whatsappPreview, setWhatsappPreview] = useState(null)
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [generatingWhatsapp, setGeneratingWhatsapp] = useState(false)

  // Assignment state
  const [defaultAvatarId, setDefaultAvatarId] = useState(null)
  const [emailAvatarId, setEmailAvatarId] = useState(null)
  const [whatsappAvatarId, setWhatsappAvatarId] = useState(null)

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }, [])

  // ── Load Data ──

  const loadAvatars = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/avatars')
      const data = res.data?.avatars || res.data || []
      setAvatars(data)
      const def = data.find(a => a.is_default)
      if (def) setDefaultAvatarId(def.id)
    } catch (err) {
      console.error('Error loading avatars:', err)
      setAvatars([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAvatars()
  }, [loadAvatars])

  // ── CRUD ──

  const openCreateModal = () => {
    setEditingAvatar(null)
    setFormData({ ...EMPTY_AVATAR })
    setActiveTab('identity')
    setEmailPreview(null)
    setWhatsappPreview(null)
    setModalOpen(true)
  }

  const openEditModal = (avatar) => {
    setEditingAvatar(avatar)
    setFormData({
      ...EMPTY_AVATAR,
      ...avatar,
      specialties: avatar.specialties || [],
    })
    setActiveTab('identity')
    setEmailPreview(null)
    setWhatsappPreview(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingAvatar(null)
    setFormData({ ...EMPTY_AVATAR })
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showNotification('El nombre es obligatorio', 'error')
      return
    }
    setSaving(true)
    try {
      // Clean up local blob URL before saving
      const saveData = { ...formData }
      if (saveData.photo_url?.startsWith('blob:')) saveData.photo_url = ''
      delete saveData._pendingFile

      if (editingAvatar) {
        await api.put(`/api/avatars/${editingAvatar.id}`, saveData)
        showNotification('Avatar actualizado correctamente')
      } else {
        const res = await api.post('/api/avatars', saveData)
        const newId = res.data?.avatar?.id
        // Upload pending photo for new avatar
        if (newId && formData._pendingFile) {
          const fd = new FormData()
          fd.append('photo', formData._pendingFile)
          try {
            await api.post(`/api/avatars/${newId}/upload-photo`, fd, {
              headers: { 'Content-Type': 'multipart/form-data' }
            })
          } catch {}
        }
        showNotification('Avatar creado correctamente')
      }
      closeModal()
      loadAvatars()
    } catch (err) {
      console.error('Error saving avatar:', err)
      showNotification(err.response?.data?.error || 'Error al guardar avatar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/avatars/${id}`)
      showNotification('Avatar eliminado')
      setDeleteConfirm(null)
      loadAvatars()
    } catch (err) {
      console.error('Error deleting avatar:', err)
      showNotification('Error al eliminar avatar', 'error')
    }
  }

  const handleToggleActive = async (avatar) => {
    try {
      await api.put(`/api/avatars/${avatar.id}`, { ...avatar, is_active: !avatar.is_active })
      loadAvatars()
    } catch (err) {
      console.error('Error toggling avatar:', err)
      showNotification('Error al cambiar estado', 'error')
    }
  }

  const handleSetDefault = async (id) => {
    try {
      await api.post(`/api/avatars/${id}/set-default`)
      showNotification('Avatar establecido como predeterminado')
      setDefaultAvatarId(id)
      loadAvatars()
    } catch (err) {
      console.error('Error setting default:', err)
      showNotification('Error al establecer predeterminado', 'error')
    }
  }

  // ── Test/Preview ──

  const handleTestEmail = async (avatarId) => {
    try {
      showNotification('Generando email de prueba...')
      await api.post(`/api/avatars/${avatarId}/generate-email`, {
        sector: previewSector,
        company_name: previewCompany,
      })
      showNotification('Email de prueba generado')
    } catch (err) {
      showNotification('Error generando email', 'error')
    }
  }

  const handleTestWhatsapp = async (avatarId) => {
    try {
      showNotification('Generando WhatsApp de prueba...')
      await api.post(`/api/avatars/${avatarId}/generate-whatsapp`, {
        sector: previewSector,
        company_name: previewCompany,
      })
      showNotification('WhatsApp de prueba generado')
    } catch (err) {
      showNotification('Error generando WhatsApp', 'error')
    }
  }

  const generateEmailPreview = async () => {
    if (!editingAvatar?.id) return
    setGeneratingEmail(true)
    try {
      const res = await api.post(`/api/avatars/${editingAvatar.id}/generate-email`, {
        sector: previewSector,
        company_name: previewCompany,
      })
      setEmailPreview(res.data)
    } catch (err) {
      showNotification('Error generando preview de email', 'error')
    } finally {
      setGeneratingEmail(false)
    }
  }

  const generateWhatsappPreview = async () => {
    if (!editingAvatar?.id) return
    setGeneratingWhatsapp(true)
    try {
      const res = await api.post(`/api/avatars/${editingAvatar.id}/generate-whatsapp`, {
        sector: previewSector,
        company_name: previewCompany,
      })
      setWhatsappPreview(res.data)
    } catch (err) {
      showNotification('Error generando preview de WhatsApp', 'error')
    } finally {
      setGeneratingWhatsapp(false)
    }
  }

  // ── Specialty Tags ──

  const addSpecialty = () => {
    const tag = specialtyInput.trim()
    if (tag && !formData.specialties.includes(tag)) {
      setFormData(prev => ({ ...prev, specialties: [...prev.specialties, tag] }))
    }
    setSpecialtyInput('')
  }

  const removeSpecialty = (tag) => {
    setFormData(prev => ({ ...prev, specialties: prev.specialties.filter(t => t !== tag) }))
  }

  // ── Helpers ──

  const getInitials = (name) => {
    if (!name) return '??'
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  const getToneConfig = (tone) => TONE_CONFIG[tone] || TONE_CONFIG.professional

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-500 text-lg">Cargando avatares...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {notification.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Avatares IA</h1>
            <p className="text-sm text-gray-500">Gestiona tus representantes virtuales de ventas</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Crear Avatar
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avatars.length}</p>
              <p className="text-xs text-gray-500">Avatares totales</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <ToggleRight className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avatars.filter(a => a.is_active).length}</p>
              <p className="text-xs text-gray-500">Activos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Mail className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avatars.reduce((sum, a) => sum + (a.emails_sent || 0), 0)}</p>
              <p className="text-xs text-gray-500">Emails enviados</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avatars.reduce((sum, a) => sum + (a.whatsapp_sent || 0), 0)}</p>
              <p className="text-xs text-gray-500">WhatsApp enviados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Grid */}
      {avatars.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay avatares creados</h3>
          <p className="text-gray-500 mb-6">Crea tu primer avatar IA para empezar a enviar mensajes personalizados.</p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Crear primer avatar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {avatars.map(avatar => {
            const tone = getToneConfig(avatar.tone)
            return (
              <div key={avatar.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                {/* Gradient Top Border */}
                <div className={`h-1.5 bg-gradient-to-r ${tone.gradient}`} />

                <div className="p-5">
                  {/* Avatar Header */}
                  <div className="flex items-start gap-4 mb-4">
                    {avatar.photo_url ? (
                      <img
                        src={avatar.photo_url}
                        alt={avatar.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-14 h-14 rounded-full bg-gradient-to-br ${tone.gradient} flex items-center justify-center text-white font-bold text-lg`}
                      style={{ display: avatar.photo_url ? 'none' : 'flex' }}
                    >
                      {getInitials(avatar.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{avatar.name}</h3>
                        {avatar.is_default && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3" /> Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{avatar.role || 'Sales Representative'}</p>
                      <p className="text-sm text-gray-400 truncate">{avatar.company || 'Adbize'}</p>
                    </div>
                  </div>

                  {/* Tone Badge + Active Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${tone.bg}`}>
                      {tone.label}
                    </span>
                    <button
                      onClick={() => handleToggleActive(avatar)}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      {avatar.is_active ? (
                        <>
                          <ToggleRight className="w-6 h-6 text-green-500" />
                          <span className="text-green-600 font-medium">Activo</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-6 h-6 text-gray-400" />
                          <span className="text-gray-400 font-medium">Inactivo</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4 bg-gray-50 rounded-xl p-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{avatar.emails_sent || 0}</p>
                      <p className="text-xs text-gray-500">Emails</p>
                    </div>
                    <div className="text-center border-x border-gray-200">
                      <p className="text-lg font-bold text-gray-900">{avatar.whatsapp_sent || 0}</p>
                      <p className="text-xs text-gray-500">WhatsApp</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{(avatar.emails_sent || 0) + (avatar.whatsapp_sent || 0)}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => handleTestEmail(avatar.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Test Email
                    </button>
                    <button
                      onClick={() => handleTestWhatsapp(avatar.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-medium"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Test WhatsApp
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openEditModal(avatar)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      <Edit3 className="w-4 h-4" />
                      Editar
                    </button>
                    {!avatar.is_default && (
                      <button
                        onClick={() => handleSetDefault(avatar.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors text-sm font-medium"
                        title="Establecer como predeterminado"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(avatar.id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Avatar Assignment Section */}
      {avatars.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Asignacion de Avatares</h2>
          <p className="text-sm text-gray-500 mb-5">Configura qué avatar maneja cada canal de comunicacion</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Default Avatar */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="font-medium text-gray-700 text-sm">Avatar por Defecto</span>
              </div>
              <select
                value={defaultAvatarId || ''}
                onChange={(e) => {
                  const id = e.target.value
                  if (id) handleSetDefault(parseInt(id))
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin asignar</option>
                {avatars.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                ))}
              </select>
              {defaultAvatarId && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Asignado: {avatars.find(a => a.id === defaultAvatarId)?.name}
                </p>
              )}
            </div>

            {/* Email Avatar */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-gray-700 text-sm">Avatar para Email</span>
              </div>
              <select
                value={emailAvatarId || ''}
                onChange={(e) => setEmailAvatarId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Usar avatar por defecto</option>
                {avatars.filter(a => a.is_active).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-2">Se usa para campañas de email</p>
            </div>

            {/* WhatsApp Avatar */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span className="font-medium text-gray-700 text-sm">Avatar para WhatsApp</span>
              </div>
              <select
                value={whatsappAvatarId || ''}
                onChange={(e) => setWhatsappAvatarId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Usar avatar por defecto</option>
                {avatars.filter(a => a.is_active).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-2">Se usa para mensajes de WhatsApp</p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar Avatar</h3>
            <p className="text-sm text-gray-500 mb-5">
              ¿Estás seguro de que deseas eliminar este avatar? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 shadow-xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingAvatar ? `Editar: ${editingAvatar.name}` : 'Crear Avatar'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              {[
                { key: 'identity', label: 'Identidad', icon: User },
                { key: 'personality', label: 'Personalidad', icon: Palette },
                { key: 'signature', label: 'Firma Email', icon: FileText },
                { key: 'preview', label: 'Preview & Test', icon: Eye },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Tab 1: Identidad */}
              {activeTab === 'identity' && (
                <div className="space-y-4">
                  {/* Photo Preview */}
                  <div className="flex items-center gap-4 mb-2">
                    {formData.photo_url ? (
                      <img
                        src={formData.photo_url}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                        {getInitials(formData.name)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-700">{formData.name || 'Nuevo Avatar'}</p>
                      <p className="text-sm text-gray-400">{formData.role || 'Sales Representative'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="María García"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        placeholder="Sales Representative"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="Adbize"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="maria@adbize.com"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+54 11 1234-5678"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Foto de Perfil</label>
                      <div className="flex items-start gap-3">
                        {/* Preview */}
                        <div className="flex-shrink-0">
                          {formData.photo_url ? (
                            <img src={formData.photo_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" onError={(e) => { e.target.style.display = 'none' }} />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500">
                              <User className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          {/* File upload */}
                          <label className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium cursor-pointer hover:bg-emerald-100 transition-colors border border-emerald-200">
                            <Plus className="w-4 h-4" />
                            Subir Imagen
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                // If editing existing avatar, upload immediately
                                if (editingAvatar && editingAvatar.id) {
                                  const fd = new FormData()
                                  fd.append('photo', file)
                                  try {
                                    const res = await api.post(`/api/avatars/${editingAvatar.id}/upload-photo`, fd, {
                                      headers: { 'Content-Type': 'multipart/form-data' }
                                    })
                                    if (res.data?.photoUrl) {
                                      setFormData(prev => ({ ...prev, photo_url: res.data.photoUrl }))
                                    }
                                  } catch (err) {
                                    console.error('Upload error:', err)
                                  }
                                } else {
                                  // For new avatars, use local preview URL
                                  const localUrl = URL.createObjectURL(file)
                                  setFormData(prev => ({ ...prev, photo_url: localUrl, _pendingFile: file }))
                                }
                              }}
                            />
                          </label>
                          {/* URL fallback */}
                          <input
                            type="url"
                            value={formData.photo_url || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, photo_url: e.target.value }))}
                            placeholder="O pegar URL de imagen..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-[10px] text-gray-400">Esta imagen aparecera en los emails enviados por este avatar.</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                      <input
                        type="url"
                        value={formData.linkedin_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                        placeholder="https://linkedin.com/in/maria-garcia"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">URL de calendario/agenda</label>
                      <input
                        type="url"
                        value={formData.calendar_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, calendar_url: e.target.value }))}
                        placeholder="https://calendly.com/maria-garcia"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Breve descripción del avatar para contexto interno..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Personalidad */}
              {activeTab === 'personality' && (
                <div className="space-y-4">
                  {/* AI Auto-Generate Button */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-indigo-700 flex items-center gap-1.5">
                          <Star className="w-4 h-4" /> Generar Personalidad con IA
                        </p>
                        <p className="text-xs text-indigo-500 mt-0.5">Completa automaticamente personalidad, system prompt, tono, saludos y especialidades</p>
                      </div>
                      <button
                        onClick={async () => {
                          setGeneratingAI(true)
                          try {
                            const res = await api.post('/api/avatars/generate-personality', {
                              name: formData.name,
                              role: formData.role,
                              company: formData.company,
                              bio: formData.bio,
                              tone: formData.tone,
                            })
                            if (res.data?.generated) {
                              const g = res.data.generated
                              setFormData(prev => ({
                                ...prev,
                                personality: g.personality || prev.personality,
                                system_prompt: g.system_prompt || prev.system_prompt,
                                tone: g.tone || prev.tone,
                                formality: g.formality || prev.formality,
                                emoji_usage: g.emoji_usage || prev.emoji_usage,
                                greeting_style: g.greeting_style || prev.greeting_style,
                                closing_style: g.closing_style || g.farewell_style || prev.closing_style,
                                farewell_style: g.farewell_style || g.closing_style || prev.farewell_style,
                                specialties: g.specialties || prev.specialties,
                                bio: g.bio || prev.bio,
                              }))
                              showNotification('Personalidad generada con IA')
                            }
                          } catch (err) {
                            showNotification(err.response?.data?.error || 'Error generando con IA', 'error')
                          }
                          setGeneratingAI(false)
                        }}
                        disabled={generatingAI || !formData.name}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {generatingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {generatingAI ? 'Generando...' : 'Generar con IA'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Personalidad</label>
                    <textarea
                      value={formData.personality}
                      onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value }))}
                      placeholder="Soy un profesional amigable que se enfoca en entender las necesidades del cliente antes de ofrecer soluciones..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                    <p className="text-xs text-gray-400 mb-1">Esta es la instrucción central que define cómo la IA se comporta como este avatar.</p>
                    <textarea
                      value={formData.system_prompt}
                      onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                      placeholder="Eres un representante comercial experimentado de Adbize. Tu objetivo es generar interés en los servicios de la empresa sin ser invasivo. Siempre personaliza tus mensajes basándote en la información del prospecto..."
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tono</label>
                      <select
                        value={formData.tone}
                        onChange={(e) => setFormData(prev => ({ ...prev, tone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(TONE_CONFIG).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Formalidad</label>
                      <select
                        value={formData.formality}
                        onChange={(e) => setFormData(prev => ({ ...prev, formality: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {FORMALITY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Uso de emojis</label>
                      <select
                        value={formData.emoji_usage}
                        onChange={(e) => setFormData(prev => ({ ...prev, emoji_usage: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {EMOJI_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estilo de saludo</label>
                      <input
                        type="text"
                        value={formData.greeting_style}
                        onChange={(e) => setFormData(prev => ({ ...prev, greeting_style: e.target.value }))}
                        placeholder="Hola! / Buen dia / Estimado/a"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estilo de despedida</label>
                      <input
                        type="text"
                        value={formData.farewell_style}
                        onChange={(e) => setFormData(prev => ({ ...prev, farewell_style: e.target.value }))}
                        placeholder="Saludos cordiales / Abrazo / Un saludo"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Specialties Tag Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Especialidades</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={specialtyInput}
                        onChange={(e) => setSpecialtyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addSpecialty()
                          }
                        }}
                        placeholder="Agregar especialidad y presionar Enter"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={addSpecialty}
                        className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(formData.specialties || []).map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                        >
                          <Hash className="w-3 h-3" />
                          {tag}
                          <button onClick={() => removeSpecialty(tag)} className="ml-0.5 hover:text-blue-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {(!formData.specialties || formData.specialties.length === 0) && (
                        <p className="text-xs text-gray-400">Sin especialidades agregadas</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Firma Email */}
              {activeTab === 'signature' && (
                <div className="space-y-4">
                  {/* Template Buttons */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Plantillas rapidas</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, email_signature_html: SIGNATURE_TEMPLATES.simple(prev) }))}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                      >
                        Firma Simple
                      </button>
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, email_signature_html: SIGNATURE_TEMPLATES.with_photo(prev) }))}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                      >
                        Firma con Foto
                      </button>
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, email_signature_html: SIGNATURE_TEMPLATES.corporate(prev) }))}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                      >
                        Firma Corporativa
                      </button>
                    </div>
                  </div>

                  {/* HTML Editor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HTML de la firma</label>
                    <textarea
                      value={formData.email_signature_html}
                      onChange={(e) => setFormData(prev => ({ ...prev, email_signature_html: e.target.value }))}
                      placeholder="<div>Tu firma HTML aqui...</div>"
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                    />
                  </div>

                  {/* Signature Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vista previa</label>
                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 min-h-[80px]">
                      {formData.email_signature_html ? (
                        <div dangerouslySetInnerHTML={{ __html: formData.email_signature_html }} />
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">
                          Escribe HTML arriba o selecciona una plantilla para ver la vista previa
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Preview & Test */}
              {activeTab === 'preview' && (
                <div className="space-y-4">
                  {!editingAvatar ? (
                    <div className="text-center py-8">
                      <Eye className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Guarda el avatar primero para poder generar previews.</p>
                    </div>
                  ) : (
                    <>
                      {/* Scenario Config */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Escenario de prueba</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Sector del lead</label>
                            <select
                              value={previewSector}
                              onChange={(e) => setPreviewSector(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="tecnologia">Tecnología</option>
                              <option value="salud">Salud</option>
                              <option value="educacion">Educación</option>
                              <option value="finanzas">Finanzas</option>
                              <option value="retail">Retail</option>
                              <option value="inmobiliaria">Inmobiliaria</option>
                              <option value="gastronomia">Gastronomía</option>
                              <option value="servicios">Servicios</option>
                              <option value="manufactura">Manufactura</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Empresa del lead</label>
                            <input
                              type="text"
                              value={previewCompany}
                              onChange={(e) => setPreviewCompany(e.target.value)}
                              placeholder="Empresa Demo SA"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Generate Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={generateEmailPreview}
                          disabled={generatingEmail}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
                        >
                          {generatingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                          Generar Email Preview
                        </button>
                        <button
                          onClick={generateWhatsappPreview}
                          disabled={generatingWhatsapp}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium"
                        >
                          {generatingWhatsapp ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                          Generar WhatsApp Preview
                        </button>
                      </div>

                      {/* Previews Side by Side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Email Preview */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-blue-50 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
                            <Mail className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-blue-700">Email Preview</span>
                          </div>
                          <div className="p-4 min-h-[200px]">
                            {emailPreview ? (
                              <div className="space-y-3">
                                {emailPreview.subject && (
                                  <div>
                                    <p className="text-xs text-gray-500">Asunto:</p>
                                    <p className="text-sm font-medium text-gray-900">{emailPreview.subject}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Cuerpo:</p>
                                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                                    {emailPreview.body || emailPreview.content || emailPreview.message || JSON.stringify(emailPreview, null, 2)}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 text-center py-8">
                                Haz clic en "Generar Email Preview" para ver cómo escribiría este avatar
                              </p>
                            )}
                          </div>
                        </div>

                        {/* WhatsApp Preview */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-emerald-50 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
                            <MessageSquare className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-700">WhatsApp Preview</span>
                          </div>
                          <div className="p-4 min-h-[200px]">
                            {whatsappPreview ? (
                              <div className="bg-emerald-50 rounded-xl p-4">
                                <div className="bg-white rounded-lg p-3 shadow-sm max-w-[85%]">
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                    {whatsappPreview.message || whatsappPreview.content || whatsappPreview.body || JSON.stringify(whatsappPreview, null, 2)}
                                  </p>
                                  <p className="text-xs text-gray-400 text-right mt-1">
                                    {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 text-center py-8">
                                Haz clic en "Generar WhatsApp Preview" para ver cómo escribiría este avatar
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingAvatar ? 'Guardar Cambios' : 'Crear Avatar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
