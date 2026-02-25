import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  Schedule,
  Face,
  Assessment,
  Settings,
  Person,
  Logout,
  ChevronLeft,
  Notifications,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import { useTranslation } from '../utils/translations';

const drawerWidth = 240;

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { language, colors } = useThemeContext();
  const { t } = useTranslation(language);

  // Menu items with translations
  const menuItems = [
    { text: t('nav.dashboard'), icon: <Dashboard />, path: '/dashboard' },
    { text: t('employees.title'), icon: <People />, path: '/employees' },
    { text: t('nav.attendance'), icon: <Schedule />, path: '/attendance' },
    { text: language === 'id' ? 'Pendaftaran Wajah' : 'Face Registration', icon: <Face />, path: '/face-registration' },
    { text: t('nav.reports'), icon: <Assessment />, path: '/reports' },
    { text: t('nav.settings'), icon: <Settings />, path: '/settings' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationOpen = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: colors.sidebar, color: colors.sidebarText }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: colors.sidebarText }}>
          Absensi System
        </Typography>
      </Box>
      <Divider sx={{ borderColor: colors.border }} />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => handleNavigation(item.path)}
            selected={location.pathname === item.path}
            sx={{
              '&.Mui-selected': {
                backgroundColor: colors.hover,
                color: colors.sidebarText,
                '&:hover': {
                  backgroundColor: colors.hover,
                },
              },
              '&:hover': {
                backgroundColor: colors.hover,
              },
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              color: colors.sidebarText,
            }}
          >
            <ListItemIcon
              sx={{
                color: colors.sidebarText,
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text}
              primaryTypographyProps={{
                fontWeight: location.pathname === item.path ? 600 : 400,
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: colors.surface,
          color: colors.textPrimary,
          boxShadow: 'none',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || t('nav.dashboard')}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              color="inherit"
              onClick={handleNotificationOpen}
              sx={{ mr: 1 }}
            >
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>

            <IconButton
              onClick={handleMenuOpen}
              sx={{ p: 0 }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
                {user?.name?.charAt(0) || 'U'}
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 180,
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                backgroundColor: colors.card,
                color: colors.textPrimary,
              },
            }}
          >
            <MenuItem onClick={() => { handleNavigation('/profile'); handleMenuClose(); }}>
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              {t('nav.profile')}
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              {t('nav.logout')}
            </MenuItem>
          </Menu>

          <Menu
            anchorEl={notificationAnchorEl}
            open={Boolean(notificationAnchorEl)}
            onClose={handleNotificationClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 300,
                maxHeight: 400,
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                backgroundColor: colors.card,
                color: colors.textPrimary,
              },
            }}
          >
            <MenuItem>
              <Typography variant="body2">
                {language === 'id' ? 'Belum ada notifikasi' : 'No notifications'}
              </Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: colors.sidebar,
              color: colors.sidebarText,
              borderRight: `1px solid ${colors.border}`,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: colors.sidebar,
              color: colors.sidebarText,
              borderRight: `1px solid ${colors.border}`,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          minHeight: '100vh',
          backgroundColor: colors.background,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
