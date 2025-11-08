# 🚀 Guía Rápida de Inicio

## ✨ Nueva Característica: Diseño Multicolor Líquido 3D

La plataforma ahora cuenta con un **diseño visual espectacular** con:
- 🌊 Efectos líquidos 3D animados
- 🎨 Gradientes multicolor en movimiento
- 💎 Glass morphism en componentes
- ✨ Iconos flotantes con shimmer
- 🌈 Basado en los colores del logo de Adbize

---

# Guía Rápida de Inicio

## Instalación Rápida (Windows)

### Opción 1: Script Automático
```batch
# 1. Ejecutar el instalador
install.bat

# 2. Copiar el logo (opcional pero recomendado)
copiar-logo.bat

# 3. Iniciar la aplicación
start-dev.bat
```

### Opción 2: Manual
```batch
# 1. Instalar frontend
cd frontend
npm install

# 2. Instalar backend
cd ../backend
npm install
copy .env.example .env

# 3. Instalar Python service
cd python-service
pip install -r requirements.txt
```

## Configuración Mínima

### 1. MongoDB
**Opción fácil:** Usar MongoDB sin instalación
- El backend funciona sin MongoDB (modo desarrollo)
- Los usuarios no se guardarán permanentemente

**Opción completa:** Instalar MongoDB
- Descargar de: https://www.mongodb.com/try/download/community
- Instalar y ejecutar el servicio

### 2. Variables de Entorno
Editar `backend/.env`:
```env
JWT_SECRET=mi-clave-secreta-123
PORT=5000
```

## Ejecutar la Aplicación

### Windows
```batch
start-dev.bat
```

### Manual (3 terminales)
```batch
# Terminal 1
cd frontend
npm run dev

# Terminal 2
cd backend
npm run dev

# Terminal 3
cd backend/python-service
python app.py
```

## Acceso

Abre tu navegador en:
```
http://localhost:3000
```

## Primer Uso

1. Haz clic en "Regístrate aquí"
2. Crea una cuenta con tu nombre, email y contraseña
3. Inicia sesión
4. Explora los 8 demos disponibles

## Demos Disponibles

1. **Chatbot con IA** - Conversación con asistente virtual
2. **Visión Artificial** - Sube imágenes o usa tu cámara
3. **Generador de Agentes** - Crea agentes personalizados
4. **Marketplace** - Busca compradores o vendedores
5. **Análisis de Sentimientos** - Analiza el tono de textos
6. **Transcripción de Audio** - Convierte audio a texto
7. **Análisis de Documentos** - Clasifica y extrae información
8. **Predictor de Tendencias** - Forecasting de datos

## Solución de Problemas Comunes

### "Cannot connect to MongoDB"
- No te preocupes, la app funciona sin MongoDB
- Los usuarios no se guardarán entre reinicios
- Para guardar usuarios, instala MongoDB

### "Puerto ya en uso"
- Cerrar otras aplicaciones en puertos 3000, 5000, 5001
- O cambiar puertos en los archivos de configuración

### "Python no encontrado"
- Instalar Python 3.8+ desde python.org
- Agregar Python al PATH durante instalación

### "npm no encontrado"
- Instalar Node.js desde nodejs.org
- Versión recomendada: v18 o superior

## Estructura de Carpetas

```
demoiram/
├── frontend/        → React (Puerto 3000)
├── backend/         → Node.js (Puerto 5000)
│   └── python-service/  → Flask (Puerto 5001)
└── README.md
```

## Características

- ✅ Sistema de login y registro
- ✅ 8 demos interactivos de IA
- ✅ Interfaz moderna con Tailwind CSS
- ✅ Backend RESTful API
- ✅ Servicio Python para IA
- ✅ Mock data para desarrollo sin APIs externas

## Personalización

### Cambiar colores
Editar `frontend/tailwind.config.js`

### Agregar un demo
1. Crear componente en `frontend/src/pages/demos/`
2. Agregar ruta en `frontend/src/App.jsx`
3. Agregar card en `Dashboard.jsx`

### Usar IA real
Agregar en `backend/.env`:
```env
OPENAI_API_KEY=sk-tu-api-key
```

## Próximos Pasos

1. Explorar cada demo
2. Revisar el código fuente
3. Personalizar según tus necesidades
4. Agregar tus propios demos

## Soporte

- Documentación completa: README.md
- Issues: Crear en el repositorio
- Email: support@adbize.com

---

¡Disfruta explorando la plataforma de demos de IA! 🚀
