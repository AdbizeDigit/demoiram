# Guía de Despliegue en Vercel

Este proyecto está configurado para desplegarse en Vercel con el frontend y backend juntos.

## Cambios Realizados

1. **Integración del Servicio Python**: Los endpoints de Python han sido convertidos a Node.js e integrados en el backend principal en `backend/routes/python-api.js`.

2. **Configuración de Vercel**: Se ha creado `vercel.json` para configurar el build y routing del proyecto.

3. **Actualización de Proxies**: El proxy de Vite ahora apunta ambos servicios (`/api` y `/python-api`) al mismo servidor backend (puerto 5000).

## Requisitos Previos

1. Cuenta de Vercel (gratuita): https://vercel.com
2. Cuenta de MongoDB Atlas (gratuita): https://www.mongodb.com/cloud/atlas
3. CLI de Vercel instalado (opcional): `npm i -g vercel`

## Variables de Entorno Necesarias

Deberás configurar estas variables de entorno en Vercel:

### Obligatorias:
- `MONGODB_URI`: URI de conexión a MongoDB Atlas
- `JWT_SECRET`: Clave secreta para JWT (genera una segura)

### Opcionales:
- `OPENAI_API_KEY`: API key de OpenAI (para chatbot con IA real)

## Pasos para Desplegar

### Opción 1: Despliegue desde la Web de Vercel (Recomendado)

1. **Sube tu código a GitHub/GitLab/Bitbucket**

2. **Importa el proyecto en Vercel**:
   - Ve a https://vercel.com/new
   - Selecciona tu repositorio
   - Vercel detectará automáticamente la configuración

3. **Configura las Variables de Entorno**:
   - En el dashboard de Vercel, ve a Settings > Environment Variables
   - Añade:
     ```
     MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/adbize-demos
     JWT_SECRET=tu-clave-secreta-super-segura-aqui
     OPENAI_API_KEY=sk-... (opcional)
     ```

4. **Deploya**:
   - Haz clic en "Deploy"
   - Vercel construirá y desplegará automáticamente

### Opción 2: Despliegue desde CLI

```bash
# Instala Vercel CLI si no lo tienes
npm i -g vercel

# Desde el directorio raíz del proyecto
vercel

# Sigue las instrucciones interactivas
# Configura las variables de entorno cuando se te solicite

# Para producción
vercel --prod
```

## Configuración de MongoDB Atlas

1. Crea una cuenta en MongoDB Atlas: https://www.mongodb.com/cloud/atlas
2. Crea un cluster gratuito (M0)
3. Crea un usuario de base de datos
4. Añade `0.0.0.0/0` a la lista de IPs permitidas (para permitir conexiones de Vercel)
5. Obtén tu connection string y úsalo como `MONGODB_URI`

Ejemplo de connection string:
```
mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/adbize-demos?retryWrites=true&w=majority
```

## Verificación del Despliegue

Una vez desplegado, verifica que todo funciona:

1. **Frontend**: Accede a tu dominio de Vercel (ej: `tu-proyecto.vercel.app`)
2. **API Backend**: `https://tu-proyecto.vercel.app/api/health`
3. **Python API**: `https://tu-proyecto.vercel.app/python-api/health`

## Desarrollo Local

Para desarrollo local después de estos cambios:

```bash
# Instalar dependencias
npm run install-all

# Crear archivo .env en backend/ con las variables necesarias
cp backend/.env.example backend/.env
# Edita backend/.env con tus valores locales

# Ejecutar solo frontend y backend (Python ya no es necesario)
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

El frontend estará en `http://localhost:3000` y el backend en `http://localhost:5000`.

## Notas Importantes

- **Python Service**: El servicio Python original ha sido reemplazado por implementaciones en Node.js. Si necesitas funcionalidad ML real en el futuro, considera:
  - Usar APIs externas (OpenAI Vision, Google Cloud Vision, etc.)
  - Desplegar el servicio Python en Railway, Render o Heroku
  - Usar Vercel Edge Functions con WASM

- **Socket.io**: Si planeas usar Socket.io para tiempo real, considera usar Vercel's serverless functions con alternativas como Pusher o Ably, o despliega Socket.io en un servidor separado.

- **Límites de Vercel (Plan Gratuito)**:
  - 100 GB de bandwidth por mes
  - Funciones serverless con timeout de 10s (Hobby) / 60s (Pro)
  - 12 mil ejecuciones por día

## Dominios Personalizados

Para añadir un dominio personalizado:
1. Ve a Settings > Domains en tu proyecto de Vercel
2. Añade tu dominio
3. Configura los DNS según las instrucciones de Vercel

## Actualizaciones Automáticas

Si conectaste tu repositorio Git:
- Cada push a la rama principal desplegará automáticamente
- Los PRs crearán preview deployments automáticamente

## Soporte y Troubleshooting

- **Logs**: Revisa los logs en el dashboard de Vercel
- **Build Errors**: Verifica que todas las dependencias estén en `package.json`
- **Runtime Errors**: Revisa que las variables de entorno estén configuradas correctamente
- **Database Errors**: Verifica la conexión a MongoDB Atlas y las IPs permitidas
