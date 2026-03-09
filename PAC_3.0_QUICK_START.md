# ⚡ PAC 3.0 - Guía Rápida de Inicio

## 🎯 En 5 Minutos

### 1. Convertir Usuario a Admin

```bash
cd backend
node scripts/make-admin.js tu-email@example.com
```

**Salida esperada:**
```
✅ Usuario convertido a admin:
   ID: 1
   Nombre: Tu Nombre
   Email: tu-email@example.com
   Rol: admin
```

### 2. Iniciar la Aplicación

```bash
# En la raíz del proyecto
npm run dev
```

### 3. Acceder a PAC 3.0

1. Abre `http://localhost:3000`
2. Inicia sesión con tu cuenta admin
3. Ve a `/dashboard/pac-3.0`

---

## 📋 Estructura de Archivos Creados

```
backend/
├── routes/
│   └── pac-3.0.js                    # Rutas principales (4 módulos)
├── scripts/
│   └── make-admin.js                 # Script para crear admins
└── config/
    └── database.js                   # Tablas PAC 3.0 agregadas

frontend/
├── pages/
│   └── PAC3AdminPanel.jsx            # Página principal
└── components/
    └── PAC3/
        ├── PAC3Dashboard.jsx         # Módulo 4: Monitoreo
        ├── PAC3Scraper.jsx           # Módulo 1: Rastreo
        ├── PAC3AIAnalysis.jsx        # Módulo 2: Análisis IA
        ├── PAC3EmailSequence.jsx     # Módulo 3: Email
        └── PAC3MapView.jsx           # Visualización en mapa
```

---

## 🔑 Endpoints Principales

### Rastreo
```
POST /api/pac-3.0/search-prospects
GET /api/pac-3.0/prospects
```

### Análisis IA
```
POST /api/pac-3.0/analyze-prospect/:prospectId
```

### Email
```
POST /api/pac-3.0/send-email-sequence/:prospectId
GET /api/pac-3.0/email-sequences/:prospectId
```

### Monitoreo
```
GET /api/pac-3.0/dashboard-stats
GET /api/pac-3.0/map-prospects
GET /api/pac-3.0/monitoring-events
```

---

## 🧪 Pruebas Rápidas

### Test 1: Búsqueda de Prospectos

```bash
curl -X POST http://localhost:5000/api/pac-3.0/search-prospects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "USA",
    "industry": "Technology",
    "keywords": "startup"
  }'
```

### Test 2: Obtener Estadísticas

```bash
curl http://localhost:5000/api/pac-3.0/dashboard-stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3: Analizar Prospecto

```bash
curl -X POST http://localhost:5000/api/pac-3.0/analyze-prospect/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 🎨 Interfaz de Usuario

### Pestañas Disponibles

1. **Dashboard** 📊
   - Monitoreo en tiempo real
   - Métricas clave
   - Estado del sistema

2. **Rastreador** 🔍
   - Búsqueda por país/industria
   - Resultados de prospectos
   - Datos de contacto

3. **Análisis IA** 🧠
   - Clasificación de prospectos
   - Tesis de venta generadas
   - Contactos identificados
   - Scores de confianza

4. **Email Sequences** 📧
   - Plantillas de email
   - Envío de secuencias
   - Historial de emails

5. **Mapa** 🗺️
   - Visualización geográfica
   - Código de colores por score
   - Filtrado por industria

---

## 🔐 Control de Acceso

### Solo Admins Pueden Acceder

```javascript
// Verificación automática en:
// - Rutas: /api/pac-3.0/*
// - Página: /dashboard/pac-3.0

// Si no eres admin:
// → Recibirás error 403
// → Serás redirigido a /dashboard
```

### Verificar tu Rol

En el navegador, abre la consola y ejecuta:
```javascript
// Desde localStorage
console.log(JSON.parse(localStorage.getItem('user')))
// Deberías ver: { role: 'admin', ... }
```

---

## 📊 Base de Datos

### Tablas Creadas

```sql
-- Prospectos rastreados
CREATE TABLE pac_prospects (...)

-- Secuencias de email
CREATE TABLE pac_email_sequences (...)

-- Análisis IA
CREATE TABLE pac_ai_analysis (...)

-- Monitoreo en tiempo real
CREATE TABLE pac_monitoring (...)
```

### Consultas Útiles

```sql
-- Ver todos los prospectos de un admin
SELECT * FROM pac_prospects WHERE admin_id = 1;

-- Ver emails enviados
SELECT * FROM pac_email_sequences WHERE status = 'sent';

-- Ver análisis completados
SELECT * FROM pac_ai_analysis;

-- Ver eventos de monitoreo
SELECT * FROM pac_monitoring ORDER BY created_at DESC;
```

---

## 🚀 Flujo de Trabajo Típico

```
1. RASTREO (5 min)
   └─ Selecciona país e industria
   └─ Inicia búsqueda
   └─ Obtén lista de prospectos

2. ANÁLISIS (2 min por prospecto)
   └─ Selecciona prospecto
   └─ Ejecuta análisis IA
   └─ Revisa clasificación y contactos

3. OUTREACH (1 min por email)
   └─ Selecciona prospecto
   └─ Elige plantilla o escribe email
   └─ Envía secuencia

4. MONITOREO (Continuo)
   └─ Visualiza en mapa
   └─ Revisa eventos en tiempo real
   └─ Analiza métricas
```

---

## 🐛 Troubleshooting

### Error: "Acceso denegado. Solo administradores"

**Solución:**
```bash
# Verifica que el usuario sea admin
node scripts/make-admin.js tu-email@example.com

# Cierra sesión y vuelve a iniciar
```

### Error: "Tabla no existe"

**Solución:**
```bash
# Reinicia el servidor para que cree las tablas
npm run dev:backend
```

### Error: "Token inválido"

**Solución:**
```javascript
// Limpia localStorage y vuelve a iniciar sesión
localStorage.clear()
// Recarga la página
location.reload()
```

---

## 📈 Próximos Pasos

1. **Integración de Scraping Real**
   - Implementar BeautifulSoup/Scrapy
   - Conectar con APIs de búsqueda

2. **Modelos IA Locales**
   - Integrar Ollama con Llama2
   - Fine-tuning para tu industria

3. **Envío de Emails Real**
   - Configurar SMTP personalizado
   - Integración con SendGrid/Mailgun

4. **Webhooks y Integraciones**
   - Conectar con CRM externo
   - Sincronización automática

---

## 💡 Tips y Trucos

### Tip 1: Usar Plantillas
Las plantillas de email incluyen variables como `{company}`, `{contact}`, `{service}` que se reemplazan automáticamente.

### Tip 2: Monitoreo en Tiempo Real
El dashboard se actualiza cada 5 segundos. Abre múltiples pestañas para ver cambios en vivo.

### Tip 3: Exportar Datos
Puedes descargar los prospectos como CSV desde el panel de rastreo.

### Tip 4: Filtrar Resultados
Usa los filtros de industria y estado para encontrar rápidamente los prospectos que necesitas.

---

## 📞 Soporte

- **Documentación Completa**: Ver `PAC_3.0_README.md`
- **Código Fuente**: `/backend/routes/pac-3.0.js`
- **Componentes**: `/frontend/src/components/PAC3/`

---

**¡Listo para comenzar! 🚀**
