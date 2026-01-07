@echo off
echo ========================================
echo Testing Flutter FaceNet TFLite API
echo ========================================
echo.

echo Starting Express.js server...
start /B node server.js

echo Waiting for server to start...
timeout /t 3 /nobreak > nul

echo.
echo Running Flutter API tests...
node test-flutter-embedding-api.js

echo.
echo ========================================
echo Test completed!
echo ========================================
echo.
echo Press any key to exit...
pause > nul