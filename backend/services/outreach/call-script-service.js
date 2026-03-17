import { pool } from '../../config/database.js';
import { analyzeWithDeepSeek } from '../deepseek.js';

class CallScriptService {
  async generateCallScript(lead) {
    const senderName = process.env.SMTP_FROM_NAME?.replace(/_/g, ' ') || 'Gian Koch';

    const systemPrompt = `Eres ${senderName} de Adbize. Genera un guion de llamada telefonica de prospeccion en espanol argentino.

Adbize ofrece: chatbots IA, automatizacion, scraping inteligente, analisis de datos con IA.

El guion debe tener:
- Apertura (presentacion, 2 lineas)
- Gancho (por que llamas, relevante al sector, 2 lineas)
- Propuesta de valor (que ofreces, 3 lineas)
- Manejo de objeciones comunes (3 objeciones con respuestas)
- Cierre (pedir reunion, 2 lineas)

Responde SOLO con JSON:
{
  "opening": "texto de apertura",
  "hook": "gancho personalizado",
  "value_proposition": "propuesta de valor",
  "objections": [
    {"objection": "No tenemos presupuesto", "response": "respuesta"},
    {"objection": "Ya tenemos proveedor", "response": "respuesta"},
    {"objection": "No nos interesa", "response": "respuesta"}
  ],
  "closing": "texto de cierre",
  "estimated_duration": "3-5 minutos"
}`;

    const context = `Empresa: ${lead.name}\nSector: ${lead.sector || 'general'}\nCiudad: ${lead.city || ''}\nTelefono: ${lead.phone || ''}\nWebsite: ${lead.website || ''}`;

    try {
      const response = await analyzeWithDeepSeek(`${systemPrompt}\n\n${context}`);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error('[CallScript] AI generation failed:', err.message);
    }

    // Fallback
    return {
      opening: `Hola, buen dia. Soy ${senderName} de Adbize. ¿Hablo con alguien de ${lead.name}?`,
      hook: `Los contacto porque estamos trabajando con empresas del sector ${lead.sector || 'como la suya'} en ${lead.city || 'Argentina'} implementando soluciones de inteligencia artificial.`,
      value_proposition: `En Adbize ayudamos a empresas a automatizar procesos, aumentar ventas y optimizar operaciones con IA. Tenemos chatbots inteligentes, sistemas de prospeccion automatizada y analisis de datos. Empresas similares a ${lead.name} han logrado un 35% de mejora en eficiencia.`,
      objections: [
        { objection: 'No tenemos presupuesto', response: 'Entiendo. Justamente nuestras soluciones se pagan solas en pocos meses. Podemos hacer una consulta gratuita de 15 minutos para mostrarles el ROI potencial.' },
        { objection: 'Ya tenemos proveedor', response: 'Excelente que ya estan en el tema. Nosotros nos especializamos en IA aplicada al negocio. Podriamos complementar lo que ya tienen. ¿Les interesa una segunda opinion gratuita?' },
        { objection: 'No nos interesa', response: 'Lo entiendo perfectamente. ¿Puedo enviarles un caso de exito por email para que lo revisen cuando tengan un momento? Sin compromiso.' },
      ],
      closing: `¿Les parece si coordinamos una videollamada de 15 minutos esta semana? Puedo mostrarles ejemplos concretos para ${lead.sector || 'su sector'}. ¿Que dia les queda mejor?`,
      estimated_duration: '3-5 minutos',
    };
  }

  async saveScript(leadId, script) {
    await pool.query(
      `INSERT INTO outreach_messages (lead_id, channel, step, body, ai_generated, status)
       VALUES ($1, 'CALL', 1, $2, true, 'GENERATED')`,
      [leadId, JSON.stringify(script)]
    );
    return script;
  }
}

export const callScriptService = new CallScriptService();
export default callScriptService;
