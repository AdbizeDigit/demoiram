# 🚀 Quick Reference - Sistema de Automatización

## ⚡ Inicio Rápido (3 minutos)

### 1️⃣ Inicializar Base de Datos
```bash
cd backend
npm run init-automation
```

### 2️⃣ Iniciar Backend
```bash
cd backend
npm run dev
# ✅ Debe mostrar: "🤖 Sistema de automatización inicializado"
```

### 3️⃣ Iniciar Frontend
```bash
cd frontend
npm run dev
# ✅ Abrir: http://localhost:5173
```

---

## 🎯 Páginas Principales

| Ruta | Página | Función |
|------|--------|---------|
| `/dashboard/automation` | Dashboard | Vista general del sistema |
| `/dashboard/automation/scheduled-searches` | Búsquedas | Configurar búsquedas automáticas |
| `/dashboard/automation/crm` | CRM | Gestionar leads capturados |
| `/dashboard/automation/metrics` | Métricas | Analytics y performance |
| `/dashboard/automation/webhooks` | Webhooks | Integraciones externas |

---

## 📊 Endpoints API Principales

### Búsquedas Programadas
```javascript
GET    /api/automation/scheduled-searches       // Listar
POST   /api/automation/scheduled-searches       // Crear
PUT    /api/automation/scheduled-searches/:id   // Actualizar
DELETE /api/automation/scheduled-searches/:id   // Eliminar
```

### CRM
```javascript
GET  /api/crm/leads                    // Listar leads
POST /api/crm/capture-lead             // Capturar lead
PUT  /api/crm/leads/:id/status         // Cambiar estado
POST /api/crm/leads/:id/interaction    // Agregar nota
```

### Métricas
```javascript
GET /api/metrics/summary?days=30           // Resumen
GET /api/metrics/conversion-funnel         // Embudo
GET /api/metrics/performance-summary       // Performance
```

### Webhooks
```javascript
GET    /api/automation/webhooks           // Listar
POST   /api/automation/webhooks           // Crear
GET    /api/automation/webhooks/:id/logs  // Ver logs
```

---

## 🎨 Componentes Frontend Creados

```
frontend/src/pages/
├── AutomationDashboard.jsx       ✅ Dashboard principal
├── ScheduledSearchesPage.jsx     ✅ Búsquedas programadas
├── CRMPage.jsx                   ✅ Gestión de leads
├── MetricsPage.jsx               ✅ Métricas y analytics
└── WebhooksPage.jsx              ✅ Webhooks e integraciones
```

---

## 🗄️ Tablas de Base de Datos

```sql
-- 15 tablas creadas
scheduled_searches          ✅
scheduled_search_runs       ✅
lead_tracking              ✅
tracking_actions           ✅
generated_emails           ✅
notification_settings      ✅
webhooks                   ✅
webhook_logs               ✅
lead_metrics               ✅
auto_campaigns             ✅
captured_leads             ✅
lead_interactions          ✅
email_templates            ✅
ai_lead_analysis           ✅
auto_enrichment_jobs       ✅
```

---

## 🔑 Variables de Entorno Clave

```bash
# Backend (.env)
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
DEEPSEEK_API_KEY=sk-...
PORT=5000
FRONTEND_URL=http://localhost:5173
```

---

## 🎯 Flujo Típico de Uso

```
1. Crear Búsqueda Programada
   ↓
2. Sistema busca leads automáticamente
   ↓
3. Leads se capturan en CRM
   ↓
4. Ver y gestionar en CRM Page
   ↓
5. Analizar métricas
   ↓
6. Configurar webhooks para integraciones
```

---

## 🐛 Troubleshooting Rápido

### Backend no conecta a DB
```bash
# Verificar .env
cat backend/.env | grep DATABASE_URL
```

### Frontend muestra "Loading..."
```bash
# Verificar backend corriendo
curl http://localhost:5000/api/health
```

### Búsquedas no se ejecutan
```bash
# Logs deben mostrar:
# "🤖 Sistema de automatización inicializado"
```

---

## 📦 Comandos NPM Backend

```bash
npm run dev              # Iniciar servidor
npm run init-db          # Iniciar DB principal
npm run init-automation  # Iniciar tablas automatización
```

---

## 🎨 Stack Tecnológico

### Backend
- Node.js + Express
- PostgreSQL (Neon)
- node-cron (scheduling)
- DeepSeek API (AI)

### Frontend
- React 18
- React Router v6
- Tailwind CSS
- Lucide Icons

---

## 📈 Métricas del Sistema

- **Backend:** 11 sistemas implementados
- **Frontend:** 5 páginas completas
- **Base de Datos:** 15 tablas + índices
- **Endpoints:** 100+ rutas API
- **Valor estimado:** $89,500+

---

## 🎓 Documentación Completa

- `SISTEMA_COMPLETO_IMPLEMENTADO.md` - Guía completa del sistema
- `SCRAPING_LEAD_GENERATION_GUIDE.md` - Sistema de scraping
- `AUTOMATION_GUIDE.md` - Sistema de automatización
- `FRONTEND_IMPLEMENTATION_GUIDE.md` - Desarrollo frontend

---

## ✅ Checklist de Verificación

- [ ] Base de datos inicializada (`npm run init-automation`)
- [ ] Backend corriendo en puerto 5000
- [ ] Frontend corriendo en puerto 5173
- [ ] Usuario registrado en el sistema
- [ ] Navegación a `/dashboard/automation` funciona
- [ ] Búsquedas programadas se pueden crear
- [ ] CRM muestra leads correctamente
- [ ] Métricas cargan datos
- [ ] Webhooks se pueden configurar

---

## 🚀 Producción Ready

### Pre-deployment Checklist
- [ ] Variables de entorno configuradas
- [ ] Base de datos migrada
- [ ] SSL configurado
- [ ] CORS configurado para dominio de producción
- [ ] Rate limiting activado
- [ ] Logs configurados
- [ ] Backups de DB programados

---

*Quick Reference - Última actualización: Noviembre 2025*
