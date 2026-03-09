# 🔒 Sistema Interno Adbize

## Descripción General

**Sistema Interno Adbize** es una plataforma exclusiva para el equipo interno de Adbize que proporciona herramientas avanzadas para operaciones, growth y prospección.

---

## 🔐 Acceso Restringido

### Quién puede acceder
- ✅ Usuarios con email `@adbize.com`
- ✅ Usuarios con rol `internal`
- ❌ Usuarios externos

### Verificación de Acceso
```javascript
// En InternalToolsPage.jsx
const isAdbizeInternal = user?.email?.endsWith('@adbize.com') || user?.role === 'internal'

if (!isAdbizeInternal) {
  // Mostrar página de acceso denegado
}
```

---

## 📋 4 Módulos Principales

### 1. 🔍 Scrapping Inteligente

**Funcionalidades:**
- Búsqueda multi-fuente (Web, LinkedIn, GitHub, News, Social, Crunchbase)
- Extracción inteligente de datos estructurados
- Scoring automático de relevancia
- Filtrado avanzado por país, industria, score
- Exportación a CSV/JSON

**Fuentes de Datos:**
- 🌐 Web Scraping
- 💼 LinkedIn
- 🐙 GitHub
- 📰 News & Press
- 📱 Social Media
- 🚀 Crunchbase

**Componente:** `/frontend/src/components/InternalTools/IntelligentScraping.jsx`

---

### 2. 📈 Growth & Operaciones

**Funcionalidades:**
- KPIs en tiempo real (Ingresos, Clientes, Conversión, Pipeline)
- Operaciones en ejecución
- Estrategias de growth activas
- Próximas acciones programadas

**Métricas Monitoreadas:**
- Ingresos
- Clientes Activos
- Tasa de Conversión
- Pipeline de Ventas

**Operaciones Activas:**
- Prospección Diaria
- Seguimiento Automático
- Análisis Competitivo
- Enriquecimiento de Datos

**Componente:** `/frontend/src/components/InternalTools/GrowthOperations.jsx`

---

### 3. 🎯 Prospección Avanzada

**Funcionalidades:**
- Segmentación de prospectos (Alto Valor, Mid-Market, Startups, Enterprise)
- Tabla de prospectos con scoring
- Filtros avanzados (Score, Industria, Ubicación, Etapa)
- Análisis de etapas del ciclo de venta

**Segmentos:**
- Alto Valor: 234 prospectos ($2.1M)
- Mid-Market: 567 prospectos ($1.8M)
- Startups: 892 prospectos ($0.9M)
- Enterprise: 45 prospectos ($3.5M)

**Métricas:**
- Tasa de Conversión: 3.8%
- Ciclo de Venta Promedio: 45 días
- Valor Promedio por Deal: $125K

**Componente:** `/frontend/src/components/InternalTools/ProspectionAdvanced.jsx`

---

### 4. 📊 Métricas Internas

**Funcionalidades:**
- Dashboard de métricas por categoría
- Selector de rango de tiempo (Semana, Mes, Trimestre, Año)
- Alertas y notificaciones
- Gráfico de tendencia de rendimiento
- Top performers
- Proyecciones

**Categorías de Métricas:**
- Prospección (Leads, Calificación, Tasa)
- Ventas (Deals, Valor, Ciclo)
- Operaciones (Automatizaciones, Tiempo Ahorrado, Eficiencia)

**Alertas:**
- Warnings (Pipeline bajo)
- Success (Meta alcanzada)
- Info (Nuevas integraciones)

**Componente:** `/frontend/src/components/InternalTools/InternalMetrics.jsx`

---

## 🗂️ Estructura de Archivos

```
frontend/src/
├── pages/
│   └── InternalToolsPage.jsx          ← Página principal
└── components/
    └── InternalTools/
        ├── IntelligentScraping.jsx    ← Módulo 1
        ├── GrowthOperations.jsx       ← Módulo 2
        ├── ProspectionAdvanced.jsx    ← Módulo 3
        └── InternalMetrics.jsx        ← Módulo 4
```

