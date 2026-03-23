import { pool } from '../../config/database.js';
import { analyzeWithDeepSeek } from '../deepseek.js';

class WhatsAppOutreachService {
  // Generate personalized WhatsApp message with AI
  async generateMessage(lead) {
    const senderName = process.env.SMTP_FROM_NAME?.replace(/_/g, ' ') || 'Gian Koch';

    const systemPrompt = `Eres ${senderName} de Adbize. Genera un mensaje de WhatsApp CASUAL y NATURAL en espanol argentino.

IMPORTANTE — lo que NO hacer:
- NO menciones productos especificos (chatbots, scraping, automatizacion, analisis de datos)
- NO hagas un pitch de venta directo
- NO suenes como vendedor o como mensaje masivo
- NO uses frases como "ayudamos a empresas", "soluciones", "servicios", "ofrecemos"

Lo que SI hacer:
- Escribi como si le mandaras un WhatsApp a alguien que no conoces pero te interesa su empresa
- Menciona algo ESPECIFICO de su empresa/sector que te llamo la atencion
- Habla de "ventaja competitiva con inteligencia artificial" de forma sutil y curiosa
- Que suene como una persona real hablando, no un bot
- Usa tono argentino relajado (tipo "che", "buenas", "copado", etc)
- Pregunta algo que genere curiosidad, no que pida una reunion
- Max 50 palabras, como un mensaje real de WhatsApp
- Max 1 emoji

Ejemplo de tono correcto: "Buenas! Vi lo de [empresa] y me parecio muy copado. Estamos laburando con empresas del sector [X] para que tengan ventaja competitiva usando IA. Te suena?"

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
    return `Buenas! Soy ${senderName}. Vi lo de ${lead.name} y me cope. Estamos laburando con empresas de ${lead.sector || 'su rubro'} en ${lead.city || 'Argentina'} para que tengan ventaja competitiva usando IA. Te copa si te cuento?`;
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
