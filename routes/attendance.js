const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const faceRecognitionService = require('../services/faceRecognitionService');

const router = express.Router();

// Configure multer for attendance images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/attendance';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'attendance-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Hanya 1 file per request
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 [attendance] File upload info:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      encoding: file.encoding
    });
    // Bypass khusus untuk upload dari Flutter agar tidak nyangkut di validasi
    if (file.fieldname === 'face_image') {
      console.log('✅ [attendance] BYPASS validation for face_image');
      return cb(null, true);
    }
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Hanya file JPEG, PNG, atau JPG yang diperbolehkan'), false);
    }
    cb(null, true);
  }
});

// Get all attendance records
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, date, employee_id, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (date) {
      // Pastikan format tanggal benar dan gunakan DATE() untuk membandingkan hanya bagian tanggal
      whereClause += ' AND DATE(a.check_in) = DATE(?)';
      params.push(date);
      console.log('📅 Filtering attendance by date:', date);
    }

    if (employee_id) {
      whereClause += ' AND a.employee_id = ?';
      params.push(employee_id);
    }

    if (status) {
      whereClause += ' AND a.status = ?';
      params.push(status);
    }

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM attendance a
      ${whereClause}
    `, params);

    const total = countResult[0].total;

    // Get attendance data with pagination
    const [rows] = await pool.execute(`
      SELECT 
        a.*,
        e.employee_id as emp_id,
        e.full_name,
        e.position,
        e.department
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
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
    console.error('Get attendance error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Get attendance by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(`
      SELECT 
        a.*,
        e.employee_id as emp_id,
        e.full_name,
        e.position,
        e.department
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'Data absensi tidak ditemukan' 
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    console.error('Get attendance by ID error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Create check-in record (for Flutter app) - UPDATED for universal face recognition
router.post('/check-in', upload.single('face_image'), [
  // ✅ Input validation rules
  body('location')
    .optional()
    .isLength({ max: 255 }).withMessage('Lokasi maksimal 255 karakter'),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('Catatan maksimal 1000 karakter')
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
      location = null,
      notes = null 
    } = req.body;
    
    const faceImage = req.file;

    if (!faceImage) {
      return res.status(400).json({ 
        error: 'Face image harus diupload' 
      });
    }

    // Initialize face recognition service
    await faceRecognitionService.initialize();

    // Extract face descriptor from uploaded image
    const inputDescriptor = await faceRecognitionService.extractFaceDescriptor(faceImage.path);

    // Find employee by face recognition (universal search)
    const [allFaces] = await pool.execute(`
      SELECT ef.employee_id, ef.face_descriptor, e.id, e.full_name, e.position, e.department
      FROM employee_faces ef
      JOIN employees e ON ef.employee_id = e.id
      WHERE e.is_active = TRUE
    `);

    if (allFaces.length === 0) {
      return res.status(404).json({ 
        error: 'Tidak ada wajah terdaftar di database' 
      });
    }

    // Find best match (pure JS compare + timeouts)
    let bestMatch = null;
    let highestSimilarity = 0;
    const startAt = Date.now();
    for (const face of allFaces) {
      try {
        const storedDescriptor = JSON.parse(face.face_descriptor);
        const comparisonPromise = Promise.resolve(
          faceRecognitionService.compareDescriptors(
            inputDescriptor,
            storedDescriptor,
            { metric: 'cosine', threshold: 0.55, l2Normalize: true }
          )
        );
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Comparison timeout')), 5000));
        const comparison = await Promise.race([comparisonPromise, timeoutPromise]);
        const sim = comparison.cosineSimilarity || comparison.similarity;
        console.log(`📊 [check-in] ${face.full_name}: cosine=${sim.toFixed(4)}, match=${comparison.isMatch}`);
        if (sim > highestSimilarity && comparison.isMatch) {
          highestSimilarity = sim;
          bestMatch = {
            employee_id: face.employee_id,
            employee_name: face.full_name,
            position: face.position,
            department: face.department,
            similarity: sim,
            confidence: sim
          };
        }
        if (Date.now() - startAt > 30000) {
          console.log('⏰ [check-in] overall comparison timeout reached');
          break;
        }
      } catch (e) {
        console.error('Error comparing descriptors:', e.message);
      }
    }

    if (!bestMatch) {
      return res.status(401).json({
        success: false,
        message: 'Wajah tidak dikenali. Silakan daftar terlebih dahulu.',
        data: {
          verified: false,
          similarity: highestSimilarity,
          threshold: 0.6
        }
      });
    }

    // Get employee details for attendance
    const [employee] = await pool.execute(`
      SELECT id FROM employees WHERE id = ? AND is_active = TRUE
    `, [bestMatch.employee_id]);

    if (employee.length === 0) {
      return res.status(404).json({ 
        error: 'Pegawai tidak ditemukan' 
      });
    }

    // Check if already checked in today
    const today = new Date().toISOString().split('T')[0];
    const [existingCheckIn] = await pool.execute(`
      SELECT id FROM attendance 
      WHERE employee_id = ? AND DATE(check_in) = ? AND check_out IS NULL
    `, [employee[0].id, today]);

    if (existingCheckIn.length > 0) {
      return res.status(400).json({ 
        error: 'Pegawai sudah melakukan check-in hari ini' 
      });
    }

    // Determine status based on check-in time
    const now = new Date();
    const checkInTime = now.getHours() * 60 + now.getMinutes();
    const lateThreshold = 8 * 60; // 8:00 AM
    let status = 'present';
    
    if (checkInTime > lateThreshold) {
      status = 'late';
    }

    // Create check-in record
    const [result] = await pool.execute(`
      INSERT INTO attendance (employee_id, check_in, check_in_image, check_in_location, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      employee[0].id, 
      now, 
      faceImage.filename,
      location,
      status,
      notes
    ]);

    res.status(201).json({
      success: true,
      message: 'Check-in berhasil',
      data: {
        id: result.insertId,
        employee_id: bestMatch.employee_id,
        employee_name: bestMatch.employee_name,
        position: bestMatch.position,
        department: bestMatch.department,
        check_in: now,
        status: status,
        face_verification: {
          verified: true,
          confidence: bestMatch.confidence,
          similarity: bestMatch.similarity
        }
      }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // ✅ Enhanced error handling
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        error: 'Data duplikat ditemukan',
        message: 'Pegawai sudah melakukan check-in hari ini'
      });
    }
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ 
        error: 'Data tidak valid',
        message: 'Pegawai tidak ditemukan dalam sistem'
      });
    }
    
    if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ 
        error: 'Data terlalu panjang',
        message: 'Lokasi atau catatan melebihi batas maksimal'
      });
    }
    
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create check-out record (for Flutter app) - UPDATED for universal face recognition
router.post('/check-out', upload.single('face_image'), [
  // ✅ Input validation rules
  body('location')
    .optional()
    .isLength({ max: 255 }).withMessage('Lokasi maksimal 255 karakter'),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('Catatan maksimal 1000 karakter')
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
      location = null,
      notes = null 
    } = req.body;
    
    const faceImage = req.file;

    if (!faceImage) {
      return res.status(400).json({ 
        error: 'Face image harus diupload' 
      });
    }

    // Initialize face recognition service
    await faceRecognitionService.initialize();

    // Extract face descriptor from uploaded image
    const inputDescriptor = await faceRecognitionService.extractFaceDescriptor(faceImage.path);

    // Find employee by face recognition (universal search)
    const [allFaces] = await pool.execute(`
      SELECT ef.employee_id, ef.face_descriptor, e.id, e.full_name, e.position, e.department
      FROM employee_faces ef
      JOIN employees e ON ef.employee_id = e.id
      WHERE e.is_active = TRUE
    `, []);

    if (allFaces.length === 0) {
      return res.status(404).json({ 
        error: 'Tidak ada wajah terdaftar di database' 
      });
    }

    // Find best match (pure JS compare + timeouts)
    let bestMatch = null;
    let highestSimilarity = 0;
    const startAt = Date.now();
    for (const face of allFaces) {
      try {
        const storedDescriptor = JSON.parse(face.face_descriptor);
        const comparisonPromise = Promise.resolve(
          faceRecognitionService.compareDescriptors(
            inputDescriptor,
            storedDescriptor,
            { metric: 'cosine', threshold: 0.55, l2Normalize: true }
          )
        );
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Comparison timeout')), 5000));
        const comparison = await Promise.race([comparisonPromise, timeoutPromise]);
        const sim = comparison.cosineSimilarity || comparison.similarity;
        console.log(`📊 [check-out] ${face.full_name}: cosine=${sim.toFixed(4)}, match=${comparison.isMatch}`);
        if (sim > highestSimilarity && comparison.isMatch) {
          highestSimilarity = sim;
          bestMatch = {
            employee_id: face.employee_id,
            employee_name: face.full_name,
            position: face.position,
            department: face.department,
            similarity: sim,
            confidence: sim
          };
        }
        if (Date.now() - startAt > 30000) {
          console.log('⏰ [check-out] overall comparison timeout reached');
          break;
        }
      } catch (e) {
        console.error('Error comparing descriptors:', e.message);
      }
    }

    if (!bestMatch) {
      return res.status(401).json({
        success: false,
        message: 'Wajah tidak dikenali. Silakan daftar terlebih dahulu.',
        data: {
          verified: false,
          similarity: highestSimilarity,
          threshold: 0.6
        }
      });
    }

    // Get employee details for attendance
    const [employee] = await pool.execute(`
      SELECT id FROM employees WHERE id = ? AND is_active = TRUE
    `, [bestMatch.employee_id]);

    if (employee.length === 0) {
      return res.status(404).json({ 
        error: 'Pegawai tidak ditemukan' 
      });
    }

    // Find today's check-in record
    const today = new Date().toISOString().split('T')[0];
    const [checkInRecord] = await pool.execute(`
      SELECT id, check_in FROM attendance 
      WHERE employee_id = ? AND DATE(check_in) = ? AND check_out IS NULL
    `, [employee[0].id, today]);

    if (checkInRecord.length === 0) {
      return res.status(400).json({ 
        error: 'Pegawai belum melakukan check-in hari ini' 
      });
    }

    // Update check-out record
    const now = new Date();
    await pool.execute(`
      UPDATE attendance 
      SET check_out = ?, check_out_image = ?, check_out_location = ?, notes = ?
      WHERE id = ?
    `, [
      now,
      faceImage.filename,
      location,
      notes,
      checkInRecord[0].id
    ]);

    res.json({
      success: true,
      message: 'Check-out berhasil',
      data: {
        employee_id: bestMatch.employee_id,
        employee_name: bestMatch.employee_name,
        position: bestMatch.position,
        department: bestMatch.department,
        check_in: checkInRecord[0].check_in,
        check_out: now,
        face_verification: {
          verified: true,
          confidence: bestMatch.confidence,
          similarity: bestMatch.similarity
        }
      }
    });

  } catch (error) {
    console.error('Check-out error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // ✅ Enhanced error handling
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ 
        error: 'Data tidak valid',
        message: 'Pegawai tidak ditemukan dalam sistem'
      });
    }
    
    if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ 
        error: 'Data terlalu panjang',
        message: 'Lokasi atau catatan melebihi batas maksimal'
      });
    }
    
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get attendance statistics
router.get('/stats/summary', verifyToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const currentMonth = month || currentDate.getMonth() + 1;
    const currentYear = year || currentDate.getFullYear();

    // Get monthly statistics
    const [monthlyStats] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT a.employee_id) as total_employees,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN a.check_out IS NOT NULL THEN 1 END) as completed_days
      FROM attendance a
      WHERE MONTH(a.check_in) = ? AND YEAR(a.check_in) = ?
    `, [currentMonth, currentYear]);

    // Get daily attendance for current month
    const [dailyStats] = await pool.execute(`
      SELECT 
        DATE(a.check_in) as date,
        COUNT(DISTINCT a.employee_id) as present_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count
      FROM attendance a
      WHERE MONTH(a.check_in) = ? AND YEAR(a.check_in) = ?
      GROUP BY DATE(a.check_in)
      ORDER BY date DESC
    `, [currentMonth, currentYear]);

    res.json({
      success: true,
      data: {
        month: currentMonth,
        year: currentYear,
        summary: monthlyStats[0],
        daily_stats: dailyStats
      }
    });

  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Update attendance record (admin only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { check_in, check_out, status, notes } = req.body;

    // Check if attendance exists
    const [existing] = await pool.execute(
      'SELECT id FROM attendance WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ 
        error: 'Data absensi tidak ditemukan' 
      });
    }

    // Update attendance
    await pool.execute(`
      UPDATE attendance 
      SET check_in = ?, check_out = ?, status = ?, notes = ?
      WHERE id = ?
    `, [check_in, check_out, status, notes, id]);

    res.json({
      success: true,
      message: 'Data absensi berhasil diupdate'
    });

  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Delete attendance record (admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if attendance exists
    const [existing] = await pool.execute(
      'SELECT id FROM attendance WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ 
        error: 'Data absensi tidak ditemukan' 
      });
    }

    // Delete attendance
    await pool.execute('DELETE FROM attendance WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Data absensi berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// ========================================
// FLUTTER APP SPECIFIC ENDPOINTS
// ========================================

// Flutter Check-in (Universal Face Recognition) - FIXED
router.post('/flutter-check-in', [
  body('face_descriptor').notEmpty().withMessage('Face descriptor wajib diisi'),
  body('location').optional().isLength({ max: 255 }).withMessage('Lokasi maksimal 255 karakter'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Catatan maksimal 1000 karakter')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validasi input gagal', details: errors.array() });
  }

  try {
    const { face_descriptor, location = null, notes = null } = req.body;

    await faceRecognitionService.initialize();

    let inputDescriptor;
    try {
      if (typeof face_descriptor === 'string') {
        inputDescriptor = JSON.parse(face_descriptor);
      } else if (Array.isArray(face_descriptor)) {
        inputDescriptor = face_descriptor;
      } else {
        throw new Error('Format face descriptor tidak valid');
      }
    } catch (e) {
      return res.status(400).json({ error: 'Format face descriptor tidak valid', detail: e.message });
    }

    const [allFaces] = await pool.execute(`
      SELECT ef.employee_id, ef.face_descriptor, e.id, e.full_name, e.position, e.department
      FROM employee_faces ef
      JOIN employees e ON ef.employee_id = e.id
      WHERE e.is_active = TRUE
    `);

    if (allFaces.length === 0) {
      return res.status(404).json({ error: 'Tidak ada wajah terdaftar di database' });
    }

    const bestMatch = await faceRecognitionService.findBestMatch(inputDescriptor, allFaces, 0.6);
    if (!bestMatch) {
      return res.status(401).json({
        success: false,
        message: 'Wajah tidak dikenali. Silakan daftar terlebih dahulu.',
        data: { verified: false, threshold: 0.6 }
      });
    }

    const [employee] = await pool.execute(
      `SELECT id FROM employees WHERE id = ? AND is_active = TRUE`,
      [bestMatch.employee_id]
    );
    if (employee.length === 0) {
      return res.status(404).json({ error: 'Pegawai tidak ditemukan' });
    }

    const today = new Date().toISOString().split('T')[0];
    const [existingCheckIn] = await pool.execute(`
      SELECT id FROM attendance 
      WHERE employee_id = ? AND DATE(check_in) = ? AND check_out IS NULL
    `, [employee[0].id, today]);

    if (existingCheckIn.length > 0) {
      return res.status(400).json({ error: 'Pegawai sudah melakukan check-in hari ini' });
    }

    const now = new Date();
    const checkInTime = now.getHours() * 60 + now.getMinutes();
    const lateThreshold = 8 * 60; // 8:00 AM
    const status = (checkInTime > lateThreshold) ? 'late' : 'present';

    const [result] = await pool.execute(`
      INSERT INTO attendance (employee_id, check_in, check_in_location, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `, [employee[0].id, now, location, status, notes]);

    res.status(201).json({
      success: true,
      message: 'Check-in berhasil',
      data: {
        id: result.insertId,
        employee_id: bestMatch.employee_id,
        employee_name: bestMatch.employee_name,
        position: bestMatch.position,
        department: bestMatch.department,
        check_in: now,
        status,
        location,
        face_verification: {
          verified: true,
          confidence: bestMatch.similarity,
          similarity: bestMatch.similarity
        }
      }
    });
  } catch (error) {
    console.error('Flutter check-in error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server', message: error.message });
  }
});

