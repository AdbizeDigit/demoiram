# Scrapping Inteligente con Mapa Interactivo

## 🗺️ Nuevas Características

El sistema de Scrapping Inteligente ahora incluye un **mapa interactivo** que te permite buscar potenciales clientes por zona geográfica.

### Dos Modos de Búsqueda:

#### 1. **Búsqueda por Empresa** (Modo Original)
- Ingresa nombre de empresa o dominio web
- Extrae: señales de dolor, tech stack, contactos, eventos de compra
- Calcula lead score
- Genera propuesta de email personalizado

#### 2. **Búsqueda por Zona** (Nuevo)
- Abre un mapa interactivo
- Haz clic para marcar una ubicación
- Ajusta el radio de búsqueda (10-500 km)
- El sistema busca noticias y oportunidades en esa zona
- Extrae empresas y eventos relevantes

## 🚀 Cómo Usar

### Modo Búsqueda por Empresa:

1. Ve a Dashboard → Scrapping Inteligente
2. Asegúrate de estar en la pestaña "Búsqueda por Empresa"
3. Ingresa:
   - Nombre de empresa: "Tesla", "Stripe", etc.
   - O dominio: "www.stripe.com", "tesla.com"
4. Pulsa el botón Play (lupa)
5. Ve los resultados:
   - Lead Score
   - Señales de dolor
   - Tech stack
   - Contactos clave
   - Eventos de compra
   - Propuesta de email

### Modo Búsqueda por Zona:

1. Ve a Dashboard → Scrapping Inteligente
2. Pulsa la pestaña "Búsqueda por Zona"
3. Se abre un mapa interactivo (OpenStreetMap)
4. **Haz clic en el mapa** para marcar la ubicación
   - Aparecerá un marcador azul
   - El mapa se centrará en esa zona
5. Ajusta el **radio de búsqueda** con el slider (10-500 km)
6. Pulsa "Buscar en esta zona"
7. El sistema busca:
   - Noticias sobre empresas en esa zona
   - Eventos de negocio (Series B, funding, etc.)
   - Oportunidades de venta
8. Ve los resultados:
   - Ubicación y radio seleccionados
   - Artículos y noticias encontradas
   - Información de empresas relevantes

## 📊 Datos Extraídos

### Por Empresa:
- **Lead Score** (0-100): Probabilidad de cierre
- **Señales de Dolor**: Ineficiencias, retrasos, costos altos
- **Tech Stack**: Infraestructura, herramientas, cloud
- **Contactos Clave**: CTO, CIO, Head of Data, etc.
- **Eventos de Compra**: Series B, fusiones, lanzamientos
- **Email Personalizado**: Asunto y apertura sugeridos

### Por Zona:
- **Noticias**: Artículos de NewsAPI, GNews, Newsdata
- **Palabras Clave**: Series B, funding, AI, automation
- **Empresas Mencionadas**: Basadas en análisis de noticias
- **Oportunidades**: Eventos de negocio en la región

## 🛠️ Instalación de Dependencias

Si es la primera vez que usas el mapa, instala las dependencias:

```bash
cd frontend
npm install leaflet react-leaflet
```

## 🗺️ Tecnologías Usadas

- **Mapa**: Leaflet + OpenStreetMap (gratuito, sin API key)
- **Noticias**: NewsAPI, GNews, Newsdata
- **Backend**: Node.js + Express
- **Base de Datos**: PostgreSQL (Neon)

## 📍 Ejemplos de Uso

### Ejemplo 1: Buscar empresas en Madrid
1. Modo "Búsqueda por Zona"
2. Haz clic en Madrid en el mapa
3. Radio: 50 km
4. Buscar
5. Resultado: Empresas con noticias sobre Series B, funding, etc. en Madrid

### Ejemplo 2: Buscar empresas en Silicon Valley
1. Modo "Búsqueda por Zona"
2. Haz clic en San Francisco
3. Radio: 100 km
4. Buscar
5. Resultado: Startups y empresas tech con eventos recientes

### Ejemplo 3: Analizar competidor específico
1. Modo "Búsqueda por Empresa"
2. Ingresa: "Stripe"
3. Resultado: Lead score, tech stack, contactos, eventos

## 🔧 Configuración en Vercel

Las variables de entorno necesarias son las mismas:

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
NEWS_API_KEY=0c8a1941b319436692eab3d5014e24bb
GNEWS_API_KEY=a549d2117cdb126dd8ffa7256a8b8b73
NEWSDATA_API_KEY=pub_5b74dc15902f42bdb15aa4cd3889ae06
```

## 📝 Notas Importantes

- El mapa usa **OpenStreetMap** (gratuito, sin límites)
- Las noticias vienen de 3 APIs diferentes (deduplicadas)
- El radio de búsqueda es aproximado (basado en coordenadas)
- Los resultados se guardan en la base de datos Neon
- Solo `contacto@adbize.com` puede usar el scrapping

## 🚀 Próximos Pasos

- Integrar LinkedIn scraping para enriquecer contactos
- Agregar filtros por industria
- Crear alertas automáticas por zona
- Exportar resultados a CSV/Excel
- Integrar con CRM (Salesforce, HubSpot)

## 🐛 Troubleshooting

### El mapa no carga
- Verifica que Leaflet está instalado: `npm install leaflet react-leaflet`
- Recarga la página
- Revisa la consola del navegador

### No encuentro empresas en una zona
- Intenta con un radio más grande
- Cambia de zona (algunas regiones tienen menos noticias)
- Verifica que las API keys están configuradas

### El marcador no aparece
- Haz clic en el mapa nuevamente
- Verifica que estás en modo "Búsqueda por Zona"
- Recarga la página

## 📞 Soporte

Si tienes problemas, contacta a `contacto@adbize.com`
