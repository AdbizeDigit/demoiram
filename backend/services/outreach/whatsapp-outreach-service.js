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
2. Decir que la IA hoy es una VENTAJA COMPETITIVA real en el mercado
3. Dos ejemplos CORTOS y CONCRETOS de como la IA se aplica en su rubro (adaptados a su sector especifico)
4. Ofrecer un DEMO GRATUITO para que lo vean en accion
5. Pregunta abierta para cerrar

REGLAS:
- Transmitir que la IA ya no es futuro, es una ventaja competitiva que sus competidores van a usar
- Los 2 ejemplos deben ser especificos para su sector. Ejemplo para metalurgica: "automatizar cotizaciones al instante" o "predecir fallas en maquinas antes de que pasen"
- Mencionar que tienen un demo gratuito / sin compromiso para que lo prueben
- NO uses frases genericas de vendedor ("soluciones integrales", "ayudamos a empresas")
- NO seas demasiado informal (nada de "che", "copado", "me cope")
- Tono argentino natural pero profesional
- Max 70 palabras total
- Max 1 emoji

Ejemplo de tono correcto: "Hola! Soy [nombre] de Adbize. Vi que en [empresa] trabajan en [sector]. Hoy la IA es una ventaja competitiva real — por ejemplo para [ejemplo 1] y [ejemplo 2]. Tenemos un demo gratuito para que lo vean en accion. Les interesa?"

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
    return `Hola! Soy ${senderName} de Adbize. Vi que en ${lead.name} trabajan en ${lead.sector || 'su rubro'}. Hoy la IA es una ventaja competitiva real — por ejemplo para automatizar respuestas a consultas y optimizar procesos internos. Tenemos un demo gratuito para que lo vean en accion. Les interesa?`;
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
