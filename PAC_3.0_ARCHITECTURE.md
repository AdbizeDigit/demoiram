# 🏗️ PAC 3.0 - Arquitectura Técnica

## 📐 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PAC3AdminPanel.jsx (Página Principal)                    │  │
│  │  ├─ PAC3Dashboard.jsx (Monitoreo)                        │  │
│  │  ├─ PAC3Scraper.jsx (Rastreo)                           │  │
│  │  ├─ PAC3AIAnalysis.jsx (Análisis)                       │  │
│  │  ├─ PAC3EmailSequence.jsx (Email)                       │  │
│  │  └─ PAC3MapView.jsx (Mapa)                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    API REST (HTTP/HTTPS)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js/Express)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Middleware                                               │  │
│  │  ├─ protect (Autenticación JWT)                         │  │
│  │  └─ adminOnly (Verificación de Rol)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Routes (/api/pac-3.0)                                    │  │
│  │  ├─ search-prospects (POST)                             │  │
│  │  ├─ prospects (GET)                                     │  │
│  │  ├─ analyze-prospect/:id (POST)                         │  │
│  │  ├─ send-email-sequence/:id (POST)                      │  │
│  │  ├─ email-sequences/:id (GET)                           │  │
│  │  ├─ dashboard-stats (GET)                               │  │
│  │  ├─ map-prospects (GET)                                 │  │
│  │  └─ monitoring-events (GET)                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Tablas                                                   │  │
│  │  ├─ users (con campo 'role')                            │  │
│  │  ├─ pac_prospects                                       │  │
│  │  ├─ pac_email_sequences                                 │  │
│  │  ├─ pac_ai_analysis                                     │  │
│  │  └─ pac_monitoring                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos

### 1. Autenticación y Autorización

```
Usuario Inicia Sesión
    ↓
POST /api/auth/login
    ↓
Genera JWT Token
    ↓
Frontend almacena token en localStorage
    ↓
Cada request incluye: Authorization: Bearer {token}
    ↓
Middleware 'protect' verifica token
    ↓
Middleware 'adminOnly' verifica role = 'admin'
    ↓
✅ Acceso Permitido o ❌ Acceso Denegado
```

### 2. Flujo de Rastreo

```
Usuario selecciona país e industria
    ↓
POST /api/pac-3.0/search-prospects
    ↓
Backend simula búsqueda (preparado para scraping real)
    ↓
Crea prospectos en pac_prospects
    ↓
Registra evento en pac_monitoring
    ↓
Retorna lista de prospectos
    ↓
Frontend muestra resultados
```

### 3. Flujo de Análisis IA

```
Usuario selecciona prospecto
    ↓
POST /api/pac-3.0/analyze-prospect/:id
    ↓
Backend obtiene datos del prospecto
    ↓
Simula análisis IA (preparado para modelo real)
    ↓
Genera:
  - Clasificación
  - Tesis de venta (múltiples versiones)
  - Contactos clave
  - Scores
    ↓
Guarda en pac_ai_analysis
    ↓
Actualiza pac_prospects con score
    ↓
Registra evento en pac_monitoring
    ↓
Retorna análisis completo
```

### 4. Flujo de Email

```
Usuario selecciona prospecto y escribe email
    ↓
POST /api/pac-3.0/send-email-sequence/:id
    ↓
Backend valida datos
    ↓
Guarda en pac_email_sequences
    ↓
Simula envío (preparado para SMTP real)
    ↓
Registra evento en pac_monitoring
    ↓
Retorna confirmación
```

### 5. Flujo de Monitoreo

```
Frontend solicita datos cada 5 segundos
    ↓
GET /api/pac-3.0/dashboard-stats
GET /api/pac-3.0/monitoring-events
GET /api/pac-3.0/map-prospects
    ↓
Backend consulta base de datos
    ↓
Retorna datos en tiempo real
    ↓
Frontend actualiza visualización
```

---

## 🗄️ Esquema de Base de Datos

