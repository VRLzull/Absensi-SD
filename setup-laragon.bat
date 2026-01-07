@echo off
echo ========================================
echo Setup Absensi App untuk Laragon
echo ========================================
echo.

echo 1. Pastikan Laragon sudah running...
echo    - Start Laragon
echo    - Klik "Start All"
echo    - Pastikan MySQL running (hijau)
echo.

echo 2. Buka HeidiSQL:
echo    - Klik kanan pada MySQL di Laragon
echo    - Pilih "HeidiSQL"
echo    - Connect dengan:
echo      Host: 127.0.0.1
echo      User: root
echo      Password: (kosong)
echo      Port: 3306
echo.

echo 3. Import database:
echo    - File -> Run SQL file
echo    - Pilih file: setup-laragon.sql
echo    - Jalankan script
echo.

echo 4. Test aplikasi:
echo    - Buka terminal baru
echo    - cd /c/laragon/www/Absensi-App
echo    - npm run dev
echo.

echo 5. Akses aplikasi:
echo    - Backend: http://localhost:5000
echo    - Frontend: http://localhost:3000
echo    - Login: admin / admin123
echo.

pause
