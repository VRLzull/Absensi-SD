@echo off
echo.
echo ========================================
echo    FIX LOGIN ISSUES
echo ========================================
echo.

echo Step 1: Setting up database...
echo.

echo Creating database and tables...
mysql -u root -e "CREATE DATABASE IF NOT EXISTS ljn_db;"
mysql -u root -e "USE ljn_db;"

echo.
echo Step 2: Creating admin user with correct password...
echo.

echo Creating admin user table...
mysql -u root ljn_db -e "
CREATE TABLE IF NOT EXISTS admin_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    department VARCHAR(100),
    position VARCHAR(100),
    bio TEXT,
    role ENUM('super_admin', 'admin') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);"

echo.
echo Step 3: Inserting admin user with password 'admin123'...
echo.

echo Inserting admin user...
mysql -u root ljn_db -e "
INSERT INTO admin_users (username, email, password_hash, full_name, role) VALUES 
('admin', 'admin@company.com', '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'super_admin')
ON DUPLICATE KEY UPDATE 
password_hash = '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';"

echo.
echo Step 4: Verifying admin user...
echo.

echo Checking admin user...
mysql -u root ljn_db -e "SELECT username, email, full_name, role FROM admin_users WHERE username = 'admin';"

echo.
echo ========================================
echo    LOGIN CREDENTIALS
echo ========================================
echo.
echo Username: admin
echo Password: admin123
echo.
echo ========================================
echo    NEXT STEPS
echo ========================================
echo.
echo 1. Make sure your server is running: npm start
echo 2. Try to login with the credentials above
echo 3. If still having issues, check server logs
echo.
pause
