import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Camera as CameraIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Face as FaceIcon,
} from '@mui/icons-material';

import { useTheme as useThemeContext } from '../contexts/ThemeContext';

const FaceRegistration = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [faceRegistrationOpen, setFaceRegistrationOpen] = useState(false);
  const [capturedFaces, setCapturedFaces] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { colors, mode } = useThemeContext();
  const cardStyle = {
    borderRadius: 6,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.card,
    boxShadow: 'none',
  };
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Cleanup camera when component unmounts or dialog closes
  useEffect(() => {
    return () => {
      if (stream) {
        console.log('🧹 Cleaning up camera on unmount');
        stopCamera();
      }
    };
  }, []);

  // Cleanup camera when dialog closes
  const handleCloseDialog = () => {
    console.log('🚪 Closing dialog, cleaning up camera');
    stopCamera();
    setFaceRegistrationOpen(false);
    setCapturedFaces([]);
    setSelectedStudent(null);
  };

  // Debug camera state
  useEffect(() => {
    console.log('📷 Camera state changed:', {
      cameraActive,
      hasStream: !!stream,
      hasVideoRef: !!videoRef.current,
      hasCanvasRef: !!canvasRef.current
    });
  }, [cameraActive, stream]);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showSnackbar('Token autentikasi tidak ditemukan', 'error');
        return;
      }

      const response = await fetch('http://localhost:5000/api/employees', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Gagal memuat data siswa');
      }

      const result = await response.json();
      if (result.success) {
        setStudents(result.data);
      } else {
        showSnackbar('Gagal memuat data siswa', 'error');
      }
    } catch (error) {
      console.error('Error loading students:', error);
      showSnackbar('Gagal memuat data siswa', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceRegistration = (student) => {
    setSelectedStudent(student);
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

  const handleSaveFaces = async () => {
    if (capturedFaces.length < 3) {
      showSnackbar('Minimal 3 foto wajah diperlukan', 'error');
      return;
    }

    setLoading(true);
    try {
      console.log('💾 Saving faces to database...');
      console.log('👤 Student:', selectedStudent);
      console.log('📸 Faces count:', capturedFaces.length);
      
      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token autentikasi tidak ditemukan');
      }

      // Convert captured faces to FormData
      const formData = new FormData();
      formData.append('student_id', selectedStudent.student_id);
      
      // Add each face image
      capturedFaces.forEach((face, index) => {
        formData.append(`face_images`, face.blob, `student_${selectedStudent.student_id}_${index + 1}.jpg`);
      });

      console.log('📤 Sending data to server...');
      
      // Send to backend API
      const response = await fetch('http://localhost:5000/api/face-recognition/register', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menyimpan foto wajah');
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Faces saved successfully:', result);
        showSnackbar('Pendaftaran wajah berhasil disimpan', 'success');
        setFaceRegistrationOpen(false);
        stopCamera();
        setCapturedFaces([]);
        setSelectedStudent(null);
        
        // Reload students to get updated data from database
        loadStudents();
      } else {
        throw new Error(result.message || 'Gagal menyimpan foto wajah');
      }
      
    } catch (error) {
      console.error('❌ Error saving faces:', error);
      showSnackbar(`Gagal menyimpan pendaftaran wajah: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFaces = async (student) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus semua foto wajah ${student.full_name}?`)) {
      try {
        // TODO: Implement actual API call to delete face data
        // For now, just reload students to get updated data from database
        
        showSnackbar('Foto wajah berhasil dihapus', 'success');
        loadStudents();
      } catch (error) {
        showSnackbar('Gagal menghapus foto wajah', 'error');
      }
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'error';
  };

  const getFaceStatusColor = (faceCount) => {
    return faceCount > 0 ? 'success' : 'warning';
  };

  const getFaceStatusText = (faceCount) => {
    return faceCount > 0 ? 'Terdaftar' : 'Belum Terdaftar';
  };

  const registeredCount = students.filter(emp => emp.face_count > 0).length;
  const totalCount = students.length;
  const registrationRate = totalCount > 0 ? (registeredCount / totalCount) * 100 : 0;

  return (
    <Box sx={{ color: colors.textPrimary }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Pendaftaran Wajah
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadStudents}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={cardStyle}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                {totalCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Siswa
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={cardStyle}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>
                {registeredCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Wajah Terdaftar
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={cardStyle}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main', mb: 1 }}>
                {totalCount - registeredCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Belum Terdaftar
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={cardStyle}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main', mb: 1 }}>
                {registrationRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tingkat Pendaftaran
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progress Bar */}
      <Card sx={{ ...cardStyle, mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progress Pendaftaran Wajah
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {registeredCount} dari {totalCount} siswa
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={registrationRate} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </CardContent>
      </Card>

      {/* Students Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: mode === 'dark' ? '#1f2937' : 'grey.50' }}>
              <TableCell>Siswa</TableCell>
              <TableCell>Kelas</TableCell>
              <TableCell>Status Wajah</TableCell>
              <TableCell>Jumlah Foto</TableCell>
              <TableCell>Terakhir Update</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    Belum ada data siswa
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {student.full_name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {student.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          NIS: {student.student_id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {student.grade} - {student.classroom}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={student.face_count > 0 ? <CheckIcon /> : <ErrorIcon />}
                      label={getFaceStatusText(student.face_count)}
                      color={getFaceStatusColor(student.face_count)}
                      size="small"
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FaceIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {student.face_count} foto
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {student.updated_at ? new Date(student.updated_at).toLocaleDateString('id-ID') : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={student.is_active ? 'Aktif' : 'Tidak Aktif'}
                      color={student.is_active ? 'success' : 'error'}
                      size="small"
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Pendaftaran Wajah">
                        <IconButton
                          size="small"
                          onClick={() => handleFaceRegistration(student)}
                          sx={{ color: 'primary.main' }}
                        >
                          <CameraIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {student.face_count > 0 && (
                        <Tooltip title="Hapus Foto Wajah">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteFaces(student)}
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Face Registration Dialog */}
      <Dialog
        open={faceRegistrationOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Pendaftaran Wajah - {selectedStudent?.full_name}
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
                    {/* Always render video element but control visibility */}
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        opacity: cameraActive ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}
                    />
                    
                    {/* Camera inactive overlay */}
                    {!cameraActive && (
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: '100%',
                        color: 'text.secondary',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'grey.100'
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
                      <img src={face.url} alt="Face" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          backgroundColor: 'rgba(244, 67, 54, 0.8)',
                          color: 'white',
                          '&:hover': { backgroundColor: 'rgb(244, 67, 54)' },
                          padding: '2px',
                        }}
                        onClick={() => removeFace(face.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  
                  {[...Array(Math.max(0, 3 - capturedFaces.length))].map((_, i) => (
                    <Box
                      key={`placeholder-${i}`}
                      sx={{
                        width: 80,
                        height: 80,
                        border: '2px dashed',
                        borderColor: 'grey.400',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'grey.50',
                      }}
                    >
                      <FaceIcon sx={{ color: 'grey.400' }} />
                    </Box>
                  ))}
                </Box>
                
                <Alert severity={capturedFaces.length < 3 ? 'info' : 'success'} sx={{ mt: 2 }}>
                  {capturedFaces.length < 3 
                    ? `Ambil setidaknya ${3 - capturedFaces.length} foto lagi.`
                    : 'Foto cukup! Anda bisa menyimpan pendaftaran sekarang.'}
                </Alert>
                
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: `1px solid ${colors.border}` }}>
          <Button onClick={handleCloseDialog}>Batal</Button>
          <Button
            variant="contained"
            onClick={handleSaveFaces}
            disabled={capturedFaces.length < 3 || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
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

export default FaceRegistration;
