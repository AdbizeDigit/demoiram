import { useState, useEffect } from 'react'
import { Eye, Loader2 } from 'lucide-react'
import api from '../../services/api'

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'recién'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

export default function EmailTrackingPanel({ leadId }) {
  const [opens, setOpens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/seller/leads/${leadId}/email-opens`)
      .then(r => { setOpens(r.data?.opens || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [leadId])

  if (loading) return null
  if (!opens.length) return null

  return (
    <div className="bg-blue-50/40 rounded-2xl border border-blue-100 shadow-sm">
      <div className="px-5 py-3 border-b border-blue-100 flex items-center gap-2">
        <div className="bg-blue-600 p-1.5 rounded-lg">
          <Eye className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">Aperturas de email <span className="text-[10px] font-normal text-blue-700">({opens.length})</span></h3>
          <p className="text-[10px] text-gray-500">Cuando abrieron tus mails</p>
        </div>
      </div>
      <div className="px-5 py-3 max-h-48 overflow-y-auto">
        <div className="space-y-1.5">
          {opens.slice(0, 15).map(o => (
            <div key={o.id} className="flex items-center justify-between text-xs py-1 border-b border-blue-50 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-gray-800 truncate font-medium">{o.subject || 'Email'}</p>
              </div>
              <span className="text-[10px] text-blue-700 flex-shrink-0 ml-2 font-semibold">{timeAgo(o.opened_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
