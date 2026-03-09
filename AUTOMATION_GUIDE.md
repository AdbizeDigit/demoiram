# 🤖 Guía Completa del Sistema de Automatización

## 📋 Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Instalación](#instalación)
3. [Búsquedas Programadas](#búsquedas-programadas)
4. [Seguimiento Automático de Leads](#seguimiento-automático)
5. [Generador de Emails con IA](#generador-de-emails)
6. [Mini CRM Automático](#mini-crm)
7. [Dashboard de Métricas](#dashboard-de-métricas)
8. [Webhooks e Integraciones](#webhooks)
9. [Configuración Avanzada](#configuración-avanzada)

---

## 🎯 Visión General

El sistema de automatización convierte tu plataforma de scraping en una **máquina de captación de clientes completamente automática**. Una vez configurado, el sistema:

✅ **Busca leads automáticamente** en horarios programados
✅ **Califica y prioriza** leads usando IA
✅ **Hace seguimiento automático** con secuencias personalizadas
✅ **Genera emails** personalizados con IA
✅ **Gestiona tu pipeline** de ventas
✅ **Envía notificaciones** cuando hay leads hot
✅ **Integra con tu stack** vía webhooks
✅ **Mide resultados** en tiempo real

---

## 🚀 Instalación

### Paso 1: Instalar Dependencias

```bash
cd backend
npm install node-cron
```

### Paso 2: Crear Tablas de Automatización

```bash
npm run init-automation
```

Esto creará las siguientes tablas:
- `scheduled_searches` - Búsquedas programadas
- `scheduled_search_runs` - Historial de ejecuciones
- `lead_tracking` - Seguimiento de leads
- `tracking_actions` - Acciones programadas
- `generated_emails` - Emails generados por IA
- `notification_settings` - Configuración de notificaciones
- `webhooks` - Webhooks configurados
- `webhook_logs` - Logs de webhooks
- `lead_metrics` - Métricas diarias
- `auto_campaigns` - Campañas automáticas
- `captured_leads` - Base de datos de leads
- `lead_interactions` - Historial de interacciones

### Paso 3: Configurar Variables de Entorno

Agrega a tu `.env`:

```bash
# APIs Opcionales
DEEPSEEK_API_KEY=tu_api_key_deepseek  # Para generación de emails con IA
HUNTER_API_KEY=tu_api_key_hunter      # Para enriquecimiento
CLEARBIT_API_KEY=tu_api_key_clearbit  # Para datos de empresas

# Base URL del servidor (para cron jobs internos)
BASE_URL=http://localhost:5000
```

### Paso 4: Reiniciar el Servidor

```bash
npm run dev
```

Deberías ver:
```
✅ Server running on port 5000
✅ 0 búsquedas programadas inicializadas
🤖 Sistema de automatización inicializado
```

---

## 📅 Búsquedas Programadas

### Crear Búsqueda Programada

**Endpoint:** `POST /api/automation/scheduled-search/create`

```javascript
{
  "name": "Leads Tech Madrid - Diario",
  "location": "Madrid",
  "industry": "Technology",
  "minEmployees": 50,
  "maxEmployees": 500,
  "schedule": "daily",  // 'daily', 'weekly', 'monthly', 'custom'
  "minLeadScore": 70,   // Score mínimo para notificar
  "enabled": true,
  "notifyEmail": "tu@email.com",
  "webhookUrl": "https://tu-webhook.com/leads"
}
```

**Horarios Predefinidos:**
- `daily` → Todos los días a las 9am
- `weekly` → Todos los lunes a las 9am
- `monthly` → Primer día del mes a las 9am
- `custom` → Usa `cronExpression` personalizado

**Ejemplo de Cron Expression:**
```javascript
{
  "schedule": "custom",
  "cronExpression": "0 9,14 * * 1-5"  // 9am y 2pm, lunes a viernes
}
```

### Listar Búsquedas Programadas

**Endpoint:** `GET /api/automation/scheduled-search/list`

Respuesta:
```json
{
  "success": true,
  "scheduledSearches": [
    {
      "id": 1,
      "name": "Leads Tech Madrid - Diario",
      "location": "Madrid",
      "schedule": "daily",
      "enabled": true,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### Habilitar/Deshabilitar Búsqueda

**Endpoint:** `PUT /api/automation/scheduled-search/:id`

```javascript
{
  "enabled": false  // Pausar búsqueda
}
```

### Eliminar Búsqueda Programada

**Endpoint:** `DELETE /api/automation/scheduled-search/:id`

---

## 🎯 Seguimiento Automático de Leads

### Secuencias Disponibles

El sistema incluye 3 secuencias predefinidas:

#### 1. **Secuencia HOT** (Para leads calientes)
```
Día 0: Email de primer contacto
Día 2: Follow-up
Día 5: Llamada telefónica (tarea)
Día 7: Último seguimiento
```

#### 2. **Secuencia WARM** (Para leads tibios)
```
Día 0: Email de primer contacto
Día 3: Follow-up
Día 7: Contenido de valor
Día 14: Check-in
```

#### 3. **Secuencia COLD** (Para leads fríos)
```
Día 0: Email de introducción
Día 7: Contenido educativo
Día 21: Caso de estudio
Día 45: Seguimiento trimestral
```

### Crear Seguimiento Automático

**Endpoint:** `POST /api/automation/lead-tracking/create`

```javascript
{
  "leadId": "lead_abc123",
  "leadData": {
    "name": "María González",
    "company": "TechCorp",
    "email": "maria@techcorp.com",
    "title": "CTO"
  },
  "sequence": "hot",  // 'hot', 'warm', 'cold'
  "startDate": "2025-01-20"  // Opcional, default: hoy
}
```

Respuesta:
```json
{
  "success": true,
  "tracking": {...},
  "message": "Seguimiento automático creado con 4 acciones programadas"
}
```

### Ver Acciones Pendientes

**Endpoint:** `GET /api/automation/lead-tracking/pending-actions`

Muestra todas las acciones programadas para hoy y mañana:

```json
{
  "success": true,
  "pendingActions": [
    {
      "id": 1,
      "action_type": "email",
      "subject": "Primer contacto",
      "scheduled_date": "2025-01-16T09:00:00Z",
      "lead_data": {...}
    }
  ]
}
```

---

## 📧 Generador de Emails con IA

### Generar Email Personalizado

**Endpoint:** `POST /api/automation/email-generator/generate`

```javascript
{
  "leadData": {
    "name": "Carlos Rodríguez",
    "company": "InnovaTech",
    "title": "CEO",
    "industry": "Fintech"
  },
  "emailType": "first_contact",  // 'first_contact', 'follow_up', 'value_content', 'case_study'
  "buyingSignals": [
    {
      "signal": "Financiación reciente",
      "description": "Recibió ronda Serie A de 5M€"
    }
  ],
  "companyInfo": {
    "employees": "50-100",
    "location": "Madrid"
  }
}
```

Respuesta:
```json
{
  "success": true,
  "email": {
    "subject": "Optimiza tu inversión Serie A con IA aplicada",
    "body": "Hola Carlos,\n\nFelicidades por vuestra ronda Serie A...",
    "type": "first_contact"
  }
}
```

**Tipos de Email:**

1. **`first_contact`** - Primer contacto (breve, genera interés)
2. **`follow_up`** - Seguimiento (recuerda contexto, agrega valor)
3. **`value_content`** - Contenido educativo (aporta conocimiento)
4. **`case_study`** - Caso de estudio (prueba social)

---

## 📊 Mini CRM Automático

### Capturar Lead Automáticamente

**Endpoint:** `POST /api/crm/capture-lead`

```javascript
{
  "sourceType": "scraping_auto_search",
  "sourceId": "search_123",
  "leadData": {
    "name": "Ana Martínez",
    "company": "Digital Solutions",
    "email": "ana@digitalsolutions.com",
    "phone": "+34 912 345 678",
    "industry": "Marketing Digital",
    "website": "digitalsolutions.com"
  },
  "leadScore": 85,
  "leadQuality": "hot"
}
```

El sistema automáticamente:
- ✅ Evita duplicados (por email)
- ✅ Actualiza score si el lead ya existe
- ✅ Programa siguiente acción según calidad
- ✅ Registra interacción inicial

### Listar Leads

**Endpoint:** `GET /api/crm/leads?status=new&quality=hot&minScore=70`

Parámetros:
- `status` - new, contacted, qualified, meeting_scheduled, proposal_sent, closed_won, closed_lost
- `quality` - hot, warm, cold, low
- `minScore` - Score mínimo (0-100)
- `search` - Buscar por nombre/email/empresa
- `limit` - Límite de resultados (default: 50)
- `offset` - Paginación

### Ver Lead Individual con Historial

**Endpoint:** `GET /api/crm/leads/:id`

```json
{
  "success": true,
  "lead": {...},
  "interactions": [
    {
      "interaction_type": "discovered",
      "subject": "Lead capturado",
      "created_at": "2025-01-15T10:00:00Z"
    },
    {
      "interaction_type": "email",
      "subject": "Primer contacto enviado",
      "created_at": "2025-01-15T11:30:00Z"
    }
  ]
}
```

### Actualizar Estado del Lead

**Endpoint:** `PUT /api/crm/leads/:id/status`

```javascript
{
  "status": "meeting_scheduled",
  "notes": "Reunión programada para el 20/01 a las 10am"
}
```

### Registrar Interacción

**Endpoint:** `POST /api/crm/leads/:id/interaction`

```javascript
{
  "interactionType": "call",
  "channel": "phone",
  "subject": "Llamada de seguimiento",
  "content": "Hablamos sobre sus necesidades de automatización...",
  "outcome": "interested"
}
```

### Ver Pipeline

**Endpoint:** `GET /api/crm/pipeline/summary`

```json
{
  "success": true,
  "pipeline": [
    { "status": "new", "count": 15, "avg_score": 72 },
    { "status": "contacted", "count": 8, "avg_score": 78 },
    { "status": "meeting_scheduled", "count": 3, "avg_score": 85 }
  ]
}
```

### Leads que Necesitan Atención

**Endpoint:** `GET /api/crm/leads/needs-attention`

Devuelve leads que requieren acción inmediata:
- Hot leads sin contactar en 24h
- Warm leads sin contactar en 3 días
- Leads con acción vencida

---

## 📈 Dashboard de Métricas

### Métricas Generales

**Endpoint:** `GET /api/metrics/overview?period=30`

```json
{
  "success": true,
  "period": "30 días",
  "metrics": {
    "leads": {
      "total_leads": 150,
      "hot_leads": 45,
      "warm_leads": 60,
      "cold_leads": 35,
      "contacted": 80,
      "meetings_scheduled": 15,
      "deals_won": 5,
      "avg_score": 72.5
    },
    "scheduledSearches": {
      "total_scheduled": 3,
      "active_scheduled": 2
    },
    "recentRuns": {
      "total_runs": 60,
      "total_qualified_leads": 150,
      "avg_qualified_per_run": 2.5
    },
    "conversion": {
      "contactRate": 53.3,
      "meetingRate": 18.8,
      "winRate": 33.3
    }
  }
}
```

### Tendencias por Día

**Endpoint:** `GET /api/metrics/trends?period=30`

```json
{
  "success": true,
  "trends": [
    {
      "date": "2025-01-15",
      "total_leads": 5,
      "hot_leads": 2,
      "warm_leads": 3,
      "avg_score": 75.2
    }
  ]
}
```

### Top Fuentes de Leads

**Endpoint:** `GET /api/metrics/top-sources`

```json
{
  "success": true,
  "topSources": [
    {
      "source_type": "scraping_auto_search",
      "total_leads": 80,
      "hot_leads": 25,
      "avg_score": 74.5
    },
    {
      "source_type": "news_mention",
      "total_leads": 40,
      "hot_leads": 15,
      "avg_score": 78.2
    }
  ]
}
```

### Próximas Acciones

**Endpoint:** `GET /api/metrics/upcoming-actions`

Lista las próximas 20 acciones programadas en los próximos 7 días.

### Leads Prioritarios

**Endpoint:** `GET /api/metrics/priority-leads`

Top 10 hot leads que necesitan atención inmediata.

### Resumen de Rendimiento

**Endpoint:** `GET /api/metrics/performance-summary?period=30`

```json
{
  "success": true,
  "period": "30 días",
  "summary": {
    "total_leads": 150,
    "hot_leads": 45,
    "emails_sent": 200,
    "emails_opened": 120,
    "emails_replied": 45,
    "meetings_scheduled": 15,
    "deals_closed": 5,
    "revenue": 25000,
    "rates": {
      "openRate": 60.0,
      "replyRate": 22.5,
      "meetingRate": 33.3,
      "closeRate": 33.3
    }
  }
}
```

### Comparar Periodos

**Endpoint:** `GET /api/metrics/compare-periods`

Compara último mes vs mes anterior con % de cambio.

---

## 🔗 Webhooks e Integraciones

### Crear Webhook

**Endpoint:** `POST /api/automation/webhooks/create`

```javascript
{
  "name": "Slack - Hot Leads",
  "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "events": [
    "new_hot_lead",
    "scheduled_search_complete",
    "buying_signal_detected"
  ],
  "enabled": true
}
```

**Eventos Disponibles:**
- `new_hot_lead` - Nuevo lead con score >= 85
- `scheduled_search_complete` - Búsqueda programada completada
- `buying_signal_detected` - Señal de compra detectada
- `meeting_scheduled` - Reunión agendada
- `deal_closed` - Deal cerrado

### Payload del Webhook

Cuando se dispara un evento, tu URL recibirá:

```json
{
  "event": "new_hot_lead",
  "data": {
    "leadId": "123",
    "name": "Carlos Rodríguez",
    "company": "TechCorp",
    "score": 92,
    "quality": "hot",
    "email": "carlos@techcorp.com",
    "buyingSignals": [...]
  },
  "timestamp": "2025-01-15T10:00:00Z",
  "webhook_id": "webhook_456"
}
```

### Integraciones Comunes

#### Slack

```javascript
{
  "name": "Slack Notifications",
  "url": "https://hooks.slack.com/services/XXX/YYY/ZZZ",
  "events": ["new_hot_lead", "meeting_scheduled"]
}
```

#### Zapier

```javascript
{
  "name": "Zapier Integration",
  "url": "https://hooks.zapier.com/hooks/catch/XXXXX/YYYYY/",
  "events": ["new_hot_lead", "scheduled_search_complete"]
}
```

#### Make (Integromat)

```javascript
{
  "name": "Make Automation",
  "url": "https://hook.eu1.make.com/XXXXXXXXXXXXX",
  "events": ["new_hot_lead"]
}
```

---

## ⚙️ Configuración Avanzada

### Personalizar Secuencias de Seguimiento

Edita `backend/routes/automation.js` y modifica el objeto `sequences`:

```javascript
const sequences = {
  custom: [
    { day: 0, action: 'email_1', subject: 'Introducción', type: 'email' },
    { day: 1, action: 'linkedin_connect', subject: 'Conexión LinkedIn', type: 'task' },
    { day: 3, action: 'follow_up', subject: 'Seguimiento', type: 'email' },
    { day: 7, action: 'phone_call', subject: 'Llamada', type: 'task' }
  ]
}
```

### Ajustar Scoring de Leads

Edita `backend/routes/multi-source-scraping.js` en la función `calculateLeadScore()`:

```javascript
// Ejemplo: Aumentar peso de recencia
if (daysOld < 3) {
  recencyScore = 25  // Antes: 20
  factors.push({ factor: 'Muy reciente (<3 días)', points: 25 })
}
```

### Configurar Notificaciones

**Endpoint:** `POST /api/automation/notifications/create`

```javascript
{
  "type": "hot_lead",
  "channels": ["email", "webhook"],
  "criteria": {
    "minScore": 85,
    "industries": ["Technology", "Fintech"],
    "minEmployees": 50
  },
  "enabled": true
}
```

---

## 🎯 Casos de Uso Completos

### Caso 1: Sistema Completamente Automático

**Objetivo:** Generar 50 leads calificados por semana sin intervención manual

```javascript
// 1. Crear 5 búsquedas programadas para diferentes ubicaciones
POST /api/automation/scheduled-search/create
{
  "name": "Madrid Tech - Diario",
  "location": "Madrid",
  "schedule": "daily",
  "minLeadScore": 70,
  "notifyEmail": "tu@email.com"
}

// 2. Repetir para: Barcelona, Valencia, Bilbao, Sevilla

// 3. El sistema automáticamente:
// - Busca leads cada día a las 9am
// - Los captura en el CRM
// - Crea seguimiento automático según calidad
// - Te notifica de hot leads
// - Genera emails personalizados
// - Programa acciones de seguimiento
```

**Resultado esperado:** 10 leads/día = 50 leads/semana, 200 leads/mes

### Caso 2: Integración con Tu CRM Existente

```javascript
// 1. Crear webhook hacia tu CRM
POST /api/automation/webhooks/create
{
  "name": "Mi CRM",
  "url": "https://mi-crm.com/api/leads",
  "events": ["new_hot_lead"]
}

// 2. Cuando se detecta un hot lead, se envía automáticamente a tu CRM
// 3. Puedes gestionar el lead en tu CRM habitual
```

### Caso 3: Secuencia de Nurturing Completa

```javascript
// 1. Crear seguimiento para lead
POST /api/automation/lead-tracking/create
{
  "leadId": "lead_123",
  "leadData": {...},
  "sequence": "warm"
}

// 2. El sistema programa 4 emails automáticos en 14 días
// 3. Genera cada email con IA personalizado
// 4. Registra interacciones
// 5. Te notifica si el lead responde o abre emails
```

---

## 📊 Métricas de Éxito

Monitorea estos KPIs clave:

### Diarios
- Nuevos leads capturados
- Hot leads generados
- Acciones completadas

### Semanales
- Leads contactados
- Tasa de apertura de emails
- Reuniones agendadas

### Mensuales
- Conversion rate (lead → cliente)
- Revenue generado
- ROI del sistema de automatización

---

## 🆘 Troubleshooting

### Las búsquedas programadas no se ejecutan

1. Verifica que el servidor esté corriendo
2. Comprueba los logs: `console.log` en terminal
3. Verifica que `enabled = true` en la BD
4. Revisa la expresión cron con https://crontab.guru

### Los webhooks no se disparan

1. Verifica la URL del webhook
2. Comprueba logs en `webhook_logs`
3. Asegúrate de que `enabled = true`
4. Prueba el webhook manualmente con Postman

### Los emails generados no son buenos

1. Verifica que tienes `DEEPSEEK_API_KEY` configurado
2. Ajusta el prompt en `automation.js`
3. Proporciona más contexto en `buyingSignals`

---

## 🚀 Próximos Pasos

1. ✅ Configura tu primera búsqueda programada
2. ✅ Crea un webhook hacia Slack/Zapier
3. ✅ Genera tu primer email con IA
4. ✅ Monitorea métricas durante 1 semana
5. ✅ Optimiza scoring y secuencias según resultados

---

**¿Preguntas?** Contacta: contacto@adbize.com

**Última actualización:** Enero 2025
**Versión:** 1.0
