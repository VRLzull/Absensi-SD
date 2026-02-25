import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'light';
  });

  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'id';
  });

  useEffect(() => {
    localStorage.setItem('theme', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const colorTokens = {
    light: {
      background: '#f1f5f9',
      surface: '#ffffff',
      sidebar: '#ffffff',
      sidebarText: '#0f172a',
      card: '#ffffff',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      border: '#e2e8f0',
      hover: '#f8fafc',
    },
    dark: {
      background: '#0f172a',
      surface: '#111827',
      sidebar: '#0b1121',
      sidebarText: '#f8fafc',
      card: '#1f2937',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5f5',
      border: '#1f2937',
      hover: '#1e293b',
    },
  };

  const colors = colorTokens[mode] || colorTokens.light;

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: mode === 'dark' ? 'dark' : 'light',
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
          background: {
            default: colors.background,
            paper: colors.card,
          },
          text: {
            primary: colors.textPrimary,
            secondary: colors.textSecondary,
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: colors.background,
                margin: 0,
                padding: 0,
              },
              '#root': {
                backgroundColor: colors.background,
                minHeight: '100vh',
              },
            },
          },
        },
      }),
    [mode, colors]
  );

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const changeTheme = (newMode) => {
    console.log('🎨 ThemeContext: Changing theme to', newMode);
    if (newMode === 'light' || newMode === 'dark') {
      setMode(newMode);
      localStorage.setItem('theme', newMode);
    } else {
      console.warn('Invalid theme mode:', newMode);
    }
  };

  const changeLanguage = (newLanguage) => {
    console.log('🌐 ThemeContext: Changing language to', newLanguage);
    if (newLanguage === 'id' || newLanguage === 'en') {
      setLanguage(newLanguage);
      localStorage.setItem('language', newLanguage);
    } else {
      console.warn('Invalid language:', newLanguage);
    }
  };

  useEffect(() => {
    document.body.style.backgroundColor = colors.background;
    document.body.style.color = colors.textPrimary;
  }, [colors]);

  const value = {
    mode,
    language,
    theme,
    colors,
    toggleTheme,
    changeTheme,
    changeLanguage,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MUIThemeProvider theme={theme}>
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};

