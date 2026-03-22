import { ChevronDown } from 'lucide-react';

// ── Detection Modes ──────────────────────────────────────────────
export const DETECTION_MODES = [
  { id: 'manual', label: 'Manual', icon: 'Hand' },
  { id: 'automatic', label: 'Auto', icon: 'Zap' },
  { id: 'hybrid', label: 'Hibrido', icon: 'Shuffle' },
];

// ── Tab definitions ──────────────────────────────────────────────
export const TABS = [
  { id: 'radar', label: 'Radar', icon: 'Radio' },
  { id: 'sources', label: 'Fuentes', icon: 'Globe' },
  { id: 'opportunities', label: 'Oportunidades', icon: 'Target' },
  { id: 'rules', label: 'Reglas', icon: 'Cpu' },
  { id: 'pipeline', label: 'Pipeline', icon: 'GitBranch' },
  { id: 'leads', label: 'Leads', icon: 'Users' },
];

// ── Opportunity types for Adbize (servicios de tecnologia) ──────
export const OPPORTUNITY_TYPES = [
  { value: '', label: 'Todos los tipos' },
  { value: 'APP_WEB', label: 'App Web' },
  { value: 'APP_MOVIL', label: 'App Movil' },
  { value: 'IA_ML', label: 'IA / Machine Learning' },
  { value: 'CHATBOT_LLM', label: 'Chatbot / LLM' },
  { value: 'AUTOMATIZACION', label: 'Automatizacion' },
  { value: 'ECOMMERCE', label: 'Ecommerce' },
  { value: 'LICITACION_TECH', label: 'Licitacion Tech' },
  { value: 'NEARSHORING_TECH', label: 'Nearshoring Tech' },
  { value: 'TRANSFORMACION_DIGITAL', label: 'Transformacion Digital' },
  { value: 'OTRO', label: 'Otro' },
];

// ── Type labels ──────────────────────────────────────────────────
export const typeLabels = {
  APP_WEB: 'App Web',
  APP_MOVIL: 'App Movil',
  IA_ML: 'IA / Machine Learning',
  CHATBOT_LLM: 'Chatbot / LLM',
  AUTOMATIZACION: 'Automatizacion',
  ECOMMERCE: 'Ecommerce',
  LICITACION_TECH: 'Licitacion Tech',
  NEARSHORING_TECH: 'Nearshoring Tech',
  TRANSFORMACION_DIGITAL: 'Transformacion Digital',
  OTRO: 'Otro',
};

// ── Size labels ──────────────────────────────────────────────────
export const sizeLabels = {
  GRANDE: 'Grande',
  MEDIANO: 'Mediano',
  PEQUENO: 'Pequeno',
};

// ── Pipeline stages ──────────────────────────────────────────────
export const PIPELINE_STAGES = [
  { id: 'NEW', name: 'Detectado', color: 'gray' },
  { id: 'QUALIFIED', name: 'Calificado', color: 'blue' },
  { id: 'PROPOSAL', name: 'Propuesta', color: 'amber' },
  { id: 'NEGOTIATION', name: 'Negociacion', color: 'purple' },
  { id: 'WON', name: 'Cerrado Ganado', color: 'emerald' },
  { id: 'LOST', name: 'Cerrado Perdido', color: 'red' },
];

// ── Priority colors ─────────────────────────────────────────────
export const PRIORITY_COLORS = {
  ALTA: 'bg-red-50 text-red-700 border-red-200',
  MEDIA: 'bg-amber-50 text-amber-700 border-amber-200',
  BAJA: 'bg-gray-100 text-gray-600 border-gray-200',
};

// ── Status colors ───────────────────────────────────────────────
export const STATUS_COLORS = {
  NEW: 'bg-blue-100 text-blue-700',
  REVIEWED: 'bg-violet-100 text-violet-700',
  CONVERTED: 'bg-emerald-100 text-emerald-700',
  DISMISSED: 'bg-gray-100 text-gray-500',
};

