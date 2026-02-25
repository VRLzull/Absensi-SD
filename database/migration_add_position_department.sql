-- Migration: Tambah kolom position dan department ke tabel employees (database absen_sd)
-- Jalankan jika error: Unknown column 'e.position' in 'SELECT'
-- Jalankan: mysql -u root absen_sd < database/migration_add_position_department.sql

USE absen_sd;

-- Tambah kolom position jika belum ada
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'position');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE employees ADD COLUMN position VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tambah kolom department jika belum ada
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'department');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE employees ADD COLUMN department VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration selesai. Kolom position dan department siap di tabel employees (absen_sd).' AS result;
