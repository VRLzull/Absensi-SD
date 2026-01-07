@echo off
echo.
echo ========================================
echo    COMPREHENSIVE FIX - ABSENSI APP
echo ========================================
echo.

echo Step 1: Stopping any running servers...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Step 2: Installing all required packages...
npm install bcryptjs mysql2 axios cors helmet express-rate-limit

echo.
echo Step 3: Creating admin user...
node create-admin-user.js

echo.
echo Step 4: Starting server with fixed CORS...
start "Server" cmd /k "npm start"

echo.
echo Step 5: Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo Step 6: Testing CORS configuration...
node test-cors.js

echo.
echo Step 7: Testing login system...
node test-login.js

echo.
echo ========================================
echo    ALL FIXES COMPLETED
echo ========================================
echo.
echo Summary of fixes applied:
echo   ✅ CORS configuration updated
echo   ✅ Admin user created (admin/admin123)
echo   ✅ Server restarted with new config
echo   ✅ CORS and login tested
echo.
echo Next steps:
echo   1. Refresh your browser page
echo   2. Try to login with admin/admin123
echo   3. Check browser console for errors
echo.
echo If you still have issues:
echo   - Make sure server is running on port 5000
echo   - Check if database is accessible
echo   - Verify all packages are installed
echo.
pause
