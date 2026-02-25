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
    const uploadDir = 'uploads/students';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + uniqueSuffix + path.extname(file.originalname));
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

// Get all students
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
    console.error('Get students error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Get student by ID
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
        error: 'Siswa tidak ditemukan' 
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Create new student
router.post('/', verifyToken, [
  // ✅ Input validation rules
  body('student_id')
    .notEmpty().withMessage('NIS tidak boleh kosong')
    .isLength({ min: 3, max: 20 }).withMessage('NIS harus 3-20 karakter')
    .matches(/^[A-Za-z0-9_-]+$/).withMessage('NIS hanya boleh huruf, angka, underscore, dan dash'),
  
  body('full_name')
    .notEmpty().withMessage('Nama lengkap tidak boleh kosong')
    .isLength({ min: 2, max: 100 }).withMessage('Nama lengkap harus 2-100 karakter'),
  
  body('phone')
    .optional()
    .matches(/^[0-9+\-\s()]+$/).withMessage('Format nomor telepon tidak valid'),

  body('parent_phone')
    .optional()
    .matches(/^[0-9+\-\s()]+$/).withMessage('Format nomor telepon orang tua tidak valid'),
  
  body('grade')
    .optional()
    .isInt({ min: 1, max: 6 }).withMessage('Kelas harus antara 1-6'),
  
  body('classroom')
    .optional()
    .isLength({ max: 5 }).withMessage('Rombel maksimal 5 karakter'),
  
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
      student_id, 
      full_name, 
      phone,
      parent_phone,
      grade, 
      classroom,
      gender,
      address,
      hire_date
    } = req.body;

    // Check if student_id already exists
    const [existing] = await pool.execute(`
      SELECT id FROM employees WHERE student_id = ?
    `, [student_id]);

    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'NIS sudah terdaftar' 
      });
    }

    // Create student
    const [result] = await pool.execute(`
      INSERT INTO employees (student_id, full_name, phone, parent_phone, grade, classroom, gender, address, hire_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [student_id, full_name, phone, parent_phone, grade, classroom, gender, address, hire_date]);

    res.status(201).json({
      success: true,
      message: 'Siswa berhasil ditambahkan',
      data: {
        id: result.insertId,
        student_id,
        full_name
      }
    });

  } catch (error) {
    console.error('Create student error:', error);
    
    // ✅ Enhanced error handling
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        error: 'Data duplikat ditemukan',
        message: 'NIS sudah ada dalam sistem'
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

// Update student
router.put('/:id', verifyToken, [
  // ✅ Input validation rules
  body('full_name')
    .optional()
    .isLength({ min: 2, max: 100 }).withMessage('Nama lengkap harus 2-100 karakter'),
  
  body('phone')
    .optional()
    .matches(/^[0-9+\-\s()]+$/).withMessage('Format nomor telepon tidak valid'),

  body('parent_phone')
    .optional()
    .matches(/^[0-9+\-\s()]+$/).withMessage('Format nomor telepon orang tua tidak valid'),
  
  body('grade')
    .optional()
    .isInt({ min: 1, max: 6 }).withMessage('Kelas harus antara 1-6'),
  
  body('classroom')
    .optional()
    .isLength({ max: 5 }).withMessage('Rombel maksimal 5 karakter'),
  
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
      phone,
      parent_phone,
      grade, 
      classroom,
      gender,
      address,
      hire_date
    } = req.body;

    // Check if student exists
    const [existing] = await pool.execute(`
      SELECT id FROM employees WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ 
        error: 'Siswa tidak ditemukan' 
      });
    }

    // Update student
    await pool.execute(`
      UPDATE employees 
      SET full_name = ?, phone = ?, parent_phone = ?, grade = ?, classroom = ?, 
          gender = ?, address = ?, hire_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [full_name, phone, parent_phone, grade, classroom, gender, address, hire_date, id]);

    res.json({
      success: true,
      message: 'Data siswa berhasil diupdate'
    });

  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Delete student
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if student exists
    const [existing] = await pool.execute(`
      SELECT student_id, full_name FROM employees WHERE id = ?
    `, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ 
        error: 'Siswa tidak ditemukan' 
      });
    }

    // Check if student has attendance records
    const [attendanceCount] = await pool.execute(`
      SELECT COUNT(*) as count FROM attendance WHERE employee_id = ?
    `, [id]);

    if (attendanceCount[0].count > 0) {
      return res.status(400).json({ 
        error: 'Siswa tidak dapat dihapus karena memiliki data absensi' 
      });
    }

    // Delete student faces
    await pool.execute(`
      DELETE FROM employee_faces WHERE employee_id = ?
    `, [id]);

    // Delete student
    await pool.execute(`
      DELETE FROM employees WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Siswa berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Upload student photo
router.post('/:id/photo', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const photo = req.file;

    if (!photo) {
      return res.status(400).json({ 
        error: 'Foto harus diupload' 
      });
    }

    // Check if student exists
    const [employee] = await pool.execute(`
      SELECT id, full_name FROM employees WHERE id = ? AND is_active = TRUE
    `, [id]);

    if (employee.length === 0) {
      return res.status(404).json({ 
        error: 'Siswa tidak ditemukan' 
      });
    }

    // Update student photo
    await pool.execute(`
      UPDATE employees 
      SET photo_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [photo.filename, id]);

    res.json({
      success: true,
      message: 'Foto siswa berhasil diupload',
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

// Register face for student - NEW ENDPOINT
router.post('/:id/face', verifyToken, upload.single('face_image'), async (req, res) => {
  try {
    const { id } = req.params;
    const faceImage = req.file;

    if (!faceImage) {
      return res.status(400).json({ 
        error: 'Foto wajah harus diupload' 
      });
    }

    // Check if student exists
    const [employee] = await pool.execute(`
      SELECT id, full_name FROM employees WHERE id = ? AND is_active = TRUE
    `, [id]);

    if (employee.length === 0) {
      return res.status(404).json({ 
        error: 'Siswa tidak ditemukan' 
      });
    }

    // Initialize face recognition service
    await faceRecognitionService.initialize();

    // Extract face descriptor
    const faceDescriptor = await faceRecognitionService.extractFaceDescriptor(faceImage.path);

    // Check if student already has face data
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

// Get student face data
router.get('/:id/face', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(`
      SELECT ef.*, e.full_name, e.student_id
      FROM employee_faces ef
      JOIN employees e ON ef.employee_id = e.id
      WHERE ef.employee_id = ?
    `, [id]);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Get student face error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Delete student face data
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

// Get student attendance history
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
    console.error('Get student attendance error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

module.exports = router;
