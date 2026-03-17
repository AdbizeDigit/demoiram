import { pool } from '../../config/database.js';
import { analyzeWithDeepSeek } from '../deepseek.js';

class LeadReportService {
  static instance;

  static getInstance() {
    if (!LeadReportService.instance) {
      LeadReportService.instance = new LeadReportService();
    }
    return LeadReportService.instance;
  }

  async generateReport(leadId) {
    // 1. Get lead from DB with all data
    const result = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (result.rows.length === 0) throw new Error('Lead not found');
    const lead = result.rows[0];

    // 2. Build context for AI
    const context = this.buildLeadContext(lead);

    // 3. Generate report with AI (DeepSeek or fallback)
    let report;
    try {
      report = await this.generateAIReport(context, lead);
    } catch (err) {
      console.error('AI report error, using template:', err.message);
      report = this.generateTemplateReport(lead);
    }

    // 4. Save report to DB
    await pool.query(
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_report TEXT`,
      []
    );
    await pool.query(
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMP`,
      []
    );
    await pool.query(
      'UPDATE leads SET ai_report = $1, report_generated_at = NOW() WHERE id = $2',
      [JSON.stringify(report), leadId]
    );

    return report;
  }

  buildLeadContext(lead) {
    // Build a comprehensive text about the lead
    let context = `Empresa: ${lead.name}\n`;
    if (lead.city) context += `Ciudad: ${lead.city}, ${lead.state}\n`;
    if (lead.address) context += `Direccion: ${lead.address}\n`;
    if (lead.phone) context += `Telefono: ${lead.phone}\n`;
    if (lead.email) context += `Email: ${lead.email}\n`;
    if (lead.website) context += `Website: ${lead.website}\n`;
    if (lead.sector) context += `Sector: ${lead.sector}\n`;
    if (lead.social_facebook) context += `Facebook: ${lead.social_facebook}\n`;
    if (lead.social_instagram) context += `Instagram: ${lead.social_instagram}\n`;
    if (lead.social_linkedin) context += `LinkedIn: ${lead.social_linkedin}\n`;
    if (lead.social_twitter) context += `Twitter: ${lead.social_twitter}\n`;
    if (lead.social_whatsapp) context += `WhatsApp: ${lead.social_whatsapp}\n`;
    context += `Score: ${lead.score}/100\n`;
    context += `Estado enriquecimiento: ${lead.enrichment_status}\n`;
    return context;
  }

  async generateAIReport(context, lead) {
    const systemPrompt = `Eres un analista de inteligencia comercial. Genera un informe detallado sobre un lead/empresa detectada por nuestro sistema de scraping.

El informe debe tener estas secciones en formato JSON:
{
  "companyProfile": "Perfil de la empresa (2-3 oraciones sobre qué hace, tamaño estimado, industria)",
  "contactQuality": "ALTA|MEDIA|BAJA - Evaluacion de la calidad de los datos de contacto",
  "contactSummary": "Resumen de datos de contacto disponibles y recomendacion de canal preferido para primer contacto",
  "strengths": ["fortaleza1", "fortaleza2", "fortaleza3"],
  "opportunities": ["oportunidad de negocio 1", "oportunidad 2"],
  "recommendedApproach": "Estrategia recomendada para primer acercamiento comercial (2-3 oraciones)",
  "socialPresence": "FUERTE|MODERADA|DEBIL|INEXISTENTE - Evaluacion de presencia digital",
  "socialAnalysis": "Analisis de sus redes sociales y presencia web",
  "nextSteps": ["paso1", "paso2", "paso3"],
  "score": 0-100,
  "priority": "ALTA|MEDIA|BAJA",
  "tags": ["tag1", "tag2", "tag3"]
}

Responde SOLO con JSON valido, sin markdown.`;

    const userPrompt = `Analiza este lead y genera el informe:\n\n${context}`;

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const response = await analyzeWithDeepSeek(fullPrompt);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON in AI response');
  }

