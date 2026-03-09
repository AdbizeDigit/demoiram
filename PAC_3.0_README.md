# 🚀 PAC 3.0 - Plataforma de Crecimiento Open Source y Basada en IA

## Descripción General

**PAC 3.0** es un motor de crecimiento completamente open source y basado en IA que automatiza el proceso de prospección, análisis y outreach de empresas. Está diseñado exclusivamente para **administradores** y proporciona 4 módulos principales:

1. **🤖 Módulo de Rastreo y Recolección** - Búsqueda inteligente de prospectos
2. **🧠 Módulo de Análisis y Calificación** - Análisis profundo con IA
3. **📧 Módulo de Interacción y Automatización** - Secuencias de email automáticas
4. **🗺️ Módulo de Visualización y Monitoreo** - Dashboard en tiempo real

---

## 🔐 Acceso Restringido a Administradores

### Convertir un Usuario a Admin

Para que un usuario pueda acceder a PAC 3.0, primero debe ser convertido a administrador:

```bash
# En la carpeta backend
node scripts/make-admin.js email@example.com
```

**Ejemplo:**
```bash
node scripts/make-admin.js admin@adbize.com
```

### Verificar Rol de Admin

El sistema verifica automáticamente que el usuario tenga rol `admin` antes de permitir acceso a:
- Cualquier endpoint de `/api/pac-3.0/*`
- La página `/dashboard/pac-3.0`

Si un usuario no-admin intenta acceder, será redirigido al dashboard principal.

---

## 📋 Módulos Implementados

### 1. 🤖 Módulo de Rastreo y Recolección

**Funcionalidades:**
- Búsqueda por país e industria
- Rastreo web inteligente usando OpenStreetMap (OSM)
- Extracción automática de datos de contacto
- Geolocalización de empresas
- Almacenamiento en base de datos

**Endpoints:**
```
POST /api/pac-3.0/search-prospects
GET /api/pac-3.0/prospects
```

**Ejemplo de Uso:**
```javascript
// Buscar prospectos
const response = await fetch('/api/pac-3.0/search-prospects', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    country: 'USA',
    industry: 'Technology',
    keywords: 'startup, SaaS'
  })
})
```

### 2. 🧠 Módulo de Análisis y Calificación (IA)

**Funcionalidades:**
- Clasificación semántica de prospectos (Cero-Shot/Few-Shot)
- Generación de múltiples tesis de venta por rol (CTO, CEO, etc.)
- Identificación de contactos clave (NER Avanzado)
- Verificación probabilística de emails
- Análisis de sentimiento y confianza

**Endpoints:**
```
POST /api/pac-3.0/analyze-prospect/:prospectId
```

