const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const faceRecognitionService = require('../services/faceRecognitionService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/employees';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'employee-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Hanya 1 file per request
  },
  fileFilter: (req, file, cb) => {
    // ✅ Enhanced MIME type validation
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Hanya file JPEG, PNG, atau JPG yang diperbolehkan'), false);
    }
    
    // ✅ Enhanced file extension validation
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error('Ekstensi file tidak diperbolehkan. Gunakan .jpg, .jpeg, atau .png'), false);
    }
    
    // ✅ File size validation (additional check)
    if (file.size > 5 * 1024 * 1024) {
      return cb(new Error('Ukuran file maksimal 5MB'), false);
    }
    
    cb(null, true);
  }
});

// Get all employees
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT e.*, 
             COUNT(ef.id) as face_count,
             COUNT(a.id) as attendance_count
      FROM employees e
      LEFT JOIN employee_faces ef ON e.id = ef.employee_id
      LEFT JOIN attendance a ON e.id = a.employee_id
      WHERE e.is_active = TRUE
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Get employee by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(`
      SELECT e.*, 
             ef.face_image_path,
             ef.face_descriptor
      FROM employees e
      LEFT JOIN employee_faces ef ON e.id = ef.employee_id AND ef.is_primary = TRUE
      WHERE e.id = ? AND e.is_active = TRUE
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'Pegawai tidak ditemukan' 
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Create new employee
router.post('/', verifyToken, [
  // ✅ Input validation rules
  body('employee_id')
    .notEmpty().withMessage('Employee ID tidak boleh kosong')
    .isLength({ min: 3, max: 20 }).withMessage('Employee ID harus 3-20 karakter')
    .matches(/^[A-Za-z0-9_-]+$/).withMessage('Employee ID hanya boleh huruf, angka, underscore, dan dash'),
  
  body('full_name')
    .notEmpty().withMessage('Nama lengkap tidak boleh kosong')
    .isLength({ min: 2, max: 100 }).withMessage('Nama lengkap harus 2-100 karakter')
    .matches(/^[A-Za-z\s]+$/).withMessage('Nama lengkap hanya boleh huruf dan spasi'),
  
  body('email')
    .optional()
    .isEmail().withMessage('Format email tidak valid'),
  
  body('phone')
    .optional()
    .matches(/^[0-9+\-\s()]+$/).withMessage('Format nomor telepon tidak valid'),
  
  body('position')
    .optional()
    .isLength({ max: 100 }).withMessage('Posisi maksimal 100 karakter'),
  
  body('department')
    .optional()
    .isLength({ max: 100 }).withMessage('Department maksimal 100 karakter'),
  
  body('gender')
    .optional()
    .isIn(['male', 'female']).withMessage('Gender harus male atau female'),
  
  body('address')
    .optional()
    .isLength({ max: 500 }).withMessage('Alamat maksimal 500 karakter'),
  
  body('hire_date')
    .optional()
    .isISO8601().withMessage('Format tanggal tidak valid')
], async (req, res) => {
  // ✅ Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validasi input gagal',
      details: errors.array()
    });
  }

  try {
    const { 
      employee_id, 
      full_name, 
      email, 
      phone, 
      position, 
      department,
      gender,
      address,
      hire_date
    } = req.body;

    // Check if employee_id already exists
    const [existing] = await pool.execute(`
      SELECT id FROM employees WHERE employee_id = ?
    `, [employee_id]);

    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'Employee ID sudah ada' 
      });
    }

    // Create employee
    const [result] = await pool.execute(`
      INSERT INTO employees (employee_id, full_name, email, phone, position, department, gender, address, hire_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [employee_id, full_name, email, phone, position, department, gender, address, hire_date]);

    res.status(201).json({
      success: true,
      message: 'Pegawai berhasil ditambahkan',
      data: {
        id: result.insertId,
        employee_id,
        full_name
      }
    });

  } catch (error) {
    console.error('Create employee error:', error);
    
    // ✅ Enhanced error handling
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        error: 'Data duplikat ditemukan',
        message: 'Employee ID sudah ada dalam sistem'
      });
    }
    
    if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ 
        error: 'Data terlalu panjang',
        message: 'Salah satu field melebihi batas maksimal'
      });
    }
    
    if (error.code === 'ER_BAD_NULL_ERROR') {
      return res.status(400).json({ 
        error: 'Data tidak lengkap',
        message: 'Field wajib tidak boleh kosong'
      });
    }
    
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update employee
router.put('/:id', verifyToken, [
  // ✅ Input validation rules
  body('full_name')
    .optional()
    .isLength({ min: 2, max: 100 }).withMessage('Nama lengkap harus 2-100 karakter')
    .matches(/^[A-Za-z\s]+$/).withMessage('Nama lengkap hanya boleh huruf dan spasi'),
  
  body('email')
    .optional()
    .isEmail().withMessage('Format email tidak valid'),
  
  body('phone')
    .optional()
    .matches(/^[0-9+\-\s()]+$/).withMessage('Format nomor telepon tidak valid'),
  
  body('position')
    .optional()
    .isLength({ max: 100 }).withMessage('Posisi maksimal 100 karakter'),
  
  body('department')
    .optional()
    .isLength({ max: 100 }).withMessage('Department maksimal 100 karakter'),
  
  body('gender')
    .optional()
    .isIn(['male', 'female']).withMessage('Gender harus male atau female'),
  
  body('address')
    .optional()
    .isLength({ max: 500 }).withMessage('Alamat maksimal 500 karakter'),
  
  body('hire_date')
    .optional()
    .isISO8601().withMessage('Format tanggal tidak valid')
], async (req, res) => {
  // ✅ Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validasi input gagal',
      details: errors.array()
    });
  }

  try {
    const { id } = req.params;
    const { 
      full_name, 
      email, 
      phone, 
      position, 
      department,
      gender,
      address,
      hire_date
    } = req.body;

    // Check if employee exists
    const [existing] = await pool.execute(`
      SELECT id FROM employees WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ 
        error: 'Pegawai tidak ditemukan' 
      });
    }

    // Update employee
    await pool.execute(`
      UPDATE employees 
      SET full_name = ?, email = ?, phone = ?, position = ?, department = ?, 
          gender = ?, address = ?, hire_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [full_name, email, phone, position, department, gender, address, hire_date, id]);

    res.json({
      success: true,
      message: 'Data pegawai berhasil diupdate'
    });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Delete employee
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const [existing] = await pool.execute(`
      SELECT employee_id, full_name FROM employees WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ 
        error: 'Pegawai tidak ditemukan' 
      });
    }

    // Check if employee has attendance records
    const [attendanceCount] = await pool.execute(`
      SELECT COUNT(*) as count FROM attendance WHERE employee_id = ?
    `, [id]);

    if (attendanceCount[0].count > 0) {
      return res.status(400).json({ 
        error: 'Pegawai tidak dapat dihapus karena memiliki data absensi' 
      });
    }

    // Delete employee faces
    await pool.execute(`
      DELETE FROM employee_faces WHERE employee_id = ?
    `, [id]);

    // Delete employee
    await pool.execute(`
      DELETE FROM employees WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Pegawai berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Upload employee photo
router.post('/:id/photo', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const photo = req.file;

    if (!photo) {
      return res.status(400).json({ 
        error: 'Foto harus diupload' 
      });
    }

    // Check if employee exists
    const [employee] = await pool.execute(`
      SELECT id, full_name FROM employees WHERE id = ? AND is_active = TRUE
    `, [id]);

    if (employee.length === 0) {
      return res.status(404).json({ 
        error: 'Pegawai tidak ditemukan' 
      });
    }

    // Update employee photo
    await pool.execute(`
      UPDATE employees 
      SET photo_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [photo.filename, id]);

    res.json({
      success: true,
      message: 'Foto pegawai berhasil diupload',
      data: {
        photo_path: photo.filename
      }
    });

  } catch (error) {
    console.error('Upload photo error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Register face for employee - NEW ENDPOINT
router.post('/:id/face', verifyToken, upload.single('face_image'), async (req, res) => {
  try {
    const { id } = req.params;
    const faceImage = req.file;

    if (!faceImage) {
      return res.status(400).json({ 
        error: 'Foto wajah harus diupload' 
      });
    }

    // Check if employee exists
    const [employee] = await pool.execute(`
      SELECT id, full_name FROM employees WHERE id = ? AND is_active = TRUE
    `, [id]);

    if (employee.length === 0) {
      return res.status(404).json({ 
        error: 'Pegawai tidak ditemukan' 
      });
    }

    // Initialize face recognition service
    await faceRecognitionService.initialize();

    // Extract face descriptor
    const faceDescriptor = await faceRecognitionService.extractFaceDescriptor(faceImage.path);

    // Check if employee already has face data
    const [existingFace] = await pool.execute(`
      SELECT id FROM employee_faces WHERE employee_id = ?
    `, [id]);

    if (existingFace.length > 0) {
      // Update existing face data
      await pool.execute(`
        UPDATE employee_faces 
        SET face_descriptor = ?, face_image_path = ?, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ?
      `, [JSON.stringify(faceDescriptor), faceImage.filename, id]);
    } else {
      // Insert new face data
      await pool.execute(`
        INSERT INTO employee_faces (employee_id, face_descriptor, face_image_path)
        VALUES (?, ?, ?)
      `, [id, JSON.stringify(faceDescriptor), faceImage.filename]);
    }

    res.json({
      success: true,
      message: 'Data wajah berhasil didaftarkan',
      data: {
        employee_id: id,
        employee_name: employee[0].full_name,
        face_image: faceImage.filename,
        descriptor_length: faceDescriptor.length
      }
    });

  } catch (error) {
    console.error('Face registration error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server',
      message: error.message
    });
  }
});

// Get employee face data
router.get('/:id/face', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(`
      SELECT ef.*, e.full_name, e.employee_id
      FROM employee_faces ef
      JOIN employees e ON ef.employee_id = e.id
      WHERE ef.employee_id = ?
    `, [id]);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Get employee face error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Delete employee face data
router.delete('/:id/face/:faceId', verifyToken, async (req, res) => {
  try {
    const { id, faceId } = req.params;

    // Check if face data exists
    const [faceData] = await pool.execute(`
      SELECT ef.*, e.full_name 
      FROM employee_faces ef
      JOIN employees e ON ef.employee_id = e.id
      WHERE ef.id = ? AND ef.employee_id = ?
    `, [faceId, id]);

    if (faceData.length === 0) {
      return res.status(404).json({ 
        error: 'Data wajah tidak ditemukan' 
      });
    }

    // Delete face image file
    if (faceData[0].face_image_path) {
      const imagePath = path.join('uploads/face-recognition', faceData[0].face_image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete face data
    await pool.execute(`
      DELETE FROM employee_faces WHERE id = ?
    `, [faceId]);

    res.json({
      success: true,
      message: 'Data wajah berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete face data error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Get employee attendance history
router.get('/:id/attendance', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, month, year } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE a.employee_id = ?';
    let params = [id];

    if (month && year) {
      whereClause += ' AND MONTH(a.check_in) = ? AND YEAR(a.check_in) = ?';
      params.push(parseInt(month), parseInt(year));
    }

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM attendance a
      ${whereClause}
    `, params);

    const total = countResult[0].total;

    // Get attendance data
    const [rows] = await pool.execute(`
      SELECT a.*
      FROM attendance a
      ${whereClause}
      ORDER BY a.check_in DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get employee attendance error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

module.exports = router;
