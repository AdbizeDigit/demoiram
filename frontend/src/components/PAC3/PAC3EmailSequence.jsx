import { useState } from 'react'
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react'

export default function PAC3EmailSequence({ prospects }) {
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState('')

  const emailTemplates = [
    {
      name: 'Presentación Inicial',
      subject: 'Oportunidad de Crecimiento para {company}',
      body: `Hola {contact},

He identificado que {company} podría beneficiarse significativamente de nuestras soluciones de {service}.

Basándome en mi análisis, creo que podemos ayudarte a:
- Aumentar eficiencia operativa en un 40%
- Reducir costos tecnológicos
- Acelerar tu transformación digital

¿Te gustaría agendar una breve llamada para explorar esto?

Saludos,
Tu Equipo`
    },
    {
      name: 'Seguimiento Técnico',
      subject: 'Solución Técnica para {company}',
      body: `Hola {contact},

Continuando con nuestra conversación anterior, aquí te comparto algunos detalles técnicos sobre cómo podemos optimizar tu stack:

[Detalles técnicos personalizados]

¿Cuándo podemos conectar con tu equipo técnico?

Saludos`
    },
    {
      name: 'Propuesta de ROI',
      subject: 'Proyección de ROI para {company}',
      body: `Hola {contact},

He preparado una proyección de ROI específica para {company}:

Inversión: $X
Retorno esperado en 6 meses: $Y
Ahorro operativo anual: $Z

¿Te gustaría revisar los detalles?

Saludos`
    }
  ]

  const handleSendEmail = async () => {
    if (!selectedProspect || !emailSubject || !emailBody) {
      setMessage('Por favor completa todos los campos')
      return
    }

    setIsSending(true)
    setMessage('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/pac-3.0/send-email-sequence/${selectedProspect.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailSubject,
          emailBody,
          contactEmail: selectedProspect.contact_email || selectedProspect.email
        })
      })

      if (response.ok) {
        setMessage('✅ Email enviado correctamente')
        setEmailSubject('')
        setEmailBody('')
        setTimeout(() => setMessage(''), 3000)
      } else {
        const errorData = await response.json()
        setMessage(`❌ ${errorData.message}`)
      }
    } catch (error) {
      setMessage('Error al enviar email')
      console.error(error)
    } finally {
      setIsSending(false)
    }
  }

  const applyTemplate = (template) => {
    setEmailSubject(template.subject)
    setEmailBody(template.body)
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Mail className="text-blue-400" />
        Módulo de Interacción y Automatización
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prospects List */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-white mb-4">Prospectos</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {prospects.length === 0 ? (
              <p className="text-slate-400 text-sm">No hay prospectos disponibles</p>
            ) : (
              prospects.map(prospect => (
                <button
                  key={prospect.id}
                  onClick={() => setSelectedProspect(prospect)}
                  className={`w-full text-left p-3 rounded transition border ${
                    selectedProspect?.id === prospect.id
                      ? 'bg-blue-600/30 border-blue-500 text-white'
                      : 'bg-slate-600/30 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <p className="font-medium truncate">{prospect.company_name}</p>
                  <p className="text-xs text-slate-400 mt-1">{prospect.email}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Email Composer */}
        <div className="lg:col-span-2">
          {selectedProspect ? (
            <div className="space-y-4">
              {/* Prospect Info */}
              <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white">{selectedProspect.company_name}</h3>
                <p className="text-slate-400 text-sm mt-1">
                  📧 {selectedProspect.contact_email || selectedProspect.email}
                </p>
              </div>

              {/* Templates */}
              <div>
                <h4 className="text-white font-semibold mb-2">Plantillas Rápidas</h4>
                <div className="grid grid-cols-1 gap-2">
                  {emailTemplates.map((template, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyTemplate(template)}
                      className="text-left bg-slate-600/30 hover:bg-slate-600/50 border border-slate-600 rounded p-3 transition"
                    >
                      <p className="text-blue-400 font-medium text-sm">{template.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Subject */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Asunto</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Asunto del email..."
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Email Body */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Cuerpo del Email</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  rows={8}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Message */}
              {message && (
                <div className={`flex items-center gap-2 p-3 rounded ${
                  message.includes('✅')
                    ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                    : 'bg-red-500/20 border border-red-500/50 text-red-300'
                }`}>
                  {message.includes('✅') ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  {message}
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={handleSendEmail}
                disabled={isSending}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 rounded transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Enviar Email
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-slate-600/30 border border-slate-600 rounded-lg p-8 text-center">
              <Mail className="mx-auto text-slate-400 mb-4" size={48} />
              <p className="text-slate-400">Selecciona un prospecto para enviar un email</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-white font-semibold mb-2">📧 Características de Automatización</h4>
        <ul className="text-slate-300 text-sm space-y-1">
          <li>✓ Secuencias de email condicionales basadas en IA</li>
          <li>✓ Análisis automático de respuestas</li>
          <li>✓ Generación de borradores de respuesta sugerida</li>
          <li>✓ Generación automática de material de venta</li>
          <li>✓ Integración con SMTP personalizado</li>
        </ul>
      </div>
    </div>
  )
}
