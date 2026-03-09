# 📦 Instalación Completa del Sistema

## ✅ Checklist de Instalación

```
[ ] 1. Instalar dependencias
[ ] 2. Crear tablas de base de datos
[ ] 3. Configurar variables de entorno (opcional)
[ ] 4. Reiniciar servidor
[ ] 5. Verificar funcionamiento
[ ] 6. Crear primera búsqueda automática
```

---

## 🚀 Paso a Paso

### 1. Instalar Dependencias

```bash
cd backend
npm install node-cron
```

**¿Qué hace?**
Instala `node-cron` para programar tareas automáticas.

---

### 2. Crear Tablas de Base de Datos

```bash
npm run init-automation
```

**¿Qué hace?**
Crea 12 nuevas tablas en PostgreSQL:
- scheduled_searches
- scheduled_search_runs
- lead_tracking
- tracking_actions
- generated_emails
- notification_settings
- webhooks
- webhook_logs
- lead_metrics
- auto_campaigns
- captured_leads
- lead_interactions

**Output esperado:**
```
🚀 Iniciando creación de tablas de automatización...
✅ Tabla scheduled_searches creada
✅ Tabla scheduled_search_runs creada
✅ Tabla lead_tracking creada
...
✅ Índices creados
✅ ¡Todas las tablas de automatización creadas exitosamente!
```

**Si falla:**
- Verifica que PostgreSQL esté corriendo
- Comprueba credenciales en `.env`
- Asegúrate de que la base de datos existe

---

### 3. Configurar Variables de Entorno (Opcional)

Abre `backend/.env` y agrega:

```bash
# APIs Opcionales (para enriquecimiento)
DEEPSEEK_API_KEY=sk-xxxxx
HUNTER_API_KEY=xxxxx
CLEARBIT_API_KEY=xxxxx

# Base URL (para cron jobs internos)
BASE_URL=http://localhost:5000
```

**¿Son necesarias?**
- ❌ **NO** - El sistema funciona sin ellas (usa datos simulados)
- ✅ **SI** - Si quieres enriquecimiento y validación real

**Dónde conseguirlas:**
- DeepSeek: https://platform.deepseek.com
- Hunter.io: https://hunter.io/api
- Clearbit: https://clearbit.com/pricing

---

### 4. Reiniciar Servidor

```bash
npm run dev
```

**Output esperado:**
```
✅ Server running on port 5000
📍 API available at http://localhost:5000/api
✅ 0 búsquedas programadas inicializadas
🤖 Sistema de automatización inicializado
```

---

### 5. Verificar Funcionamiento

#### Test 1: Health Check
```bash
curl http://localhost:5000/api/health
```

Esperado: `{"status":"ok","message":"Server is running"}`

#### Test 2: Ver Métricas
```bash
curl -X GET http://localhost:5000/api/metrics/overview \
  -H "Authorization: Bearer TU_TOKEN"
```

Esperado: JSON con métricas (inicialmente en 0)

#### Test 3: Listar Búsquedas
```bash
curl -X GET http://localhost:5000/api/automation/scheduled-search/list \
  -H "Authorization: Bearer TU_TOKEN"
```

Esperado: `{"success":true,"scheduledSearches":[]}`

---

### 6. Crear Primera Búsqueda Automática

**Opción A: Con curl**

```bash
curl -X POST http://localhost:5000/api/automation/scheduled-search/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "name": "Tech Madrid - Diario",
    "location": "Madrid",
    "industry": "Technology",
    "schedule": "daily",
    "minLeadScore": 70,
    "enabled": true
  }'
```

**Opción B: Con Postman**

1. POST `http://localhost:5000/api/automation/scheduled-search/create`
2. Headers:
   - `Content-Type: application/json`
   - `Authorization: Bearer TU_TOKEN`
3. Body (raw JSON):
```json
{
  "name": "Tech Madrid - Diario",
  "location": "Madrid",
  "industry": "Technology",
  "schedule": "daily",
  "minLeadScore": 70,
  "enabled": true
}
```

