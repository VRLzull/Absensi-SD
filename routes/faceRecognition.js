const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const faceRecognitionService = require('../services/faceRecognitionService');

const router = express.Router();

// Configure multer for face images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/face-recognition';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'face-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Izinkan hingga 10 file per request untuk pendaftaran multi-gambar
  },
  fileFilter: (req, file, cb) => {
    // Debug logging untuk troubleshooting
    console.log('📁 File upload info:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      encoding: file.encoding
    });
    
    // COMPLETE BYPASS untuk Flutter upload - tidak ada validasi sama sekali
    if (file.fieldname === 'face_image') {
      console.log('✅ BYPASSING ALL VALIDATION for Flutter face_image upload');
      return cb(null, true);
    }
    
    // Validasi normal untuk upload lainnya (web admin)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    
    // Cek MIME type
    if (file.mimetype && !allowedMimes.includes(file.mimetype)) {
      console.log('❌ MIME type rejected:', file.mimetype);
      return cb(new Error('Hanya file JPEG, PNG, atau JPG yang diperbolehkan'), false);
    }
    
    // Cek extension
    if (file.originalname) {
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (fileExtension && !allowedExtensions.includes(fileExtension)) {
        console.log('❌ Extension rejected:', fileExtension);
        return cb(new Error('Ekstensi file tidak diperbolehkan. Gunakan .jpg, .jpeg, atau .png'), false);
      }
    }
    
    console.log('✅ File validation passed for non-Flutter upload');
    cb(null, true);
  }
});

