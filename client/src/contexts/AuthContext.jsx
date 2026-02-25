import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      verifyToken();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setError(null);
      } else {
        // Only logout on auth errors (401/403)
        if (response.status === 401 || response.status === 403) {
          console.warn('Token invalid or expired, logging out...');
          logout();
        } else {
          // Server error or rate limit - don't logout, just keep loading state or show error
          console.warn(`Token verification failed with status: ${response.status}`);
          // Optionally keep the user logged in locally if it's just a temporary server issue
          // But for security, we might want to at least set an error state
          setError(`Gagal memverifikasi sesi (Status: ${response.status})`);
        }
      }
    } catch (error) {
      console.error('Token verification network error:', error);
      // Don't logout on network errors (server down, offline, etc)
      // logout(); 
      setError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔐 Attempting login with:', { username: credentials.username });
      
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Failed to parse login response:', e);
        data = { error: `Server error: ${response.status} ${response.statusText}` };
      }

      console.log('📥 Login response:', { ok: response.ok, data });

      if (!response.ok) {
        const errorMessage = data.error || `Login gagal (${response.status})`;
        console.error('❌ Login failed:', errorMessage);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (!data.token) {
        console.error('❌ No token in response');
        setError('Token tidak diterima dari server');
        return { success: false, error: 'Token tidak diterima dari server' };
      }

      // Store token in localStorage
      localStorage.setItem('token', data.token);
      setToken(data.token);
      
      // Set user data
      setUser(data.user);
      
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      console.log('✅ Login successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error);
      const message = error.message || 'Login gagal. Periksa koneksi internet Anda.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Gagal mengubah password';
      return { success: false, error: message };
    }
  };

  const updateUser = (newUserData) => {
    setUser(newUserData);
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    changePassword,
    updateUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
