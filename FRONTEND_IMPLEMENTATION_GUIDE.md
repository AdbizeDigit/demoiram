# 🎨 Guía de Implementación del Frontend Completo

## ✅ Lo que Ya Está Creado

### Backend Completo (100%)
- ✅ Sistema de scraping perfeccionado
- ✅ Búsquedas programadas automáticas
- ✅ Seguimiento automático de leads
- ✅ Generador de emails con IA
- ✅ Mini CRM automático
- ✅ Dashboard de métricas
- ✅ Webhooks e integraciones
- ✅ **NUEVO:** Sistema de campañas automáticas
- ✅ **NUEVO:** Templates de emails
- ✅ **NUEVO:** AI Assistant para análisis
- ✅ **NUEVO:** Re-enriquecimiento automático

### Frontend Creado
- ✅ Dashboard principal de automatización (`AutomationDashboard.jsx`)

---

## 📁 Páginas a Crear

### 1. Búsquedas Programadas (`ScheduledSearchesPage.jsx`)

**Ubicación:** `frontend/src/pages/automation/ScheduledSearchesPage.jsx`

**Funcionalidades:**
- Listar todas las búsquedas programadas
- Crear nueva búsqueda (modal o página)
- Editar búsqueda existente
- Activar/Desactivar búsqueda
- Ver historial de ejecuciones
- Estadísticas por búsqueda

**Endpoints a usar:**
```javascript
GET    /api/automation/scheduled-search/list
POST   /api/automation/scheduled-search/create
PUT    /api/automation/scheduled-search/:id
DELETE /api/automation/scheduled-search/:id
```

**Componentes clave:**
- Formulario de creación con:
  - Nombre de la búsqueda
  - Ubicación (input text)
  - Industria (select)
  - Min/Max empleados (range slider)
  - Horario (daily/weekly/monthly/custom)
  - Score mínimo (slider 0-100)
  - Email notificaciones
  - Webhook URL
- Lista de búsquedas con cards
- Toggle para activar/desactivar
- Modal de confirmación para eliminar

---

### 2. CRM de Leads (`CRMPage.jsx`)

**Ubicación:** `frontend/src/pages/automation/CRMPage.jsx`

**Funcionalidades:**
- Vista de pipeline (Kanban)
- Lista de leads con filtros
- Vista detallada de lead individual
- Actualizar estado de lead
- Registrar interacciones
- Agregar tags
- Ver historial completo
- Acciones rápidas (email, call, meeting)

**Endpoints a usar:**
```javascript
GET  /api/crm/leads
GET  /api/crm/leads/:id
PUT  /api/crm/leads/:id/status
POST /api/crm/leads/:id/interaction
POST /api/crm/leads/:id/tags
GET  /api/crm/pipeline/summary
GET  /api/crm/leads/needs-attention
```

**Componentes:**
- `PipelineView` - Vista Kanban con drag & drop
- `LeadsTable` - Tabla con filtros y búsqueda
- `LeadDetailModal` - Modal con toda la info del lead
- `InteractionForm` - Form para registrar interacción
- `LeadFilters` - Filtros avanzados (quality, score, status, etc.)

---

### 3. Métricas y Analytics (`MetricsPage.jsx`)

**Ubicación:** `frontend/src/pages/automation/MetricsPage.jsx`

**Funcionalidades:**
- Métricas generales (overview)
- Gráficos de tendencias
- Funnel de conversión
- Top fuentes de leads
- Comparación de periodos
- Performance summary
- Exportar reportes

**Endpoints a usar:**
```javascript
GET /api/metrics/overview?period=30
GET /api/metrics/trends?period=30
GET /api/metrics/top-sources
GET /api/metrics/industry-distribution
GET /api/metrics/performance-summary
GET /api/metrics/compare-periods
```

**Librerías recomendadas:**
- `recharts` para gráficos
- `react-chartjs-2` alternativa

**Componentes:**
- `OverviewMetrics` - Cards de métricas principales
- `TrendsChart` - Gráfico de líneas con tendencias
- `ConversionFunnel` - Embudo de conversión
- `SourcesChart` - Gráfico de barras/pie
- `PerformanceTable` - Tabla con métricas detalladas