  generateTemplateReport(lead) {
    // Template-based fallback when AI is not available
    const hasPhone = !!lead.phone;
    const hasEmail = !!lead.email;
    const hasWebsite = !!lead.website;
    const hasSocial = !!(lead.social_facebook || lead.social_instagram || lead.social_linkedin || lead.social_whatsapp);

    const contactChannels = [hasPhone && 'telefono', hasEmail && 'email', lead.social_whatsapp && 'WhatsApp'].filter(Boolean);
    const contactQuality = contactChannels.length >= 3 ? 'ALTA' : contactChannels.length >= 2 ? 'MEDIA' : 'BAJA';

    const socialCount = [lead.social_facebook, lead.social_instagram, lead.social_linkedin, lead.social_twitter, lead.social_whatsapp].filter(Boolean).length;
    const socialPresence = socialCount >= 3 ? 'FUERTE' : socialCount >= 1 ? 'MODERADA' : socialCount === 0 && hasWebsite ? 'DEBIL' : 'INEXISTENTE';

    const strengths = [];
    if (hasWebsite) strengths.push('Tiene presencia web establecida');
    if (hasPhone) strengths.push('Telefono de contacto disponible');
    if (hasEmail) strengths.push('Email corporativo disponible');
    if (hasSocial) strengths.push('Presencia activa en redes sociales');
    if (lead.address) strengths.push('Ubicacion fisica verificada');
    if (strengths.length === 0) strengths.push('Lead detectado por el sistema');

    const opportunities = [];
    if (lead.sector) opportunities.push(`Oportunidad en sector ${lead.sector}`);
    if (lead.city) opportunities.push(`Mercado en ${lead.city}, ${lead.state}`);
    if (!hasWebsite) opportunities.push('Podria necesitar servicios de presencia digital');
    if (!hasSocial) opportunities.push('Oportunidad de ofrecer gestion de redes sociales');

    const nextSteps = [];
    if (lead.social_whatsapp) nextSteps.push(`Contactar via WhatsApp: ${lead.social_whatsapp}`);
    else if (hasPhone) nextSteps.push(`Llamar al ${lead.phone}`);
    else if (hasEmail) nextSteps.push(`Enviar email a ${lead.email}`);
    nextSteps.push('Investigar mas sobre la empresa en su sitio web');
    nextSteps.push('Preparar propuesta personalizada segun sector');

    return {
      companyProfile: `${lead.name} es una empresa del sector ${lead.sector || 'general'} ubicada en ${lead.city || 'Argentina'}, ${lead.state || ''}. Detectada por el sistema de scraping con un score de ${lead.score}/100.`,
      contactQuality,
      contactSummary: contactChannels.length > 0
        ? `Datos de contacto disponibles: ${contactChannels.join(', ')}. Canal recomendado: ${contactChannels[0]}.`
        : 'Sin datos de contacto directos. Requiere investigacion adicional.',
      strengths,
      opportunities,
      recommendedApproach: lead.social_whatsapp
        ? `Primer contacto via WhatsApp (${lead.social_whatsapp}) con mensaje personalizado mencionando su actividad en ${lead.sector || 'su industria'}.`
        : hasPhone
          ? `Llamada telefonica al ${lead.phone} presentando servicios relevantes para ${lead.sector || 'su sector'}.`
          : `Acercamiento via ${hasEmail ? 'email corporativo' : 'redes sociales'} con propuesta de valor especifica.`,
      socialPresence,
      socialAnalysis: socialCount > 0
        ? `Presencia en ${socialCount} red(es) social(es): ${[lead.social_facebook && 'Facebook', lead.social_instagram && 'Instagram', lead.social_linkedin && 'LinkedIn', lead.social_twitter && 'Twitter/X', lead.social_whatsapp && 'WhatsApp'].filter(Boolean).join(', ')}.`
        : 'Sin presencia detectada en redes sociales.',
      nextSteps,
      score: lead.score || 50,
      priority: lead.score >= 70 ? 'ALTA' : lead.score >= 40 ? 'MEDIA' : 'BAJA',
      tags: [lead.sector, lead.city, lead.state, contactQuality === 'ALTA' ? 'contacto-completo' : null, lead.social_whatsapp ? 'whatsapp' : null].filter(Boolean),
    };
  }
}

export const leadReportService = LeadReportService.getInstance();
export default leadReportService;
