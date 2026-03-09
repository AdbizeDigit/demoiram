# 📚 PAC 3.0 - Referencia de API

## 🔐 Autenticación

Todos los endpoints requieren:
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

---

## 🤖 MÓDULO 1: RASTREO Y RECOLECCIÓN

### 1.1 Buscar Prospectos

**Endpoint:**
```
POST /api/pac-3.0/search-prospects
```

**Parámetros:**
```json
{
  "country": "USA",
  "industry": "Technology",
  "keywords": "startup, SaaS"
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Se encontraron 2 prospectos",
  "prospects": [
    {
      "id": 1,
      "admin_id": 1,
      "company_name": "Tech Innovations Inc",
      "website": "https://techinnovations.com",
      "email": "info@techinnovations.com",
      "phone": "+1-555-0100",
      "location": "San Francisco, CA",
      "country": "USA",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "industry": "Technology",
      "description": "Empresa de tecnología enfocada en soluciones de IA",
      "source": "web_scraping",
      "status": "new",
      "ai_score": null,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Errores:**
- `400` - Parámetros faltantes
- `401` - No autenticado
- `403` - No es admin

---

### 1.2 Obtener Prospectos

**Endpoint:**
```
GET /api/pac-3.0/prospects?status=new&country=USA&industry=Technology
```

**Query Parameters:**
- `status` (opcional) - 'new', 'analyzed', 'contacted', 'qualified', 'rejected'
- `country` (opcional) - Filtrar por país
- `industry` (opcional) - Filtrar por industria

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "admin_id": 1,
    "company_name": "Tech Innovations Inc",
    "website": "https://techinnovations.com",
    "email": "info@techinnovations.com",
    "phone": "+1-555-0100",
    "location": "San Francisco, CA",
    "country": "USA",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "industry": "Technology",
    "description": "Empresa de tecnología enfocada en soluciones de IA",
    "source": "web_scraping",
    "status": "new",
    "ai_score": null,
    "contact_name": null,
    "contact_role": null,
    "contact_email": null,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

---

## 🧠 MÓDULO 2: ANÁLISIS Y CALIFICACIÓN (IA)

### 2.1 Analizar Prospecto

**Endpoint:**
```
POST /api/pac-3.0/analyze-prospect/:prospectId
```

**Parámetros:**
- `:prospectId` - ID del prospecto a analizar

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Análisis completado",
  "analysis": {
    "id": 1,
    "admin_id": 1,
    "prospect_id": 1,
    "analysis_type": "deep_analysis",
    "classification": "Alto potencial IA/ML",
    "thesis_versions": [
      {
        "version": "CTO",
        "title": "Optimización Técnica",
        "content": "Hemos identificado oportunidades de optimización en tu stack tecnológico que podrían mejorar la eficiencia un 40%"
      },
      {
        "version": "CEO",
        "title": "ROI y Crecimiento",
        "content": "Nuestras soluciones han ayudado a empresas similares a aumentar sus ingresos en un 35% en 6 meses"
      }
    ],
    "key_contacts": [
      {
        "name": "John Smith",
        "role": "CTO",
        "email": "john.smith@company.com",
        "confidence": 0.95
      },
      {
        "name": "Sarah Johnson",
        "role": "Head of Digital",
        "email": "sarah.j@company.com",
        "confidence": 0.87
      }
    ],
    "sentiment_score": 0.78,
    "confidence_score": 0.85,
    "created_at": "2024-01-15T10:35:00Z"
  }
}
```

**Errores:**
- `404` - Prospecto no encontrado
- `401` - No autenticado
- `403` - No es admin

---

## 📧 MÓDULO 3: INTERACCIÓN Y AUTOMATIZACIÓN

### 3.1 Enviar Secuencia de Email

**Endpoint:**
```
POST /api/pac-3.0/send-email-sequence/:prospectId
```

**Parámetros:**
```json
{
  "emailSubject": "Oportunidad de Crecimiento para Tech Innovations",
  "emailBody": "Hola John,\n\nHe identificado que Tech Innovations podría beneficiarse significativamente...",
  "contactEmail": "john.smith@company.com"
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Email enviado correctamente",
  "sequence": {
    "id": 1,
    "admin_id": 1,
    "prospect_id": 1,
    "sequence_number": 1,
    "email_subject": "Oportunidad de Crecimiento para Tech Innovations",
    "email_body": "Hola John,\n\nHe identificado que Tech Innovations...",
    "status": "sent",
    "sent_at": "2024-01-15T10:40:00Z",
    "response_status": null,
    "response_text": null,
    "response_at": null,
    "created_at": "2024-01-15T10:40:00Z"
  }
}
```

**Errores:**
- `400` - Campos faltantes
- `404` - Prospecto no encontrado
- `401` - No autenticado
- `403` - No es admin

---

### 3.2 Obtener Secuencias de Email

