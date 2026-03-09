import { analyzeWithDeepSeek } from './deepseek.js'

/**
 * 🤖 MACHINE LEARNING LEAD SCORING
 * Sistema predictivo para scoring de leads usando IA y patrones históricos
 */

class MLLeadScorer {
  constructor() {
    this.historicalData = []
    this.featureWeights = {
      // Firmographic features
      company_size: 0.15,
      industry_match: 0.12,
      location_tier: 0.08,
      revenue_estimate: 0.10,

      // Technographic features
      tech_stack_match: 0.15,
      tech_maturity: 0.08,

      // Behavioral features
      website_engagement: 0.10,
      content_downloads: 0.08,
      email_opens: 0.06,
      email_clicks: 0.08,

      // Intent signals
      buying_signals: 0.20,
      recent_funding: 0.12,
      hiring_activity: 0.10,
      product_launches: 0.08,

      // Contact quality
      decision_maker_contact: 0.15,
      email_deliverability: 0.10,
      contact_completeness: 0.08
    }

    this.modelVersion = '1.0.0'
    this.lastTrainingDate = null
  }

  /**
   * 1. EXTRACCIÓN DE FEATURES
   */
  extractFeatures(lead) {
    return {
      // Firmographics
      company_size: this.scoreCompanySize(lead.company_size || lead.employees),
      industry_match: this.scoreIndustryMatch(lead.industry),
      location_tier: this.scoreLocation(lead.location),
      revenue_estimate: this.scoreRevenue(lead.revenue || lead.estimated_revenue),

      // Technographics
      tech_stack_match: this.scoreTechStack(lead.tech_stack),
      tech_maturity: this.scoreTechMaturity(lead.tech_stack),

      // Behavioral
      website_engagement: lead.website_visits || 0,
      content_downloads: lead.content_downloads || 0,
      email_opens: lead.email_opens || 0,
      email_clicks: lead.email_clicks || 0,

      // Intent signals
      buying_signals: this.scoreBuyingSignals(lead.buying_signals),
      recent_funding: lead.funding_amount ? this.scoreFunding(lead.funding_amount, lead.funding_date) : 0,
      hiring_activity: lead.job_postings ? this.scoreHiring(lead.job_postings) : 0,
      product_launches: lead.product_launches ? lead.product_launches.length * 10 : 0,

      // Contact quality
      decision_maker_contact: this.scoreDecisionMaker(lead.contact_title),
      email_deliverability: lead.email_score || 50,
      contact_completeness: this.scoreContactCompleteness(lead)
    }
  }

  /**
   * 2. SCORING DE FEATURES INDIVIDUALES
   */

  scoreCompanySize(size) {
    if (typeof size === 'number') {
      if (size >= 1000) return 100
      if (size >= 500) return 85
      if (size >= 100) return 70
      if (size >= 50) return 55
      if (size >= 10) return 40
      return 25
    }

    const sizeMap = {
      'enterprise': 100,
      'large': 85,
      'medium': 70,
      'small': 55,
      'startup': 40
    }

    return sizeMap[size?.toLowerCase()] || 50
  }

  scoreIndustryMatch(industry) {
    const targetIndustries = [
      'technology', 'saas', 'software', 'fintech', 'healthcare tech',
      'e-commerce', 'digital marketing', 'consulting'
    ]

    if (!industry) return 30

    const industryLower = industry.toLowerCase()
    const matches = targetIndustries.some(target => industryLower.includes(target))

    return matches ? 100 : 40
  }

  scoreLocation(location) {
    if (!location) return 30

    const tier1 = ['united states', 'usa', 'canada', 'uk', 'germany', 'france', 'australia', 'spain', 'madrid', 'barcelona', 'london', 'new york', 'san francisco', 'toronto']
    const tier2 = ['mexico', 'brazil', 'argentina', 'chile', 'colombia', 'poland', 'netherlands', 'belgium', 'italy']

    const locationLower = location.toLowerCase()

    if (tier1.some(t1 => locationLower.includes(t1))) return 100
    if (tier2.some(t2 => locationLower.includes(t2))) return 70

    return 50
  }

