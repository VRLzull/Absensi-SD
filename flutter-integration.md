# FLUTTER INTEGRATION GUIDE

## Overview
Sistem absensi ini sudah siap untuk integrasi dengan aplikasi Flutter. Flutter app akan mengirim data wajah yang di-scan untuk verifikasi dan melakukan check-in/check-out.

## API Endpoints untuk Flutter

### Base URL
```
http://localhost:5000/api
```

### 1. Verifikasi Wajah
**Endpoint:** `POST /face-recognition/flutter-verify`

**Request Body:**
```json
{
  "employee_id": "EMP001",
  "face_descriptor": "base64_encoded_face_data",
  "face_image": "file" // optional, untuk backup
}
```

**Response Success:**
```json
{
  "success": true,
  "verified": true,
  "message": "Verifikasi wajah berhasil",
  "data": {
    "employee_id": 1,
    "employee_name": "John Doe",
    "confidence": 0.95
  }
}
```

**Response Failed:**
```json
{
  "success": true,
  "verified": false,
  "message": "Verifikasi wajah gagal"
}
```

### 2. Check-In
**Endpoint:** `POST /attendance/flutter-check-in`

**Request Body:**
```json
{
  "employee_id": "EMP001",
  "face_descriptor": "base64_encoded_face_data",
  "location": "Jakarta", // optional
  "notes": "Check-in via Flutter" // optional
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Check-in berhasil",
  "data": {
    "id": 123,
    "employee_name": "John Doe",
    "check_in": "2024-01-15T08:00:00.000Z",
    "status": "present"
  }
}
```

### 3. Check-Out
**Endpoint:** `POST /attendance/flutter-check-out`

**Request Body:**
```json
{
  "employee_id": "EMP001",
  "face_descriptor": "base64_encoded_face_data",
  "location": "Jakarta", // optional
  "notes": "Check-out via Flutter" // optional
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Check-out berhasil",
  "data": {
    "employee_name": "John Doe",
    "check_in": "2024-01-15T08:00:00.000Z",
    "check_out": "2024-01-15T17:00:00.000Z"
  }
}
```

## Flow Integrasi Flutter

### 1. Check-In Flow
```
Flutter App → Scan Wajah → Kirim ke /flutter-verify → 
Jika verified=true → Kirim ke /flutter-check-in → 
Response success/failed
```

### 2. Check-Out Flow
```
Flutter App → Scan Wajah → Kirim ke /flutter-verify → 
Jika verified=true → Kirim ke /flutter-check-out → 
Response success/failed
```

## Implementasi di Flutter

### Contoh HTTP Request (Dart)
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class AttendanceService {
  static const String baseUrl = 'http://localhost:5000/api';
  
  // Verifikasi wajah
  static Future<bool> verifyFace(String employeeId, String faceDescriptor) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/face-recognition/flutter-verify'),
        body: {
          'employee_id': employeeId,
          'face_descriptor': faceDescriptor,
        },
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['verified'] == true;
      }
      return false;
    } catch (e) {
      print('Error verifying face: $e');
      return false;
    }
  }
  
  // Check-in
  static Future<bool> checkIn(String employeeId, String faceDescriptor) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/attendance/flutter-check-in'),
        body: {
          'employee_id': employeeId,
          'face_descriptor': faceDescriptor,
          'location': 'Jakarta',
        },
      );
      
      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        return data['success'] == true;
      }
      return false;
    } catch (e) {
      print('Error checking in: $e');
      return false;
    }
  }
  
  // Check-out
  static Future<bool> checkOut(String employeeId, String faceDescriptor) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/attendance/flutter-check-out'),
        body: {
          'employee_id': employeeId,
          'face_descriptor': faceDescriptor,
          'location': 'Jakarta',
        },
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['success'] == true;
      }
      return false;
    } catch (e) {
      print('Error checking out: $e');
      return false;
    }
  }
}
```

## Status Codes

- `200` - Success
- `201` - Created (Check-in berhasil)
- `400` - Bad Request (Data tidak lengkap)
- `404` - Not Found (Pegawai tidak ditemukan)
- `500` - Internal Server Error

## Catatan Penting

1. **Face Descriptor:** Format yang dikirim harus sesuai dengan yang tersimpan di database
2. **Employee ID:** Gunakan employee_id (bukan id internal database)
3. **Authentication:** Endpoint Flutter tidak memerlukan token auth
4. **Error Handling:** Selalu handle response success/failed di Flutter
5. **Face Recognition:** Saat ini masih placeholder, perlu implementasi real algorithm

## Testing

Gunakan endpoint test untuk debugging:
- `GET /api/test/employees` - Lihat data pegawai
- `GET /api/test/attendance` - Lihat data absensi
- `POST /api/test/check-in` - Test check-in
- `POST /api/test/check-out` - Test check-out

## Next Steps

1. Implementasi real face recognition algorithm
2. Tambahkan rate limiting untuk endpoint Flutter
3. Implementasi logging untuk audit trail
4. Tambahkan validasi tambahan (GPS, device ID, dll)
