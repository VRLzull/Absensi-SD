@echo off
echo.
echo ========================================
echo    FIX CORS ISSUES - ABSENSI APP
echo ========================================
echo.

echo Step 1: Stopping any running server...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Step 2: Installing dependencies...
npm install

echo.
echo Step 3: Starting server with fixed CORS...
npm start

echo.
echo ========================================
echo    SERVER STARTED
echo ========================================
echo.
echo Server should now be running on port 5000
echo Frontend can access from port 3001
echo.
echo If you still see CORS errors:
echo 1. Check if server is running on port 5000
echo 2. Refresh your browser page
echo 3. Check browser console for errors
echo.
pause