  scoreRevenue(revenue) {
    if (!revenue) return 50

    const revenueNum = typeof revenue === 'string'
      ? parseInt(revenue.replace(/[^0-9]/g, ''))
      : revenue

    if (revenueNum >= 100000000) return 100  // $100M+
    if (revenueNum >= 50000000) return 90    // $50M+
    if (revenueNum >= 10000000) return 80    // $10M+
    if (revenueNum >= 5000000) return 70     // $5M+
    if (revenueNum >= 1000000) return 60     // $1M+
    if (revenueNum >= 500000) return 50      // $500K+

    return 40
  }

  scoreTechStack(techStack) {
    if (!techStack || techStack.length === 0) return 30

    const modernTech = [
      'react', 'vue', 'angular', 'node.js', 'python', 'aws', 'azure', 'gcp',
      'kubernetes', 'docker', 'microservices', 'graphql', 'mongodb', 'postgresql'
    ]

    const techArray = Array.isArray(techStack) ? techStack : [techStack]
    const techLower = techArray.map(t => t.toLowerCase()).join(' ')

    const matches = modernTech.filter(tech => techLower.includes(tech)).length

    return Math.min(100, 40 + (matches * 10))
  }

  scoreTechMaturity(techStack) {
    if (!techStack || techStack.length === 0) return 40

    const legacyTech = ['jquery', 'php', 'wordpress', 'drupal', 'joomla']
    const modernTech = ['react', 'vue', 'next.js', 'node.js', 'python', 'go']

    const techArray = Array.isArray(techStack) ? techStack : [techStack]
    const techLower = techArray.map(t => t.toLowerCase()).join(' ')

    const legacyCount = legacyTech.filter(tech => techLower.includes(tech)).length
    const modernCount = modernTech.filter(tech => techLower.includes(tech)).length

    if (modernCount > legacyCount) return 100
    if (modernCount === legacyCount) return 60
    return 30
  }

  scoreBuyingSignals(signals) {
    if (!signals || signals.length === 0) return 0

    const signalValues = {
      'expansion': 30,
      'funding': 35,
      'hiring': 25,
      'product_launch': 20,
      'digital_transformation': 30,
      'leadership_change': 15,
      'migration': 25,
      'pain_point_mentioned': 20
    }

    let score = 0
    signals.forEach(signal => {
      const signalLower = signal.toLowerCase()
      Object.keys(signalValues).forEach(key => {
        if (signalLower.includes(key)) {
          score += signalValues[key]
        }
      })
    })

    return Math.min(100, score)
  }

  scoreFunding(amount, date) {
    if (!amount) return 0

    const amountNum = typeof amount === 'string'
      ? parseInt(amount.replace(/[^0-9]/g, ''))
      : amount

    let score = 0

    // Funding amount score
    if (amountNum >= 50000000) score += 50      // $50M+
    else if (amountNum >= 10000000) score += 40 // $10M+
    else if (amountNum >= 5000000) score += 30  // $5M+
    else if (amountNum >= 1000000) score += 20  // $1M+
    else score += 10

    // Recency score
    if (date) {
      const daysAgo = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
      if (daysAgo <= 30) score += 50        // Within last month
      else if (daysAgo <= 90) score += 30   // Within last 3 months
      else if (daysAgo <= 180) score += 15  // Within last 6 months
    }

    return Math.min(100, score)
  }

  scoreHiring(jobPostings) {
    const count = typeof jobPostings === 'number' ? jobPostings : jobPostings.length

    if (count >= 20) return 100
    if (count >= 10) return 80
    if (count >= 5) return 60
    if (count >= 2) return 40
    if (count >= 1) return 20

    return 0
  }