### Tabla: users (Extendida)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',  -- 'user' o 'admin'
  
  -- Campos de uso de servicios...
  chatbot_uses INTEGER DEFAULT 3,
  agent_generator_uses INTEGER DEFAULT 3,
  -- ... otros campos
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### Tabla: pac_prospects

```sql
CREATE TABLE pac_prospects (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  
  -- Información de la empresa
  company_name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  location VARCHAR(255),
  country VARCHAR(100),
  
  -- Geolocalización
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  
  -- Clasificación
  industry VARCHAR(100),
  description TEXT,
  source VARCHAR(100),  -- 'web_scraping', 'linkedin', 'github', etc.
  
  -- Análisis IA
  status VARCHAR(50) DEFAULT 'new',  -- 'new', 'analyzed', 'contacted', 'qualified', 'rejected'
  ai_score DECIMAL(3, 2),  -- 0.00 - 1.00
  ai_analysis TEXT,  -- JSON con análisis completo
  
  -- Contacto identificado
  contact_name VARCHAR(255),
  contact_role VARCHAR(255),
  contact_email VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_pac_prospects_admin_id ON pac_prospects(admin_id);
CREATE INDEX idx_pac_prospects_country ON pac_prospects(country);
CREATE INDEX idx_pac_prospects_industry ON pac_prospects(industry);
CREATE INDEX idx_pac_prospects_status ON pac_prospects(status);
CREATE INDEX idx_pac_prospects_ai_score ON pac_prospects(ai_score DESC);
```

### Tabla: pac_email_sequences

```sql
CREATE TABLE pac_email_sequences (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  prospect_id INTEGER NOT NULL REFERENCES pac_prospects(id),
  
  -- Secuencia
  sequence_number INTEGER,  -- 1, 2, 3, etc.
  email_subject VARCHAR(255),
  email_body TEXT,
  
  -- Estado
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'sent', 'bounced', 'replied'
  sent_at TIMESTAMP,
  
  -- Respuesta
  response_status VARCHAR(50),  -- 'positive', 'negative', 'question', null
  response_text TEXT,
  response_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_pac_email_sequences_admin_id ON pac_email_sequences(admin_id);
CREATE INDEX idx_pac_email_sequences_prospect_id ON pac_email_sequences(prospect_id);
CREATE INDEX idx_pac_email_sequences_status ON pac_email_sequences(status);
```

### Tabla: pac_ai_analysis

```sql
CREATE TABLE pac_ai_analysis (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  prospect_id INTEGER NOT NULL REFERENCES pac_prospects(id),
  
  -- Tipo de análisis
  analysis_type VARCHAR(100),  -- 'deep_analysis', 'quick_scan', etc.
  classification VARCHAR(100),  -- 'Alto potencial IA/ML', 'Alto potencial Web/App', etc.
  
  -- Resultados (JSON)
  thesis_versions TEXT,  -- JSON array de tesis por rol
  key_contacts TEXT,  -- JSON array de contactos identificados
  email_suggestions TEXT,  -- JSON array de emails sugeridos
  
  -- Scores
  sentiment_score DECIMAL(3, 2),  -- 0.00 - 1.00
  confidence_score DECIMAL(3, 2),  -- 0.00 - 1.00
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_pac_ai_analysis_admin_id ON pac_ai_analysis(admin_id);
CREATE INDEX idx_pac_ai_analysis_prospect_id ON pac_ai_analysis(prospect_id);
```

### Tabla: pac_monitoring

```sql
CREATE TABLE pac_monitoring (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  
  -- Evento
  event_type VARCHAR(100),  -- 'search_started', 'search_completed', 'ai_analysis_completed', 'email_sent', etc.
  event_description TEXT,
  status VARCHAR(50),  -- 'in_progress', 'completed', 'error'
  
  -- Referencia opcional
  prospect_id INTEGER REFERENCES pac_prospects(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_pac_monitoring_admin_id ON pac_monitoring(admin_id);
CREATE INDEX idx_pac_monitoring_event_type ON pac_monitoring(event_type);
CREATE INDEX idx_pac_monitoring_created_at ON pac_monitoring(created_at DESC);
```

---

