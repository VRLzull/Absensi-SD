@echo off
echo.
echo ========================================
echo    QUICK CAMERA TEST
echo ========================================
echo.

echo Opening quick camera test...
start test-camera-quick.html

echo.
echo ========================================
echo    INSTRUCTIONS
echo ========================================
echo.
echo 1. Click "Start Camera" button
echo 2. Allow camera access if prompted
echo 3. Camera should show video feed
echo 4. Click "Stop Camera" to stop
echo.
echo If camera works here but not in the app:
echo - The issue is with the React component
echo - Check browser console for errors
echo.
pause