---

## 🚀 Cómo Acceder

### URL
```
http://localhost:3000/dashboard/internal-tools
```

### Requisitos
1. Usuario registrado
2. Email `@adbize.com` o rol `internal`
3. Autenticación JWT válida

### Pasos
1. Inicia sesión en `/login`
2. Navega a `/dashboard/internal-tools`
3. Sistema verifica automáticamente el acceso
4. Si no tienes acceso: Página de acceso denegado

---

## 🎨 Diseño Visual

### Colores
- Header: Azul → Púrpura (Gradiente)
- Fondo: Slate oscuro
- Acentos: Azul, Verde, Púrpura, Amarillo

### Componentes
- Tabs navegables
- Cards con datos
- Tablas interactivas
- Gráficos de barras
- Indicadores de progreso
- Alertas coloreadas

### Responsive
- Desktop: Grid completo
- Tablet: 2-3 columnas
- Móvil: 1 columna

---

## 🔄 Flujo de Datos

```
1. ACCESO
   └─ Verificar email @adbize.com
   └─ Verificar rol internal
   └─ Mostrar página o acceso denegado

2. NAVEGACIÓN
   └─ Seleccionar pestaña
   └─ Cargar componente
   └─ Mostrar datos

3. INTERACCIÓN
   └─ Filtrar datos
   └─ Cambiar rango de tiempo
   └─ Exportar resultados
   └─ Ver detalles
```

---

## 📊 Datos Simulados

Actualmente, todos los datos son simulados. Para integración real:

### Scrapping Inteligente
```javascript
// Reemplazar con API real
const results = await fetch('/api/internal/scraping', {
  method: 'POST',
  body: JSON.stringify({ source, query, filters })
})
```

### Growth & Operaciones
```javascript
// Reemplazar con API real
const metrics = await fetch('/api/internal/metrics')
const operations = await fetch('/api/internal/operations')
```

### Prospección Avanzada
```javascript
// Reemplazar con API real
const prospects = await fetch('/api/internal/prospects', {
  query: { segment, filters }
})
```

### Métricas Internas
```javascript
// Reemplazar con API real
const internalMetrics = await fetch('/api/internal/dashboard-metrics', {
  query: { timeRange }
})
```

---

## 🔒 Seguridad

### Autenticación
- JWT token requerido
- Verificación de email `@adbize.com`
- Verificación de rol `internal`

### Autorización
- Solo usuarios internos pueden acceder
- Datos aislados por usuario
- Validación en frontend y backend

### Confidencialidad
- Banner de información confidencial
- Datos internos no se comparten
- Acceso restringido

---

## 📝 Notas Importantes

1. **Información Confidencial**: Todos los datos mostrados son confidenciales de Adbize
2. **Acceso Exclusivo**: Solo para equipo interno
3. **Datos Simulados**: Actualmente con datos de ejemplo
4. **Escalable**: Preparado para integración con APIs reales
5. **Responsive**: Funciona en desktop, tablet y móvil

---

## 🎯 Casos de Uso

### Para Sales
- Monitorear prospectos
- Seguir pipeline
- Ver top performers
- Analizar ciclo de venta

### Para Growth
- Monitorear KPIs
- Revisar operaciones
- Analizar estrategias
- Proyectar resultados

### Para Operaciones
- Monitorear scrapping
- Revisar automatizaciones
- Analizar eficiencia
- Gestionar alertas

### Para Management
- Ver métricas globales
- Revisar tendencias
- Analizar performance
- Tomar decisiones

---

## 🚀 Próximas Mejoras

- [ ] Integración con APIs reales
- [ ] Exportación avanzada (PDF, Excel)
- [ ] Gráficos interactivos
- [ ] Reportes automatizados
- [ ] Webhooks y notificaciones
- [ ] Análisis predictivo
- [ ] Integración con Slack
- [ ] Mobile app nativa

---

## 📞 Soporte

Para problemas o sugerencias, contacta al equipo de desarrollo.

---

**Sistema Interno Adbize** - Herramientas Exclusivas para el Equipo 🔒
