@echo off
echo Running database migration...
echo.

REM Check if Laragon is running
echo Checking if Laragon is running...
netstat -an | findstr ":3306" >nul
if %errorlevel% neq 0 (
    echo ERROR: Laragon/MySQL is not running!
    echo Please start Laragon first.
    pause
    exit /b 1
)

echo Laragon is running. Proceeding with migration...
echo.

REM Run the migration script
echo Executing migration script...
mysql -u root -p -h localhost ljn_db < database/migration_add_gender_address.sql

if %errorlevel% equ 0 (
    echo.
    echo Migration completed successfully!
    echo The employees table now has gender and address fields.
) else (
    echo.
    echo ERROR: Migration failed!
    echo Please check the error messages above.
)

echo.
pause
