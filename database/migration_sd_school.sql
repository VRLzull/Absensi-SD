-- Migration: Adaptasi database untuk Sekolah Dasar (SD)
-- Struktur: Kelas 1-6, masing-masing 2 rombel (A, B) = 12 kelas
-- Kapasitas: ~370 siswa (face recognition TIDAK DIUBAH)
--
-- employee_id = NIS (Nomor Induk Siswa) - dipakai face recognition
-- Jalankan: mysql -u root absen_sd < database/migration_sd_school.sql

USE absen_sd;

-- Tambah kolom grade (skip jika sudah ada)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'grade');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE employees ADD COLUMN grade TINYINT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah kolom classroom
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'classroom');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE employees ADD COLUMN classroom VARCHAR(5) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah kolom parent_phone
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'parent_phone');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE employees ADD COLUMN parent_phone VARCHAR(20) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tambah kolom student_id (alias NIS untuk frontend)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'student_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE employees ADD COLUMN student_id VARCHAR(20) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Sync student_id = employee_id untuk data lama
UPDATE employees SET student_id = employee_id WHERE (student_id IS NULL OR student_id = '') AND employee_id IS NOT NULL;

-- Pastikan position dan department nullable
ALTER TABLE employees MODIFY COLUMN position VARCHAR(100) NULL;
ALTER TABLE employees MODIFY COLUMN department VARCHAR(100) NULL;

-- Index untuk filter (performansi 370 siswa)
-- Jika error "Duplicate key name", index sudah ada - aman diabaikan
CREATE INDEX idx_employees_grade ON employees(grade);
CREATE INDEX idx_employees_classroom ON employees(classroom);
CREATE INDEX idx_employees_grade_classroom ON employees(grade, classroom);

-- Default jam sekolah SD (bisa diubah di Settings)
UPDATE system_settings SET setting_value = '07:00' WHERE setting_key = 'work_start_time';
UPDATE system_settings SET setting_value = '12:00' WHERE setting_key = 'work_end_time';
UPDATE system_settings SET setting_value = '10' WHERE setting_key = 'late_threshold';
