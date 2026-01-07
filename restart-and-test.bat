@echo off
echo.
echo ========================================
echo    RESTART SERVER & TEST ENDPOINT
echo ========================================
echo.

echo 1. Stopping existing server processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo 2. Installing dependencies...
npm install

echo 3. Starting server...
start "Backend Server" cmd /k "npm start"

echo 4. Waiting for server to start...
timeout /t 5 /nobreak >nul

echo 5. Testing new endpoint...
node test-register-endpoint.js

echo.
echo ========================================
echo    TEST COMPLETED
echo ========================================
echo.

echo If endpoint test is successful:
echo 1. Go back to web app
echo 2. Refresh page (F5)
echo 3. Try face registration again
echo.

pause
















