@echo off
echo ========================================
echo   Sistem Absensi Face Recognition
echo ========================================
echo.
echo Starting application...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Backend dependencies not found. Running install.bat first...
    call install.bat
    if %errorlevel% neq 0 (
        echo Installation failed. Please run install.bat manually.
        pause
        exit /b 1
    )
)

if not exist "client\node_modules" (
    echo Frontend dependencies not found. Running install.bat first...
    call install.bat
    if %errorlevel% neq 0 (
        echo Installation failed. Please run install.bat manually.
        pause
        exit /b 1
    )
)

echo Starting backend and frontend...
npm run dev

pause
