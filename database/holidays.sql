-- Tabel untuk mencatat hari libur
CREATE TABLE IF NOT EXISTS holidays (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('national', 'company', 'other') DEFAULT 'national',
    is_annual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert some sample holidays
INSERT INTO holidays (date, name, type) VALUES
('2025-01-01', 'Tahun Baru', 'national'),
('2025-02-10', 'Tahun Baru Imlek', 'national'),
('2025-03-11', 'Hari Raya Nyepi', 'national'),
('2025-04-10', 'Hari Raya Idul Fitri', 'national'),
('2025-04-11', 'Hari Raya Idul Fitri', 'national'),
('2025-05-01', 'Hari Buruh', 'national'),
('2025-05-22', 'Kenaikan Yesus Kristus', 'national'),
('2025-06-01', 'Hari Lahir Pancasila', 'national'),
('2025-08-17', 'Hari Kemerdekaan', 'national'),
('2025-12-25', 'Hari Raya Natal', 'national');
