-- Migration script to add gender and address fields to employees table
-- Run this script if you have an existing database without these fields

USE ljn_db;

-- Add gender field if it doesn't exist
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS gender ENUM('male', 'female') DEFAULT 'male' AFTER department;

-- Add address field if it doesn't exist
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS address TEXT AFTER gender;

-- Update existing records to have default values
UPDATE employees SET gender = 'male' WHERE gender IS NULL;
UPDATE employees SET address = 'Address not specified' WHERE address IS NULL;

-- Verify the changes
DESCRIBE employees;
