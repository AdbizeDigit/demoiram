import { useState, useEffect, useCallback } from 'react'
import { Linkedin, Sparkles, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import api from '../../services/api'

export default function LinkedInResearchPanel({ leadId, lead }) {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [research, setResearch] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/api/seller/leads/${leadId}/linkedin-research`)
      setResearch(data?.research || null)
    } catch (err) {
      console.error('Error cargando research:', err)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => { load() }, [load])

  async function generate() {
    setGenerating(true)
    setError(null)
    try {
      const { data } = await api.post(`/api/seller/leads/${leadId}/linkedin-research`, {
        profile_url: lead?.social_linkedin || lead?.socialMedia?.linkedin || null
      })
      setResearch(data?.research || null)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo generar la investigación')
    } finally {
      setGenerating(false)
    }
  }

  const linkedinUrl = lead?.social_linkedin || lead?.socialMedia?.linkedin || research?.profile_url

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 p-1.5 rounded-lg">
            <Linkedin className="w-4 h-4 text-indigo-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Investigación LinkedIn</h3>
        </div>
        <div className="flex items-center gap-2">
          {linkedinUrl && (
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
              Abrir perfil <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <button
            onClick={generate}
            disabled={generating}
            className="text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : research ? <RefreshCw className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
            {research ? 'Re-analizar' : 'Analizar con IA'}
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !research ? (
          <div className="text-center py-8">
            <Linkedin className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Todavía no analizaste este lead en LinkedIn.</p>
            <p className="text-[11px] text-gray-400 mt-1">Hacé click en "Analizar con IA" para generar un resumen y puntos clave.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {research.ai_summary && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Resumen IA</p>
                <p className="text-sm text-gray-700 leading-relaxed">{research.ai_summary}</p>
              </div>
            )}
            {research.ai_talking_points && (
              <div className="bg-indigo-50/50 rounded-xl p-3 ring-1 ring-indigo-100">
                <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Puntos para abordar el contacto
                </p>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{research.ai_talking_points}</pre>
              </div>
            )}
            <p className="text-[10px] text-gray-400 text-right">
              Generado {new Date(research.created_at).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
