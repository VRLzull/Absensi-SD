@echo off
echo.
echo ========================================
echo    COMPREHENSIVE LOGIN FIX
echo ========================================
echo.

echo Step 1: Installing required packages...
echo.
npm install bcryptjs mysql2 axios

echo.
echo Step 2: Creating admin user...
echo.
node create-admin-user.js

echo.
echo Step 3: Testing login system...
echo.
node test-login.js

echo.
echo ========================================
echo    FIX COMPLETED
echo ========================================
echo.
echo If everything is working, you should be able to login with:
echo   Username: admin
echo   Password: admin123
echo.
echo If you still have issues:
echo   1. Make sure MySQL is running (Laragon)
echo   2. Make sure server is running (npm start)
echo   3. Check server logs for errors
echo.
pause