// ── Default sources for Adbize ──────────────────────────────────
export const DEFAULT_SOURCES = [
  { id: 'src-1', name: 'Compranet Tech', category: 'gubernamental', enabled: true, schedule: 'Cada 2 horas', lastRun: new Date(Date.now() - 3600000).toISOString(), status: 'active', totalDetected: 47, last24h: 5, description: 'Licitaciones de software y tecnologia del gobierno' },
  { id: 'src-2', name: 'El Financiero RSS', category: 'empresarial', enabled: true, schedule: 'Cada 4 horas', lastRun: new Date(Date.now() - 7200000).toISOString(), status: 'active', totalDetected: 23, last24h: 2, description: 'Noticias de transformacion digital y tech' },
  { id: 'src-3', name: 'Expansion RSS', category: 'empresarial', enabled: true, schedule: 'Cada 4 horas', lastRun: new Date(Date.now() - 5400000).toISOString(), status: 'active', totalDetected: 34, last24h: 3, description: 'Startups, IA y negocios digitales' },
  { id: 'src-4', name: 'TechCrunch Latam', category: 'tecnologia', enabled: true, schedule: 'Cada 3 horas', lastRun: new Date(Date.now() - 10800000).toISOString(), status: 'active', totalDetected: 19, last24h: 1, description: 'Noticias de startups y tecnologia LATAM' },
  { id: 'src-5', name: 'DuckDuckGo Search', category: 'tecnologia', enabled: true, schedule: 'Cada 1 hora', lastRun: new Date(Date.now() - 1800000).toISOString(), status: 'active', totalDetected: 56, last24h: 8, description: 'Busqueda de oportunidades de desarrollo de software e IA' },
  { id: 'src-6', name: 'Nearshoring Tech MX', category: 'tecnologia', enabled: true, schedule: 'Cada 3 horas', lastRun: new Date(Date.now() - 4500000).toISOString(), status: 'active', totalDetected: 31, last24h: 4, description: 'Nearshoring de desarrollo de software en Mexico' },
  { id: 'src-7', name: 'GitHub Trending', category: 'tecnologia', enabled: false, schedule: 'Diario', lastRun: null, status: 'idle', totalDetected: 12, last24h: 0, description: 'Tendencias en tecnologia y herramientas' },
  { id: 'src-8', name: 'Gobierno Digital MX', category: 'gubernamental', enabled: true, schedule: 'Cada 12 horas', lastRun: new Date(Date.now() - 14400000).toISOString(), status: 'active', totalDetected: 15, last24h: 1, description: 'Proyectos de digitalizacion gubernamental' },
];

// ── Default rules ───────────────────────────────────────────────
export const DEFAULT_RULES = [
  {
    id: 'rule-1', name: 'Auto-Pipeline Premium', description: 'Agrega automaticamente oportunidades con score >85 y prioridad alta al pipeline',
    enabled: true,
    conditions: [
      { id: 'c1', field: 'relevance_score', operator: 'greater_than', value: 85 },
      { id: 'c2', field: 'priority', operator: 'equals', value: 'ALTA' },
    ],
    actions: [{ id: 'a1', type: 'add_to_pipeline', label: 'Agregar al pipeline' }],
    priority: 'ALTA', createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), lastTriggered: new Date(Date.now() - 3600000).toISOString(), triggerCount: 12,
  },
  {
    id: 'rule-2', name: 'Alerta Licitaciones Tech', description: 'Alerta cuando se detecta una licitacion de software o tecnologia',
    enabled: true,
    conditions: [{ id: 'c3', field: 'opportunity_type', operator: 'equals', value: 'LICITACION_TECH' }],
    actions: [{ id: 'a2', type: 'send_alert', label: 'Enviar alerta' }],
    priority: 'ALTA', createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), lastTriggered: new Date(Date.now() - 7200000).toISOString(), triggerCount: 8,
  },
  {
    id: 'rule-3', name: 'Enriquecimiento IA/ML', description: 'Auto-enriquecer oportunidades de IA y Machine Learning con score >60',
    enabled: true,
    conditions: [
      { id: 'c4', field: 'opportunity_type', operator: 'equals', value: 'IA_ML' },
      { id: 'c5', field: 'relevance_score', operator: 'greater_than', value: 60 },
    ],
    actions: [{ id: 'a3', type: 'auto_enrich', label: 'Enriquecer automaticamente' }],
    priority: 'MEDIA', createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), lastTriggered: new Date(Date.now() - 18000000).toISOString(), triggerCount: 5,
  },
];

