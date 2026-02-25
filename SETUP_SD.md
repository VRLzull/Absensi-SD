# Setup Sistem Absensi SD

Sistem ini sudah disesuaikan untuk **Sekolah Dasar (SD)** dengan struktur:
- **Kelas 1–6**, masing-masing **2 rombel** (A, B) = 12 kelas
- Kapasitas ~**370 siswa**
- **Face recognition** tidak diubah (alur dan kode tetap sama)

---

## Langkah Setup

### 1. Jalankan Migration Database

**Cara 1 (Node.js - disarankan):**
```bash
node run-migration-only.js
```

**Cara 2 (MySQL CLI):**
```bash
mysql -u root absen_sd < database/migration_sd_school.sql
```

**Setup lengkap dari awal:**
```bash
node run-setup.js
```

### 2. Konfigurasi `config.env`

Pastikan:
```
DB_NAME=absen_sd
```

### 3. Tambah Rombel (opsional)

Jika sekolah punya lebih dari 2 rombel per kelas, edit `client/src/pages/Students.jsx`:

```javascript
const classrooms = ['A', 'B', 'C', 'D']; // tambah C, D jika perlu
```

---

## Perubahan yang Dilakukan

| Area | Perubahan |
|------|-----------|
| **Database** | Kolom `grade` (1–6), `classroom` (A/B), `parent_phone`, `student_id` |
| **Employees** | `employee_id` = NIS untuk face recognition, `student_id` untuk tampilan |
| **Students.jsx** | Rombel A/B, perbaikan typo, cek `face_count` |
| **Layout** | Branding "Absensi SD" |
| **Settings** | Jam default: 07:00–12:00, late threshold 10 menit |
| **Face recognition** | Tidak diubah – masih sama persis |

---

## Face Recognition

**Tidak ada perubahan** pada:
- `services/faceRecognitionService.js`
- Alur verifikasi dan pendaftaran wajah
- Tabel `employee_faces` dan `attendance`

`employee_id` (NIS) tetap dipakai untuk lookup wajah dan absensi.
