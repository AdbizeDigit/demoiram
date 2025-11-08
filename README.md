# Plataforma de Demos de IA - Adbize

Plataforma interactiva de exhibición de demos de inteligencia artificial con **diseño multicolor líquido 3D animado**, autenticación completa y múltiples funcionalidades de IA.

## ✨ Diseño Multicolor Líquido 3D + Olas Gomosas

Esta plataforma cuenta con un diseño visual impresionante con:

- 🌊 **Olas 3D líquidas gomosas** ondulando en la parte inferior
- 💧 **Efectos viscosos y gomosos** en tarjetas y elementos
- 🎨 **Gradientes multicolor** que fluyen suavemente
- ✨ **Blobs flotantes** con deformación orgánica
- 💎 **Glass morphism** en componentes
- 🎪 **Iconos con morphing líquido** constante
- 🌀 **Deformación de formas** como gelatina real
- 🌈 **Paleta vibrante**: Cyan, Azul, Púrpura, Rosa, Amarillo
- 🔮 **Transiciones suaves** en toda la interfaz

### Nuevos Efectos Gomosos:
- 5 animaciones CSS únicas (wave, gooey, viscous, ripple, pulse3D)
- 3 capas de olas SVG con movimiento independiente
- Componente GooeyWaves con blobs flotantes
- Efectos de ripple en todas las tarjetas
- Deformación líquida en hover

## Características

### Demos Incluidos

1. **Chatbot con IA** - Asistente virtual inteligente con procesamiento de lenguaje natural
2. **Visión Artificial** - Detección y reconocimiento de objetos en tiempo real
3. **Generador de Agentes** - Crea agentes de IA personalizados automáticamente
4. **Marketplace Inteligente** - Búsqueda automática de compradores y vendedores
5. **Análisis de Sentimientos** - Detecta emociones y sentimientos en texto
6. **Transcripción de Audio** - Convierte audio/video a texto con resumen automático
7. **Análisis de Documentos** - Clasifica y extrae información de documentos
8. **Predictor de Tendencias** - Análisis predictivo y forecasting de datos

### Stack Tecnológico

#### Frontend
- React 18
- React Router para navegación
- Zustand para gestión de estado
- Tailwind CSS para estilos
- Axios para peticiones HTTP
- TensorFlow.js para ML en el navegador
- React Webcam para captura de video

#### Backend
- Node.js con Express
- MongoDB con Mongoose
- JWT para autenticación
- Python con Flask para servicios de IA
- OpenAI API (opcional)

## Instalación

### Prerrequisitos

- Node.js (v18 o superior)
- Python 3.8+
- MongoDB (local o Atlas)
- npm o yarn

### 1. Clonar el repositorio

```bash
cd demoiram
```

### 2. Configurar Frontend

```bash
cd frontend
npm install
```

### 3. Configurar Backend (Node.js)

```bash
cd ../backend
npm install

# Copiar archivo de entorno
copy .env.example .env

# Editar .env con tus configuraciones
```

### 4. Configurar Python Service

```bash
cd python-service
pip install -r requirements.txt
```

### 5. Configurar MongoDB

**Opción A: MongoDB Local**
- Instalar MongoDB Community Edition
- Iniciar servicio: `mongod`

**Opción B: MongoDB Atlas (Cloud)**
- Crear cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Crear cluster gratuito
- Copiar connection string al archivo `.env`

### 6. Logo de Adbize (Opcional)

El logo multicolor de Adbize está incluido. Para copiarlo a la ubicación correcta:

**Opción A:** Ejecutar el script
```bash
copiar-logo.bat
```

**Opción B:** Copiar manualmente
```bash
copy logo2023.png frontend\public\logo.png
```

Si no copias el logo, aparecerá un ícono animado con gradiente líquido como respaldo.

### 7. Variables de Entorno

Editar `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/adbize-demos
JWT_SECRET=tu-clave-secreta-segura
OPENAI_API_KEY=tu-api-key-opcional
PORT=5000
```