// ── Default automation config ───────────────────────────────────
export const DEFAULT_AUTOMATION = {
  autoScan: true,
  scanIntervalMinutes: 30,
  autoScore: true,
  autoPipeline: true,
  minScoreForPipeline: 85,
  autoEnrich: true,
  autoAlerts: true,
};

// ── Formatters ──────────────────────────────────────────────────
export function formatCurrency(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Nunca';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Justo ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

export function formatCompact(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

// ── Shared UI Components ────────────────────────────────────────

export function FitScoreBadge({ score, size = 'sm' }) {
  const color = score >= 90
    ? 'from-emerald-500 to-green-400'
    : score >= 80
    ? 'from-blue-500 to-cyan-400'
    : score >= 70
    ? 'from-amber-500 to-yellow-400'
    : 'from-gray-400 to-gray-300';

  if (size === 'lg') {
    return (
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex flex-col items-center justify-center shadow-lg text-white`}>
        <span className="text-xl font-bold">{score}</span>
        <span className="text-[9px] font-medium opacity-90">Fit</span>
      </div>
    );
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${color} text-white`}>
      {score}%
    </span>
  );
}

export function PriorityTag({ priority }) {
  const styles = {
    ALTA: 'bg-red-50 text-red-700 border-red-200',
    MEDIA: 'bg-amber-50 text-amber-700 border-amber-200',
    BAJA: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  const labels = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${styles[priority] || styles.BAJA}`}>
      {labels[priority] || priority}
    </span>
  );
}

export function TypeTag({ type }) {
  const colors = {
    APP_WEB: 'bg-blue-50 text-blue-700 border-blue-200',
    APP_MOVIL: 'bg-purple-50 text-purple-700 border-purple-200',
    IA_ML: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CHATBOT_LLM: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    AUTOMATIZACION: 'bg-amber-50 text-amber-700 border-amber-200',
    ECOMMERCE: 'bg-orange-50 text-orange-700 border-orange-200',
    LICITACION_TECH: 'bg-red-50 text-red-700 border-red-200',
    NEARSHORING_TECH: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    TRANSFORMACION_DIGITAL: 'bg-teal-50 text-teal-700 border-teal-200',
    OTRO: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${colors[type] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {typeLabels[type] || type}
    </span>
  );
}

export function StatusDot({ status }) {
  const colors = {
    active: 'bg-emerald-500',
    idle: 'bg-gray-400',
    error: 'bg-red-500',
    scanning: 'bg-blue-500',
  };
  return (
    <span className="relative flex h-2 w-2">
      {(status === 'active' || status === 'scanning') && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status]} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colors[status] || colors.idle}`} />
    </span>
  );
}

export function CustomSelect({ value, onChange, options, icon: Icon }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none bg-white border border-gray-200 rounded-lg py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 ${Icon ? 'pl-9' : 'pl-3'}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

export function CategoryBadge({ category }) {
  const map = {
    gubernamental: 'bg-orange-50 text-orange-700 border-orange-200',
    tecnologia: 'bg-blue-50 text-blue-700 border-blue-200',
    empresarial: 'bg-purple-50 text-purple-700 border-purple-200',
    inmobiliaria: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${map[category] || 'bg-gray-100 text-gray-600'}`}>
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </span>
  );
}