## 🔐 Seguridad

### Autenticación

```javascript
// JWT Token
- Generado en login
- Válido por 30 días
- Incluido en header: Authorization: Bearer {token}
- Verificado en cada request protegido
```

### Autorización

```javascript
// Middleware adminOnly
- Verifica que req.user.role === 'admin'
- Retorna 403 si no es admin
- Aplicado a todas las rutas /api/pac-3.0/*
```

### Validación de Datos

```javascript
// En cada endpoint
- Validar que admin_id coincida con req.user.id
- Validar que prospect_id pertenece al admin
- Validar que los datos requeridos estén presentes
```

---

## 📊 Rendimiento

### Optimizaciones Implementadas

1. **Índices en BD**
   - admin_id para filtrado rápido
   - status para búsquedas
   - created_at para ordenamiento

2. **Paginación**
   - Limit en queries
   - Offset para scroll infinito

3. **Caché en Frontend**
   - localStorage para token
   - React state para datos

4. **Queries Eficientes**
   - SELECT solo campos necesarios
   - JOIN cuando es necesario
   - Evitar N+1 queries

---

## 🚀 Escalabilidad

### Preparado Para:

1. **Scraping Real**
   - Integración con BeautifulSoup/Scrapy
   - Rate limiting
   - Proxy rotation

2. **IA Real**
   - Integración con Ollama/LLaMA
   - Fine-tuning por industria
   - Caché de resultados

3. **Email Real**
   - Integración con SMTP
   - SendGrid/Mailgun
   - Bounce handling

4. **Webhooks**
   - Notificaciones en tiempo real
   - Integraciones externas
   - CRM sync

---

## 🔧 Stack Tecnológico

### Frontend
- **React 18** - UI framework
- **React Router** - Routing
- **Lucide Icons** - Iconografía
- **TailwindCSS** - Styling
- **Fetch API** - HTTP requests

### Backend
- **Node.js** - Runtime
- **Express.js** - Framework
- **PostgreSQL** - Base de datos
- **JWT** - Autenticación
- **bcryptjs** - Hash de contraseñas

### DevOps
- **npm** - Package manager
- **Concurrently** - Ejecutar dev servers
- **Vercel** - Deployment (opcional)

---

## 📝 Convenciones de Código

### Rutas
```javascript
// Estructura
POST /api/pac-3.0/{recurso}           // Crear
GET /api/pac-3.0/{recurso}            // Listar
GET /api/pac-3.0/{recurso}/:id        // Obtener
PUT /api/pac-3.0/{recurso}/:id        // Actualizar
DELETE /api/pac-3.0/{recurso}/:id     // Eliminar
```

### Respuestas
```javascript
// Éxito
{
  success: true,
  message: "Descripción",
  data: { ... }
}

// Error
{
  message: "Descripción del error",
  error: "Detalles técnicos"
}
```

### Estados
```javascript
// Prospectos
'new' → 'analyzed' → 'contacted' → 'qualified' / 'rejected'

// Emails
'pending' → 'sent' → 'bounced' / 'replied'

// Eventos
'in_progress' → 'completed' / 'error'
```

---

## 🧪 Testing

### Endpoints para Testear

```bash
# 1. Crear admin
node scripts/make-admin.js test@example.com

# 2. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 3. Buscar prospectos
curl -X POST http://localhost:5000/api/pac-3.0/search-prospects \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"country":"USA","industry":"Technology"}'

# 4. Analizar
curl -X POST http://localhost:5000/api/pac-3.0/analyze-prospect/1 \
  -H "Authorization: Bearer {token}"

# 5. Enviar email
curl -X POST http://localhost:5000/api/pac-3.0/send-email-sequence/1 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"emailSubject":"Test","emailBody":"Test body"}'
```

---

## 📈 Métricas Clave

### Monitoreo
- Prospectos rastreados por admin
- Emails enviados
- Análisis completados
- Score promedio
- Tasa de respuesta

### KPIs
- Conversion rate
- Response time
- Error rate
- Active admins

---

**Arquitectura Completa de PAC 3.0** ✨