## Ejecución

### Desarrollo

Necesitas 3 terminales:

**Terminal 1 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend disponible en: http://localhost:3000

**Terminal 2 - Backend Node.js:**
```bash
cd backend
npm run dev
```
API disponible en: http://localhost:5000

**Terminal 3 - Python Service:**
```bash
cd backend/python-service
python app.py
```
Python API disponible en: http://localhost:5001

### Producción

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

**Backend:**
```bash
cd backend
npm start
```

**Python Service:**
```bash
cd backend/python-service
python app.py
```

## Uso

1. Abre http://localhost:3000 en tu navegador
2. Regístrate con un nuevo usuario
3. Inicia sesión
4. Explora los 8 demos disponibles en el dashboard

### Credenciales de Prueba

Puedes crear cualquier usuario nuevo. No hay credenciales predefinidas.

## Estructura del Proyecto

```
demoiram/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/           # Páginas principales
│   │   │   ├── demos/       # Demos individuales
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── store/           # Estado global (Zustand)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/                  # Backend Node.js
│   ├── routes/              # Rutas de API
│   │   ├── auth.js
│   │   ├── chatbot.js
│   │   ├── agent.js
│   │   └── marketplace.js
│   ├── models/              # Modelos de MongoDB
│   │   └── User.js
│   ├── middleware/          # Middleware (auth, etc.)
│   │   └── auth.js
│   ├── config/              # Configuración
│   │   └── database.js
│   ├── python-service/      # Servicio Python
│   │   ├── app.py
│   │   └── requirements.txt
│   ├── server.js
│   └── package.json
│
└── README.md
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión

### Demos
- `POST /api/chatbot` - Chatbot con IA
- `POST /api/agent/generate` - Generar agente
- `POST /api/marketplace/search` - Búsqueda en marketplace

### Python Service
- `POST /python-api/vision/detect` - Detección de objetos
- `POST /python-api/sentiment/analyze` - Análisis de sentimientos
- `POST /python-api/transcription/process` - Transcripción de audio
- `POST /python-api/document/analyze` - Análisis de documentos
- `POST /python-api/predictor/forecast` - Predicción de tendencias

## Características de Seguridad

- Autenticación JWT
- Passwords hasheados con bcrypt
- Protección de rutas
- CORS configurado
- Validación de datos

## Personalización

### Agregar un Nuevo Demo

1. Crear componente en `frontend/src/pages/demos/`
2. Agregar ruta en `frontend/src/App.jsx`
3. Agregar card en `frontend/src/pages/Dashboard.jsx`
4. Crear endpoint en backend si es necesario

### Cambiar Estilos

Editar `frontend/tailwind.config.js` para personalizar colores y tema.

### Configurar IA Real

Para usar IA real en lugar de mocks:

1. Obtener API key de OpenAI
2. Agregar a `.env`: `OPENAI_API_KEY=sk-...`
3. Instalar modelos de Python reales en `requirements.txt`

## Solución de Problemas

### MongoDB no conecta
- Verificar que MongoDB esté ejecutándose: `mongod`
- Verificar connection string en `.env`

### Python service no inicia
- Verificar instalación de Python: `python --version`
- Instalar dependencias: `pip install -r requirements.txt`

### Frontend no carga
- Verificar puerto 3000 disponible
- Limpiar cache: `rm -rf node_modules && npm install`

### CORS errors
- Verificar que los 3 servicios estén corriendo
- Verificar configuración de proxy en `vite.config.js`

## Contribuir

1. Fork el proyecto
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'Agregar nueva funcionalidad'`
4. Push a rama: `git push origin feature/nueva-funcionalidad`
5. Abrir Pull Request

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## Soporte

Para reportar bugs o solicitar features, crear un issue en el repositorio.

## Autores

- Adbize Development Team

## Agradecimientos

- OpenAI por GPT API
- TensorFlow por modelos de ML
- React y comunidad open source

---

Desarrollado con ❤️ por Adbize
# adbizepage
