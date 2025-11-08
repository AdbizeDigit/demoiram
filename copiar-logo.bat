@echo off
echo ========================================
echo   Copiando logo de Adbize
echo ========================================
echo.

REM Crear directorio public si no existe
if not exist "frontend\public" (
    mkdir "frontend\public"
    echo Directorio public creado
)

REM Copiar logo
if exist "logo2023.png" (
    copy "logo2023.png" "frontend\public\logo.png"
    echo.
    echo ✓ Logo copiado exitosamente!
    echo   Ubicacion: frontend\public\logo.png
) else (
    echo.
    echo ✗ No se encontro logo2023.png en el directorio actual
    echo   Asegurate de que el archivo logo2023.png este en:
    echo   C:\Users\frann\OneDrive\Escritorio\Adbize\demoiram\
)

echo.
echo ========================================
echo.
pause
