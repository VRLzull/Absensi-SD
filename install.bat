@echo off
echo ========================================
echo   Sistem Absensi Face Recognition
echo ========================================
echo.
echo Installing dependencies...
echo.

REM Install backend dependencies
echo Installing backend dependencies...
npm install
if %errorlevel% neq 0 (
    echo Error installing backend dependencies
    pause
    exit /b 1
)

REM Install frontend dependencies
echo Installing frontend dependencies...
cd client
npm install
if %errorlevel% neq 0 (
    echo Error installing frontend dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo   Installation completed successfully!
echo ========================================
echo.
echo To run the application:
echo   1. Start MySQL database
echo   2. Import database schema: database/schema.sql
echo   3. Run: npm run dev
echo.
echo Default admin credentials:
echo   Username: admin
echo   Password: admin123
echo.
pause