// Flutter Check-out (Universal Face Recognition) - FIXED
router.post('/flutter-check-out', [
  body('face_descriptor').notEmpty().withMessage('Face descriptor wajib diisi'),
  body('location').optional().isLength({ max: 255 }).withMessage('Lokasi maksimal 255 karakter'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Catatan maksimal 1000 karakter')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validasi input gagal', details: errors.array() });
  }

  try {
    const { face_descriptor, location = null, notes = null } = req.body;

    await faceRecognitionService.initialize();

    let inputDescriptor;
    try {
      if (typeof face_descriptor === 'string') {
        inputDescriptor = JSON.parse(face_descriptor);
      } else if (Array.isArray(face_descriptor)) {
        inputDescriptor = face_descriptor;
      } else {
        throw new Error('Format face descriptor tidak valid');
      }
    } catch (e) {
      return res.status(400).json({ error: 'Format face descriptor tidak valid', detail: e.message });
    }

    const [allFaces] = await pool.execute(`
      SELECT ef.employee_id, ef.face_descriptor, e.id, e.full_name, e.position, e.department
      FROM employee_faces ef
      JOIN employees e ON ef.employee_id = e.id
      WHERE e.is_active = TRUE
    `);

    if (allFaces.length === 0) {
      return res.status(404).json({ error: 'Tidak ada wajah terdaftar di database' });
    }

    const bestMatch = await faceRecognitionService.findBestMatch(inputDescriptor, allFaces, 0.6);
    if (!bestMatch) {
      return res.status(401).json({
        success: false,
        message: 'Wajah tidak dikenali. Silakan daftar terlebih dahulu.',
        data: { verified: false, threshold: 0.6 }
      });
    }

    const [employee] = await pool.execute(
      `SELECT id FROM employees WHERE id = ? AND is_active = TRUE`,
      [bestMatch.employee_id]
    );
    if (employee.length === 0) {
      return res.status(404).json({ error: 'Pegawai tidak ditemukan' });
    }

    const today = new Date().toISOString().split('T')[0];
    const [checkInRecord] = await pool.execute(`
      SELECT id, check_in FROM attendance 
      WHERE employee_id = ? AND DATE(check_in) = ? AND check_out IS NULL
    `, [employee[0].id, today]);

    if (checkInRecord.length === 0) {
      return res.status(400).json({ error: 'Pegawai belum melakukan check-in hari ini' });
    }

    const now = new Date();
    await pool.execute(`
      UPDATE attendance 
      SET check_out = ?, check_out_location = ?, notes = ?
      WHERE id = ?
    `, [now, location, notes, checkInRecord[0].id]);

    res.json({
      success: true,
      message: 'Check-out berhasil',
      data: {
        employee_id: bestMatch.employee_id,
        employee_name: bestMatch.employee_name,
        position: bestMatch.position,
        department: bestMatch.department,
        check_in: checkInRecord[0].check_in,
        check_out: now,
        location,
        face_verification: {
          verified: true,
          confidence: bestMatch.similarity,
          similarity: bestMatch.similarity
        }
      }
    });
  } catch (error) {
    console.error('Flutter check-out error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server', message: error.message });
  }
});


module.exports = router;
