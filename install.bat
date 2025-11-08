@echo off
echo ========================================
echo   Instalacion de Plataforma de Demos IA
echo ========================================
echo.

echo [1/3] Instalando dependencias del frontend...
cd frontend
call npm install
if errorlevel 1 (
    echo Error al instalar dependencias del frontend
    pause
    exit /b 1
)
cd ..
echo ✓ Frontend instalado correctamente
echo.

echo [2/3] Instalando dependencias del backend...
cd backend
call npm install
if errorlevel 1 (
    echo Error al instalar dependencias del backend
    pause
    exit /b 1
)

REM Copy .env.example to .env if it doesn't exist
if not exist ".env" (
    echo Creando archivo .env...
    copy .env.example .env
    echo ✓ Archivo .env creado. Por favor configuralo antes de iniciar.
)
cd ..
echo ✓ Backend instalado correctamente
echo.

echo [3/3] Instalando dependencias de Python...
cd backend\python-service
pip install -r requirements.txt
if errorlevel 1 (
    echo Error al instalar dependencias de Python
    echo Asegurate de tener Python instalado
    pause
    exit /b 1
)
cd ..\..
echo ✓ Python service instalado correctamente
echo.

echo ========================================
echo   Instalacion completada!
echo ========================================
echo.
echo Pasos siguientes:
echo 1. Configura backend\.env con tus credenciales
echo 2. Asegurate de tener MongoDB ejecutandose
echo 3. Ejecuta start-dev.bat para iniciar la aplicacion
echo.
pause
