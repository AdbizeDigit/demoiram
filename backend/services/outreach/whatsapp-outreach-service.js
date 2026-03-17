import { pool } from '../../config/database.js';
import { analyzeWithDeepSeek } from '../deepseek.js';

class WhatsAppOutreachService {
  // Generate personalized WhatsApp message with AI
  async generateMessage(lead) {
    const senderName = process.env.SMTP_FROM_NAME?.replace(/_/g, ' ') || 'Gian Koch';

    const systemPrompt = `Eres ${senderName} de Adbize. Genera un mensaje de WhatsApp de prospeccion en espanol argentino.

Adbize ofrece: chatbots IA, automatizacion de procesos, scraping inteligente, analisis de datos con IA.

El mensaje debe ser:
- Muy corto (max 80 palabras)
- Profesional pero amigable
- Personalizado para la empresa
- Con pregunta abierta al final
- Sin emojis excesivos (max 2)
- Tono argentino natural

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
    return `Hola! Soy ${senderName} de Adbize. Encontré a ${lead.name} investigando empresas de ${lead.sector || 'su sector'} en ${lead.city || 'Argentina'}. En Adbize ayudamos a empresas a automatizar procesos con inteligencia artificial. ¿Les interesaría saber cómo la IA puede ayudarles a crecer?`;
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