**Respuesta esperada:**
```json
{
  "success": true,
  "scheduledSearch": {
    "id": 1,
    "name": "Tech Madrid - Diario",
    "location": "Madrid",
    ...
  },
  "message": "Búsqueda programada creada exitosamente"
}
```

---

## ✅ Verificación Final

### Comprueba que todo funciona:

```bash
# 1. Ver búsquedas programadas
curl -X GET http://localhost:5000/api/automation/scheduled-search/list \
  -H "Authorization: Bearer TU_TOKEN"

# Debe mostrar la búsqueda creada

# 2. Espera 1 minuto y verifica logs del servidor
# Deberías ver en la terminal algo como:
# "Ejecutando búsqueda programada: Tech Madrid - Diario"

# 3. Ver leads capturados (después de primera ejecución)
curl -X GET http://localhost:5000/api/crm/leads \
  -H "Authorization: Bearer TU_TOKEN"

# 4. Ver métricas actualizadas
curl -X GET http://localhost:5000/api/metrics/overview \
  -H "Authorization: Bearer TU_TOKEN"
```

---

## 🎯 Próximos Pasos

Una vez verificado que todo funciona:

1. **Lee la documentación:**
   - `QUICK_START_AUTOMATION.md` - Inicio rápido
   - `AUTOMATION_GUIDE.md` - Guía completa
   - `RESUMEN_SISTEMA_COMPLETO.md` - Visión general

2. **Configura webhooks:**
   - Slack para notificaciones
   - Zapier para integraciones
   - Tu CRM para sincronización

3. **Crea más búsquedas:**
   - Diferentes ubicaciones
   - Diferentes industrias
   - Diferentes horarios

4. **Optimiza:**
   - Ajusta scoring según resultados
   - Personaliza secuencias de seguimiento
   - Configura APIs de enriquecimiento

---

## 🆘 Troubleshooting

### Error: "Cannot find module 'node-cron'"

**Solución:**
```bash
cd backend
npm install node-cron
```

### Error: "relation 'scheduled_searches' does not exist"

**Solución:**
```bash
npm run init-automation
```

### Error: "No autorizado para usar el módulo de scrapping"

**Solución:**
El sistema solo permite al usuario `contacto@adbize.com`.
Edita `backend/routes/multi-source-scraping.js` para permitir tu usuario.

### Las búsquedas programadas no se ejecutan

**Solución:**
1. Verifica que el servidor esté corriendo
2. Comprueba que `enabled: true`
3. Revisa la expresión cron con https://crontab.guru
4. Mira los logs en la terminal

### Los webhooks no funcionan

**Solución:**
1. Verifica la URL del webhook
2. Comprueba que esté `enabled: true`
3. Revisa logs en `webhook_logs` tabla
4. Prueba el webhook manualmente con Postman

---

## 📊 Estructura de Archivos

Después de la instalación, deberías tener:

```
backend/
├── routes/
│   ├── automation.js          ← NUEVO
│   ├── dashboard-metrics.js   ← NUEVO
│   ├── mini-crm.js            ← NUEVO
│   └── multi-source-scraping.js (mejorado)
├── scripts/
│   └── init-automation-tables.js ← NUEVO
└── server.js (actualizado)

docs/
├── AUTOMATION_GUIDE.md              ← NUEVO
├── QUICK_START_AUTOMATION.md        ← NUEVO
├── RESUMEN_SISTEMA_COMPLETO.md      ← NUEVO
├── INSTALL.md                       ← NUEVO (este archivo)
└── SCRAPING_LEAD_GENERATION_GUIDE.md (existente)
```

---

## 🎉 ¡Instalación Completa!

Tu sistema de captación automática de clientes está listo para funcionar 24/7.

**Próximos pasos:**
1. ✅ Monitorea los logs durante las primeras 24h
2. ✅ Revisa los primeros leads capturados
3. ✅ Ajusta configuración según resultados
4. ✅ Escala agregando más búsquedas programadas

**¿Necesitas ayuda?**
📧 contacto@adbize.com

---

**Última actualización:** Enero 2025
**Versión:** 2.0