**Ejemplo de Uso:**
```javascript
// Analizar prospecto con IA
const response = await fetch(`/api/pac-3.0/analyze-prospect/${prospectId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

**Respuesta:**
```json
{
  "success": true,
  "analysis": {
    "classification": "Alto potencial IA/ML",
    "thesis_versions": [
      {
        "version": "CTO",
        "title": "Optimización Técnica",
        "content": "..."
      },
      {
        "version": "CEO",
        "title": "ROI y Crecimiento",
        "content": "..."
      }
    ],
    "key_contacts": [
      {
        "name": "John Smith",
        "role": "CTO",
        "email": "john@company.com",
        "confidence": 0.95
      }
    ],
    "sentiment_score": 0.78,
    "confidence_score": 0.85
  }
}
```

### 3. 📧 Módulo de Interacción y Automatización

**Funcionalidades:**
- Secuencias de email condicionales
- Plantillas de email personalizables
- Análisis automático de respuestas
- Generación de borradores de respuesta
- Generación de material de venta

**Endpoints:**
```
POST /api/pac-3.0/send-email-sequence/:prospectId
GET /api/pac-3.0/email-sequences/:prospectId
```

**Ejemplo de Uso:**
```javascript
// Enviar email
const response = await fetch(`/api/pac-3.0/send-email-sequence/${prospectId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailSubject: 'Oportunidad de Crecimiento',
    emailBody: 'Hola...',
    contactEmail: 'contact@company.com'
  })
})
```

### 4. 🗺️ Módulo de Visualización y Monitoreo

**Funcionalidades:**
- Mapa interactivo con OpenStreetMap
- Visualización en tiempo real de prospectos
- Código de colores por puntuación de IA
- KPIs y métricas en vivo
- Monitoreo de eventos del sistema

**Endpoints:**
```
GET /api/pac-3.0/dashboard-stats
GET /api/pac-3.0/map-prospects
GET /api/pac-3.0/monitoring-events
```

**Ejemplo de Respuesta (Dashboard Stats):**
```json
{
  "totalProspects": 45,
  "prospectsByStatus": [
    { "status": "new", "count": 20 },
    { "status": "analyzed", "count": 15 },
    { "status": "contacted", "count": 10 }
  ],
  "emailsSent": 25,
  "analysisCompleted": 15,
  "averageScore": "0.78"
}
```

---

## 🗄️ Estructura de Base de Datos

### Tablas Principales

#### `pac_prospects`
```sql
- id: SERIAL PRIMARY KEY
- admin_id: INTEGER (FK users)
- company_name: VARCHAR
- website: VARCHAR
- email: VARCHAR
- phone: VARCHAR
- location: VARCHAR
- country: VARCHAR
- latitude: DECIMAL
- longitude: DECIMAL
- industry: VARCHAR
- description: TEXT
- source: VARCHAR
- status: VARCHAR (new, analyzed, contacted, qualified, rejected)
- ai_score: DECIMAL (0-1)
- ai_analysis: TEXT (JSON)
- contact_name: VARCHAR
- contact_role: VARCHAR
- contact_email: VARCHAR
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `pac_email_sequences`
```sql
- id: SERIAL PRIMARY KEY
- admin_id: INTEGER (FK users)
- prospect_id: INTEGER (FK pac_prospects)
- sequence_number: INTEGER
- email_subject: VARCHAR
- email_body: TEXT
- status: VARCHAR (pending, sent, bounced, replied)
- sent_at: TIMESTAMP
- response_status: VARCHAR (positive, negative, question)
- response_text: TEXT
- response_at: TIMESTAMP
- created_at: TIMESTAMP
```

#### `pac_ai_analysis`
```sql
- id: SERIAL PRIMARY KEY
- admin_id: INTEGER (FK users)
- prospect_id: INTEGER (FK pac_prospects)
- analysis_type: VARCHAR
- classification: VARCHAR
- thesis_versions: TEXT (JSON)
- key_contacts: TEXT (JSON)
- email_suggestions: TEXT (JSON)
- sentiment_score: DECIMAL
- confidence_score: DECIMAL
- created_at: TIMESTAMP
```

#### `pac_monitoring`
```sql
- id: SERIAL PRIMARY KEY
- admin_id: INTEGER (FK users)
- event_type: VARCHAR
- event_description: TEXT
- status: VARCHAR (in_progress, completed, error)
- prospect_id: INTEGER (FK pac_prospects, nullable)
- created_at: TIMESTAMP
```

---

## 🚀 Cómo Usar PAC 3.0

### Paso 1: Acceder al Panel

1. Inicia sesión en tu cuenta
2. Ve a `/dashboard/pac-3.0`
3. El sistema verificará que seas admin

### Paso 2: Rastrear Prospectos

1. Ve a la pestaña **"Rastreador"**
2. Selecciona país e industria
3. (Opcional) Añade palabras clave
4. Haz clic en **"Iniciar Búsqueda"**
5. Espera a que se completen los resultados

### Paso 3: Analizar con IA

