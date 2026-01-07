@echo off
echo Running Profile Migration...
echo.

cd /d "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin"
mysql.exe -u admin_db -pPassword!@# ljn_db -e "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) AFTER full_name;"
mysql.exe -u admin_db -pPassword!@# ljn_db -e "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS address TEXT AFTER phone;"
mysql.exe -u admin_db -pPassword!@# ljn_db -e "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS department VARCHAR(100) AFTER address;"
mysql.exe -u admin_db -pPassword!@# ljn_db -e "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS position VARCHAR(100) AFTER department;"
mysql.exe -u admin_db -pPassword!@# ljn_db -e "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS bio TEXT AFTER position;"

echo.
echo Profile migration completed!
pause
