import { pool } from '../../config/database.js';
import { analyzeWithDeepSeek } from '../deepseek.js';

class WhatsAppOutreachService {
  // Generate personalized WhatsApp message with AI
  async generateMessage(lead) {
    const senderName = process.env.SMTP_FROM_NAME?.replace(/_/g, ' ') || 'Gian Koch';

    const systemPrompt = `Eres ${senderName} de Adbize. Genera un mensaje de WhatsApp en espanol argentino, natural pero profesional.

Este es el PRIMER mensaje a un numero de la empresa. Probablemente atienda alguien que no es el dueño ni el encargado.

ESTRUCTURA del mensaje:
1. Presentate con tu nombre y que sos de Adbize
2. Pedi hablar con el encargado o con el dueño de la empresa
3. Explica brevemente por que: que la IA hoy es una ventaja competitiva en el mercado y que tenes dos formas concretas de aplicarla en su rubro
4. NO des los ejemplos todavia, eso es para cuando hables con el decisor
5. Menciona que tenes un demo gratuito para mostrarle

REGLAS:
- NO uses simbolos raros, ni guiones largos, ni comillas, ni corchetes, ni parentesis
- NO seas demasiado informal ni demasiado formal
- Tono argentino natural y profesional
- Max 50 palabras
- Max 1 emoji
- Que suene como persona real

Ejemplo de tono correcto: Hola buen dia! Soy Gian de Adbize. Estoy buscando hablar con el encargado o el dueño de la empresa. Tenemos un demo gratuito de inteligencia artificial aplicada al sector metalurgico que les puede dar una ventaja competitiva importante. Me podes pasar su contacto?

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
    return `Hola buen dia! Soy ${senderName} de Adbize. Estoy buscando hablar con el encargado o el dueño de ${lead.name}. Tenemos un demo gratuito de inteligencia artificial aplicada a ${lead.sector || 'su rubro'} que les puede dar una ventaja competitiva importante. Me podes pasar su contacto?`;
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