1. Ve a la pestaña **"Análisis IA"**
2. Selecciona un prospecto de la lista
3. Haz clic en **"Ejecutar Análisis IA"**
4. Revisa las clasificaciones, tesis de venta y contactos identificados

### Paso 4: Enviar Emails

1. Ve a la pestaña **"Email Sequences"**
2. Selecciona un prospecto
3. Elige una plantilla o escribe tu propio email
4. Haz clic en **"Enviar Email"**

### Paso 5: Monitorear en Mapa

1. Ve a la pestaña **"Mapa"**
2. Visualiza todos tus prospectos geográficamente
3. Los colores indican la puntuación de IA:
   - 🟢 Verde: Excelente (0.8+)
   - 🔵 Azul: Bueno (0.6-0.8)
   - 🟡 Amarillo: Regular (0.4-0.6)
   - 🔴 Rojo: Bajo (<0.4)
   - ⚪ Gris: Sin analizar

---

## 📊 Dashboard en Tiempo Real

El dashboard muestra:
- **Total de Prospectos**: Cantidad total rastreados
- **Emails Enviados**: Secuencias completadas
- **Análisis Completados**: Prospectos analizados
- **Score Promedio**: Calidad promedio de prospectos
- **Monitoreo en Tiempo Real**: Eventos del sistema

---

## 🔒 Seguridad y Permisos

### Middleware de Autenticación

```javascript
// Proteger rutas
router.post('/search-prospects', protect, adminOnly, async (req, res) => {
  // Solo usuarios autenticados y admins pueden acceder
})
```

### Verificación de Rol

```javascript
// En middleware/auth.js
export const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Acceso denegado. Solo administradores.' 
    })
  }
  next()
}
```

---

## 🛠️ Configuración Técnica

### Variables de Entorno Requeridas

```env
DATABASE_URL=postgresql://user:password@localhost:5432/adbize
JWT_SECRET=your-secret-key
PORT=5000
```

### Instalación

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install

# Iniciar desarrollo
npm run dev
```

---

## 📈 Flujo de Datos

```
1. RASTREO
   └─> Búsqueda por país/industria
   └─> Extracción de datos
   └─> Almacenamiento en BD

2. ANÁLISIS IA
   └─> Clasificación semántica
   └─> Generación de tesis
   └─> Identificación de contactos
   └─> Cálculo de scores

3. AUTOMATIZACIÓN
   └─> Envío de emails
   └─> Análisis de respuestas
   └─> Generación de borradores

4. MONITOREO
   └─> Visualización en mapa
   └─> KPIs en tiempo real
   └─> Eventos del sistema
```

---

## 🎯 Casos de Uso

### Prospección B2B
- Encontrar empresas por industria y ubicación
- Identificar decisores clave
- Enviar emails personalizados

### Lead Scoring
- Calificar prospectos automáticamente
- Priorizar contactos de alto valor
- Optimizar tiempo de ventas

### Análisis Competitivo
- Monitorear empresas competidoras
- Identificar oportunidades de mercado
- Rastrear cambios en el sector

---

## 📝 Notas Importantes

1. **Solo Admins**: PAC 3.0 es exclusivamente para administradores
2. **Open Source**: Usa tecnologías 100% open source (OpenStreetMap, etc.)
3. **IA Local**: Preparado para integración con modelos locales (Ollama, etc.)
4. **Escalable**: Diseñado para crecer sin aumentar costos de software
5. **Privacidad**: Todos los datos se almacenan localmente en tu BD

---

## 🚀 Próximas Mejoras

- [ ] Integración con LinkedIn para enriquecimiento de datos
- [ ] Scoring dinámico por potencial
- [ ] Filtros avanzados por industria
- [ ] Alertas automáticas
- [ ] Integración con CRM externo
- [ ] Reportes automatizados
- [ ] API pública para integraciones

---

## 📞 Soporte

Para reportar bugs o sugerencias, contacta al equipo de desarrollo.

---

**PAC 3.0 - Motor de Crecimiento Open Source** ✨
