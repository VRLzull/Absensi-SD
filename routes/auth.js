const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');

const router = express.Router();

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Hanya file JPEG, PNG, atau JPG yang diperbolehkan'), false);
    }
    cb(null, true);
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username dan password harus diisi' 
      });
    }

    // Get admin user from database
    const [rows] = await pool.execute(
      'SELECT id, username, email, full_name, phone, department, position, role, is_active, password_hash FROM admin_users WHERE username = ? AND is_active = TRUE',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ 
        error: 'Username atau password salah' 
      });
    }

    const user = rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Username atau password salah' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET, // ✅ Secure: Using environment variable
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      message: 'Login berhasil',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Verify token route
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token tidak ditemukan' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user data
    const [rows] = await pool.execute(
      'SELECT id, username, email, full_name, phone, address, department, position, bio, role FROM admin_users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ 
        error: 'User tidak ditemukan' 
      });
    }

    res.json({
      message: 'Token valid',
      user: rows[0]
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token tidak valid' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token sudah expired' 
      });
    }
    
    console.error('Token verification error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Change password route
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Token tidak ditemukan' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get current user
    const [rows] = await pool.execute(
      'SELECT password_hash FROM admin_users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'User tidak ditemukan' 
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ 
        error: 'Password saat ini salah' 
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.execute(
      'UPDATE admin_users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, decoded.id]
    );

    res.json({ 
      message: 'Password berhasil diubah' 
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Update profile route
router.put('/update-profile', async (req, res) => {
  try {
    const { full_name, email, phone, address, department, position, bio } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Token tidak ditemukan' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists
    const [existing] = await pool.execute(
      'SELECT id FROM admin_users WHERE id = ? AND is_active = TRUE',
      [decoded.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ 
        error: 'User tidak ditemukan' 
      });
    }

    // Update user profile
    await pool.execute(`
      UPDATE admin_users 
      SET full_name = ?, email = ?, phone = ?, address = ?, department = ?, position = ?, bio = ?
      WHERE id = ?
    `, [full_name, email, phone, address, department, position, bio, decoded.id]);

    // Get updated user data
    const [updatedUser] = await pool.execute(
      'SELECT id, username, email, full_name, role, phone, address, department, position, bio FROM admin_users WHERE id = ?',
      [decoded.id]
    );

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui',
      user: updatedUser[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Upload profile photo route
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    const photo = req.file;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Token tidak ditemukan' 
      });
    }

    if (!photo) {
      return res.status(400).json({ 
        error: 'Foto harus diupload' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists
    const [existing] = await pool.execute(
      'SELECT id, photo_path FROM admin_users WHERE id = ? AND is_active = TRUE',
      [decoded.id]
    );

    if (existing.length === 0) {
      // Clean up uploaded file
      if (fs.existsSync(photo.path)) {
        fs.unlinkSync(photo.path);
      }
      return res.status(404).json({ 
        error: 'User tidak ditemukan' 
      });
    }

    // Delete old photo if exists
    if (existing[0].photo_path) {
      const oldPhotoPath = path.join('uploads/profiles', existing[0].photo_path);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update user photo
    await pool.execute(
      'UPDATE admin_users SET photo_path = ? WHERE id = ?',
      [photo.filename, decoded.id]
    );

    // Get updated user data
    const [updatedUser] = await pool.execute(
      'SELECT id, username, email, full_name, role, phone, address, department, position, bio, photo_path FROM admin_users WHERE id = ?',
      [decoded.id]
    );

    res.json({
      success: true,
      message: 'Foto profil berhasil diupload',
      user: updatedUser[0]
    });

  } catch (error) {
    console.error('Upload photo error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token tidak valid' 
      });
    }
    
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

module.exports = router;