// Initialize face recognition service
router.get('/init', async (req, res) => {
  try {
    const result = await faceRecognitionService.initialize();
    res.json({
      success: result,
      message: result ? 'Face recognition service initialized' : 'Failed to initialize service',
      status: faceRecognitionService.getStatus()
    });
  } catch (error) {
    console.error('Initialization error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Get service status
router.get('/status', async (req, res) => {
  try {
    const status = faceRecognitionService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Verify face for attendance (Flutter app) - UPDATED
router.post('/verify', upload.single('face_image'), async (req, res) => {
  try {
    const { employee_id } = req.body;
    const faceImage = req.file;

    if (!faceImage || !employee_id) {
      return res.status(400).json({ 
        error: 'Face image dan employee ID harus diisi' 
      });
    }

    // Initialize service if needed
    await faceRecognitionService.initialize();

    // Extract face descriptor from uploaded image
    const inputDescriptor = await faceRecognitionService.extractFaceDescriptor(faceImage.path);

    // Get employee and their registered face
    const [employee] = await pool.execute(`
      SELECT e.id, e.full_name, ef.face_descriptor
      FROM employees e
      JOIN employee_faces ef ON e.id = ef.employee_id
      WHERE e.employee_id = ? AND e.is_active = TRUE
    `, [employee_id]);

    if (employee.length === 0) {
      return res.status(404).json({ 
        error: 'Pegawai tidak ditemukan atau belum terdaftar wajah' 
      });
    }

    // Parse stored face descriptor
    let storedDescriptor;
    try {
      storedDescriptor = JSON.parse(employee[0].face_descriptor);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Data wajah pegawai tidak valid' 
      });
    }

    // Compare faces
    const comparison = await faceRecognitionService.compareFaces(
      inputDescriptor, 
      storedDescriptor, 
      0.55 // threshold diturunkan sedikit untuk meningkatkan keberhasilan login (dari 0.6)
    );

    if (comparison.isMatch) {
      const verificationResult = {
        success: true,
        employee_id: employee[0].id,
        employee_name: employee[0].full_name,
        verified: true,
        confidence: comparison.similarity,
        similarity: comparison.similarity
      };

      res.json({
        success: true,
        message: 'Verifikasi wajah berhasil',
        data: verificationResult
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Verifikasi wajah gagal - wajah tidak cocok. Pastikan pencahayaan cukup dan wajah terlihat jelas.',
        data: {
          verified: false,
          confidence: comparison.similarity,
          threshold: 0.55
        }
      });
    }

  } catch (error) {
    console.error('Face verification error:', error);
    
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

// Find employee by face recognition (Flutter app) - UPDATED
router.post('/find-employee', (req, res, next) => {
  // Use multer upload with proper error handling
  upload.single('face_image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.log('❌ Multer error:', err.code, err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File terlalu besar',
          message: 'Ukuran file maksimal 5MB'
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          error: 'File tidak diharapkan',
          message: 'Berkas harus dikirim dengan field name "face_image"'
        });
      }
    }
    
    if (err) {
      console.log('❌ Multer validation error:', err.message);
      return res.status(400).json({
        error: 'Something went wrong!',
        message: err.message
      });
    }
    
    next();
  });
}, async (req, res) => {
  try {
    console.log('🎯 /find-employee endpoint called');
    console.log('📁 req.file:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'NO FILE');
    
    const faceImage = req.file;

    if (!faceImage) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ 
        error: 'Face image harus diisi' 
      });
    }

    console.log('✅ File received, processing...');

    // Initialize service if needed
    await faceRecognitionService.initialize();

    // Extract face descriptor from uploaded image
    const inputDescriptor = await faceRecognitionService.extractFaceDescriptor(faceImage.path);

    // Get all registered faces (SD: grade/classroom, bukan position/department)
    const [allFaces] = await pool.execute(`
      SELECT ef.employee_id, ef.face_descriptor, e.full_name, e.grade, e.classroom
      FROM employee_faces ef
      JOIN employees e ON ef.employee_id = e.id
      WHERE e.is_active = TRUE
    `);

    if (allFaces.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Tidak ada wajah terdaftar di database' 
      });
    }

    // Find best match with timeout protection
    console.log(`🔍 Starting comparison with ${allFaces.length} registered faces...`);
    let bestMatch = null;
    let highestSimilarity = 0;
    const comparisonStartTime = Date.now();

    for (let i = 0; i < allFaces.length; i++) {
      const face = allFaces[i];
      console.log(`🔄 Comparing with face ${i + 1}/${allFaces.length}: ${face.full_name}`);
      
      try {
        const storedDescriptor = JSON.parse(face.face_descriptor);
        
        // Add timeout for each comparison (max 5 seconds)
        const comparisonPromise = Promise.resolve(
          faceRecognitionService.compareDescriptors(
            inputDescriptor,
            storedDescriptor,
            { metric: 'cosine', threshold: 0.55, l2Normalize: true } // Use cosine similarity (0.55 = 55% similarity)
          )
        );
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Comparison timeout')), 5000)
        );
        
        const comparison = await Promise.race([comparisonPromise, timeoutPromise]);
        
        const similarityScore = comparison.cosineSimilarity || comparison.similarity;
        
        // Log all comparisons for debugging (even non-matches)
        console.log(`📊 ${face.full_name}: cosine=${similarityScore.toFixed(4)}, distance=${comparison.distance?.toFixed(4) || 'N/A'}, match=${comparison.isMatch}`);
        
        // Track highest similarity even if below threshold (for debugging)
        if (similarityScore > highestSimilarity) {
          highestSimilarity = similarityScore;
        }
        
        if (comparison.isMatch && similarityScore > (bestMatch?.similarity || 0)) {
          bestMatch = {
            employee_id: face.employee_id,
            employee_name: face.full_name,
            position: face.classroom ?? null,
            department: face.grade != null ? String(face.grade) : null,
            similarity: similarityScore,
            confidence: similarityScore,
            distance: comparison.distance
          };
          console.log(`✅ Found better match: ${face.full_name} (similarity: ${similarityScore.toFixed(4)})`);
        }
        
        // Check overall timeout (max 30 seconds total)
        const elapsedTime = Date.now() - comparisonStartTime;
        if (elapsedTime > 30000) {
          console.log('⏰ Comparison timeout reached, stopping search');
          break;
        }
        
      } catch (error) {
        if (error.message === 'Comparison timeout') {
          console.log(`⏰ Comparison timeout for ${face.full_name}`);
        } else {
          console.error('Error parsing face descriptor:', error);
        }
        continue;
      }
    }
    
    const totalTime = Date.now() - comparisonStartTime;
    console.log(`⏱️ Total comparison time: ${totalTime}ms`);
    console.log(`📊 Final result: best similarity = ${highestSimilarity.toFixed(4)}, threshold = 0.55`);

    if (bestMatch) {
      res.json({
        success: true,
        message: 'Karyawan ditemukan',
        data: bestMatch
      });
    } else {
      res.json({
        success: false,
        message: 'Wajah tidak dikenali. Silakan daftar terlebih dahulu.',
        data: {
          highestSimilarity: highestSimilarity.toFixed(4),
          threshold: 0.55,
          metric: 'cosine',
          note: highestSimilarity > 0 ? `Kesamaan tertinggi: ${(highestSimilarity * 100).toFixed(1)}% (di bawah threshold ${(0.55 * 100).toFixed(0)}%)` : 'Tidak ada kesamaan yang ditemukan'
        }
      });
    }

  } catch (error) {
    console.error('Find employee by face error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Handle specific face detection errors with better user feedback
    if (error.message && error.message.includes('No face detected')) {
      return res.status(400).json({ 
        success: false,
        message: 'Wajah tidak terdeteksi dalam gambar',
        error: 'Mohon pastikan wajah terlihat jelas dengan pencahayaan yang cukup dan posisi yang tepat'
      });
    }

    // Handle other server errors
    res.status(500).json({ 
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: error.message
    });
  }
});

