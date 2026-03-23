import { pool } from '../../config/database.js';
import { analyzeWithDeepSeek } from '../deepseek.js';

class WhatsAppOutreachService {
  // Generate personalized WhatsApp message with AI
  async generateMessage(lead) {
    const senderName = process.env.SMTP_FROM_NAME?.replace(/_/g, ' ') || 'Gian Koch';
    const senderFullName = 'Gian Franco Koch';

    // Check if this is a referred/derived lead
    const isReferido = (lead.source_url || lead.sourceUrl || '').startsWith('referido:');
    let parentName = '';
    if (isReferido) {
      try {
        const parentId = (lead.source_url || lead.sourceUrl || '').replace('referido:', '');
        const pr = await pool.query("SELECT name FROM leads WHERE id = $1", [parentId]);
        parentName = pr.rows[0]?.name || '';
      } catch {}
    }

    if (isReferido && parentName) {
      const referidoPrompt = `Eres ${senderFullName} de Adbize. Genera un mensaje de WhatsApp en espanol argentino.

Este numero te lo pasaron desde ${parentName}. El mensaje debe:
1. Empezar diciendo que te pasaron este numero desde ${parentName}
2. Presentarte como ${senderFullName} de Adbize
3. Mencionar brevemente que la IA es una ventaja competitiva clave hoy
4. Preguntar si podes compartirle un demo gratuito sin compromiso

REGLAS:
- NO uses simbolos raros ni comillas ni corchetes
- Amable y directo
- Max 45 palabras
- Texto plano

Ejemplo: Hola buen dia! Me pasaron este numero desde ${parentName}. Soy ${senderFullName} de Adbize, trabajamos con inteligencia artificial aplicada al sector y hoy es una ventaja competitiva clave. Puedo compartirte un demo gratuito?

Responde SOLO JSON: {"message":"texto"}`;

      try {
        const resp = await analyzeWithDeepSeek(referidoPrompt);
        const parsed = JSON.parse(resp.match(/\{[\s\S]*\}/)?.[0] || '{}');
        if (parsed.message) return parsed.message;
      } catch {}
      return `Hola buen dia! Me pasaron este numero desde ${parentName}. Soy ${senderFullName} de Adbize, trabajamos con inteligencia artificial aplicada al sector y hoy es una ventaja competitiva clave. Puedo compartirte un demo gratuito?`;
    }

    const systemPrompt = `Eres ${senderName} de Adbize. Genera un mensaje de WhatsApp en espanol argentino, natural pero profesional.

Este es el PRIMER mensaje a un numero de la empresa. Probablemente atienda alguien que no es el dueño ni el encargado.

ESTRUCTURA del mensaje:
1. Saludo amable y presentate con tu nombre completo ${senderFullName} y que sos de Adbize
2. Comenta que estuviste viendo empresas del sector y que te parecio interesante lo que hacen
3. Menciona que estas trabajando con empresas del rubro en temas de inteligencia artificial y que hoy es una ventaja competitiva clave
4. Pregunta amablemente si te pueden comunicar con el encargado o el dueño para compartirle un demo gratuito sin compromiso

TONO:
- Persuasivo y amable, no agresivo ni vendedor
- Que genere curiosidad, no presion
- Como alguien que genuinamente quiere compartir algo util, no vender
- Argentino natural y profesional

REGLAS:
- NO uses simbolos raros, ni guiones largos, ni comillas, ni corchetes, ni parentesis
- NO seas demasiado directo pidiendo el contacto, que fluya naturalmente
- Max 55 palabras
- Max 1 emoji
- Texto plano sin formato

Ejemplo de tono correcto: Hola buen dia! Soy Gian Franco Koch de Adbize. Estuve viendo empresas del sector metalurgico y me parecio muy interesante lo que hacen. Estamos trabajando con inteligencia artificial aplicada al rubro y hoy es una ventaja competitiva clave. Tendran algun encargado o responsable con quien pueda compartir un demo gratuito?

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
    return `Hola buen dia! Soy ${senderFullName} de Adbize. Estuve viendo empresas de ${lead.sector || 'su rubro'} y me parecio muy interesante lo que hacen en ${lead.name}. Estamos trabajando con inteligencia artificial aplicada al sector y hoy es una ventaja competitiva clave. Tendran algun encargado o responsable con quien pueda compartir un demo gratuito?`;
  }

  // Generate WhatsApp link
  getWhatsAppLink(phone, message) {
    const cleanPhone = phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  // Generate follow-up reply based on conversation history
  async generateFollowUp(lead, conversationHistory) {
    const senderFullName = 'Gian Franco Koch';

    const prompt = `Eres ${senderFullName}, fundador de Adbize. Estas respondiendo un WhatsApp a un potencial cliente.

SOBRE ADBIZE — servicios y precios:
- Desarrollo de apps web y mobile a medida
- Inteligencia Artificial: chatbots IA, machine learning, deep learning, vision artificial, LLMs
- Automatizacion de procesos con IA
- Scraping inteligente y analisis de datos

PRECIOS ORIENTATIVOS (dependen de la complejidad):
- Chatbot IA basico: desde USD 500
- App web con IA integrada: desde USD 1.500 a USD 5.000
- App mobile: desde USD 2.000 a USD 8.000
- Automatizacion de procesos: desde USD 800 a USD 3.000
- Proyecto integral (web + mobile + IA): desde USD 5.000 a USD 15.000
- Proyectos enterprise/complejos: a cotizar

FORMAS DE PAGO:
- Pago por hito: se divide el proyecto en etapas y se paga al completar cada hito
- Pago mensual: cuotas mensuales durante el desarrollo
- Siempre se trabaja bajo contrato de servicio que garantiza el desarrollo y la entrega del producto

HISTORIAL DE CONVERSACION:
${conversationHistory}

REGLAS para tu respuesta:
- Responde de forma natural y profesional en espanol argentino
- Si el cliente saludo o mostro interes, avanza la conversacion mencionando brevemente los servicios relevantes
- Menciona precios orientativos adaptados a lo que el cliente necesita
- Aclara que se puede pagar por hito o mensual
- Menciona que se trabaja bajo contrato de servicio
- NO uses simbolos raros ni comillas ni corchetes
- Max 80 palabras
- Texto plano

Responde SOLO JSON: {"message":"texto de respuesta"}`;

    try {
      const response = await analyzeWithDeepSeek(prompt);
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
      if (parsed.message) return parsed.message;
    } catch (err) {
      console.error('[WhatsApp] Follow-up generation failed:', err.message);
    }

    return `Gracias por responder! Te cuento, en Adbize desarrollamos apps web, mobile e inteligencia artificial a medida. Los precios arrancan desde USD 500 para chatbots hasta USD 15.000 para proyectos integrales, dependiendo la complejidad. Se puede pagar por hito o mensual, siempre bajo contrato de servicio. Te interesa que te arme una propuesta?`;
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
