import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  CircularProgress,
} from '@mui/material';
import {
  Notifications,
  Security,
  Schedule,
  Camera,
  Storage,
  Backup,
  Restore,
  Save,
  Refresh,
  Warning,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import { useTranslation } from '../utils/translations';

const Settings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { language } = useThemeContext();
  const { t } = useTranslation(language);

  // Load settings from API
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setInitialLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token autentikasi tidak ditemukan');
      }

      console.log('📥 Loading settings...');

      const response = await fetch('http://localhost:5000/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memuat pengaturan');
      }

      console.log('✅ Settings loaded:', data);
      
      // Convert API data to local state format
      const formattedSettings = {};
      if (data.data && typeof data.data === 'object') {
        Object.entries(data.data).forEach(([category, categorySettings]) => {
          if (Array.isArray(categorySettings)) {
            categorySettings.forEach(setting => {
              formattedSettings[setting.key] = setting.value;
            });
          }
        });
      }

      console.log('📋 Formatted settings:', formattedSettings);
      setSettings(formattedSettings);
    } catch (error) {
      console.error('❌ Load settings error:', error);
      showSnackbar(error.message || 'Gagal memuat pengaturan', 'error');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Prepare settings for batch update
      const settingsToUpdate = Object.entries(settings).map(([key, value]) => ({
        key,
        value
      }));

      console.log('💾 Saving settings:', settingsToUpdate);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token autentikasi tidak ditemukan');
      }

      const response = await fetch('http://localhost:5000/api/settings/batch', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ settings: settingsToUpdate })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan pengaturan');
      }

      console.log('✅ Settings saved successfully:', data);
      showSnackbar('Pengaturan berhasil disimpan', 'success');
      
      // Reload settings to get updated values
      await loadSettings();
    } catch (error) {
      console.error('❌ Save settings error:', error);
      showSnackbar(error.message || 'Gagal menyimpan pengaturan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    // Konfirmasi sebelum reset
    if (!window.confirm('Apakah Anda yakin ingin mereset semua pengaturan ke nilai default?')) {
      return;
    }

    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token autentikasi tidak ditemukan');
      }

      console.log('🔄 Resetting settings to default...');

      const response = await fetch('http://localhost:5000/api/settings/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mereset pengaturan');
      }

      console.log('✅ Settings reset successfully:', data);

      // Reload settings after reset
      await loadSettings();
      showSnackbar('Pengaturan direset ke nilai default', 'success');
    } catch (error) {
      console.error('❌ Reset settings error:', error);
      showSnackbar(error.message || 'Gagal mereset pengaturan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          {t('settings.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleReset}
            disabled={loading}
          >
            {t('settings.reset')}
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? <CircularProgress size={16} /> : t('settings.save')}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Notifications color="primary" />
                <Typography variant="h6">Notifikasi</Typography>
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.email_notifications || false}
                    onChange={(e) => handleSettingChange('email_notifications', e.target.checked)}
                  />
                }
                label="Notifikasi Email"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.push_notifications || false}
                    onChange={(e) => handleSettingChange('push_notifications', e.target.checked)}
                  />
                }
                label="Notifikasi Push"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.sms_notifications || false}
                    onChange={(e) => handleSettingChange('sms_notifications', e.target.checked)}
                  />
                }
                label="Notifikasi SMS"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Security color="primary" />
                <Typography variant="h6">Keamanan</Typography>
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.two_factor_auth || false}
                    onChange={(e) => handleSettingChange('two_factor_auth', e.target.checked)}
                  />
                }
                label="Autentikasi 2 Faktor"
              />
              
              <TextField
                fullWidth
                label="Timeout Sesi (menit)"
                type="number"
                value={settings.session_timeout || 30}
                onChange={(e) => handleSettingChange('session_timeout', parseInt(e.target.value))}
                sx={{ mt: 2 }}
              />
              
              <TextField
                fullWidth
                label="Kadaluarsa Password (hari)"
                type="number"
                value={settings.password_expiry || 90}
                onChange={(e) => handleSettingChange('password_expiry', parseInt(e.target.value))}
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Attendance Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Schedule color="primary" />
                <Typography variant="h6">Pengaturan Absensi</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Jam Mulai Kerja"
                    type="time"
                    value={settings.work_start_time || '08:00'}
                    onChange={(e) => handleSettingChange('work_start_time', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Jam Selesai Kerja"
                    type="time"
                    value={settings.work_end_time || '17:00'}
                    onChange={(e) => handleSettingChange('work_end_time', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
              
              <TextField
                fullWidth
                label="Toleransi Keterlambatan (menit)"
                type="number"
                value={settings.late_threshold || 15}
                onChange={(e) => handleSettingChange('late_threshold', parseInt(e.target.value))}
                sx={{ mt: 2 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.overtime_enabled || false}
                    onChange={(e) => handleSettingChange('overtime_enabled', e.target.checked)}
                  />
                }
                label="Aktifkan Lembur"
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Face Recognition Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Camera color="primary" />
                <Typography variant="h6">Pengenalan Wajah</Typography>
              </Box>
              
              <TextField
                fullWidth
                label="Tingkat Kepercayaan Deteksi (0.1 - 1.0)"
                type="number"
                inputProps={{ min: 0.1, max: 1.0, step: 0.1 }}
                value={settings.face_detection_confidence || 0.8}
                onChange={(e) => handleSettingChange('face_detection_confidence', parseFloat(e.target.value))}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Maksimal Foto Wajah per Pegawai"
                type="number"
                inputProps={{ min: 3, max: 10 }}
                value={settings.max_face_images || 5}
                onChange={(e) => handleSettingChange('max_face_images', parseInt(e.target.value))}
                sx={{ mb: 2 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.auto_capture || false}
                    onChange={(e) => handleSettingChange('auto_capture', e.target.checked)}
                  />
                }
                label="Capture Otomatis"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* System Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Storage color="primary" />
                <Typography variant="h6">Sistem</Typography>
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.auto_backup || false}
                    onChange={(e) => handleSettingChange('auto_backup', e.target.checked)}
                  />
                }
                label="Backup Otomatis"
              />
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Frekuensi Backup</InputLabel>
                <Select
                  value={settings.backup_frequency || 'daily'}
                  label="Frekuensi Backup"
                  onChange={(e) => handleSettingChange('backup_frequency', e.target.value)}
                >
                  <MenuItem value="daily">Harian</MenuItem>
                  <MenuItem value="weekly">Mingguan</MenuItem>
                  <MenuItem value="monthly">Bulanan</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Retensi Data (hari)"
                type="number"
                value={settings.data_retention || 365}
                onChange={(e) => handleSettingChange('data_retention', parseInt(e.target.value))}
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CheckCircle color="primary" />
                <Typography variant="h6">Status Sistem</Typography>
              </Box>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Database" 
                    secondary="Terhubung dan berfungsi normal"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Face Recognition API" 
                    secondary="Aktif dan responsif"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Backup System" 
                    secondary="Terakhir backup: 2 jam yang lalu"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Storage" 
                    secondary="75% terpakai - Perlu monitoring"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

export default Settings;
