# 🎯 Guía del Sistema de Scraping Inteligente para Captación de Clientes

## 📋 Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Funcionalidades Principales](#funcionalidades-principales)
3. [Sistema de Scoring de Leads](#sistema-de-scoring-de-leads)
4. [Señales de Compra](#señales-de-compra)
5. [Enriquecimiento de Datos](#enriquecimiento-de-datos)
6. [Guía de Uso](#guía-de-uso)
7. [APIs Externas (Opcionales)](#apis-externas)

---

## 🎯 Visión General

El sistema de scraping inteligente está diseñado para **identificar y calificar automáticamente potenciales clientes** mediante:

- ✅ Búsqueda multi-fuente (redes sociales, directorios, noticias)
- ✅ Sistema avanzado de scoring (0-100 puntos)
- ✅ Detección automática de señales de compra
- ✅ Extracción inteligente de datos de contacto
- ✅ Identificación de decisores clave
- ✅ Generación de emails probables
- ✅ Priorización automática de contactos
- ✅ Enriquecimiento de datos (opcional con APIs)
- ✅ Validación de emails (opcional con APIs)

---

## 🚀 Funcionalidades Principales

### 1. **Búsqueda Automática Multi-Fuente**
```
Endpoint: POST /api/multi-scraping/auto-search
```

Busca en múltiples fuentes simultáneamente:
- **Potenciales Negocios**: Posts en redes sociales buscando servicios
- **Empresas**: Directorios empresariales (Google Business, LinkedIn, etc.)
- **Noticias**: Menciones en prensa (inversiones, expansiones, etc.)
- **Datos Enriquecidos**: Información consolidada de múltiples fuentes

**Parámetros:**
```json
{
  "location": "Madrid",
  "limit": 30,
  "industry": "Technology",      // Opcional
  "minEmployees": 50,            // Opcional
  "maxEmployees": 500            // Opcional
}
```

**Respuesta:**
```json
{
  "success": true,
  "location": "Madrid",
  "totalResults": 30,
  "mapCenter": { "lat": 40.4168, "lng": -3.7038, "zoom": 10 },
  "sourcesProcessed": {
    "potentialClients": 5,
    "businessDirectories": 8,
    "news": 6,
    "enriched": 4
  },
  "qualityDistribution": {
    "hot": 8,     // Leads calientes (85-100)
    "warm": 12,   // Leads tibios (70-84)
    "cold": 8,    // Leads fríos (50-69)
    "low": 2      // Leads bajos (<50)
  },
  "averageScore": 72,
  "results": [ /* Array de leads */ ]
}
```

---

## 📊 Sistema de Scoring de Leads

### Cálculo del Score (0-100 puntos)

El sistema evalúa **6 dimensiones clave**:

#### 1️⃣ **Intención de Compra** (0-35 puntos)
- **25 pts**: Potencial cliente activo (post buscando servicio)
- **+10 pts**: Alta urgencia ("urgente", "ASAP", etc.)
- **+5 pts**: Palabras clave de intención ("busco", "necesito", "contratar")
- **20 pts**: Señales de compra en noticias (inversión, expansión)
- **10 pts**: Mención en noticias
- **15 pts**: Datos enriquecidos de múltiples fuentes
- **5 pts**: Empresa en directorio

#### 2️⃣ **Recencia** (0-20 puntos)
- **20 pts**: Muy reciente (<3 días)
- **15 pts**: Reciente (<7 días)
- **10 pts**: Reciente (<14 días)
- **5 pts**: Último mes

#### 3️⃣ **Completitud de Contacto** (0-25 puntos)
- **10 pts**: Email disponible
- **8 pts**: Teléfono disponible
- **4 pts**: Website disponible
- **3 pts**: LinkedIn disponible

#### 4️⃣ **Calidad de Información** (0-15 puntos)
- **5 pts**: Descripción completa
- **3 pts**: Industria identificada
- **3 pts**: Tamaño de empresa conocido
- **2 pts**: Año de fundación
- **2 pts**: Ubicación exacta (coordenadas)

#### 5️⃣ **Fit de Mercado** (0-10 puntos)
- **10 pts**: Industria de alto valor (tech, SaaS, fintech, e-commerce, AI)
- **5 pts**: Industria identificada

#### 6️⃣ **Señales de Presupuesto** (0-10 puntos)
- **10 pts**: Empresa grande (100+ empleados)
- **7 pts**: Empresa mediana (50-100 empleados)
- **5 pts**: Empresa pequeña (25-50 empleados)
- **+5 pts**: Indicadores de financiación en el texto

### Categorización de Leads

| Score | Categoría | Prioridad | Acción Recomendada |
|-------|-----------|-----------|-------------------|
| 85-100 | 🔥 **Hot Lead** | P0 | Contactar inmediatamente |
| 70-84 | ✨ **Warm** | P1 | Contactar esta semana |
| 50-69 | ❄️ **Cold** | P2 | Seguimiento de rutina |
| 0-49 | ⭐ **Low** | P3 | Nutrición a largo plazo |

---

## 🎯 Señales de Compra

El sistema detecta automáticamente **6 tipos de señales** que indican intención de compra:

### 1. **Expansión de Negocio** 🚀
- **Palabras clave**: "expansión", "apertura", "nueva oficina"
- **Urgencia**: Alta
- **Acción**: Ofrecer soluciones de automatización para escalar operaciones

### 2. **Financiación Reciente** 💰
- **Palabras clave**: "ronda", "inversión", "funding", "capital"
- **Urgencia**: Alta
- **Acción**: Proponer inversión en tecnología para maximizar el uso del capital

### 3. **Proceso de Contratación** 👥
- **Palabras clave**: "contratación", "hiring", "busca", "necesita"
- **Urgencia**: Media
- **Acción**: Ofrecer automatización para reducir carga de trabajo

### 4. **Lanzamiento de Producto** 🎉
- **Palabras clave**: "lanza", "lanzamiento", "nuevo producto"
- **Urgencia**: Media
- **Acción**: Proponer IA para optimizar operaciones del nuevo producto

### 5. **Transformación Digital** 🔄
- **Palabras clave**: "transformación digital", "automatización"
- **Urgencia**: Alta
- **Acción**: Alinearse con iniciativas de transformación digital en marcha

### 6. **Cambio de Liderazgo** 👔
- **Palabras clave**: "nuevo CEO", "nuevo CTO"
- **Urgencia**: Alta
- **Acción**: Contactar en primeros 90 días del nuevo líder (ventana de quick wins)

**Ejemplo de señal detectada:**
```json
{
  "type": "funding",
  "signal": "Financiación reciente",
  "description": "La empresa ha recibido o busca inversión",
  "urgency": "high",
  "action": "Proponer inversión en tecnología para maximizar el uso del capital"
}
```

---

## 💎 Enriquecimiento de Datos

### Endpoint de Enriquecimiento
```
POST /api/multi-scraping/enrich-lead
```

**Parámetros:**
```json
{
  "companyDomain": "empresa.com",
  "companyName": "Empresa Tech SL"
}
```

**Fuentes de Enriquecimiento:**

1. **Hunter.io** (Opcional - requiere API key)
   - Emails corporativos verificados
   - Nombres y cargos de empleados
   - Nivel de confianza de cada email

2. **Clearbit** (Opcional - requiere API key)
   - Información detallada de la empresa
   - Tamaño, ingresos, financiación
   - Stack tecnológico
   - Redes sociales

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "company": {
      "name": "Empresa Tech SL",
      "domain": "empresa.com",
      "description": "Empresa líder en su sector...",
      "industry": "Technology",
      "employees": 150,
      "employeeRange": "100-250",
      "founded": 2015,
      "revenue": "5M-10M",
      "techStack": ["React", "Node.js", "PostgreSQL"]
    },
    "contacts": [
      {
        "firstName": "Carlos",
        "lastName": "Rodríguez",
        "email": "carlos.rodriguez@empresa.com",
        "position": "CEO",
        "department": "Executive",
        "confidence": 95,
        "verified": true
      }
    ],
    "socialMedia": {
      "linkedin": "linkedin.com/company/empresa-tech",
      "twitter": "twitter.com/empresatech"
    },
    "enrichmentScore": 85,
    "completeness": "excellent"
  }
}
```

---

## 📧 Validación de Emails

### Endpoint de Validación
```
POST /api/multi-scraping/validate-email
```

**Parámetros:**
```json
{
  "email": "contacto@empresa.com"
}
```

**Respuesta:**
```json
{
  "success": true,
  "email": "contacto@empresa.com",
  "valid": true,
  "status": "valid",
  "confidence": 92,
  "reason": "Email validado correctamente",
  "isPersonal": false,
  "source": "Hunter.io"
}
```

---

## 🎓 Guía de Uso

### Paso 1: Búsqueda de Leads

1. Accede a `/dashboard` → **Scraping Automático Multi-Fuente**
2. Ingresa la **ubicación** (ej: "Madrid", "España", "Barcelona")
3. Haz clic en **Buscar**
4. El sistema buscará en todas las fuentes simultáneamente

### Paso 2: Filtrar y Ordenar

**Filtros disponibles:**
- **Por tipo**: Potenciales clientes, Empresas, Noticias, Enriquecidos
- **Por calidad**: Hot, Warm, Cold, Low
- **Por texto**: Buscar por nombre, email, industria, etc.
- **Ordenamiento**: Score, Fecha, Nombre

### Paso 3: Analizar Resultados

Cada lead incluye:
- ✅ **Score y categoría** (Hot/Warm/Cold/Low)
- ✅ **Desglose del score** por dimensión
- ✅ **Señales de compra** detectadas
- ✅ **Información de contacto** (email, teléfono, website)
- ✅ **Emails probables** generados
- ✅ **Decisores identificados**
- ✅ **Prioridad de contacto** (P0-P3)

### Paso 4: Exportar Datos

- Haz clic en el botón **CSV** para exportar todos los resultados
- El archivo incluye todos los datos de contacto

### Paso 5: Contactar Leads

**Priorización recomendada:**

1. **P0 - Hot Leads (85-100)**: Contactar HOY
   - Tienen alta intención de compra
   - Información de contacto completa
   - Señales de urgencia

2. **P1 - Warm (70-84)**: Contactar esta semana
   - Buena calidad de información
   - Señales positivas de compra

3. **P2 - Cold (50-69)**: Seguimiento de rutina
   - Información básica disponible
   - Agregar a secuencia de nurturing

4. **P3 - Low (<50)**: Nutrición a largo plazo
   - Información incompleta
   - Seguimiento mensual/trimestral

---

## 🔑 APIs Externas (Opcionales)

Para habilitar el enriquecimiento y validación con APIs reales, configura las siguientes variables de entorno en tu archivo `.env`:

### Hunter.io
```bash
HUNTER_API_KEY=tu_api_key_de_hunter
```

**Funcionalidades:**
- Búsqueda de emails corporativos
- Verificación de emails
- Información de empleados

**Obtener API Key:**
1. Regístrate en https://hunter.io
2. Plan gratuito: 25 búsquedas/mes
3. Planes de pago: desde $49/mes

### Clearbit
```bash
CLEARBIT_API_KEY=tu_api_key_de_clearbit
```

**Funcionalidades:**
- Información detallada de empresas
- Datos de empleados, ingresos, tecnologías
- Redes sociales

**Obtener API Key:**
1. Regístrate en https://clearbit.com
2. Plan gratuito: 100 búsquedas/mes
3. Planes de pago: desde $99/mes

---

## 📈 Mejores Prácticas

### 1. **Búsquedas Específicas**
- Usa ubicaciones específicas: "Madrid" mejor que "España"
- Combina con filtros de industria para mayor precisión
- Limita resultados según tu capacidad de seguimiento

### 2. **Seguimiento de Leads**
- **Hot Leads**: Contactar dentro de 24 horas
- **Warm Leads**: Contactar dentro de 5-7 días
- **Cold Leads**: Agregar a secuencia de nurturing automática

### 3. **Personalización**
- Usa las **señales de compra** detectadas para personalizar el mensaje
- Menciona eventos específicos (financiación, expansión, etc.)
- Contacta a los **decisores identificados** directamente

### 4. **Validación**
- Valida emails antes de enviar campañas masivas
- Prioriza emails verificados (confidence > 80)
- Usa emails corporativos, no personales

### 5. **Enriquecimiento**
- Enriquece los leads más prometedores (score > 70)
- Actualiza información periódicamente
- Combina datos de múltiples fuentes

---

## 🎯 Casos de Uso

### Caso 1: Agencia de Marketing Digital
**Objetivo**: Encontrar empresas que necesitan servicios de marketing

```bash
Búsqueda: "Madrid"
Filtro industria: "E-commerce", "Retail"
Señales clave: "expansión", "lanzamiento", "nueva tienda"
Score mínimo: 70 (Warm+)
```

### Caso 2: Consultoría de IA
**Objetivo**: Identificar empresas iniciando transformación digital

```bash
Búsqueda: "Barcelona"
Filtro industria: "Technology", "Fintech"
Señales clave: "transformación digital", "automatización", "inversión"
Score mínimo: 85 (Hot)
```

### Caso 3: Software B2B
**Objetivo**: Captar empresas en crecimiento

```bash
Búsqueda: "España"
Empleados: 50-250
Señales clave: "ronda", "funding", "contratación"
Score mínimo: 70 (Warm+)
```

---

## 📊 Métricas de Éxito

Monitorea estas métricas para optimizar tu proceso:

- **Tasa de conversión por categoría** (Hot vs Warm vs Cold)
- **Tiempo de respuesta** por prioridad
- **Precisión del scoring** (leads que cierran vs score inicial)
- **Efectividad de señales de compra** (qué señales convierten más)
- **ROI por fuente** (qué fuentes generan mejores leads)

---

## 🆘 Soporte

Para consultas o reportar problemas:
- Email: contacto@adbize.com
- Documentación adicional: `/docs`

---

**Última actualización**: Noviembre 2025
**Versión**: 2.0
