import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Class as ClassIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

import { useTheme as useThemeContext } from '../contexts/ThemeContext';

const ClassData = () => {
  const [classes, setClasses] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const { colors, mode } = useThemeContext();
  
  const cardStyle = {
    borderRadius: 6,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.card,
    boxShadow: 'none',
    height: '100%',
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showSnackbar('Token autentikasi tidak ditemukan', 'error');
        return;
      }

      const response = await fetch('http://localhost:5000/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Gagal memuat data kelas');
      }

      const result = await response.json();
      if (result.success) {
        setClasses(result.data);
      } else {
        showSnackbar(result.message || 'Gagal memuat data kelas', 'error');
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      showSnackbar('Gagal memuat data kelas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      showSnackbar('Nama kelas tidak boleh kosong', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/classes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newClassName.trim() })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal menambahkan kelas');
      }

      if (result.success) {
        showSnackbar('Kelas berhasil ditambahkan', 'success');
        setNewClassName('');
        loadClasses();
      } else {
        showSnackbar(result.message || 'Gagal menambahkan kelas', 'error');
      }
    } catch (error) {
      console.error('Error adding class:', error);
      showSnackbar(error.message || 'Gagal menambahkan kelas', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (id, name) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus kelas ${name}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/classes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal menghapus kelas');
      }

      if (result.success) {
        showSnackbar('Kelas berhasil dihapus', 'success');
        loadClasses();
      } else {
        showSnackbar(result.message || 'Gagal menghapus kelas', 'error');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      showSnackbar(error.message || 'Gagal menghapus kelas', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box sx={{ color: colors.textPrimary }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ClassIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Manajemen Data Kelas
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Form Section */}
        <Grid item xs={12} md={4}>
          <Card sx={cardStyle}>
            <CardContent>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2, 
                pb: 2, 
                borderBottom: `1px solid ${colors.border}` 
              }}>
                <AddIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                  Tambah Kelas Baru
                </Typography>
              </Box>
              
              <form onSubmit={handleAddClass}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Nama Kelas
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Contoh: 10A"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    variant="outlined"
                    size="medium"
                    disabled={submitting}
                    helperText="Gunakan huruf dan angka (Otomatis kapital)"
                    InputProps={{
                      style: { textTransform: 'uppercase' }
                    }}
                  />
                </Box>
                
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  disabled={submitting || !newClassName.trim()}
                  sx={{ py: 1.5, fontWeight: 600 }}
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Kelas'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Table Section */}
        <Grid item xs={12} md={8}>
          <Card sx={cardStyle}>
            <CardContent>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2, 
                pb: 2, 
                borderBottom: `1px solid ${colors.border}` 
              }}>
                <ClassIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                  Daftar Kelas
                </Typography>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: mode === 'dark' ? '#1f2937' : '#f3f4f6' }}>
                      <TableCell sx={{ fontWeight: 700, width: '60px' }}>No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Nama Kelas</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, width: '100px' }}>Aksi</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                          <CircularProgress size={30} />
                        </TableCell>
                      </TableRow>
                    ) : classes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          Belum ada data kelas
                        </TableCell>
                      </TableRow>
                    ) : (
                      classes.map((cls, index) => (
                        <TableRow key={cls.id} hover>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {cls.name}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDeleteClass(cls.id, cls.name)}
                              sx={{ textTransform: 'none', borderRadius: 1 }}
                            >
                              Hapus
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClassData;
