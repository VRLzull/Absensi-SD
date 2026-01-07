USE ljn_db;

-- Add profile columns to admin_users table
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) AFTER full_name;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS address TEXT AFTER phone;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS department VARCHAR(100) AFTER address;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS position VARCHAR(100) AFTER department;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS bio TEXT AFTER position;

-- Update existing admin user with sample data
UPDATE admin_users 
SET phone = '+62 812-3456-7890',
    address = 'Jl. Contoh No. 123, Jakarta',
    department = 'IT Department',
    position = 'System Administrator',
    bio = 'System administrator dengan pengalaman 5+ tahun dalam pengembangan aplikasi web dan sistem absensi.'
WHERE username = 'admin';

-- Show the updated table structure
DESCRIBE admin_users;

-- Ensure employee_faces has updated_at column
ALTER TABLE employee_faces 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL;

-- Show employee_faces structure
DESCRIBE employee_faces;