# Guía: Scrapping Inteligente por Zona con Mapa

## 🗺️ Nuevo Sistema de Búsqueda por Zona

El sistema ahora permite marcar un área en el mapa y buscar automáticamente oportunidades en esa zona.

## 📐 Componentes Principales

### 1. **Mapa Interactivo (Izquierda)**
- Mapa OpenStreetMap en tiempo real
- Haz clic para marcar la ubicación
- Aparece un marcador azul
- Se dibuja un círculo que representa el radio de búsqueda

### 2. **Controles (Debajo del Mapa)**
- **Radio de búsqueda**: Slider de 10 a 500 km
- **Información de ubicación**: Coordenadas y radio actual
- **Botones Play/Stop**: Inicia o detiene la búsqueda
- **Instrucciones**: Guía paso a paso

### 3. **Panel de Resultados (Derecha)**
- Muestra los resultados en tiempo real
- Contador de oportunidades encontradas
- Cada resultado es expandible
- Botón para copiar todos los resultados

## 🚀 Cómo Usar

### Paso 1: Marcar la Ubicación
1. Abre Dashboard → Scrapping Inteligente
2. En el mapa, **haz clic en la zona** que quieres analizar
3. Aparecerá un marcador azul
4. Se dibujará un círculo alrededor de la ubicación

### Paso 2: Ajustar el Radio
1. Usa el **slider "Radio de búsqueda"**
2. Mueve hacia la izquierda para reducir (mínimo 10 km)
3. Mueve hacia la derecha para aumentar (máximo 500 km)
4. El círculo en el mapa se actualiza en tiempo real

### Paso 3: Iniciar la Búsqueda
1. Pulsa el botón **Play** (verde)
2. El sistema comienza a buscar automáticamente
3. Verás "Buscando..." en el panel de resultados
4. Los resultados aparecerán conforme se encuentren

### Paso 4: Ver Resultados
1. En el panel derecho, verás una lista de oportunidades
2. Haz clic en cada resultado para expandir
3. Verás:
   - Título completo
   - Descripción
   - Fecha de publicación
   - Enlace a la noticia original

### Paso 5: Copiar o Exportar
1. Pulsa **"Copiar resultados"** al final del panel
2. Se copian todos los resultados al portapapeles
3. Puedes pegarlos en Excel, Notion, etc.

## 📊 Información Extraída

Cada resultado incluye:
- **Título**: Titular de la noticia/oportunidad
- **Fuente**: De dónde viene (NewsAPI, GNews, Newsdata)
- **Descripción**: Resumen del contenido
- **Fecha**: Cuándo se publicó
- **URL**: Enlace a la noticia completa

## 🎯 Casos de Uso

### Caso 1: Buscar Startups en Madrid
1. Haz clic en Madrid en el mapa
2. Radio: 50 km
3. Play
4. Resultado: Startups con Series B, funding, eventos

### Caso 2: Buscar Empresas Tech en Silicon Valley
1. Haz clic en San Francisco
2. Radio: 100 km
3. Play
4. Resultado: Empresas tech con noticias recientes

### Caso 3: Buscar Oportunidades en Barcelona
1. Haz clic en Barcelona
2. Radio: 30 km
3. Play
4. Resultado: Empresas con eventos de negocio

### Caso 4: Análisis Regional Amplio
1. Haz clic en una ciudad importante
2. Radio: 200-300 km
3. Play
4. Resultado: Todas las oportunidades de la región

## ⚙️ Configuración Técnica

### APIs Utilizadas
- **NewsAPI.org**: Noticias generales
- **GNews.io**: Noticias de negocios
- **Newsdata.io**: Noticias globales

### Base de Datos
- PostgreSQL (Neon)
- Almacena búsquedas y resultados
- Acceso restringido a `contacto@adbize.com`

### Mapa
- OpenStreetMap (gratuito)
- Leaflet.js (librería)
- Sin límites de uso

## 🔧 Instalación

Si es la primera vez:

```bash
cd frontend
npm install leaflet react-leaflet
npm run dev
```

## 📱 Responsive

- ✅ Funciona en desktop
- ✅ Funciona en tablet
- ✅ Funciona en mobile
- ✅ Mapa adaptable a cualquier pantalla

## 🐛 Troubleshooting

### El mapa no carga
- Recarga la página
- Verifica conexión a internet
- Revisa la consola del navegador

### No encuentro resultados
- Intenta con un radio más grande
- Cambia de zona
- Verifica que las API keys están configuradas en Vercel

### El círculo no se actualiza
- Recarga la página
- Vuelve a marcar la ubicación
- Ajusta el slider nuevamente

### El marcador desaparece
- Haz clic nuevamente en el mapa
- Recarga la página

## 💡 Tips

- Usa radios pequeños (10-50 km) para búsquedas precisas
- Usa radios grandes (100-300 km) para análisis regionales
- Puedes marcar múltiples zonas (cada clic reemplaza la anterior)
- Copia los resultados regularmente para no perderlos
- Los resultados se guardan en la base de datos

## 🚀 Próximas Mejoras

- Guardar búsquedas favoritas
- Exportar a CSV/Excel
- Filtrar por tipo de evento (Series B, fusiones, etc.)
- Integración con CRM
- Alertas automáticas por zona
- Análisis de sentimiento de noticias

## 📞 Soporte

Contacta a `contacto@adbize.com` si tienes problemas.
