@echo off
echo.
echo ========================================
echo    TEST KAMERA - ABSENSI APP
echo ========================================
echo.

echo Membuka halaman test kamera...
echo.

echo Jika browser tidak terbuka otomatis, buka file:
echo test-camera.html
echo.

echo Tekan tombol apa saja untuk membuka browser...
pause >nul

start test-camera.html

echo.
echo ========================================
echo    INSTRUKSI TEST KAMERA
echo ========================================
echo.
echo 1. Klik "Mulai Kamera"
echo 2. Izinkan akses kamera jika diminta
echo 3. Klik "Ambil Foto" untuk test
echo 4. Klik "Stop Kamera" untuk berhenti
echo.
echo Jika kamera tidak bisa dibuka:
echo - Pastikan tidak ada aplikasi lain yang menggunakan kamera
echo - Pastikan izin kamera diizinkan di browser
echo - Gunakan browser modern (Chrome, Firefox, Edge)
echo.
pause