  scoreDecisionMaker(title) {
    if (!title) return 30

    const cLevel = ['ceo', 'cto', 'cio', 'cfo', 'coo', 'cmo', 'cdo', 'chief']
    const vp = ['vp', 'vice president', 'v.p.']
    const director = ['director', 'head of']
    const manager = ['manager', 'lead']

    const titleLower = title.toLowerCase()

    if (cLevel.some(c => titleLower.includes(c))) return 100
    if (vp.some(v => titleLower.includes(v))) return 85
    if (director.some(d => titleLower.includes(d))) return 70
    if (manager.some(m => titleLower.includes(m))) return 50

    return 30
  }

  scoreContactCompleteness(lead) {
    let score = 0
    const fields = [
      'company_name', 'contact_name', 'email', 'phone', 'title',
      'company_website', 'linkedin', 'location', 'industry'
    ]

    fields.forEach(field => {
      if (lead[field]) score += 100 / fields.length
    })

    return Math.round(score)
  }

  /**
   * 3. CÁLCULO DE SCORE PREDICTIVO
   */
  calculatePredictiveScore(lead) {
    const features = this.extractFeatures(lead)

    let totalScore = 0
    let totalWeight = 0

    Object.keys(features).forEach(featureName => {
      const featureValue = features[featureName]
      const weight = this.featureWeights[featureName] || 0.05

      totalScore += featureValue * weight
      totalWeight += weight
    })

    const normalizedScore = (totalScore / totalWeight)

    return {
      score: Math.round(normalizedScore),
      features,
      featureContributions: this.getFeatureContributions(features),
      quality: this.getQualityLabel(normalizedScore),
      conversionProbability: this.estimateConversionProbability(normalizedScore, features)
    }
  }

  /**
   * 4. CONTRIBUCIONES DE FEATURES
   */
  getFeatureContributions(features) {
    const contributions = []

    Object.keys(features).forEach(featureName => {
      const value = features[featureName]
      const weight = this.featureWeights[featureName] || 0.05

      contributions.push({
        feature: featureName,
        value,
        weight,
        contribution: value * weight,
        importance: weight
      })
    })

    // Ordenar por contribución
    contributions.sort((a, b) => b.contribution - a.contribution)

    return contributions
  }

  /**
   * 5. ESTIMACIÓN DE PROBABILIDAD DE CONVERSIÓN
   */
  estimateConversionProbability(score, features) {
    // Modelo simplificado de conversión basado en score y features clave
    let baseProbability = score / 100

    // Ajustes basados en features críticos
    if (features.decision_maker_contact >= 85) baseProbability *= 1.3
    if (features.buying_signals >= 50) baseProbability *= 1.4
    if (features.recent_funding >= 70) baseProbability *= 1.25
    if (features.tech_stack_match >= 80) baseProbability *= 1.2

    // Penalizaciones
    if (features.email_deliverability < 50) baseProbability *= 0.7
    if (features.company_size < 40) baseProbability *= 0.8

    return Math.min(100, Math.round(baseProbability * 100))
  }

  /**
   * 6. LABEL DE CALIDAD
   */
  getQualityLabel(score) {
    if (score >= 85) return 'HOT'
    if (score >= 70) return 'WARM'
    if (score >= 50) return 'COLD'
    if (score >= 30) return 'UNQUALIFIED'
    return 'INVALID'
  }

