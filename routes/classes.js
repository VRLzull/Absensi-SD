const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Get all classes
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM classes ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat data kelas' });
  }
});

// Add new class
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama kelas wajib diisi' });
    }

    // Check if exists
    const [existing] = await pool.execute('SELECT id FROM classes WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Nama kelas sudah ada' });
    }

    const [result] = await pool.execute('INSERT INTO classes (name) VALUES (?)', [name]);
    
    res.status(201).json({ 
      success: true, 
      message: 'Kelas berhasil ditambahkan',
      data: { id: result.insertId, name } 
    });
  } catch (error) {
    console.error('Error adding class:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan kelas' });
  }
});

// Delete class
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if class is used by any student (optional but recommended)
    // For now, let's just delete it. If students reference it by name, it's fine as we haven't migrated students yet.
    
    const [result] = await pool.execute('DELETE FROM classes WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
    }

    res.json({ success: true, message: 'Kelas berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus kelas' });
  }
});

module.exports = router;
