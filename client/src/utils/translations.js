// Translation strings
const translations = {
  id: {
    // Common
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
    'common.delete': 'Hapus',
    'common.edit': 'Edit',
    'common.search': 'Cari',
    'common.filter': 'Filter',
    'common.loading': 'Memuat...',
    'common.success': 'Berhasil',
    'common.error': 'Error',
    'common.confirm': 'Konfirmasi',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.employees': 'Siswa',
    'nav.attendance': 'Absensi',
    'nav.reports': 'Laporan',
    'nav.settings': 'Pengaturan',
    'nav.profile': 'Profil',
    'nav.logout': 'Keluar',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.totalEmployees': 'Total Siswa',
    'dashboard.presentToday': 'Hadir Hari Ini',
    'dashboard.absentToday': 'Tidak Hadir',
    'dashboard.lateToday': 'Terlambat',
    
    // Employees
    'employees.title': 'Data Siswa',
    'employees.add': 'Tambah Siswa',
    'employees.edit': 'Edit Siswa',
    'employees.delete': 'Hapus Siswa',
    'employees.name': 'Nama Siswa',
    'employees.department': 'Kelas',
    'employees.position': 'Rombel',
    'employees.id': 'NIS',
    'employees.grade': 'Kelas',
    'employees.classroom': 'Rombel',
    'employees.parentPhone': 'No. Telp Orang Tua',
    
    // Attendance
    'attendance.title': 'Data Absensi',
    'attendance.checkIn': 'Check In',
    'attendance.checkOut': 'Check Out',
    'attendance.totalEmployees': 'Total Siswa',
    'attendance.present': 'Hadir',
    'attendance.late': 'Terlambat',
    'attendance.absent': 'Tidak Hadir',
    
    // Profile
    'profile.title': 'Profil Saya',
    'profile.edit': 'Edit Profil',
    'profile.save': 'Simpan Perubahan',
    'profile.changePassword': 'Ubah Password',
    'profile.uploadPhoto': 'Update Foto Profil',
    'profile.viewAttendance': 'Lihat Riwayat Absensi',
    'profile.preferences': 'Preferensi',
    'profile.notifications': 'Notifikasi',
    'profile.security': 'Keamanan & Tampilan',
    'profile.language': 'Bahasa',
    'profile.theme': 'Tema',
    'profile.department': 'Kelas',
    'profile.position': 'Rombel',
    
    // Settings
    'settings.title': 'Pengaturan Sistem',
    'settings.save': 'Simpan Pengaturan',
    'settings.reset': 'Reset Default',
    
    // Login
    'login.title': 'Absensi App',
    'login.subtitle': 'Sistem Manajemen Absensi',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.submit': 'Masuk',
  },
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.loading': 'Loading...',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.confirm': 'Confirm',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.employees': 'Students',
    'nav.attendance': 'Attendance',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.totalEmployees': 'Total Students',
    'dashboard.presentToday': 'Present Today',
    'dashboard.absentToday': 'Absent',
    'dashboard.lateToday': 'Late',
    
    // Employees
    'employees.title': 'Student Data',
    'employees.add': 'Add Student',
    'employees.edit': 'Edit Student',
    'employees.delete': 'Delete Student',
    'employees.name': 'Student Name',
    'employees.department': 'Grade',
    'employees.position': 'Classroom',
    'employees.id': 'Student ID',
    'employees.grade': 'Grade',
    'employees.classroom': 'Classroom',
    'employees.parentPhone': 'Parent Phone',
    
    // Attendance
    'attendance.title': 'Attendance Data',
    'attendance.checkIn': 'Check In',
    'attendance.checkOut': 'Check Out',
    'attendance.totalEmployees': 'Total Students',
    'attendance.present': 'Present',
    'attendance.late': 'Late',
    'attendance.absent': 'Absent',
    
    // Profile
    'profile.title': 'My Profile',
    'profile.edit': 'Edit Profile',
    'profile.save': 'Save Changes',
    'profile.changePassword': 'Change Password',
    'profile.uploadPhoto': 'Update Profile Photo',
    'profile.viewAttendance': 'View Attendance History',
    'profile.preferences': 'Preferences',
    'profile.notifications': 'Notifications',
    'profile.security': 'Security & Display',
    'profile.language': 'Language',
    'profile.theme': 'Theme',
    'profile.department': 'Grade',
    'profile.position': 'Classroom',
    
    // Settings
    'settings.title': 'System Settings',
    'settings.save': 'Save Settings',
    'settings.reset': 'Reset Default',
    
    // Login
    'login.title': 'Attendance App',
    'login.subtitle': 'Attendance Management System',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.submit': 'Login',
  }
};

// Translation hook/function
export const useTranslation = (language = 'id') => {
  const t = (key, defaultValue = key) => {
    return translations[language]?.[key] || translations['id']?.[key] || defaultValue;
  };
  
  return { t, language };
};

// Direct translation function
export const translate = (key, language = 'id', defaultValue = key) => {
  return translations[language]?.[key] || translations['id']?.[key] || defaultValue;
};

export default translations;

