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

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Face registration states
  const [faceRegistrationOpen, setFaceRegistrationOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [capturedFaces, setCapturedFaces] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Form states
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    password: '',
    department: '',
    position: '',
    phone: '',
    gender: '',
    address: '',
  });

  const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations'];
  const positions = ['Manager', 'Supervisor', 'Staff', 'Senior Staff', 'Coordinator'];
  const { colors, mode } = useThemeContext();
  const cardStyle = {
    borderRadius: 6,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.card,
    boxShadow: 'none',
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
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
        throw new Error('Gagal memuat data pegawai');
      }

      const result = await response.json();
      if (result.success) {
        setEmployees(result.data);
      } else {
        showSnackbar('Gagal memuat data pegawai', 'error');
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      showSnackbar('Gagal memuat data pegawai', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        employeeId: employee.employee_id,
        name: employee.full_name,
        email: employee.email,
        password: '',
        department: employee.department,
        position: employee.position,
        phone: employee.phone || '',
        gender: employee.gender || '',
        address: employee.address || '',
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        employeeId: '',
        name: '',
        email: '',
        password: '',
        department: '',
        position: '',
        phone: '',
        gender: '',
        address: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingEmployee(null);
    setFormData({
      employeeId: '',
      name: '',
      email: '',
      password: '',
      department: '',
      position: '',
      phone: '',
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

      const employeeData = {
        employee_id: formData.employeeId,
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
        department: formData.department,
        gender: formData.gender,
        address: formData.address,
        hire_date: new Date().toISOString().split('T')[0]
      };

      if (editingEmployee) {
        // Update employee
        const response = await fetch(`http://localhost:5000/api/employees/${editingEmployee.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(employeeData)
        });

        if (!response.ok) {
          throw new Error('Gagal mengupdate pegawai');
        }

        const result = await response.json();
        if (result.success) {
          showSnackbar('Pegawai berhasil diperbarui', 'success');
          loadEmployees(); // Reload data
        } else {
          showSnackbar('Gagal mengupdate pegawai', 'error');
        }
      } else {
        // Add new employee
        const response = await fetch('http://localhost:5000/api/employees', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(employeeData)
        });

        if (!response.ok) {
          throw new Error('Gagal menambahkan pegawai');
        }

        const result = await response.json();
        if (result.success) {
          showSnackbar('Pegawai berhasil ditambahkan', 'success');
          loadEmployees(); // Reload data
        } else {
          showSnackbar('Gagal menambahkan pegawai', 'error');
        }
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving employee:', error);
      showSnackbar('Gagal menyimpan data pegawai', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (employee) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus ${employee.full_name}?`)) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          showSnackbar('Token autentikasi tidak ditemukan', 'error');
          return;
        }

        const response = await fetch(`http://localhost:5000/api/employees/${employee.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Gagal menghapus pegawai');
        }

        const result = await response.json();
        if (result.success) {
          showSnackbar('Pegawai berhasil dihapus', 'success');
          loadEmployees(); // Reload data
        } else {
          showSnackbar('Gagal menghapus pegawai', 'error');
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        showSnackbar('Gagal menghapus pegawai', 'error');
      }
    }
  };

  const handleFaceRegistration = (employee) => {
    setCurrentEmployee(employee);
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

      const response = await fetch(`http://localhost:5000/api/employees/${currentEmployee.id}/face`, {
        method: 'POST',
        headers: {
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
        loadEmployees(); // Reload data to update face registration status
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

  const filteredEmployees = employees.filter(employee =>
    employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase())
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
          Data Pegawai
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: 2 }}
        >
          Tambah Pegawai
        </Button>
      </Box>

      {/* Search and Filter */}
      <Card sx={{ ...cardStyle, mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Cari nama, ID, atau departemen..."
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
                  onClick={loadEmployees}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: mode === 'dark' ? '#1f2937' : 'grey.50' }}>
              <TableCell>ID</TableCell>
              <TableCell>Nama</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Departemen</TableCell>
              <TableCell>Jabatan</TableCell>
              <TableCell>Telepon</TableCell>
              <TableCell>Gender</TableCell>
              <TableCell>Wajah</TableCell>
              <TableCell>Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm ? 'Tidak ada pegawai yang ditemukan' : 'Belum ada data pegawai'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {employee.employee_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {employee.full_name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {employee.full_name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{employee.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={employee.department} 
                      size="small" 
                      variant="outlined"
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{employee.position}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{employee.phone}</Typography>
                  </TableCell>
                  <TableCell>
                    {employee.gender && (
                      <Chip
                        label={getGenderText(employee.gender)}
                        size="small"
                        color={getGenderColor(employee.gender)}
                        sx={{ borderRadius: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={employee.face_count > 0 ? <CheckIcon /> : <ErrorIcon />}
                      label={employee.face_count > 0 ? 'Terdaftar' : 'Belum Terdaftar'}
                      color={employee.face_count > 0 ? 'success' : 'warning'}
                      size="small"
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(employee)}
                          sx={{ color: 'primary.main' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Pendaftaran Wajah">
                        <IconButton
                          size="small"
                          onClick={() => handleFaceRegistration(employee)}
                          sx={{ color: 'secondary.main' }}
                        >
                          <FaceIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Hapus">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(employee)}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
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

      {/* Add/Edit Employee Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingEmployee ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="ID Pegawai"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  required
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nama Lengkap"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingEmployee}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Departemen</InputLabel>
                  <Select
                    value={formData.department}
                    label="Departemen"
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Jabatan</InputLabel>
                  <Select
                    value={formData.position}
                    label="Jabatan"
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  >
                    {positions.map((pos) => (
                      <MenuItem key={pos} value={pos}>{pos}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nomor Telepon"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={formData.gender}
                    label="Gender"
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
                  label="Alamat"
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
              {editingEmployee ? 'Update' : 'Simpan'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Face Registration Dialog */}
      <Dialog
        open={faceRegistrationOpen}
        onClose={() => setFaceRegistrationOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Pendaftaran Wajah - {currentEmployee?.full_name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ambil foto wajah pegawai untuk sistem pengenalan wajah. Minimal 3 foto untuk akurasi yang baik.
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

export default Employees;