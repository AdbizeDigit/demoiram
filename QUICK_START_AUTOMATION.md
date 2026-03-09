# 🚀 Inicio Rápido - Sistema de Automatización

## ⚡ En 5 Minutos

### 1. Instalar Dependencia
```bash
cd backend
npm install node-cron
```

### 2. Crear Tablas
```bash
npm run init-automation
```

### 3. Reiniciar Servidor
```bash
npm run dev
```

¡Listo! El sistema de automatización ya está funcionando.

---

## 🎯 Primera Búsqueda Automática

### Opción A: Usando curl

```bash
curl -X POST http://localhost:5000/api/automation/scheduled-search/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "name": "Tech Madrid - Diario",
    "location": "Madrid",
    "schedule": "daily",
    "minLeadScore": 70,
    "enabled": true,
    "notifyEmail": "tu@email.com"
  }'
```

### Opción B: Usando Postman

1. **POST** `http://localhost:5000/api/automation/scheduled-search/create`
2. Headers: `Authorization: Bearer TU_TOKEN`
3. Body (JSON):
```json
{
  "name": "Tech Madrid - Diario",
  "location": "Madrid",
  "schedule": "daily",
  "minLeadScore": 70,
  "enabled": true,
  "notifyEmail": "tu@email.com"
}
```

### Opción C: Desde el Frontend (próximamente)

---

## 🔥 Ver Resultados

### 1. Ver búsquedas programadas
```bash
GET /api/automation/scheduled-search/list
```

### 2. Ver leads capturados
```bash
GET /api/crm/leads?quality=hot
```

### 3. Ver métricas
```bash
GET /api/metrics/overview
```

---

## 📊 Dashboard Visual

Próximamente crearemos un dashboard visual donde podrás:
- ✅ Crear/editar búsquedas programadas
- ✅ Ver leads en tiempo real
- ✅ Gestionar pipeline
- ✅ Ver métricas y gráficos
- ✅ Configurar webhooks

---

## 🎓 Siguientes Pasos

1. **Lee la documentación completa:** `AUTOMATION_GUIDE.md`
2. **Configura un webhook** para recibir notificaciones
3. **Crea seguimiento automático** para tus hot leads
4. **Genera emails con IA** personalizados
5. **Monitorea métricas** y optimiza

---

## 🔧 Configuración Opcional

### APIs Externas (para enriquecimiento)

Agrega a tu `.env`:
```bash
DEEPSEEK_API_KEY=sk-xxxxx  # Para generación de emails
HUNTER_API_KEY=xxxxx       # Para validación de emails
CLEARBIT_API_KEY=xxxxx     # Para datos de empresas
```

Sin estas keys, el sistema funciona con datos simulados.

---

## 📈 Ejemplo Completo de Flujo Automático

### Configuración Inicial (Una sola vez)

```javascript
// 1. Crear búsqueda automática diaria
POST /api/automation/scheduled-search/create
{
  "name": "Tech España - Diario",
  "location": "España",
  "industry": "Technology",
  "schedule": "daily",
  "minLeadScore": 70
}

// 2. Crear webhook a Slack
POST /api/automation/webhooks/create
{
  "name": "Slack Notifications",
  "url": "https://hooks.slack.com/services/XXX/YYY/ZZZ",
  "events": ["new_hot_lead"]
}
```

### Lo que Sucede Automáticamente

1. **Cada día a las 9am:**
   - Sistema busca leads en España
   - Filtra por industria: Technology
   - Califica cada lead (0-100)
   - Guarda en el CRM

2. **Cuando encuentra un Hot Lead (score >= 85):**
   - Envía notificación a Slack
   - Crea seguimiento automático
   - Programa 4 emails en 7 días
   - Genera primer email con IA

3. **Durante los siguientes días:**
   - Envía emails programados
   - Registra interacciones
   - Actualiza métricas
   - Te alerta si el lead responde

### Resultado Final

- 🎯 **10-15 leads calificados por día**
- 🔥 **3-5 hot leads por semana**
- 📧 **Emails automáticos personalizados**
- 📊 **Pipeline completo y organizado**
- ⏱️ **Todo sin intervención manual**

---

## 💡 Tips Rápidos

### Maximizar Resultados

1. **Sé específico con la ubicación**
   - ✅ "Madrid" mejor que "España"
   - ✅ Múltiples búsquedas por ciudad

2. **Ajusta el score mínimo**
   - Hot leads: 85+
   - Warm leads: 70-84
   - Cold leads: 50-69

3. **Usa webhooks para integraciones**
   - Slack para notificaciones
   - Zapier para conectar con tu CRM
   - Make para automatizaciones complejas

4. **Monitorea y optimiza**
   - Revisa métricas semanalmente
   - Ajusta scoring según conversión
   - Optimiza emails según open rate

---

## 🆘 Problemas Comunes

### "No se ejecutan las búsquedas"
- Verifica que `enabled: true`
- Comprueba que el servidor esté corriendo
- Revisa logs en la terminal

### "No recibo notificaciones"
- Verifica la URL del webhook
- Comprueba que el evento esté en la lista
- Prueba el webhook manualmente

### "Los emails no se generan"
- Necesitas `DEEPSEEK_API_KEY` en .env
- Verifica que tienes créditos en DeepSeek
- Revisa logs de error en terminal

---

## 📚 Recursos

- **Guía Completa:** `AUTOMATION_GUIDE.md`
- **Guía de Scraping:** `SCRAPING_LEAD_GENERATION_GUIDE.md`
- **Documentación de APIs:** Próximamente

---

## 🎉 ¡Estás Listo!

El sistema ya está capturando leads automáticamente. En las próximas 24 horas deberías ver tus primeros resultados en:

```bash
GET /api/crm/leads
GET /api/metrics/overview
```

**¿Preguntas?** contacto@adbize.com

---

**Última actualización:** Enero 2025
