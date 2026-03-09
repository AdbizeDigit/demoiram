# Configuración de Vercel para Scrapping Inteligente con News APIs

## 1. Variables de Entorno en Vercel

Ve a tu proyecto en Vercel → **Settings → Environment Variables** y configura estas variables para **Production** y **Preview**:

### Obligatorias:

```
DATABASE_URL=postgresql://user:password@host.eu-central-1.aws.neon.tech/dbname?sslmode=require
JWT_SECRET=tu-clave-secreta-super-larga-y-aleatoria-aqui
```

**Nota sobre DATABASE_URL:**
- Usa tu connection string de **Neon PostgreSQL** (donde creaste las tablas de scrapping).
- Formato: `postgresql://usuario:contraseña@host.eu-central-1.aws.neon.tech/nombre_db?sslmode=require`

### News APIs (para búsqueda de potenciales clientes):

```
NEWS_API_KEY=0c8a1941b319436692eab3d5014e24bb
GNEWS_API_KEY=a549d2117cdb126dd8ffa7256a8b8b73
NEWSDATA_API_KEY=pub_5b74dc15902f42bdb15aa4cd3889ae06
```

### Opcionales:

```
OPENAI_API_KEY=sk-... (solo si quieres IA real en chatbot)
DEEPSEEK_API_KEY=... (solo si usas custom chatbots)
```

## 2. Pasos para Desplegar

1. **Guarda las variables en Vercel:**
   - Ve a Settings → Environment Variables
   - Añade cada variable (DATABASE_URL, JWT_SECRET, NEWS_API_KEY, etc.)
   - Pulsa "Save"

2. **Redeploy:**
   - Ve a **Deployments**
   - Haz clic en el último deployment
   - Pulsa **"Redeploy"** (o haz un nuevo push a Git si está conectado)

3. **Verifica que funciona:**
   - Accede a `https://www.adbize.com/dashboard`
   - Login con `contacto@adbize.com`
   - Ve a "Sistema interno Adbize" → "Scrapping Inteligente"
   - Ingresa una empresa y pulsa Play

## 3. Endpoints Disponibles

### Scrapping Inteligente (análisis básico):
```
POST /api/scraping/intel
Body: {
  "companyName": "Tesla",
  "website": "https://www.tesla.com",
  "industry": "Automoción",
  "focus": {
    "pains": true,
    "tech": true,
    "contacts": true,
    "events": true
  }
}
```

Respuesta: Señales de dolor, tech stack, contactos clave, eventos de compra, lead score, etc.

### Búsqueda de Noticias (nuevo):
```
POST /api/scraping/news-search
Body: {
  "query": "Series B funding AI automation",
  "languages": ["en", "es"],
  "countries": ["us", "gb", "es"],
  "limit": 20
}
```

Respuesta: Artículos de noticias de NewsAPI, GNews y Newsdata, deduplicados y con palabras clave extraídas.

## 4. Configuración Local (para desarrollo)

1. **Copia el archivo de ejemplo:**
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Edita `backend/.env` con tus valores:**
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/adbize
   JWT_SECRET=tu-clave-local-aqui
   NEWS_API_KEY=0c8a1941b319436692eab3d5014e24bb
   GNEWS_API_KEY=a549d2117cdb126dd8ffa7256a8b8b73
   NEWSDATA_API_KEY=pub_5b74dc15902f42bdb15aa4cd3889ae06
   PORT=5000
   ```

3. **Instala dependencias:**
   ```bash
   npm run install-all
   ```

4. **Levanta el backend y frontend:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

5. **Accede a:**
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:5000`

## 5. Flujo de Scrapping Inteligente

1. **Usuario ingresa empresa** (nombre o dominio)
2. **Backend ejecuta `/api/scraping/intel`:**
   - Analiza la empresa
   - Extrae señales de dolor, tech stack, contactos, eventos
   - Calcula lead score
   - Guarda en base de datos Neon
3. **Frontend muestra resultados:**
   - Lead score
   - Señales de dolor
   - Tech stack estimado
   - Contactos clave
   - Eventos de compra
   - Propuesta de email personalizado

## 6. Búsqueda de Potenciales Clientes con Noticias

El endpoint `/api/scraping/news-search` permite:
- Buscar noticias sobre empresas, industrias o palabras clave
- Filtrar por idioma y país
- Deduplicar artículos
- Extraer palabras clave relevantes (Series B, funding, AI, etc.)
- Identificar potenciales clientes basándose en eventos de negocio

**Ejemplo de uso:**
```bash
curl -X POST http://localhost:5000/api/scraping/news-search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tu-token-jwt" \
  -d '{
    "query": "Serie B logística inteligencia artificial",
    "limit": 20
  }'
```

## 7. Troubleshooting

### Error: "No autorizado"
- Asegúrate de que estás logueado con `contacto@adbize.com`
- El scrapping es solo para este usuario

### Error: "DATABASE_URL no configurado"
- Verifica que `DATABASE_URL` está en las variables de entorno de Vercel
- En local, asegúrate de que `backend/.env` tiene la URL correcta

### Error: "News API error"
- Verifica que las claves están correctas en las variables de entorno
- Algunos APIs tienen límites de rate limiting (NewsAPI: 100 req/día en plan gratuito)

### Las noticias no aparecen
- Las APIs pueden estar bloqueadas por rate limiting
- Intenta con queries más específicas
- Verifica los logs en Vercel (Deployments → Logs)

## 8. Próximos Pasos

- Integrar búsqueda de noticias en el UI del scrapping
- Conectar con LinkedIn scraping para enriquecer contactos
- Crear modelos de scoring basados en históricos
- Automatizar secuencias de email basadas en eventos detectados
