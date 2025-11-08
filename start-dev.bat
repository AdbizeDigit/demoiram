@echo off
echo ========================================
echo   Iniciando Plataforma de Demos IA
echo ========================================
echo.

REM Check if dependencies are installed
if not exist "frontend\node_modules" (
    echo Instalando dependencias del frontend...
    cd frontend
    call npm install
    cd ..
)

if not exist "backend\node_modules" (
    echo Instalando dependencias del backend...
    cd backend
    call npm install
    cd ..
)

echo.
echo ========================================
echo   Iniciando servicios...
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000
echo Python Service: http://localhost:5001
echo.

REM Start services in new windows
start "Frontend React" cmd /k "cd frontend && npm run dev"
timeout /t 2 /nobreak >nul

start "Backend Node.js" cmd /k "cd backend && npm run dev"
timeout /t 2 /nobreak >nul

start "Python Service" cmd /k "cd backend\python-service && python app.py"

echo.
echo ========================================
echo   Todos los servicios iniciados!
echo ========================================
echo.
echo Abre tu navegador en: http://localhost:3000
echo.
echo Presiona cualquier tecla para salir...
pause >nul
