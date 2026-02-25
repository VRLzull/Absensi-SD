@echo off
echo ========================================
echo   Database Setup - Sistem Absensi
echo ========================================
echo.
echo This script will help you set up the database
echo.

REM Check if MySQL is running
echo Checking MySQL connection...
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo MySQL is not installed or not in PATH
    echo Please install MySQL and add it to your PATH
    pause
    exit /b 1
)

echo.
echo Please enter your MySQL root password:
echo (Press Enter if no password)
set /p mysql_password=

echo.
echo Creating database and tables...

if "%mysql_password%"=="" (
    mysql -u root < database/absensi--SD.sql
) else (
    mysql -u root -p%mysql_password% < database/absensi--SD.sql
)

if %errorlevel% neq 0 (
    echo.
    echo Database setup failed!
    echo Please check your MySQL connection and try again
    echo.
    echo You can also manually run:
    echo   mysql -u root -p < database/schema.sql
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Database setup completed successfully!
echo ========================================
echo.
echo Database: ljn_db
echo Tables created (lihat definisi di absensi--SD.sql)
echo.
echo Default admin user:
echo   Username: admin
echo   Password: admin123
echo.
pause