---

### 4. Campañas Automáticas (`CampaignsPage.jsx`)

**Ubicación:** `frontend/src/pages/automation/CampaignsPage.jsx`

**Funcionalidades:**
- Listar campañas
- Crear nueva campaña
- Configurar criterios de targeting
- Seleccionar templates de emails
- Definir secuencia temporal
- Ver estadísticas de campaña
- Iniciar/Pausar campaña

**Endpoints a usar:**
```javascript
GET  /api/campaigns/list
POST /api/campaigns/create
POST /api/campaigns/:id/start
POST /api/campaigns/:id/pause
GET  /api/campaigns/:id/stats
```

**Wizard de creación:**
1. **Paso 1:** Nombre y descripción
2. **Paso 2:** Criterios de targeting
   - Score mínimo
   - Calidad (hot/warm/cold)
   - Industria
   - Status
3. **Paso 3:** Seleccionar templates
   - Arrastrar templates en orden
   - Configurar delay entre emails
4. **Paso 4:** Revisar y lanzar

---

### 5. Templates de Email (`TemplatesPage.jsx`)

**Ubicación:** `frontend/src/pages/automation/TemplatesPage.jsx`

**Funcionalidades:**
- Listar templates por categoría
- Crear nuevo template
- Editar template
- Vista previa con variables
- Duplicar template
- Eliminar template

**Endpoints a usar:**
```javascript
GET  /api/campaigns/templates/list?category=...
POST /api/campaigns/templates/create
POST /api/campaigns/templates/:id/render
```

**Editor de templates:**
- Subject line
- Body con editor rico (opcional) o textarea
- Variables disponibles:
  - `{{name}}` - Nombre del lead
  - `{{company}}` - Empresa
  - `{{title}}` - Cargo
  - `{{industry}}` - Industria
  - `{{customField}}` - Campos custom
- Vista previa en tiempo real

**Categorías:**
- First Contact
- Follow Up
- Value Content
- Case Study
- Custom

---

### 6. AI Assistant (`AIAssistantPage.jsx`)

**Ubicación:** `frontend/src/pages/automation/AIAssistantPage.jsx`

**Funcionalidades:**
- Analizar lead con IA
- Generar estrategia de outreach
- Predecir probabilidad de cierre
- Ver análisis previos
- Exportar análisis

**Endpoints a usar:**
```javascript
POST /api/ai/analyze-lead
POST /api/ai/generate-strategy
POST /api/ai/predict-close-probability
POST /api/ai/re-enrich/:leadId
```

**Componentes:**
- `LeadSelector` - Buscar y seleccionar lead
- `AnalysisResult` - Mostrar análisis de IA
- `StrategyViewer` - Mostrar estrategia generada
- `ProbabilityGauge` - Gauge visual de probabilidad
- `FactorsBreakdown` - Desglose de factores

---

### 7. Webhooks e Integraciones (`WebhooksPage.jsx`)

**Ubicación:** `frontend/src/pages/automation/WebhooksPage.jsx`

**Funcionalidades:**
- Listar webhooks
- Crear nuevo webhook
- Editar webhook
- Ver logs de webhooks
- Test webhook
- Desactivar webhook

**Endpoints a usar:**
```javascript
GET    /api/automation/webhooks/create
// (crear endpoints GET, PUT, DELETE en automation.js)
```

**Componentes:**
- `WebhooksList` - Lista de webhooks configurados
- `WebhookForm` - Formulario crear/editar
  - Nombre
  - URL
  - Eventos (checkboxes)
  - Secret (opcional)
- `WebhookLogs` - Tabla de logs (success/error)
- `TestWebhook` - Botón para enviar test payload

**Integraciones pre-configuradas:**
- Slack
- Zapier
- Make
- Custom

---

### 8. Configuración (`SettingsPage.jsx`)

**Ubicación:** `frontend/src/pages/automation/SettingsPage.jsx`

**Funcionalidades:**
- Configurar APIs externas
- Ajustar scoring de leads
- Personalizar secuencias
- Configurar notificaciones
- Exportar/Importar configuración

