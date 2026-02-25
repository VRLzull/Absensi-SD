import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Avatar,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Tooltip,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Camera as CameraIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Face as FaceIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

import { useTheme as useThemeContext } from '../contexts/ThemeContext';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Face registration states
  const [faceRegistrationOpen, setFaceRegistrationOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [capturedFaces, setCapturedFaces] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Form states
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    grade: '',
    classroom: '',
    phone: '',
    parentPhone: '',
    gender: '',
    address: '',
  });

  const grades = [1, 2, 3, 4, 5, 6];
  const classrooms = ['A', 'B']; // SD: 2 rombel per kelas (1A, 1B, 2A, 2B, ...)
  const { colors, mode } = useThemeContext();
  const cardStyle = {
    borderRadius: 6,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.card,
    boxShadow: 'none',
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showSnackbar('Token autentikasi tidak ditemukan', 'error');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/employees', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Gagal memuat data siswa');
      }

      const result = await response.json();
      if (result.success) {
        setStudents(result.data);
      } else {
        showSnackbar(result.message || 'Gagal memuat data siswa', 'error');
      }
    } catch (error) {
      console.error('Error loading students:', error);
      showSnackbar('Gagal memuat data siswa', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        studentId: student.student_id || '',
        name: student.full_name || '',
        grade: student.grade ?? '',
        classroom: student.classroom ?? '',
        phone: student.phone || '',
        parentPhone: student.parent_phone || '',
        gender: student.gender || '',
        address: student.address || '',
      });
    } else {
      setEditingStudent(null);
      setFormData({
        studentId: '',
        name: '',
        grade: '',
        classroom: '',
        phone: '',
        parentPhone: '',
        gender: '',
        address: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingStudent(null);
    setFormData({
      studentId: '',
      name: '',
      grade: '',
      classroom: '',
      phone: '',
      parentPhone: '',
      gender: '',
      address: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showSnackbar('Token autentikasi tidak ditemukan', 'error');
        return;
      }

      const studentData = {
        student_id: formData.studentId,
        full_name: formData.name,
        grade: formData.grade,
        classroom: formData.classroom,
        phone: formData.phone,
        parent_phone: formData.parentPhone,
        gender: formData.gender,
        address: formData.address,
        hire_date: new Date().toISOString().split('T')[0]
      };

      if (editingStudent) {
        // Update student
        const response = await fetch(`http://localhost:5000/api/employees/${editingStudent.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(studentData)
        });

        if (!response.ok) {
          throw new Error('Gagal mengupdate siswa');
        }

        const result = await response.json();
        if (result.success) {
          showSnackbar('Siswa berhasil diperbarui', 'success');
          loadStudents(); // Reload data
        } else {
          showSnackbar('Gagal mengupdate siswa', 'error');
        }
      } else {
        // Add new student
        const response = await fetch('http://localhost:5000/api/employees', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(studentData)
        });

        if (!response.ok) {
          throw new Error('Gagal menambahkan siswa');
        }

        const result = await response.json();
        if (result.success) {
          showSnackbar('Siswa berhasil ditambahkan', 'success');
          loadStudents(); // Reload data
        } else {
          showSnackbar('Gagal menambahkan siswa', 'error');
        }
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving student:', error);
      showSnackbar('Gagal menyimpan data siswa', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (student) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus ${student.full_name}?`)) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          showSnackbar('Token autentikasi tidak ditemukan', 'error');
          return;
        }

        const response = await fetch(`http://localhost:5000/api/employees/${student.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Gagal menghapus siswa');
        }

        const result = await response.json();
        if (result.success) {
          showSnackbar('Siswa berhasil dihapus', 'success');
          loadStudents(); // Reload data
        } else {
          showSnackbar('Gagal menghapus siswa', 'error');
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        showSnackbar('Gagal menghapus siswa', 'error');
      }
    }
  };

  const handleFaceRegistration = (student) => {
    setCurrentStudent(student);
    setFaceRegistrationOpen(true);
    setCapturedFaces([]);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setCameraActive(true);
      }
    } catch (error) {
      showSnackbar('Tidak dapat mengakses kamera', 'error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraActive(false);
    }
  };

  const captureFace = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const faceData = {
          id: Date.now(),
          blob: blob,
          url: URL.createObjectURL(blob),
          timestamp: new Date().toLocaleTimeString(),
        };
        
        setCapturedFaces(prev => [...prev, faceData]);
      }, 'image/jpeg', 0.8);
    }
  };

  const removeFace = (faceId) => {
    setCapturedFaces(prev => prev.filter(face => face.id !== faceId));
  };

  const saveFaceRegistration = async () => {
    if (capturedFaces.length < 3) {
      showSnackbar('Minimal 3 foto wajah diperlukan', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showSnackbar('Token autentikasi tidak ditemukan', 'error');
        return;
      }

      // Convert captured faces to base64 and send to API
      const faceData = capturedFaces[0]; // Use first face for now
      const canvas = canvasRef.current;
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);
      
      // Create a mock face descriptor (in real app, this would come from face recognition library)
      const faceDescriptor = JSON.stringify({
        features: [0.1, 0.2, 0.3, 0.4, 0.5], // Mock face features
        timestamp: new Date().toISOString()
      });

      const formData = new FormData();
      formData.append('face_image', dataURLtoBlob(base64Image), 'face.jpg');
      formData.append('face_descriptor', faceDescriptor);

      const response = await fetch(`http://localhost:5000/api/employees/${currentStudent.id}/face`, {
        method: 'POST',        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Gagal menyimpan pendaftaran wajah');
      }

      const result = await response.json();
      if (result.success) {
        showSnackbar('Pendaftaran wajah berhasil disimpan', 'success');
        setFaceRegistrationOpen(false);
        stopCamera();
        loadStudents(); // Reload data to update face registration status
      } else {
        showSnackbar('Gagal menyimpan pendaftaran wajah', 'error');
      }
    } catch (error) {
      console.error('Error saving face registration:', error);
      showSnackbar('Gagal menyimpan pendaftaran wajah', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert data URL to blob
  const dataURLtoBlob = (dataURL) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.grade && student.grade.toString().includes(searchTerm)) ||
    (student.classroom && student.classroom.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getGenderColor = (gender) => {
    return gender === 'male' ? 'primary' : 'secondary';
  };

  const getGenderText = (gender) => {
    return gender === 'male' ? 'Laki-laki' : 'Perempuan';
  };

  return (
    <Box sx={{ color: colors.textPrimary }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Data Siswa
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: 2 }}
        >
          Tambah Siswa
        </Button>
      </Box>

      {/* Search and Filter */}
      <Card sx={{ ...cardStyle, mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Cari nama, NIS, kelas, atau rombel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadStudents}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Students Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: mode === 'dark' ? '#1f2937' : 'grey.50' }}>
              <TableCell>NIS</TableCell>
              <TableCell>Nama</TableCell>
              <TableCell>Kelas</TableCell>
              <TableCell>Rombel</TableCell>
              <TableCell>Telp Ortu</TableCell>
              <TableCell>Gender</TableCell>
              <TableCell>Wajah</TableCell>
              <TableCell>Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  Tidak ada data siswa
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell>{student.student_id}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{student.full_name}</TableCell>
                  <TableCell>{student.grade}</TableCell>
                  <TableCell>{student.classroom}</TableCell>
                  <TableCell>{student.parent_phone}</TableCell>
                  <TableCell>
                    <Chip
                      label={getGenderText(student.gender)}
                      size="small"
                      color={getGenderColor(student.gender)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {(student.face_count > 0 || student.face_descriptor) ? (
                      <Chip
                        icon={<CheckIcon />}
                        label="Terdaftar"
                        size="small"
                        color="success"
                      />
                    ) : (
                      <Chip
                        icon={<ErrorIcon />}
                        label="Belum Ada"
                        size="small"
                        color="warning"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex' }}>
                      <Tooltip title="Registrasi Wajah">
                        <IconButton
                          size="small"
                          onClick={() => handleFaceRegistration(student)}
                          color="primary"
                        >
                          <FaceIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(student)}
                          sx={{ color: 'info.main' }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Hapus">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(student)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Student Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ borderBottom: `1px solid ${colors.border}` }}>
          {editingStudent ? 'Edit Siswa' : 'Tambah Siswa'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="NIS (Nomor Induk Siswa)"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  required
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nama Lengkap Siswa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Kelas</InputLabel>
                  <Select
                    value={formData.grade ?? ''}
                    label="Kelas"
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    required
                  >
                    {grades.map((grade) => (
                      <MenuItem key={grade} value={grade}>Kelas {grade}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Rombel</InputLabel>
                  <Select
                    value={formData.classroom ?? ''}
                    label="Rombel"
                    onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
                    required
                  >
                    {classrooms.map((cls) => (
                      <MenuItem key={cls} value={cls}>Rombel {cls}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nomor Telepon Siswa (Opsional)"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nomor Telepon Orang Tua"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  required
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Jenis Kelamin</InputLabel>
                  <Select
                    value={formData.gender ?? ''}
                    label="Jenis Kelamin"
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <MenuItem value="male">Laki-laki</MenuItem>
                    <MenuItem value="female">Perempuan</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Alamat Rumah"
                  multiline
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog} disabled={loading}>
              Batal
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {editingStudent ? 'Update' : 'Simpan'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Face Registration Dialog */}
      <Dialog 
        open={faceRegistrationOpen} 
        onClose={() => {
          stopCamera();
          setFaceRegistrationOpen(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${colors.border}` }}>
          Registrasi Wajah - {currentStudent?.full_name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ambil foto wajah siswa untuk sistem pengenalan wajah. Minimal 3 foto untuk akurasi yang baik.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: '100%',
                      height: 300,
                      border: '2px solid',
                      borderColor: cameraActive ? 'success.main' : 'grey.300',
                      borderRadius: 2,
                      overflow: 'hidden',
                      position: 'relative',
                      backgroundColor: 'grey.100',
                    }}
                  >
                    {cameraActive ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: '100%',
                        color: 'text.secondary'
                      }}>
                        <CameraIcon sx={{ fontSize: 48, mb: 1 }} />
                        <Typography>Kamera tidak aktif</Typography>
                      </Box>
                    )}
                  </Box>
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button
                      variant="outlined"
                      onClick={startCamera}
                      disabled={cameraActive}
                      startIcon={<CameraIcon />}
                    >
                      Mulai Kamera
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={stopCamera}
                      disabled={!cameraActive}
                      color="error"
                    >
                      Stop Kamera
                    </Button>
                    <Button
                      variant="contained"
                      onClick={captureFace}
                      disabled={!cameraActive}
                      startIcon={<CameraIcon />}
                    >
                      Ambil Foto
                    </Button>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Foto Wajah ({capturedFaces.length}/3)
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {capturedFaces.map((face) => (
                    <Box
                      key={face.id}
                      sx={{
                        position: 'relative',
                        width: 80,
                        height: 80,
                        border: '2px solid',
                        borderColor: 'success.main',
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={face.url}
                        alt="Face"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => removeFace(face.id)}
                        sx={{
                          position: 'absolute',
                          top: -5,
                          right: -5,
                          backgroundColor: 'error.main',
                          color: 'white',
                          width: 20,
                          height: 20,
                          '&:hover': { backgroundColor: 'error.dark' },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
                
                <Alert 
                  severity={capturedFaces.length >= 3 ? 'success' : 'info'}
                  sx={{ mb: 2 }}
                >
                  {capturedFaces.length >= 3 
                    ? 'Foto wajah sudah mencukupi untuk pendaftaran'
                    : `Masih diperlukan ${3 - capturedFaces.length} foto lagi`
                  }
                </Alert>
                
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setFaceRegistrationOpen(false)}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={saveFaceRegistration}
            disabled={capturedFaces.length < 3 || loading}
            startIcon={loading ? <CircularProgress size={16} /> : <CheckIcon />}
          >
            Simpan Pendaftaran
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default Students;