// Upload face data for employee (Admin)
router.post('/upload/:employeeId', verifyToken, upload.single('face_image'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const faceImage = req.file;

    if (!faceImage) {
      return res.status(400).json({ 
        error: 'Face image harus diisi' 
      });
    }

    // Verify employee exists
    const [employee] = await pool.execute(`
      SELECT id, full_name FROM employees WHERE id = ? AND is_active = TRUE
    `, [employeeId]);

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
    `, [employeeId]);

    if (existingFace.length > 0) {
      // Update existing face data
      await pool.execute(`
        UPDATE employee_faces 
        SET face_descriptor = ?, face_image_path = ?, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ?
      `, [JSON.stringify(faceDescriptor), faceImage.filename, employeeId]);
    } else {
      // Insert new face data
      await pool.execute(`
        INSERT INTO employee_faces (employee_id, face_descriptor, face_image_path)
        VALUES (?, ?, ?)
      `, [employeeId, JSON.stringify(faceDescriptor), faceImage.filename]);
    }

    res.json({
      success: true,
      message: 'Data wajah berhasil diupload',
      data: {
        employee_id: employeeId,
        employee_name: employee[0].full_name,
        face_image: faceImage.filename,
        descriptor_length: faceDescriptor.length
      }
    });

  } catch (error) {
    console.error('Upload face data error:', error);
    
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

// Get face recognition models info
router.get('/models', async (req, res) => {
  try {
    const status = faceRecognitionService.getStatus();
    
    res.json({
      success: true,
      data: {
        modelsPath: status.modelsPath,
        modelsExist: status.modelsExist,
        isInitialized: status.isInitialized,
        availableModels: [
          'tiny_face_detector_model',
          'face_landmark_68_model', 
          'face_recognition_model'
        ]
      }
    });
  } catch (error) {
    console.error('Get models info error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
});

// Test face recognition
router.post('/test', upload.single('face_image'), async (req, res) => {
  try {
    const faceImage = req.file;

    if (!faceImage) {
      return res.status(400).json({ 
        error: 'Face image harus diisi' 
      });
    }

    // Initialize service
    await faceRecognitionService.initialize();

    // Validate image
    const validation = await faceRecognitionService.validateImage(faceImage.path);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Extract descriptor
    const descriptor = await faceRecognitionService.extractFaceDescriptor(faceImage.path);

    res.json({
      success: true,
      message: 'Test face recognition berhasil',
      data: {
        face_detected: true,
        descriptor_length: descriptor.length,
        sample_values: descriptor.slice(0, 5), // First 5 values
        image_path: faceImage.filename
      }
    });

  } catch (error) {
    console.error('Test face recognition error:', error);
    
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

// Register face data for employee (multi-image) - Frontend integration
router.post('/register', verifyToken, upload.array('face_images', 10), async (req, res) => {
  try {
    const { employee_id, student_id } = req.body;
    const employeeCode = employee_id || student_id; // NIS - untuk kompatibilitas SD
    const files = req.files || [];

    if (!employeeCode) {
      return res.status(400).json({ 
        success: false,
        error: 'employee_id atau student_id (NIS) harus diisi' 
      });
    }

    if (!files.length || files.length < 3) {
      return res.status(400).json({ 
        success: false,
        error: 'Minimal 3 foto wajah diperlukan' 
      });
    }

    // Initialize service
    await faceRecognitionService.initialize();

    // Find employee/student by NIS (employee_id atau student_id)
    const [employee] = await pool.execute(`
      SELECT id, full_name FROM employees WHERE (employee_id = ? OR student_id = ?) AND is_active = TRUE
    `, [employeeCode, employeeCode]);

    if (employee.length === 0) {
      // Cleanup uploaded files
      for (const f of files) {
        if (f && fs.existsSync(f.path)) fs.unlinkSync(f.path);
      }
      return res.status(404).json({ 
        success: false,
        error: 'Pegawai tidak ditemukan atau tidak aktif' 
      });
    }

    // Validate and extract descriptors
    const descriptors = [];
    const invalidFiles = [];
    for (const f of files) {
      try {
        const validation = await faceRecognitionService.validateImage(f.path);
        if (validation.isValid) {
          const desc = await faceRecognitionService.extractFaceDescriptor(f.path);
          descriptors.push(desc);
        } else {
          invalidFiles.push({ file: f.filename, reason: validation.message });
        }
      } catch (e) {
        invalidFiles.push({ file: f.filename, reason: e.message });
      }
    }

    if (descriptors.length === 0) {
      // Cleanup uploaded files
      for (const f of files) {
        if (f && fs.existsSync(f.path)) fs.unlinkSync(f.path);
      }
      return res.status(400).json({
        success: false,
        error: 'Tidak ada wajah valid yang terdeteksi pada gambar'
      });
    }

    // Average descriptors to a single template
    const length = descriptors[0].length;
    const sum = new Array(length).fill(0);
    for (const d of descriptors) {
      if (d.length !== length) {
        // skip inconsistent descriptor
        continue;
      }
      for (let i = 0; i < length; i++) {
        sum[i] += d[i];
      }
    }
    const avgDescriptor = sum.map(v => v / descriptors.length);

    const numericEmployeeId = employee[0].id;

    // Upsert into employee_faces
    const [existingFace] = await pool.execute(`
      SELECT id FROM employee_faces WHERE employee_id = ?
    `, [numericEmployeeId]);

    const primaryImage = files[0]?.filename || null;

    if (existingFace.length > 0) {
      await pool.execute(`
        UPDATE employee_faces 
        SET face_descriptor = ?, face_image_path = ?, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ?
      `, [JSON.stringify(avgDescriptor), primaryImage, numericEmployeeId]);
    } else {
      await pool.execute(`
        INSERT INTO employee_faces (employee_id, face_descriptor, face_image_path)
        VALUES (?, ?, ?)
      `, [numericEmployeeId, JSON.stringify(avgDescriptor), primaryImage]);
    }

    // Cleanup non-primary uploaded files to save space
    for (let i = 1; i < files.length; i++) {
      const f = files[i];
      if (f && fs.existsSync(f.path)) {
        try { fs.unlinkSync(f.path); } catch {}
      }
    }

    return res.json({
      success: true,
      message: 'Pendaftaran wajah berhasil disimpan',
      data: {
        employee_id: numericEmployeeId,
        employee_code: employeeCode,
        employee_name: employee[0].full_name,
        descriptor_length: avgDescriptor.length,
        images_received: files.length,
        images_used: descriptors.length,
        images_invalid: invalidFiles.length,
        primary_image: primaryImage,
        invalid_details: invalidFiles
      }
    });

  } catch (error) {
    console.error('Register face data error:', error);
    // Clean up uploaded files on error
    if (Array.isArray(req.files)) {
      for (const f of req.files) {
        if (f && fs.existsSync(f.path)) {
          try { fs.unlinkSync(f.path); } catch {}
        }
      }
    }
    res.status(500).json({ 
      success: false,
      error: 'Terjadi kesalahan pada server',
      message: error.message
    });
  }
});

// ========================================
// FLUTTER APP SPECIFIC ENDPOINTS (FaceNet TFLite Integration)
// ========================================

// Flutter Face Verification with FaceNet Embedding
router.post('/flutter-verify-embedding', async (req, res) => {
  try {
    const { employee_id, face_embedding } = req.body;

    // Validate required fields
    if (!employee_id || !face_embedding) {
      return res.status(400).json({
        success: false,
        error: 'employee_id dan face_embedding wajib diisi'
      });
    }

    // Validate face_embedding format
    if (!Array.isArray(face_embedding) || face_embedding.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'face_embedding harus berupa array angka'
      });
    }

    // Find employee by employee_id (SD: grade/classroom)
    const [employee] = await pool.execute(`
      SELECT e.id, e.full_name, e.grade, e.classroom, ef.face_descriptor
      FROM employees e
      LEFT JOIN employee_faces ef ON e.id = ef.employee_id
      WHERE e.employee_id = ? AND e.is_active = TRUE
    `, [employee_id]);

    if (employee.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pegawai tidak ditemukan atau tidak aktif'
      });
    }

    if (!employee[0].face_descriptor) {
      return res.status(400).json({
        success: false,
        error: 'Pegawai belum memiliki data wajah terdaftar'
      });
    }

    try {
      // Parse stored face descriptor
      const storedDescriptor = JSON.parse(employee[0].face_descriptor);
      
      // Compare embeddings using Python service
      const comparison = await faceRecognitionService.compareEmbeddings(
        face_embedding, 
        storedDescriptor, 
        0.6 // threshold
      );
      
      if (comparison.isMatch) {
        res.json({
          success: true,
          verified: true,
          message: 'Verifikasi wajah berhasil',
          data: {
            employee_id: employee[0].id,
            employee_name: employee[0].full_name,
            position: employee[0].classroom ?? null,
            department: employee[0].grade != null ? String(employee[0].grade) : null,
            confidence: comparison.similarity,
            similarity: comparison.similarity,
            verified: true
          }
        });
      } else {
        res.json({
          success: true,
          verified: false,
          message: 'Verifikasi wajah gagal - wajah tidak dikenali',
          data: {
            confidence: comparison.similarity,
            threshold: 0.6,
            verified: false
          }
        });
      }
    } catch (parseError) {
      console.error('Error parsing face descriptor:', parseError);
      res.status(500).json({
        success: false,
        error: 'Error memproses data wajah'
      });
    }

  } catch (error) {
    console.error('Flutter face verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan pada server',
      message: error.message
    });
  }
});

// Flutter Find Employee by FaceNet Embedding
router.post('/flutter-find-employee-embedding', async (req, res) => {
  try {
    const { face_embedding } = req.body;

    // Validate required fields
    if (!face_embedding) {
      return res.status(400).json({
        success: false,
        error: 'face_embedding wajib diisi'
      });
    }

    // Validate face_embedding format
    if (!Array.isArray(face_embedding) || face_embedding.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'face_embedding harus berupa array angka'
      });
    }

    // Get all registered faces (SD: grade/classroom)
    const [allFaces] = await pool.execute(`
      SELECT ef.employee_id, ef.face_descriptor, e.full_name, e.grade, e.classroom, e.employee_id as employee_code
      FROM employee_faces ef
      JOIN employees e ON ef.employee_id = e.id
      WHERE e.is_active = TRUE
    `);

    if (allFaces.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada wajah terdaftar di database'
      });
    }

    // Find best match using Python service
    const bestMatch = await faceRecognitionService.findBestMatchByEmbedding(
      face_embedding,
      allFaces,
      0.6 // threshold
    );

    if (bestMatch) {
      res.json({
        success: true,
        message: 'Karyawan ditemukan',
        data: {
          employee_id: bestMatch.employee_id,
          employee_code: bestMatch.employee_code,
          employee_name: bestMatch.full_name,
          position: bestMatch.classroom ?? null,
          department: bestMatch.grade != null ? String(bestMatch.grade) : null,
          similarity: bestMatch.similarity,
          confidence: bestMatch.similarity,
          verified: true
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Wajah tidak dikenali. Silakan daftar terlebih dahulu.',
        data: {
          threshold: 0.6,
          verified: false
        }
      });
    }

  } catch (error) {
    console.error('Flutter find employee by embedding error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: error.message
    });
  }
});

// Flutter Register Face with FaceNet Embedding
router.post('/flutter-register-embedding', async (req, res) => {
  try {
    const { employee_id, face_embedding } = req.body;

    // Validate required fields
    if (!employee_id || !face_embedding) {
      return res.status(400).json({
        success: false,
        error: 'employee_id dan face_embedding wajib diisi'
      });
    }

    // Validate face_embedding format
    if (!Array.isArray(face_embedding) || face_embedding.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'face_embedding harus berupa array angka'
      });
    }

    // Find employee by employee_id
    const [employee] = await pool.execute(`
      SELECT id, full_name FROM employees WHERE employee_id = ? AND is_active = TRUE
    `, [employee_id]);

    if (employee.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pegawai tidak ditemukan atau tidak aktif'
      });
    }

    const numericEmployeeId = employee[0].id;

    // Check if employee already has face data
    const [existingFace] = await pool.execute(`
      SELECT id FROM employee_faces WHERE employee_id = ?
    `, [numericEmployeeId]);

    if (existingFace.length > 0) {
      // Update existing face data
      await pool.execute(`
        UPDATE employee_faces 
        SET face_descriptor = ?, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ?
      `, [JSON.stringify(face_embedding), numericEmployeeId]);
    } else {
      // Insert new face data
      await pool.execute(`
        INSERT INTO employee_faces (employee_id, face_descriptor)
        VALUES (?, ?)
      `, [numericEmployeeId, JSON.stringify(face_embedding)]);
    }

    res.json({
      success: true,
      message: 'Data wajah berhasil disimpan',
      data: {
        employee_id: numericEmployeeId,
        employee_code: employee_id,
        employee_name: employee[0].full_name,
        embedding_length: face_embedding.length
      }
    });

  } catch (error) {
    console.error('Flutter register face embedding error:', error);
    res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan pada server',
      message: error.message
    });
  }
});

module.exports = router;
