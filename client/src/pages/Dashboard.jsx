import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  Fade,
  LinearProgress,
  CardActionArea,
} from '@mui/material';
import {
  People,
  CheckCircle,
  Error,
  Warning,
  Refresh,
  AccessTime,
  QrCodeScanner,
  Face,
  Assessment,
  DateRange,
  Settings,
  School,
  Edit,
} from '@mui/icons-material';
import {
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    systemStatus: 'online',
  });
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [absentStudents, setAbsentStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartData, setChartData] = useState([]);
  const { colors, mode } = useThemeContext();
  const navigate = useNavigate();

  const menuGridItems = [
    { title: 'Absensi', icon: <QrCodeScanner sx={{ fontSize: 40, color: '#3b82f6' }} />, path: '/attendance', color: '#eff6ff' },
    { title: 'Scan Wajah', icon: <Face sx={{ fontSize: 40, color: '#0ea5e9' }} />, path: '/face-registration', color: '#e0f2fe' },
    { title: 'Data Siswa', icon: <People sx={{ fontSize: 40, color: '#8b5cf6' }} />, path: '/students', color: '#f5f3ff' },
    { title: 'Data Kelas', icon: <School sx={{ fontSize: 40, color: '#f59e0b' }} />, path: '/classes', color: '#fffbeb' },
    { title: 'Laporan', icon: <Assessment sx={{ fontSize: 40, color: '#10b981' }} />, path: '/reports', color: '#ecfdf5' },
    { title: 'Rekap Bulanan', icon: <DateRange sx={{ fontSize: 40, color: '#f97316' }} />, path: '/monthly-recap', color: '#fff7ed' },
    { title: 'Pengaturan', icon: <Settings sx={{ fontSize: 40, color: '#64748b' }} />, path: '/settings', color: '#f8fafc' },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);

      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('Token autentikasi tidak ditemukan');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Ambil statistik dari API
      const statsRes = await axios.get('http://localhost:5000/api/dashboard/stats', { headers });
      setStats(statsRes.data);

      // Ambil aktivitas terbaru dari API
      const recentRes = await axios.get('http://localhost:5000/api/dashboard/recent', { headers });
      setRecentAttendance(recentRes.data);

      // Ambil data chart mingguan dari API
      const chartRes = await axios.get("http://localhost:5000/api/dashboard/chart", { headers });
      setChartData(chartRes.data);

      // Ambil data siswa yang belum absen
      const absentRes = await axios.get("http://localhost:5000/api/dashboard/absent", { headers });
      setAbsentStudents(absentRes.data);

    } catch (error) {
      console.warn('Error loading dashboard data:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'offline': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <CheckCircle sx={{ color: '#10b981' }} />;
      case 'warning': return <Warning sx={{ color: '#f59e0b' }} />;
      case 'offline': return <Error sx={{ color: '#ef4444' }} />;
      default: return <AccessTime sx={{ color: '#6b7280' }} />;
    }
  };

  const getAttendanceStatusColor = (status) => {
    switch (status) {
      case 'present': return '#10b981';
      case 'late': return '#f59e0b';
      case 'absent': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const cardBaseStyle = {
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    boxShadow: 'none',
    backgroundColor: colors.card,
    height: '100%',
    minHeight: 250,
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Fade in={true} timeout={800}>
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, color: colors.textPrimary }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={5}>
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: colors.textPrimary,
                mb: 2,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' }
              }}
            >
              Dashboard Absensi
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ fontWeight: 500, fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' } }}
            >
              Monitor kehadiran siswa dan statistik absensi
            </Typography>
          </Box>
          <Tooltip title="Refresh Dashboard">
            <IconButton
              onClick={loadDashboardData}
              disabled={refreshing}
              size="large"
              sx={{
                bgcolor: mode === 'dark' ? colors.card : '#f8fafc',
                width: 56,
                height: 56,
                border: `1px solid ${colors.border}`,
                '&:hover': { bgcolor: colors.hover },
              }}
            >
              <Refresh sx={{ color: colors.textSecondary, fontSize: 28 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Statistik Cards */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {/* Status Sistem */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={cardBaseStyle}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                  <Box>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                      Status Sistem
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: getStatusColor(stats.systemStatus) }}>
                      {stats.systemStatus === 'online' ? 'Online' : 'Offline'}
                    </Typography>
                  </Box>
                  <Box>{getStatusIcon(stats.systemStatus)}</Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats.systemStatus === 'online' ? 100 : stats.systemStatus === 'warning' ? 60 : 20}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#e2e8f0',
                    '& .MuiLinearProgress-bar': { bgcolor: getStatusColor(stats.systemStatus), borderRadius: 4 },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Total Siswa */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={cardBaseStyle}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                  <Box>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                      Total Siswa
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#1976d2' }}>
                      {stats.totalStudents}
                    </Typography>
                  </Box>
                  <People sx={{ color: '#1976d2', fontSize: 40 }} />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#e2e8f0',
                    '& .MuiLinearProgress-bar': { bgcolor: '#1976d2', borderRadius: 4 },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Hadir Hari Ini */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={cardBaseStyle}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                  <Box>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                      Hadir Hari Ini
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#10b981' }}>
                      {stats.presentToday}
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ color: '#10b981', fontSize: 40 }} />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(stats.presentToday / stats.totalStudents) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#e2e8f0',
                    '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 4 },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Tidak Hadir */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={cardBaseStyle}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                  <Box>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
                      Tidak Hadir
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#ef4444' }}>
                      {stats.absentToday}
                    </Typography>
                  </Box>
                  <Error sx={{ color: '#ef4444', fontSize: 40 }} />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(stats.absentToday / stats.totalStudents) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#e2e8f0',
                    '& .MuiLinearProgress-bar': { bgcolor: '#ef4444', borderRadius: 4 },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Belum Absen & Menu Utama Container */}
        <Grid container spacing={4} sx={{ mb: 5 }}>
          {/* Left Column: Belum Absen */}
          <Grid item xs={12} md={4}>
            <Card sx={{ ...cardBaseStyle, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <People color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#ef4444' }}>
                    Belum Absen
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Data hari ini: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
                
                <List sx={{ 
                    maxHeight: 500, 
                    overflow: 'auto',
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
                    '&::-webkit-scrollbar-thumb': { background: '#cbd5e1', borderRadius: '3px' },
                    '&::-webkit-scrollbar-thumb:hover': { background: '#94a3b8' }
                }}>
                  {absentStudents.length > 0 ? (
                      absentStudents.map((student, idx) => (
                        <React.Fragment key={student.id}>
                            <ListItem alignItems="center" sx={{ px: 0, py: 1.5 }}>
                              <ListItemText 
                                  primary={
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {student.full_name}
                                    </Typography>
                                  }
                              />
                              <Chip 
                                  label={`KELAS ${student.grade}${student.classroom ? `-${student.classroom}` : ''}`} 
                                  size="small" 
                                  sx={{ 
                                    fontSize: '0.7rem', 
                                    height: 24,
                                    bgcolor: '#fee2e2',
                                    color: '#ef4444',
                                    fontWeight: 600,
                                    border: 'none'
                                  }}
                              />
                            </ListItem>
                            {idx < absentStudents.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                      ))
                  ) : (
                      <Box textAlign="center" py={4}>
                        <CheckCircle sx={{ fontSize: 48, color: '#10b981', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                            Semua siswa sudah absen!
                        </Typography>
                      </Box>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column: Menu Utama */}
          <Grid item xs={12} md={8}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: colors.textPrimary }}>
              Menu Utama
            </Typography>
            <Grid container spacing={3}>
              {menuGridItems.map((item, index) => (
                <Grid item xs={6} sm={4} md={4} key={index}>
                  <Card 
                    sx={{ 
                      borderRadius: 4, 
                      boxShadow: 'none', 
                      border: `1px solid ${colors.border}`,
                      transition: 'all 0.2s ease-in-out',
                      height: '100%',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 20px -10px rgba(0, 0, 0, 0.1)',
                        borderColor: '#3b82f6',
                        cursor: 'pointer'
                      }
                    }}
                    onClick={() => navigate(item.path)}
                  >
                    <CardActionArea sx={{ height: '100%', p: 2 }}>
                      <Box 
                        display="flex" 
                        flexDirection="column" 
                        alignItems="center" 
                        justifyContent="center"
                        minHeight={120}
                      >
                        <Box 
                          sx={{ 
                            p: 2, 
                            borderRadius: '20px', 
                            bgcolor: item.color,
                            mb: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 70,
                            height: 70
                          }}
                        >
                          {item.icon}
                        </Box>
                        <Typography 
                          variant="body1" 
                          align="center" 
                          sx={{ 
                            fontWeight: 600, 
                            color: colors.textPrimary,
                            fontSize: '0.95rem'
                          }}
                        >
                          {item.title}
                        </Typography>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        {/* Charts & Recent Activity */}
        <Grid container spacing={4}>
          {/* Chart */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ ...cardBaseStyle, minHeight: 400 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Statistik Kehadiran Mingguan
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis dataKey="day" stroke={colors.textSecondary} />
                    <YAxis stroke={colors.textSecondary} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Aktivitas Terbaru */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ ...cardBaseStyle, minHeight: 400 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Aktivitas Terbaru
                </Typography>
                <List sx={{ py: 0 }}>
                  {recentAttendance.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <ListItem sx={{ px: 0, py: 1.5 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: getAttendanceStatusColor(item.status),
                              fontSize: '0.875rem'
                            }}
                          >
                            {item.full_name ? item.full_name.charAt(0) : "?"}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {item.full_name}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Kelas {item.grade} {item.classroom} • {item.check_in ? new Date(item.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "-"}
                              </Typography>
                              <Chip
                                label={
                                  item.status === 'present'
                                    ? 'Hadir'
                                    : item.status === 'late'
                                    ? 'Terlambat'
                                    : 'Tidak Hadir'
                                }
                                size="small"
                                sx={{
                                  ml: 1,
                                  bgcolor: getAttendanceStatusColor(item.status),
                                  color: '#fff',
                                  fontSize: '0.75rem',
                                  height: 20
                                }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < recentAttendance.length - 1 && <Divider sx={{ my: 1 }} />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Fade>
  );
};

export default Dashboard;