  /**
   * 7. RECOMENDACIONES DE ACCIÓN
   */
  async generateActionRecommendations(lead, scoringResult) {
    const { score, quality, conversionProbability, features } = scoringResult

    const prompt = `Basándote en el siguiente análisis de lead, genera recomendaciones específicas de acción:

LEAD SCORE: ${score}/100
QUALITY: ${quality}
CONVERSION PROBABILITY: ${conversionProbability}%

TOP FEATURES:
${scoringResult.featureContributions.slice(0, 5).map(f =>
  `- ${f.feature}: ${f.value} (contribution: ${f.contribution.toFixed(2)})`
).join('\n')}

LEAD DATA:
Company: ${lead.company_name || 'Unknown'}
Contact: ${lead.contact_name || 'Unknown'} (${lead.title || 'Unknown'})
Industry: ${lead.industry || 'Unknown'}
Size: ${lead.company_size || lead.employees || 'Unknown'}

Genera en JSON:
{
  "recommended_actions": [
    {
      "action": "acción específica",
      "priority": "high/medium/low",
      "timing": "cuándo ejecutar",
      "channel": "email/phone/linkedin",
      "reason": "por qué esta acción"
    }
  ],
  "outreach_strategy": "estrategia general de outreach",
  "key_talking_points": ["punto 1", "punto 2", "punto 3"],
  "personalization_tips": ["tip 1", "tip 2"],
  "expected_objections": ["objeción 1", "objeción 2"],
  "close_probability": "estimación de cierre",
  "estimated_deal_size": "estimación de valor del deal",
  "next_best_action": "siguiente mejor acción inmediata"
}`

    try {
      const aiResponse = await analyzeWithDeepSeek(prompt)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (error) {
      console.error('Error generating recommendations:', error)
      return null
    }
  }

  /**
   * 8. BATCH SCORING
   */
  async scoreBatch(leads) {
    const results = leads.map(lead => ({
      lead,
      scoring: this.calculatePredictiveScore(lead)
    }))

    // Ordenar por score
    results.sort((a, b) => b.scoring.score - a.scoring.score)

    const summary = {
      total: results.length,
      hot: results.filter(r => r.scoring.quality === 'HOT').length,
      warm: results.filter(r => r.scoring.quality === 'WARM').length,
      cold: results.filter(r => r.scoring.quality === 'COLD').length,
      unqualified: results.filter(r => r.scoring.quality === 'UNQUALIFIED').length,
      invalid: results.filter(r => r.scoring.quality === 'INVALID').length,
      avgScore: results.reduce((sum, r) => sum + r.scoring.score, 0) / results.length,
      avgConversionProbability: results.reduce((sum, r) => sum + r.scoring.conversionProbability, 0) / results.length
    }

    return {
      results,
      summary,
      topLeads: results.slice(0, 10)
    }
  }

  /**
   * 9. TRAINING CON DATOS HISTÓRICOS
   */
  trainModel(historicalLeads) {
    // Análisis de datos históricos para ajustar pesos
    this.historicalData = historicalLeads

    const wonDeals = historicalLeads.filter(l => l.status === 'won')
    const lostDeals = historicalLeads.filter(l => l.status === 'lost')

    // Analizar qué features correlacionan con wins
    const wonFeatures = wonDeals.map(l => this.extractFeatures(l))
    const lostFeatures = lostDeals.map(l => this.extractFeatures(l))

    // Calcular promedios para cada feature
    Object.keys(this.featureWeights).forEach(featureName => {
      const wonAvg = wonFeatures.reduce((sum, f) => sum + f[featureName], 0) / wonFeatures.length
      const lostAvg = lostFeatures.reduce((sum, f) => sum + f[featureName], 0) / lostFeatures.length

      // Ajustar peso basado en diferencia
      const difference = wonAvg - lostAvg
      const adjustmentFactor = 1 + (difference / 100)

      this.featureWeights[featureName] *= adjustmentFactor
    })

    // Normalizar pesos
    const totalWeight = Object.values(this.featureWeights).reduce((sum, w) => sum + w, 0)
    Object.keys(this.featureWeights).forEach(key => {
      this.featureWeights[key] /= totalWeight
    })

    this.lastTrainingDate = new Date()

    return {
      trained: true,
      samplesUsed: historicalLeads.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      updatedWeights: this.featureWeights,
      trainingDate: this.lastTrainingDate
    }
  }

  /**
   * 10. ANÁLISIS DE FEATURE IMPORTANCE
   */
  getFeatureImportance() {
    const sorted = Object.entries(this.featureWeights)
      .sort((a, b) => b[1] - a[1])
      .map(([feature, weight]) => ({
        feature,
        weight,
        importance: `${(weight * 100).toFixed(2)}%`
      }))

    return {
      features: sorted,
      modelVersion: this.modelVersion,
      lastTraining: this.lastTrainingDate
    }
  }
}

// Singleton instance
const mlLeadScorer = new MLLeadScorer()

export {
  mlLeadScorer,
  MLLeadScorer
}
