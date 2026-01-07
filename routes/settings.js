const express = require('express');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get all settings
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT setting_key, setting_value, setting_type, category, description 
      FROM system_settings 
      WHERE is_active = TRUE 
      ORDER BY category, setting_key
    `);

    // Group settings by category
    const settingsByCategory = rows.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      
      // Convert value based on type
      let value = setting.setting_value;
      if (setting.setting_type === 'boolean') {
        value = value === 'true';
      } else if (setting.setting_type === 'number') {
        value = parseFloat(value);
      }
      
      acc[setting.category].push({
        key: setting.setting_key,
        value: value,
        type: setting.setting_type,
        description: setting.description
      });
      
      return acc;
    }, {});

    res.json({
      success: true,
      data: settingsByCategory
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Get setting by key
router.get('/:key', verifyToken, async (req, res) => {
  try {
    const { key } = req.params;

    const [rows] = await pool.execute(
      'SELECT setting_key, setting_value, setting_type, category, description FROM system_settings WHERE setting_key = ? AND is_active = TRUE',
      [key]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'Setting tidak ditemukan' 
      });
    }

    const setting = rows[0];
    
    // Convert value based on type
    let value = setting.setting_value;
    if (setting.setting_type === 'boolean') {
      value = value === 'true';
    } else if (setting.setting_type === 'number') {
      value = parseFloat(value);
    }

    res.json({
      success: true,
      data: {
        key: setting.setting_key,
        value: value,
        type: setting.setting_type,
        category: setting.category,
        description: setting.description
      }
    });

  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Update multiple settings (BATCH)
router.put('/batch', verifyToken, async (req, res) => {
  try {
    const { settings } = req.body;
    
    console.log('Batch update request:', { settings });

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ 
        error: 'Settings harus berupa array' 
      });
    }

    const results = [];
    
    for (const setting of settings) {
      const { key, value } = setting;
      
      console.log('Processing setting:', { key, value, type: typeof value });
      
      if (!key || value === undefined || value === null) {
        console.log('Skipping setting:', { key, value, reason: 'missing key or value' });
        continue;
      }

      try {
        // Check if setting exists
        const [existing] = await pool.execute(
          'SELECT id, setting_type FROM system_settings WHERE setting_key = ? AND is_active = TRUE',
          [key]
        );

        if (existing.length === 0) {
          console.log('Setting not found:', key);
          continue;
        }

        const settingInfo = existing[0];
        console.log('Setting info:', settingInfo);
        
        // Validate value type
        let validatedValue = value;
        if (settingInfo.setting_type === 'boolean') {
          validatedValue = Boolean(value).toString();
        } else if (settingInfo.setting_type === 'number') {
          if (isNaN(value)) {
            console.log('Invalid number value:', value);
            continue;
          }
          validatedValue = value.toString();
        } else {
          validatedValue = value.toString();
        }

        console.log('Validated value:', validatedValue);

        // Update setting
        await pool.execute(
          'UPDATE system_settings SET setting_value = ? WHERE setting_key = ?',
          [validatedValue, key]
        );

        results.push({ key, value: validatedValue, status: 'success' });
      } catch (error) {
        console.error('Error updating setting:', key, error);
        results.push({ key, error: error.message, status: 'failed' });
      }
    }

    console.log('Batch update results:', results);

    res.json({
      success: true,
      message: 'Batch update selesai',
      data: results
    });

  } catch (error) {
    console.error('Batch update settings error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Update setting
router.put('/:key', verifyToken, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ 
        error: 'Value harus diisi' 
      });
    }

    // Check if setting exists
    const [existing] = await pool.execute(
      'SELECT id, setting_type FROM system_settings WHERE setting_key = ? AND is_active = TRUE',
      [key]
    );

    if (existing.length === 0) {
      return res.status(404).json({ 
        error: 'Setting tidak ditemukan' 
      });
    }

    const setting = existing[0];
    
    // Validate value type
    let validatedValue = value;
    if (setting.setting_type === 'boolean') {
      validatedValue = Boolean(value).toString();
    } else if (setting.setting_type === 'number') {
      if (isNaN(value)) {
        return res.status(400).json({ 
          error: 'Value harus berupa angka' 
        });
      }
      validatedValue = value.toString();
    } else {
      validatedValue = value.toString();
    }

    // Update setting
    await pool.execute(
      'UPDATE system_settings SET setting_value = ? WHERE setting_key = ?',
      [validatedValue, key]
    );

    res.json({
      success: true,
      message: 'Setting berhasil diupdate',
      data: {
        key: key,
        value: validatedValue
      }
    });

  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Reset settings to default
router.post('/reset', verifyToken, async (req, res) => {
  try {
    // Reset to default values
    const defaultSettings = {
      'email_notifications': 'true',
      'push_notifications': 'false',
      'sms_notifications': 'false',
      'two_factor_auth': 'true',
      'session_timeout': '30',
      'password_expiry': '90',
      'work_start_time': '08:00',
      'work_end_time': '17:00',
      'late_threshold': '15',
      'overtime_enabled': 'true',
      'face_detection_confidence': '0.8',
      'max_face_images': '5',
      'auto_capture': 'false',
      'auto_backup': 'true',
      'backup_frequency': 'daily',
      'data_retention': '365'
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      await pool.execute(
        'UPDATE system_settings SET setting_value = ? WHERE setting_key = ?',
        [value, key]
      );
    }

    res.json({
      success: true,
      message: 'Settings berhasil direset ke nilai default'
    });

  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

module.exports = router;
