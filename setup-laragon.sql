-- Setup Database untuk Laragon
-- Jalankan file ini di HeidiSQL atau phpMyAdmin

-- Buat database
CREATE DATABASE IF NOT EXISTS ljn_db;
USE ljn_db;

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('super_admin', 'admin') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    position VARCHAR(100),
    department VARCHAR(100),
    hire_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Face data table for employees
CREATE TABLE IF NOT EXISTS employee_faces (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    face_descriptor LONGTEXT NOT NULL,
    face_image_path VARCHAR(255),
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    check_in DATETIME,
    check_out DATETIME,
    check_in_image VARCHAR(255),
    check_out_image VARCHAR(255),
    check_in_location VARCHAR(255),
    check_out_location VARCHAR(255),
    status ENUM('present', 'late', 'absent', 'half_day') DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (username, email, password_hash, full_name, role) VALUES 
('admin', 'admin@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'super_admin');

-- Insert sample employee
INSERT INTO employees (employee_id, full_name, email, phone, position, department, hire_date) VALUES 
('EMP001', 'John Doe', 'john.doe@company.com', '08123456789', 'Software Developer', 'IT Department', '2024-01-01');

-- Create indexes for better performance
CREATE INDEX idx_employee_id ON employees(employee_id);
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(check_in);
CREATE INDEX idx_employee_faces_employee ON employee_faces(employee_id);

-- Show success message
SELECT 'Database ljn_db berhasil dibuat!' as message;
SELECT 'Admin user: admin / admin123' as credentials;
