@echo off
echo ========================================
echo   Verificacion del Sistema
echo ========================================
echo.

echo Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Node.js NO instalado
    echo   Descarga desde: https://nodejs.org
) else (
    echo ✓ Node.js instalado
    node --version
)
echo.

echo Verificando npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ✗ npm NO instalado
) else (
    echo ✓ npm instalado
    npm --version
)
echo.

echo Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Python NO instalado
    echo   Descarga desde: https://python.org
) else (
    echo ✓ Python instalado
    python --version
)
echo.

echo Verificando pip...
pip --version >nul 2>&1
if errorlevel 1 (
    echo ✗ pip NO instalado
) else (
    echo ✓ pip instalado
    pip --version
)
echo.

echo Verificando MongoDB...
mongod --version >nul 2>&1
if errorlevel 1 (
    echo ⚠ MongoDB NO instalado (opcional)
    echo   La app funcionara sin MongoDB
) else (
    echo ✓ MongoDB instalado
    mongod --version | findstr version
)
echo.

echo ========================================
echo   Verificando dependencias...
echo ========================================
echo.

if exist "frontend\node_modules" (
    echo ✓ Dependencias de frontend instaladas
) else (
    echo ✗ Dependencias de frontend NO instaladas
    echo   Ejecuta: cd frontend && npm install
)

if exist "backend\node_modules" (
    echo ✓ Dependencias de backend instaladas
) else (
    echo ✗ Dependencias de backend NO instaladas
    echo   Ejecuta: cd backend && npm install
)

if exist "backend\.env" (
    echo ✓ Archivo .env configurado
) else (
    echo ⚠ Archivo .env NO encontrado
    echo   Ejecuta: cd backend && copy .env.example .env
)
echo.

echo ========================================
echo   Resumen
echo ========================================
echo.
echo Si todo tiene ✓, ejecuta: start-dev.bat
echo Si algo falta, ejecuta primero: install.bat
echo.
pause
