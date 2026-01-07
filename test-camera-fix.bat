@echo off
echo.
echo ========================================
echo    TESTING CAMERA FIX
echo ========================================
echo.

echo 1. Refresh browser page aplikasi (F5)
echo 2. Buka halaman "Pendaftaran Wajah"
echo 3. Pilih pegawai untuk didaftarkan
echo 4. Klik "MULAI KAMERA"
echo 5. Check console untuk log messages
echo.

echo Console log yang diharapkan:
echo - 📷 Camera state changed: {hasVideoRef: true, hasCanvasRef: true}
echo - 🚀 Starting camera...
echo - ✅ Camera stream obtained
echo - 📹 Video metadata loaded
echo.

echo Jika masih error, check:
echo - Browser console (F12)
echo - Permission kamera di browser
echo - Refresh halaman aplikasi
echo.

pause
