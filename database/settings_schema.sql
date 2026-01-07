-- Settings table for system configuration
USE ljn_db;

CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
-- Notification settings
('email_notifications', 'true', 'boolean', 'notifications', 'Enable email notifications'),
('push_notifications', 'false', 'boolean', 'notifications', 'Enable push notifications'),
('sms_notifications', 'false', 'boolean', 'notifications', 'Enable SMS notifications'),

-- Security settings
('two_factor_auth', 'true', 'boolean', 'security', 'Enable two-factor authentication'),
('session_timeout', '30', 'number', 'security', 'Session timeout in minutes'),
('password_expiry', '90', 'number', 'security', 'Password expiry in days'),

-- Attendance settings
('work_start_time', '08:00', 'string', 'attendance', 'Default work start time'),
('work_end_time', '17:00', 'string', 'attendance', 'Default work end time'),
('late_threshold', '15', 'number', 'attendance', 'Late threshold in minutes'),
('overtime_enabled', 'true', 'boolean', 'attendance', 'Enable overtime tracking'),

-- Face recognition settings
('face_detection_confidence', '0.8', 'number', 'face_recognition', 'Face detection confidence threshold'),
('max_face_images', '5', 'number', 'face_recognition', 'Maximum face images per employee'),
('auto_capture', 'false', 'boolean', 'face_recognition', 'Enable automatic face capture'),

-- System settings
('auto_backup', 'true', 'boolean', 'system', 'Enable automatic backup'),
('backup_frequency', 'daily', 'string', 'system', 'Backup frequency'),
('data_retention', '365', 'number', 'system', 'Data retention in days');

-- Create index for better performance
CREATE INDEX idx_settings_key ON system_settings(setting_key);
CREATE INDEX idx_settings_category ON system_settings(category);