**Secciones:**
- **APIs:** Hunter, Clearbit, DeepSeek
- **Scoring:** Pesos de cada factor
- **Secuencias:** Editar HOT/WARM/COLD
- **Notificaciones:** Email, webhooks, frecuencia
- **General:** Zona horaria, idioma, etc.

---

## 🎨 Componentes Reutilizables a Crear

### 1. `<StatsCard />` - Card de estadística
```jsx
<StatsCard
  icon={Users}
  label="Total Leads"
  value={150}
  change="+15%"
  color="cyan"
/>
```

### 2. `<DataTable />` - Tabla con filtros y paginación
```jsx
<DataTable
  columns={columns}
  data={leads}
  filters={filters}
  onRowClick={handleRowClick}
  pagination={true}
/>
```

### 3. `<Modal />` - Modal reutilizable
```jsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Título"
  size="lg"
>
  {children}
</Modal>
```

### 4. `<LoadingSpinner />` - Loading state
```jsx
<LoadingSpinner text="Cargando datos..." />
```

### 5. `<EmptyState />` - Estado vacío
```jsx
<EmptyState
  icon={Users}
  title="No hay leads"
  description="Crea tu primera búsqueda"
  action="Crear búsqueda"
  onAction={handleCreate}
/>
```

### 6. `<Badge />` - Badge de estado
```jsx
<Badge
  variant="success"  // success, warning, error, info
  text="Activo"
/>
```

### 7. `<Chart />` - Wrapper para gráficos
```jsx
<Chart
  type="line"  // line, bar, pie, area
  data={chartData}
  height={300}
/>
```

---

## 🛣️ Rutas a Agregar en React Router

**Archivo:** `frontend/src/App.jsx`

```jsx
import AutomationDashboard from './pages/AutomationDashboard'
import ScheduledSearchesPage from './pages/automation/ScheduledSearchesPage'
import CRMPage from './pages/automation/CRMPage'
import MetricsPage from './pages/automation/MetricsPage'
import CampaignsPage from './pages/automation/CampaignsPage'
import TemplatesPage from './pages/automation/TemplatesPage'
import AIAssistantPage from './pages/automation/AIAssistantPage'
import WebhooksPage from './pages/automation/WebhooksPage'
import SettingsPage from './pages/automation/SettingsPage'

// En routes:
<Route path="/automation" element={<AutomationDashboard />} />
<Route path="/automation/scheduled-searches" element={<ScheduledSearchesPage />} />
<Route path="/automation/crm" element={<CRMPage />} />
<Route path="/automation/metrics" element={<MetricsPage />} />
<Route path="/automation/campaigns" element={<CampaignsPage />} />
<Route path="/automation/templates" element={<TemplatesPage />} />
<Route path="/automation/ai-assistant" element={<AIAssistantPage />} />
<Route path="/automation/webhooks" element={<WebhooksPage />} />
<Route path="/automation/settings" element={<SettingsPage />} />
```

---

## 📦 Dependencias Adicionales a Instalar

```bash
cd frontend
npm install recharts
npm install react-hook-form
npm install @hello-pangea/dnd  # Para drag & drop en Kanban
npm install react-hot-toast    # Para notificaciones
npm install date-fns           # Para manejo de fechas
```

---

## 🎯 Prioridades de Implementación

### Fase 1: Funcionalidades Core (Semana 1)
1. ✅ AutomationDashboard (ya creado)
2. ScheduledSearchesPage (crear/listar/editar búsquedas)
3. CRMPage (vista básica de leads)
4. MetricsPage (métricas básicas)

### Fase 2: Funcionalidades Avanzadas (Semana 2)
5. CampaignsPage (crear y gestionar campañas)
6. TemplatesPage (gestionar templates)
7. AIAssistantPage (análisis con IA)

### Fase 3: Integraciones y Config (Semana 3)
8. WebhooksPage (configurar webhooks)
9. SettingsPage (configuración general)
10. Refinamiento y bugs

---

## 🎨 Diseño y UX

