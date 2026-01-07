import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Button,
  TextField,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person,
  Email,
  Phone,
  LocationOn,
  Business,
  Schedule,
  Security,
  Notifications,
  Camera as CameraIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../utils/translations';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { mode, language, changeTheme, changeLanguage } = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [uploadPhotoOpen, setUploadPhotoOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Profile form states
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    department: '',
    position: '',
    bio: '',
  });

  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Preferences states
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    twoFactorAuth: true,
    language: language,
    theme: mode,
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        department: user.department || '',
        position: user.position || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  // Load preferences from localStorage and sync with theme context
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(prev => ({ ...prev, ...parsed }));
        // Sync with theme context - only if different
        if (parsed.theme && parsed.theme !== mode) {
          changeTheme(parsed.theme);
        }
        if (parsed.language && parsed.language !== language) {
          changeLanguage(parsed.language);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
  }, []); // Only run once on mount

  const handleProfileChange = (key, value) => {
    setProfileData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Apply theme and language changes immediately
    if (key === 'theme') {
      console.log('🎨 Changing theme to:', value);
      changeTheme(value);
    }
    if (key === 'language') {
      console.log('🌐 Changing language to:', value);
      changeLanguage(value);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token autentikasi tidak ditemukan');
      }

      console.log('💾 Saving profile:', profileData);

      // Real API call to update profile
      const response = await fetch('http://localhost:5000/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          address: profileData.address,
          department: profileData.department,
          position: profileData.position,
          bio: profileData.bio
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memperbarui profil');
      }

      console.log('✅ Profile updated successfully:', data);

      // Update user context with new data
      if (updateUser && data.user) {
        updateUser({ ...user, ...data.user });
      }
      
      setEditing(false);
      showSnackbar('Profil berhasil diperbarui', 'success');
    } catch (error) {
      console.error('❌ Update profile error:', error);
      showSnackbar(error.message || 'Gagal memperbarui profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileData({
      name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      department: user?.department || '',
      position: user?.position || '',
      bio: user?.bio || '',
    });
    setEditing(false);
  };

  const handleChangePassword = async () => {
    // Validasi
    if (!passwordData.currentPassword) {
      showSnackbar('Password saat ini harus diisi', 'error');
      return;
    }

    if (!passwordData.newPassword) {
      showSnackbar('Password baru harus diisi', 'error');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showSnackbar('Password baru tidak cocok', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showSnackbar('Password minimal 6 karakter', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token autentikasi tidak ditemukan');
      }

      console.log('🔐 Changing password...');

      // Real API call to change password
      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengubah password');
      }

      console.log('✅ Password changed successfully');
      
      setChangePasswordOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      showSnackbar('Password berhasil diubah', 'success');
    } catch (error) {
      console.error('❌ Change password error:', error);
      showSnackbar(error.message || 'Gagal mengubah password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token autentikasi tidak ditemukan');
      }

      console.log('💾 Saving preferences:', preferences);

      // Simpan ke localStorage
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      
      // Apply theme and language
      changeTheme(preferences.theme);
      changeLanguage(preferences.language);
      
      console.log('✅ Preferences saved');
      showSnackbar('Preferensi berhasil disimpan', 'success');
    } catch (error) {
      console.error('❌ Save preferences error:', error);
      showSnackbar(error.message || 'Gagal menyimpan preferensi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showSnackbar('Ukuran file maksimal 5MB', 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showSnackbar('File harus berupa gambar', 'error');
        return;
      }
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setUploadPhotoOpen(true);
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedPhoto) {
      showSnackbar('Pilih foto terlebih dahulu', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token autentikasi tidak ditemukan');
      }

      const formData = new FormData();
      formData.append('photo', selectedPhoto);

      console.log('📸 Uploading photo...');

      // Upload photo - menggunakan endpoint yang sama dengan employee photo
      // Tapi kita perlu endpoint khusus untuk admin user, untuk sekarang kita coba dulu
      const response = await fetch(`http://localhost:5000/api/auth/upload-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengupload foto');
      }

      console.log('✅ Photo uploaded successfully:', data);

      // Update user context
      if (updateUser && data.user) {
        updateUser({ ...user, ...data.user });
      }

      setUploadPhotoOpen(false);
      setSelectedPhoto(null);
      setPhotoPreview(null);
      showSnackbar('Foto profil berhasil diupdate', 'success');
    } catch (error) {
      console.error('❌ Upload photo error:', error);
      showSnackbar(error.message || 'Gagal mengupload foto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAttendanceHistory = () => {
    // Redirect ke halaman attendance dengan filter untuk user saat ini
    navigate('/attendance');
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'error';
  };

  const getStatusText = (status) => {
    return status === 'active' ? 'Aktif' : 'Tidak Aktif';
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        {t('profile.title')}
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Header */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    fontSize: '2rem',
                    bgcolor: 'primary.main',
                  }}
                >
                  {user.full_name?.charAt(0) || 'U'}
                </Avatar>
                
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    {user.full_name || 'User Name'}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                    {user.position || 'Position'} • {user.department || 'Department'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {user.email || 'email@example.com'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={getStatusText(user.status || 'active')}
                      color={getStatusColor(user.status || 'active')}
                      size="small"
                    />
                    <Chip
                      label={`ID: ${user.employee_id || user.employeeId || 'N/A'}`}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Box>
                
                <Box>
                  <Button
                    variant={editing ? 'outlined' : 'contained'}
                    startIcon={editing ? <CancelIcon /> : <EditIcon />}
                    onClick={editing ? handleCancelEdit : () => setEditing(true)}
                    disabled={loading}
                  >
                    {editing ? t('common.cancel') : t('profile.edit')}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                {language === 'id' ? 'Informasi Pribadi' : 'Personal Information'}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nama Lengkap"
                    value={profileData.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    disabled={!editing}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    disabled={!editing}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nomor Telepon"
                    value={profileData.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    disabled={!editing}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Departemen"
                    value={profileData.department}
                    onChange={(e) => handleProfileChange('department', e.target.value)}
                    disabled={!editing}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Jabatan"
                    value={profileData.position}
                    onChange={(e) => handleProfileChange('position', e.target.value)}
                    disabled={!editing}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Alamat"
                    multiline
                    rows={3}
                    value={profileData.address}
                    onChange={(e) => handleProfileChange('address', e.target.value)}
                    disabled={!editing}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Bio"
                    multiline
                    rows={3}
                    value={profileData.bio}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    disabled={!editing}
                    placeholder="Ceritakan sedikit tentang diri Anda..."
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
              
              {editing && (
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={16} /> : t('profile.save')}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleCancelEdit}
                    disabled={loading}
                  >
                    Batal
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions & Stats */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {language === 'id' ? 'Aksi Cepat' : 'Quick Actions'}
              </Typography>
              
                  <Button
                fullWidth
                variant="outlined"
                startIcon={<Security />}
                onClick={() => setChangePasswordOpen(true)}
                sx={{ mb: 2 }}
              >
                {t('profile.changePassword')}
              </Button>
              
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="photo-upload"
                type="file"
                onChange={handlePhotoSelect}
              />
              <label htmlFor="photo-upload">
                <Button
                  fullWidth
                  variant="outlined"
                  component="span"
                  startIcon={<CameraIcon />}
                  sx={{ mb: 2 }}
                >
                {t('profile.uploadPhoto')}
                </Button>
              </label>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Schedule />}
                onClick={handleViewAttendanceHistory}
              >
                {t('profile.viewAttendance')}
              </Button>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {language === 'id' ? 'Statistik' : 'Statistics'}
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Schedule color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Kehadiran Bulan Ini" 
                    secondary="22 dari 25 hari"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Person color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Terlambat" 
                    secondary="2 kali"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Business color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Bergabung Sejak" 
                    secondary="Januari 2023"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Preferences */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  {t('profile.preferences')}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSavePreferences}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={16} /> : 'Simpan Preferensi'}
                </Button>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    {t('profile.notifications')}
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.emailNotifications}
                        onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                      />
                    }
                    label="Notifikasi Email"
                    sx={{ mb: 1 }}
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.pushNotifications}
                        onChange={(e) => handlePreferenceChange('pushNotifications', e.target.checked)}
                      />
                    }
                    label="Notifikasi Push"
                    sx={{ mb: 1 }}
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.smsNotifications}
                        onChange={(e) => handlePreferenceChange('smsNotifications', e.target.checked)}
                      />
                    }
                    label="Notifikasi SMS"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    {t('profile.security')}
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.twoFactorAuth}
                        onChange={(e) => handlePreferenceChange('twoFactorAuth', e.target.checked)}
                      />
                    }
                    label="Autentikasi 2 Faktor"
                    sx={{ mb: 1 }}
                  />
                  
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>{t('profile.language')}</InputLabel>
                    <Select
                      value={language}
                      label={t('profile.language')}
                      onChange={(e) => {
                        const newLang = e.target.value;
                        console.log('🌐 User selected language:', newLang);
                        // Update preferences state
                        setPreferences(prev => ({ ...prev, language: newLang }));
                        // Change language immediately
                        changeLanguage(newLang);
                        // Save to localStorage
                        localStorage.setItem('userPreferences', JSON.stringify({
                          ...preferences,
                          language: newLang
                        }));
                        showSnackbar(`Bahasa diubah ke ${newLang === 'id' ? 'Bahasa Indonesia' : 'English'}`, 'success');
                      }}
                    >
                      <MenuItem value="id">Bahasa Indonesia</MenuItem>
                      <MenuItem value="en">English</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth>
                    <InputLabel>{t('profile.theme')}</InputLabel>
                    <Select
                      value={mode}
                      label={t('profile.theme')}
                      onChange={(e) => {
                        const newTheme = e.target.value;
                        console.log('🎨 User selected theme:', newTheme);
                        // Update preferences state
                        setPreferences(prev => ({ ...prev, theme: newTheme }));
                        // Change theme immediately
                        changeTheme(newTheme);
                        // Save to localStorage
                        localStorage.setItem('userPreferences', JSON.stringify({
                          ...preferences,
                          theme: newTheme
                        }));
                        showSnackbar(`Tema diubah ke ${newTheme === 'light' ? 'Terang' : 'Gelap'}`, 'success');
                      }}
                    >
                      <MenuItem value="light">Terang</MenuItem>
                      <MenuItem value="dark">Gelap</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ubah Password</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Password Saat Ini"
            type={showPassword.current ? 'text' : 'password'}
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => togglePasswordVisibility('current')}
                  edge="end"
                >
                  {showPassword.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              ),
            }}
          />
          
          <TextField
            fullWidth
            label="Password Baru"
            type={showPassword.new ? 'text' : 'password'}
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => togglePasswordVisibility('new')}
                  edge="end"
                >
                  {showPassword.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              ),
            }}
          />
          
          <TextField
            fullWidth
            label="Konfirmasi Password Baru"
            type={showPassword.confirm ? 'text' : 'password'}
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => togglePasswordVisibility('confirm')}
                  edge="end"
                >
                  {showPassword.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              ),
            }}
          />
          
          <Alert severity="info">
            Password minimal 6 karakter dan harus mengandung huruf dan angka.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setChangePasswordOpen(false)}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            Ubah Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Photo Dialog */}
      <Dialog
        open={uploadPhotoOpen}
        onClose={() => {
          setUploadPhotoOpen(false);
          setSelectedPhoto(null);
          setPhotoPreview(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Foto Profil</DialogTitle>
        <DialogContent>
          {photoPreview && (
            <Box sx={{ mb: 2, textAlign: 'center' }}>
              <img
                src={photoPreview}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  borderRadius: '8px',
                  objectFit: 'contain'
                }}
              />
            </Box>
          )}
          <Alert severity="info" sx={{ mb: 2 }}>
            Ukuran file maksimal 5MB. Format yang didukung: JPG, PNG, GIF
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setUploadPhotoOpen(false);
              setSelectedPhoto(null);
              setPhotoPreview(null);
            }}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleUploadPhoto}
            disabled={loading || !selectedPhoto}
            startIcon={loading ? <CircularProgress size={16} /> : <CameraIcon />}
          >
            {loading ? 'Mengupload...' : 'Upload Foto'}
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

export default Profile;
