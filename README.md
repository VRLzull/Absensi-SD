# Sistem Absensi dengan Face Recognition

Sistem absensi modern yang menggunakan teknologi face recognition untuk mengelola kehadiran pegawai. Dibangun dengan Express.js untuk backend dan React dengan Vite untuk frontend admin.

## 🚀 Fitur Utama

### Backend (Express.js)
- **Authentication & Authorization** dengan JWT
- **Face Recognition API** untuk verifikasi wajah
- **Employee Management** - CRUD pegawai
- **Attendance Management** - Pencatatan check-in/check-out
- **Database Integration** dengan MySQL
- **File Upload** untuk gambar wajah dan absensi
- **RESTful API** yang terstruktur

### Frontend (React + Vite)
- **Admin Dashboard** dengan statistik real-time
- **Employee Management** - Tambah, edit, hapus pegawai
- **Attendance Monitoring** - Pantau kehadiran pegawai
- **Face Registration** - Pendaftaran wajah pegawai
- **Responsive Design** untuk desktop dan mobile
- **Modern UI/UX** dengan desain minimalis

### Face Recognition
- **Face Detection** dan ekstraksi fitur
- **Face Verification** untuk absensi
- **Multiple Face Support** per pegawai
- **Image Processing** dan optimasi

## 🛠️ Teknologi yang Digunakan

### Backend
- Node.js & Express.js
- MySQL Database
- JWT Authentication
- Multer (file upload)
- Face-api.js (face recognition)
- bcryptjs (password hashing)

### Frontend
- React 18
- Vite (build tool)
- React Router DOM
- Axios (HTTP client)
- Lucide React (icons)
- React Hook Form
- React Hot Toast

## 📋 Prerequisites

Sebelum menjalankan proyek, pastikan Anda memiliki:

- **Node.js** (versi 16 atau lebih baru)
- **MySQL** (versi 8.0 atau lebih baru)
- **Git** untuk clone repository

## 🚀 Instalasi

### 1. Clone Repository
```bash
git clone <repository-url>
cd absensi-face-recognition
```

### 2. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 3. Setup Database
```bash
# Buat database MySQL
mysql -u root -p
CREATE DATABASE ljn_db;
USE ljn_db;

# Import schema
mysql -u root -p ljn_db < database/schema.sql
```

### 4. Konfigurasi Environment
Buat file `.env` di root directory:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=admin_db
DB_PASSWORD=Password!@#
DB_NAME=ljn_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 5. Jalankan Aplikasi
```bash
# Development mode (backend + frontend)
npm run dev

# Atau jalankan terpisah:
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
cd client && npm run dev
```

## 🌐 Akses Aplikasi

- **Backend API**: http://localhost:5000
- **Frontend Admin**: http://localhost:3000
- **API Documentation**: http://localhost:5000/api/health

## 🔐 Default Credentials

```
Username: admin
Password: admin123
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/login` - Login admin
- `GET /api/auth/verify` - Verifikasi token
- `POST /api/auth/change-password` - Ubah password

### Employees
- `GET /api/employees` - Daftar semua pegawai
- `POST /api/employees` - Tambah pegawai baru
- `GET /api/employees/:id` - Detail pegawai
- `PUT /api/employees/:id` - Update pegawai
- `DELETE /api/employees/:id` - Hapus pegawai
- `POST /api/employees/:id/face` - Upload wajah pegawai

### Attendance
- `GET /api/attendance` - Daftar absensi
- `POST /api/attendance/check-in` - Check-in (Flutter)
- `POST /api/attendance/check-out` - Check-out (Flutter)
- `GET /api/attendance/stats/summary` - Statistik absensi

### Face Recognition
- `POST /api/face-recognition/verify` - Verifikasi wajah
- `GET /api/face-recognition/models` - Info model
- `POST /api/face-recognition/test` - Test recognition

## 📱 Integrasi Flutter

Aplikasi Flutter dapat menggunakan endpoint berikut untuk absensi:

### Check-in
```http
POST /api/attendance/check-in
Content-Type: multipart/form-data

employee_id: "EMP001"
face_descriptor: "face_features_json"
face_image: [file]
location: "Jakarta"
notes: "Check-in pagi"
```

### Check-out
```http
POST /api/attendance/check-out
Content-Type: multipart/form-data

employee_id: "EMP001"
face_descriptor: "face_features_json"
face_image: [file]
location: "Jakarta"
notes: "Check-out sore"
```

## 🗄️ Database Schema

### Tables
- `admin_users` - Data admin sistem
- `employees` - Data pegawai
- `employee_faces` - Data wajah pegawai
- `attendance` - Data absensi

### Relationships
- One-to-Many: Employee → Attendance
- One-to-Many: Employee → Employee Faces

## 🔧 Development

### Project Structure
```
absensi-face-recognition/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   └── main.jsx       # Entry point
│   ├── package.json
│   └── vite.config.js
├── config/                 # Configuration files
├── database/               # Database schema
├── middleware/             # Express middleware
├── routes/                 # API routes
├── uploads/                # Uploaded files
├── models/                 # Face recognition models
├── package.json
└── server.js              # Main server file
```

### Available Scripts
```bash
npm run dev          # Run backend + frontend
npm run server       # Run backend only
npm run client       # Run frontend only
npm run build        # Build frontend for production
npm run install-all  # Install all dependencies
```

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd client && npm run build

# Set environment
NODE_ENV=production

# Start server
npm start
```

### Environment Variables
- `NODE_ENV=production`
- `PORT=5000` (atau sesuai kebutuhan)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` (gunakan secret yang kuat)

## 🔒 Security Features

- **JWT Authentication** dengan expiry time
- **Password Hashing** menggunakan bcrypt
- **Rate Limiting** untuk mencegah abuse
- **CORS Protection** untuk keamanan cross-origin
- **Input Validation** dan sanitization
- **File Upload Security** dengan type checking

## 📊 Monitoring & Logging

- **Health Check** endpoint untuk monitoring
- **Error Handling** yang komprehensif
- **Request Logging** untuk debugging
- **Performance Metrics** untuk optimasi

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

Untuk pertanyaan atau dukungan, silakan buat issue di repository atau hubungi tim development.

## 🔮 Roadmap

- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Mobile app (Flutter)
- [ ] Multi-language support
- [ ] Advanced face recognition models
- [ ] Integration dengan sistem HR
- [ ] Export reports (PDF/Excel)
- [ ] Backup & restore functionality

---

**Dibuat dengan ❤️ untuk sistem absensi yang lebih modern dan efisien**
