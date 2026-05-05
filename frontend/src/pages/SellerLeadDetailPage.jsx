import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Mail, MessageCircle, Phone, Globe, Linkedin, MapPin, Tag, Hash, Sparkles, UserPlus, UserMinus } from 'lucide-react'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import LinkedInResearchPanel from '../components/seller/LinkedInResearchPanel'
import CallLogPanel from '../components/seller/CallLogPanel'
import AIFollowUpPanel from '../components/seller/AIFollowUpPanel'

const STAGE_CFG = {
  NUEVO:           { label: 'Nuevo',           bg: 'bg-gray-100',     text: 'text-gray-700' },
  CONTACTADO:      { label: 'Contactado',      bg: 'bg-blue-100',     text: 'text-blue-700' },
  EN_CONVERSACION: { label: 'En conversación', bg: 'bg-amber-100',    text: 'text-amber-700' },
  PROPUESTA:       { label: 'Propuesta',       bg: 'bg-purple-100',   text: 'text-purple-700' },
  NEGOCIACION:     { label: 'Negociación',     bg: 'bg-indigo-100',   text: 'text-indigo-700' },
  GANADO:          { label: 'Ganado',          bg: 'bg-emerald-100',  text: 'text-emerald-700' },
  PERDIDO:         { label: 'Perdido',         bg: 'bg-red-100',      text: 'text-red-700' },
}

function normalizeStage(s) {
  if (!s) return 'NUEVO'
  const u = String(s).toUpperCase().replace(/\s+/g, '_')
  return STAGE_CFG[u] ? u : 'NUEVO'
}

export default function SellerLeadDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingStage, setUpdatingStage] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get(`/api/scraping-engine/leads/${id}`)
      const raw = res.data?.data || res.data?.lead || res.data
      setLead(raw)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cargar el lead')
    } finally {
      setLoading(false)
    }
  }, [id])
  useEffect(() => { load() }, [load])

  async function changeStage(newStage) {
    setUpdatingStage(true)
    try {
      await api.patch(`/api/scraping-engine/leads/${id}`, { status: newStage })
      await load()
    } catch (err) {
      alert('Error al actualizar etapa')
    } finally {
      setUpdatingStage(false)
    }
  }

  async function claim() {
    setClaiming(true)
    try {
      await api.post(`/api/seller/leads/${id}/claim`)
      await load()
    } catch (err) {
      alert(err?.response?.data?.message || 'No se pudo reclamar')
    } finally {
      setClaiming(false)
    }
  }

  async function release() {
    setClaiming(true)
    try {
      await api.post(`/api/seller/leads/${id}/release`)
      await load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Error al liberar')
    } finally {
      setClaiming(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
  if (error || !lead) return <div className="text-center text-sm text-red-600 py-12">{error || 'Lead no encontrado'}</div>

  const stage = normalizeStage(lead.status)
  const stageCfg = STAGE_CFG[stage]
  const isMine = lead.assigned_seller_id === user?.id
  const isUnassigned = !lead.assigned_seller_id

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-200">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{lead.name || lead.company}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${stageCfg.bg} ${stageCfg.text}`}>
                {stageCfg.label}
              </span>
              {lead.score != null && (
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[11px] font-bold">
                  Score {lead.score}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
              {lead.sector && <span className="flex items-center gap-1 capitalize"><Tag className="w-3 h-3" />{lead.sector}</span>}
              {lead.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.city}</span>}
              {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline"><Globe className="w-3 h-3" />Web</a>}
              {lead.social_linkedin && <a href={lead.social_linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline"><Linkedin className="w-3 h-3" />LinkedIn</a>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isUnassigned && (
              <button onClick={claim} disabled={claiming}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50">
                {claiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                Tomar lead
              </button>
            )}
            {isMine && (
              <button onClick={release} disabled={claiming}
                className="flex items-center gap-1.5 ring-1 ring-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 disabled:opacity-50">
                {claiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                Liberar
              </button>
            )}
            {!isUnassigned && !isMine && (
              <span className="text-xs bg-amber-50 text-amber-700 px-3 py-2 rounded-lg ring-1 ring-amber-200">
                Asignado a otro vendedor
              </span>
            )}
          </div>
        </div>

        {/* Contacto rápido */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition">
              <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs text-blue-900 truncate">{lead.email}</span>
            </a>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="flex items-center gap-2 p-3 rounded-xl bg-violet-50 hover:bg-violet-100 transition">
              <Phone className="w-4 h-4 text-violet-600 flex-shrink-0" />
              <span className="text-xs text-violet-900 truncate">{lead.phone}</span>
            </a>
          )}
          {(lead.social_whatsapp || lead.whatsapp) && (
            <a href={`https://wa.me/${(lead.social_whatsapp || lead.whatsapp).replace(/[^\d]/g, '')}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition">
              <MessageCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-xs text-emerald-900 truncate">{lead.social_whatsapp || lead.whatsapp}</span>
            </a>
          )}
          {lead.id && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50">
              <Hash className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-700 truncate font-mono">{String(lead.id).slice(0, 8)}</span>
            </div>
          )}
        </div>

        {/* Cambio de etapa */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Cambiar etapa</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(STAGE_CFG).map(([key, cfg]) => (
              <button key={key} onClick={() => changeStage(key)} disabled={updatingStage || stage === key}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition disabled:opacity-50 ${
                  stage === key ? `${cfg.bg} ${cfg.text} ring-2 ring-offset-1 ring-gray-300` : 'ring-1 ring-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Paneles principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AIFollowUpPanel leadId={id} />
        <LinkedInResearchPanel leadId={id} lead={lead} />
      </div>

      <CallLogPanel leadId={id} />

      {lead.description && (
        <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-200">
          <h3 className="text-sm font-bold text-gray-800 mb-2">Descripción</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{lead.description}</p>
        </div>
      )}
    </div>
  )
}