### Paleta de Colores
- **Primary:** Cyan (#06b6d4)
- **Success:** Green (#10b981)
- **Warning:** Orange (#f97316)
- **Error:** Red (#ef4444)
- **Background:** Slate-950/900
- **Text:** White/Slate-400

### Tipografía
- **Títulos:** Font-bold, text-2xl/3xl
- **Subtítulos:** Font-semibold, text-lg
- **Body:** Font-normal, text-sm/base
- **Small:** text-xs

### Espaciado
- **Cards:** p-6, rounded-2xl
- **Gaps:** gap-4/6
- **Margins:** mb-4/6/8

### Animaciones
- **Hover:** hover:scale-105, transition-all
- **Loading:** animate-spin/pulse
- **Transitions:** transition-colors duration-200

---

## 🔧 Utils y Helpers

### 1. `formatDate(date)`
```javascript
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
```

### 2. `formatCurrency(amount)`
```javascript
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}
```

### 3. `getLeadQualityColor(quality)`
```javascript
export const getLeadQualityColor = (quality) => {
  const colors = {
    hot: 'bg-red-500/20 text-red-300 border-red-500/30',
    warm: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    cold: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
  return colors[quality] || colors.low
}
```

### 4. `calculateProgress(current, total)`
```javascript
export const calculateProgress = (current, total) => {
  if (total === 0) return 0
  return Math.round((current / total) * 100)
}
```

---

## 📝 Ejemplo de Implementación Completa

### ScheduledSearchesPage.jsx (Ejemplo Básico)

```jsx
import { useState, useEffect } from 'react'
import { Plus, Calendar, Play, Pause, Trash2 } from 'lucide-react'
import api from '../../services/api'

function ScheduledSearchesPage() {
  const [searches, setSearches] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSearches()
  }, [])

  const loadSearches = async () => {
    try {
      const res = await api.get('/api/automation/scheduled-search/list')
      setSearches(res.data.scheduledSearches || [])
    } catch (error) {
      console.error('Error loading searches:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSearch = async (id, enabled) => {
    try {
      await api.put(`/api/automation/scheduled-search/${id}`, {
        enabled: !enabled
      })
      loadSearches()
    } catch (error) {
      console.error('Error toggling search:', error)
    }
  }

  const deleteSearch = async (id) => {
    if (!confirm('¿Eliminar esta búsqueda?')) return

    try {
      await api.delete(`/api/automation/scheduled-search/${id}`)
      loadSearches()
    } catch (error) {
      console.error('Error deleting search:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Búsquedas Programadas</h1>
            <p className="text-slate-400">Automatiza la captación de leads</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Nueva Búsqueda
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12">Cargando...</div>
        ) : searches.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Calendar size={64} className="mx-auto mb-4 opacity-50" />
            <p>No hay búsquedas programadas</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {searches.map(search => (
              <div
                key={search.id}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{search.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        search.enabled
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {search.enabled ? 'Activa' : 'Pausada'}
                      </span>
                      <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded">
                        {search.schedule}
                      </span>
                    </div>
                    <div className="text-sm text-slate-400 space-y-1">
                      <p>📍 Ubicación: {search.location}</p>
                      {search.industry && <p>🏢 Industria: {search.industry}</p>}
                      <p>📊 Score mínimo: {search.min_lead_score}</p>
                      <p>🕐 Expresión cron: {search.cron_expression}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSearch(search.id, search.enabled)}
                      className={`p-2 rounded-lg transition-colors ${
                        search.enabled
                          ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      {search.enabled ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button
                      onClick={() => deleteSearch(search.id)}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de crear (implementar) */}
      {showModal && (
        <CreateSearchModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            loadSearches()
          }}
        />
      )}
    </div>
  )
}

export default ScheduledSearchesPage
```

---

## 🚀 Próximos Pasos

1. **Crea las páginas una por una** siguiendo el orden de prioridades
2. **Reutiliza componentes** para mantener consistencia
3. **Prueba cada funcionalidad** antes de continuar
4. **Agrega manejo de errores** en todos los endpoints
5. **Implementa loading states** para mejor UX
6. **Agrega validación** en formularios
7. **Optimiza** con React.memo y useMemo donde sea necesario

---

**¿Quieres que cree alguna página específica completa?**

Puedo crear cualquiera de las páginas listadas con todos sus componentes y funcionalidades.
