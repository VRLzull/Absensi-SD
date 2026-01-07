@echo off
echo ========================================
echo   API Testing - Sistem Absensi
echo ========================================
echo.
echo Testing API endpoints...
echo.

REM Test health endpoint
echo Testing health endpoint...
curl -s http://localhost:5000/api/health
if %errorlevel% neq 0 (
    echo.
    echo Health check failed. Make sure the server is running.
    echo Run: npm run server
    pause
    exit /b 1
)

echo.
echo.
echo Testing login endpoint...
curl -s -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"

echo.
echo.
echo ========================================
echo   API testing completed!
echo ========================================
echo.
echo If you see JSON responses above, the API is working correctly.
echo.
pause
