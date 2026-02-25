import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Avatar,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  LockOutlined,
  Visibility,
  VisibilityOff,
  Business,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import { useTranslation } from '../utils/translations';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const { language } = useThemeContext();
  const { t } = useTranslation(language);

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(credentials);
      console.log('📋 Login result:', result);
      if (result.success) {
        console.log('✅ Login successful, navigating to dashboard');
        navigate('/dashboard');
      } else {
        console.error('❌ Login failed:', result.error);
        // Error sudah di-set di AuthContext, akan ditampilkan oleh Alert
      }
    } catch (err) {
      console.error('❌ Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#078085ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center', 
        padding: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          padding: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: 2,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: 450,
        }}
      >
        {/* Logo dan Header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 5,
            textAlign: 'center',
          }}
        >
          <Avatar
            sx={{
              m: 1,
              bgcolor: '#1976d2',
              width: 64,
              height: 64,
              mb: 3,
            }}
          >
            <Business sx={{ fontSize: 32, color: '#ffffff' }} />
          </Avatar>
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontWeight: 600,
              color: '#1e293b',
              mb: 1,
              textAlign: 'center',
            }}
          >
            {t('login.title')}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#64748b',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            {t('login.subtitle')}
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            sx={{
              width: '100%',
              mb: 3,
              borderRadius: 1,
              border: '1px solid #fecaca',
              bgcolor: '#fef2f2',
            }}
          >
            {error}
          </Alert>
        )}

        {/* Login Form */}
        <Box 
          component="form" 
          onSubmit={handleSubmit} 
          sx={{ 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          <TextField
            fullWidth
            label={t('login.username')}
            name="username"
            value={credentials.username}
            onChange={handleChange}
            variant="outlined"
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: '#1976d2',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#1976d2',
                },
              },
            }}
          />

          <TextField
            fullWidth
            label={t('login.password')}
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={credentials.password}
            onChange={handleChange}
            variant="outlined"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: '#1976d2',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#1976d2',
                },
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              mt: 2,
              mb: 2,
              py: 1.5,
              borderRadius: 2,
              bgcolor: '#1976d2',
              '&:hover': {
                bgcolor: '#1565c0',
              },
              '&:disabled': {
                bgcolor: '#94a3b8',
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              t('login.submit')
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