**Endpoint:**
```
GET /api/pac-3.0/email-sequences/:prospectId
```

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "admin_id": 1,
    "prospect_id": 1,
    "sequence_number": 1,
    "email_subject": "Oportunidad de Crecimiento",
    "email_body": "Hola John...",
    "status": "sent",
    "sent_at": "2024-01-15T10:40:00Z",
    "response_status": "positive",
    "response_text": "Gracias por contactarme, me interesa saber más",
    "response_at": "2024-01-15T11:00:00Z",
    "created_at": "2024-01-15T10:40:00Z"
  }
]
```

---

## 🗺️ MÓDULO 4: VISUALIZACIÓN Y MONITOREO

### 4.1 Obtener Estadísticas del Dashboard

**Endpoint:**
```
GET /api/pac-3.0/dashboard-stats
```

**Respuesta (200):**
```json
{
  "totalProspects": 45,
  "prospectsByStatus": [
    {
      "status": "new",
      "count": 20
    },
    {
      "status": "analyzed",
      "count": 15
    },
    {
      "status": "contacted",
      "count": 10
    }
  ],
  "emailsSent": 25,
  "analysisCompleted": 15,
  "averageScore": "0.78"
}
```

---

### 4.2 Obtener Prospectos para Mapa

**Endpoint:**
```
GET /api/pac-3.0/map-prospects
```

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "company_name": "Tech Innovations Inc",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "ai_score": 0.85,
    "status": "analyzed",
    "industry": "Technology"
  },
  {
    "id": 2,
    "company_name": "Digital Solutions LLC",
    "latitude": 30.2672,
    "longitude": -97.7431,
    "ai_score": 0.72,
    "status": "analyzed",
    "industry": "Technology"
  }
]
```

---

### 4.3 Obtener Eventos de Monitoreo

**Endpoint:**
```
GET /api/pac-3.0/monitoring-events?limit=50
```

**Query Parameters:**
- `limit` (opcional, default: 50) - Número máximo de eventos

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "admin_id": 1,
    "event_type": "search_started",
    "event_description": "Búsqueda iniciada: USA, Technology",
    "status": "in_progress",
    "prospect_id": null,
    "created_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "admin_id": 1,
    "event_type": "search_completed",
    "event_description": "Se encontraron 2 prospectos",
    "status": "completed",
    "prospect_id": null,
    "created_at": "2024-01-15T10:31:00Z"
  },
  {
    "id": 3,
    "admin_id": 1,
    "event_type": "ai_analysis_completed",
    "event_description": "Análisis IA completado para Tech Innovations Inc",
    "status": "completed",
    "prospect_id": 1,
    "created_at": "2024-01-15T10:35:00Z"
  },
  {
    "id": 4,
    "admin_id": 1,
    "event_type": "email_sent",
    "event_description": "Email enviado a john.smith@company.com",
    "status": "completed",
    "prospect_id": 1,
    "created_at": "2024-01-15T10:40:00Z"
  }
]
```

---

## 🔄 Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| `200` | OK - Solicitud exitosa |
| `201` | Created - Recurso creado |
| `400` | Bad Request - Parámetros inválidos |
| `401` | Unauthorized - No autenticado |
| `403` | Forbidden - No es admin |
| `404` | Not Found - Recurso no encontrado |
| `500` | Server Error - Error del servidor |

---

## 📝 Ejemplos de cURL

### Ejemplo 1: Buscar Prospectos

```bash
curl -X POST http://localhost:5000/api/pac-3.0/search-prospects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "country": "USA",
    "industry": "Technology",
    "keywords": "startup"
  }'
```

### Ejemplo 2: Obtener Estadísticas

```bash
curl http://localhost:5000/api/pac-3.0/dashboard-stats \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Ejemplo 3: Analizar Prospecto

```bash
curl -X POST http://localhost:5000/api/pac-3.0/analyze-prospect/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Ejemplo 4: Enviar Email

```bash
curl -X POST http://localhost:5000/api/pac-3.0/send-email-sequence/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "emailSubject": "Oportunidad de Crecimiento",
    "emailBody": "Hola John...",
    "contactEmail": "john@company.com"
  }'
```

### Ejemplo 5: Obtener Eventos de Monitoreo

```bash
curl http://localhost:5000/api/pac-3.0/monitoring-events?limit=20 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🧪 Obtener Token JWT

### 1. Registrarse

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### 2. Iniciar Sesión

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

**Respuesta:**
```json
{
  "_id": 1,
  "name": "Admin User",
  "email": "admin@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com"
  }
}
```

### 3. Convertir a Admin

```bash
cd backend
node scripts/make-admin.js admin@example.com
```

---

## 📊 Tipos de Datos

### Prospect Status
- `new` - Nuevo prospecto
- `analyzed` - Analizado con IA
- `contacted` - Contactado
- `qualified` - Calificado
- `rejected` - Rechazado

### Email Status
- `pending` - Pendiente de envío
- `sent` - Enviado
- `bounced` - Rebotado
- `replied` - Respondido

### Event Status
- `in_progress` - En progreso
- `completed` - Completado
- `error` - Error

### Classification
- `Alto potencial IA/ML` - Para empresas tech
- `Alto potencial Web/App` - Para empresas web
- `Bajo potencial` - No califica

---

## 🔒 Seguridad

### Headers Requeridos
```
Authorization: Bearer {TOKEN}
Content-Type: application/json
```

### Validaciones
- Token JWT válido
- Usuario autenticado
- Rol = 'admin'
- Datos del admin coinciden con admin_id

### Límites
- Max 50 eventos por request
- Max 1000 prospectos por búsqueda
- Timeout: 30 segundos

---

## 📈 Rate Limiting (Futuro)

Próximamente:
- 100 requests por minuto por usuario
- 1000 requests por hora por usuario
- Throttling automático

---

**Referencia Completa de API PAC 3.0** ✨
