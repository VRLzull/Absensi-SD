-- Migration: Add profile fields to admin_users table
-- Run this script to update existing database

USE ljn_db;

-- Add new columns to admin_users table
ALTER TABLE admin_users 
ADD COLUMN phone VARCHAR(20) AFTER full_name,
ADD COLUMN address TEXT AFTER phone,
ADD COLUMN department VARCHAR(100) AFTER address,
ADD COLUMN position VARCHAR(100) AFTER department,
ADD COLUMN bio TEXT AFTER position;

-- Update existing admin user with sample data
UPDATE admin_users 
SET phone = '+62 812-3456-7890',
    address = 'Jl. Contoh No. 123, Jakarta',
    department = 'IT Department',
    position = 'System Administrator',
    bio = 'System administrator dengan pengalaman 5+ tahun dalam pengembangan aplikasi web dan sistem absensi.'
WHERE username = 'admin';

-- Verify the changes
SELECT id, username, full_name, phone, department, position FROM admin_users;
