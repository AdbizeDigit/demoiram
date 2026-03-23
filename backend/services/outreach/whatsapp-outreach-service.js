import { pool } from '../../config/database.js';
import { analyzeWithDeepSeek } from '../deepseek.js';

class WhatsAppOutreachService {
  // Generate personalized WhatsApp message with AI
  async generateMessage(lead) {
    const senderName = process.env.SMTP_FROM_NAME?.replace(/_/g, ' ') || 'Gian Koch';

    const systemPrompt = `Eres ${senderName} de Adbize. Genera un mensaje de WhatsApp en espanol argentino, natural pero profesional.

TONO: amigable y directo, ni demasiado formal ni demasiado informal. Como un profesional que le escribe a otro profesional por primera vez.

ESTRUCTURA del mensaje:
1. Saludo corto y mencion de la empresa/sector
2. Dos ejemplos CORTOS y CONCRETOS de como la IA se podria aplicar en su rubro (adaptados a su sector especifico)
3. Pregunta abierta para cerrar

REGLAS:
- NO uses frases genericas de vendedor ("soluciones", "ayudamos a empresas", "ofrecemos servicios")
- NO seas demasiado informal (nada de "che", "copado", "me cope")
- SI usa tono argentino natural pero profesional
- Los 2 ejemplos deben ser especificos para su sector, no genericos. Ejemplo para metalurgica: "automatizar cotizaciones" o "predecir mantenimiento de maquinas con IA"
- Max 60 palabras total
- Max 1 emoji
- Que suene como persona real, no como bot

Ejemplo de tono correcto: "Hola! Soy [nombre] de Adbize. Vi que en [empresa] trabajan en [sector]. Estamos aplicando IA en empresas del rubro, por ejemplo para [ejemplo 1] y [ejemplo 2]. Les interesaria ver como funciona?"

Responde SOLO con JSON:
{"message": "texto del mensaje de whatsapp"}`;

    const context = `Empresa: ${lead.name}\nSector: ${lead.sector || 'general'}\nCiudad: ${lead.city || ''}\nWebsite: ${lead.website || ''}`;

    try {
      const response = await analyzeWithDeepSeek(`${systemPrompt}\n\n${context}`);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.message;
      }
    } catch (err) {
      console.error('[WhatsApp] AI generation failed:', err.message);
    }

    // Fallback
    return `Hola! Soy ${senderName} de Adbize. Vi que en ${lead.name} trabajan en ${lead.sector || 'su rubro'}. Estamos aplicando IA en empresas del sector, por ejemplo para automatizar respuestas a consultas y optimizar procesos internos. Les interesaria ver como funciona?`;
  }

  // Generate WhatsApp link
  getWhatsAppLink(phone, message) {
    const cleanPhone = phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  // Save WhatsApp outreach
  async saveMessage(leadId, message, campaignId) {
    const result = await pool.query(
      `INSERT INTO outreach_messages (lead_id, campaign_id, channel, step, body, ai_generated, status)
       VALUES ($1, $2, 'WHATSAPP', 1, $3, true, 'GENERATED') RETURNING *`,
      [leadId, campaignId, message]
    );
    return result.rows[0];
  }

  // Mark as sent
  async markSent(messageId) {
    await pool.query(
      "UPDATE outreach_messages SET status = 'SENT', sent_at = NOW() WHERE id = $1",
      [messageId]
    );
  }
}

export const whatsappOutreachService = new WhatsAppOutreachService();
export default whatsappOutreachService;
