# Flutter + FaceNet TFLite Integration Guide

Panduan lengkap untuk mengintegrasikan Flutter dengan FaceNet TFLite untuk face recognition pada aplikasi absensi.

## Arsitektur Sistem

```
Flutter App (Kamera + FaceNet TFLite)
    ↓ kirim JSON embedding (array angka)
Express.js (API utama)
    ↓ panggil Python service
Python (face_recognition / OpenCV)
    ↓ bandingkan embedding dgn data wajah di DB
Express.js → kirim hasil ke Flutter
```

## 1. Setup Flutter Dependencies

Tambahkan dependencies berikut ke `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  camera: ^0.10.5+5
  tflite_flutter: ^0.10.4
  tflite_flutter_helper: ^0.3.1
  http: ^1.1.0
  image: ^4.1.3
  path_provider: ^2.1.1
  permission_handler: ^11.0.1
```

## 2. Model FaceNet TFLite

Download model FaceNet TFLite dan letakkan di folder `assets/models/`:

- `facenet.tflite` - Model FaceNet untuk ekstraksi embedding
- `labels.txt` - File labels (opsional)

## 3. Implementasi Face Recognition Service

Buat file `lib/services/face_recognition_service.dart`:

```dart
import 'dart:io';
import 'dart:typed_data';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:tflite_flutter/tflite_flutter.dart';
import 'package:image/image.dart' as img;
import 'package:http/http.dart' as http;

class FaceRecognitionService {
  Interpreter? _interpreter;
  static const String _modelPath = 'assets/models/facenet.tflite';
  static const String _apiBaseUrl = 'http://your-server:3000/api/face-recognition';
  
  // Input image size untuk FaceNet (biasanya 160x160)
  static const int _inputSize = 160;
  
  Future<void> initialize() async {
    try {
      // Load TFLite model
      _interpreter = await Interpreter.fromAsset(_modelPath);
      print('✅ FaceNet model loaded successfully');
    } catch (e) {
      print('❌ Error loading FaceNet model: $e');
      throw Exception('Failed to load FaceNet model');
    }
  }
  
  /// Ekstrak face embedding dari image
  Future<List<double>> extractFaceEmbedding(String imagePath) async {
    if (_interpreter == null) {
      await initialize();
    }
    
    try {
      // Load dan preprocess image
      final image = img.decodeImage(File(imagePath).readAsBytesSync());
      if (image == null) {
        throw Exception('Failed to load image');
      }
      
      // Resize image ke 160x160 (FaceNet input size)
      final resizedImage = img.copyResize(image, width: _inputSize, height: _inputSize);
      
      // Convert ke RGB dan normalize ke [-1, 1]
      final input = _preprocessImage(resizedImage);
      
      // Prepare output tensor
      final output = List.filled(1 * 512, 0.0).reshape([1, 512]);
      
      // Run inference
      _interpreter!.run(input, output);
      
      // Normalize embedding
      final embedding = _normalizeEmbedding(output[0]);
      
      return embedding;
    } catch (e) {
      print('❌ Error extracting face embedding: $e');
      throw Exception('Failed to extract face embedding');
    }
  }
  
  /// Preprocess image untuk FaceNet
  List<List<List<double>>> _preprocessImage(img.Image image) {
    final input = List.generate(
      _inputSize,
      (i) => List.generate(
        _inputSize,
        (j) => List.generate(3, (k) => 0.0),
      ),
    );
    
    for (int i = 0; i < _inputSize; i++) {
      for (int j = 0; j < _inputSize; j++) {
        final pixel = image.getPixel(j, i);
        // Normalize ke [-1, 1] range
        input[i][j][0] = (img.getRed(pixel) / 127.5) - 1.0;   // R
        input[i][j][1] = (img.getGreen(pixel) / 127.5) - 1.0; // G
        input[i][j][2] = (img.getBlue(pixel) / 127.5) - 1.0;  // B
      }
    }
    
    return [input];
  }
  
  /// Normalize embedding vector
  List<double> _normalizeEmbedding(List<double> embedding) {
    // L2 normalization
    double norm = 0.0;
    for (double value in embedding) {
      norm += value * value;
    }
    norm = math.sqrt(norm);
    
    return embedding.map((value) => value / norm).toList();
  }
  
  /// Verifikasi wajah dengan server
  Future<Map<String, dynamic>> verifyFace(String employeeId, List<double> embedding) async {
    try {
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/flutter-verify-embedding'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'employee_id': employeeId,
          'face_embedding': embedding,
        }),
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Server error: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Error verifying face: $e');
      throw Exception('Failed to verify face');
    }
  }
  
  /// Cari karyawan berdasarkan wajah
  Future<Map<String, dynamic>> findEmployeeByFace(List<double> embedding) async {
    try {
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/flutter-find-employee-embedding'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'face_embedding': embedding,
        }),
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Server error: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Error finding employee: $e');
      throw Exception('Failed to find employee');
    }
  }
  
  /// Daftarkan wajah karyawan
  Future<Map<String, dynamic>> registerFace(String employeeId, List<double> embedding) async {
    try {
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/flutter-register-embedding'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'employee_id': employeeId,
          'face_embedding': embedding,
        }),
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Server error: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Error registering face: $e');
      throw Exception('Failed to register face');
    }
  }
  
  void dispose() {
    _interpreter?.close();
  }
}
```

## 4. Camera Service

Buat file `lib/services/camera_service.dart`:

```dart
import 'dart:io';
import 'package:camera/camera.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';

class CameraService {
  CameraController? _controller;
  List<CameraDescription>? _cameras;
  
  Future<void> initialize() async {
    // Request camera permission
    final status = await Permission.camera.request();
    if (status != PermissionStatus.granted) {
      throw Exception('Camera permission denied');
    }
    
    // Get available cameras
    _cameras = await availableCameras();
    if (_cameras == null || _cameras!.isEmpty) {
      throw Exception('No cameras available');
    }
    
    // Initialize camera controller
    _controller = CameraController(
      _cameras![0], // Use front camera
      ResolutionPreset.medium,
      enableAudio: false,
    );
    
    await _controller!.initialize();
  }
  
  Future<String> captureImage() async {
    if (_controller == null || !_controller!.value.isInitialized) {
      throw Exception('Camera not initialized');
    }
    
    try {
      final image = await _controller!.takePicture();
      return image.path;
    } catch (e) {
      throw Exception('Failed to capture image: $e');
    }
  }
  
  CameraController? get controller => _controller;
  
  void dispose() {
    _controller?.dispose();
  }
}
```

## 5. Face Recognition Widget

Buat file `lib/widgets/face_recognition_widget.dart`:

```dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../services/camera_service.dart';
import '../services/face_recognition_service.dart';

class FaceRecognitionWidget extends StatefulWidget {
  final String? employeeId; // null untuk find employee, ada value untuk verify
  final Function(Map<String, dynamic>)? onResult;
  
  const FaceRecognitionWidget({
    Key? key,
    this.employeeId,
    this.onResult,
  }) : super(key: key);
  
  @override
  _FaceRecognitionWidgetState createState() => _FaceRecognitionWidgetState();
}

class _FaceRecognitionWidgetState extends State<FaceRecognitionWidget> {
  final CameraService _cameraService = CameraService();
  final FaceRecognitionService _faceService = FaceRecognitionService();
  
  bool _isLoading = false;
  String _statusMessage = 'Siap untuk face recognition';
  
  @override
  void initState() {
    super.initState();
    _initializeServices();
  }
  
  Future<void> _initializeServices() async {
    try {
      setState(() {
        _isLoading = true;
        _statusMessage = 'Menginisialisasi kamera...';
      });
      
      await _cameraService.initialize();
      
      setState(() {
        _statusMessage = 'Menginisialisasi FaceNet...';
      });
      
      await _faceService.initialize();
      
      setState(() {
        _isLoading = false;
        _statusMessage = 'Siap untuk face recognition';
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _statusMessage = 'Error: $e';
      });
    }
  }
  
  Future<void> _processFaceRecognition() async {
    if (_isLoading) return;
    
    try {
      setState(() {
        _isLoading = true;
        _statusMessage = 'Mengambil foto...';
      });
      
      // Capture image
      final imagePath = await _cameraService.captureImage();
      
      setState(() {
        _statusMessage = 'Memproses wajah...';
      });
      
      // Extract embedding
      final embedding = await _faceService.extractFaceEmbedding(imagePath);
      
      setState(() {
        _statusMessage = 'Mengirim ke server...';
      });
      
      // Process with server
      Map<String, dynamic> result;
      if (widget.employeeId != null) {
        // Verify specific employee
        result = await _faceService.verifyFace(widget.employeeId!, embedding);
      } else {
        // Find employee
        result = await _faceService.findEmployeeByFace(embedding);
      }
      
      setState(() {
        _isLoading = false;
        _statusMessage = result['success'] ? 'Berhasil!' : 'Gagal';
      });
      
      // Call callback
      if (widget.onResult != null) {
        widget.onResult!(result);
      }
      
      // Clean up captured image
      File(imagePath).delete();
      
    } catch (e) {
      setState(() {
        _isLoading = false;
        _statusMessage = 'Error: $e';
      });
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.employeeId != null ? 'Verifikasi Wajah' : 'Cari Karyawan'),
      ),
      body: Column(
        children: [
          // Camera preview
          Expanded(
            flex: 3,
            child: _cameraService.controller != null
                ? CameraPreview(_cameraService.controller!)
                : const Center(child: CircularProgressIndicator()),
          ),
          
          // Status message
          Container(
            padding: const EdgeInsets.all(16),
            child: Text(
              _statusMessage,
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
          ),
          
          // Capture button
          Expanded(
            flex: 1,
            child: Center(
              child: FloatingActionButton(
                onPressed: _isLoading ? null : _processFaceRecognition,
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Icon(Icons.camera_alt),
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  @override
  void dispose() {
    _cameraService.dispose();
    _faceService.dispose();
    super.dispose();
  }
}
```

## 6. Penggunaan dalam Aplikasi

### Verifikasi Wajah Karyawan:

```dart
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => FaceRecognitionWidget(
      employeeId: 'EMP001', // ID karyawan yang akan diverifikasi
      onResult: (result) {
        if (result['success'] && result['verified']) {
          // Wajah terverifikasi
          print('Karyawan: ${result['data']['employee_name']}');
          print('Confidence: ${result['data']['confidence']}');
        } else {
          // Wajah tidak terverifikasi
          print('Verifikasi gagal');
        }
      },
    ),
  ),
);
```

### Cari Karyawan berdasarkan Wajah:

```dart
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => FaceRecognitionWidget(
      onResult: (result) {
        if (result['success']) {
          // Karyawan ditemukan
          print('Karyawan: ${result['data']['employee_name']}');
          print('Position: ${result['data']['position']}');
          print('Department: ${result['data']['department']}');
        } else {
          // Karyawan tidak ditemukan
          print('Karyawan tidak dikenali');
        }
      },
    ),
  ),
);
```

### Daftarkan Wajah Karyawan:

```dart
// Capture image dan extract embedding
final imagePath = await _cameraService.captureImage();
final embedding = await _faceService.extractFaceEmbedding(imagePath);

// Register ke server
final result = await _faceService.registerFace('EMP001', embedding);
if (result['success']) {
  print('Wajah berhasil didaftarkan');
} else {
  print('Gagal mendaftarkan wajah');
}
```

## 7. API Endpoints

Server menyediakan endpoint berikut:

### POST `/api/face-recognition/flutter-verify-embedding`
Verifikasi wajah karyawan dengan embedding.

**Request:**
```json
{
  "employee_id": "EMP001",
  "face_embedding": [0.1, 0.2, 0.3, ...]
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "message": "Verifikasi wajah berhasil",
  "data": {
    "employee_id": 1,
    "employee_name": "John Doe",
    "position": "Developer",
    "department": "IT",
    "confidence": 0.85,
    "verified": true
  }
}
```

### POST `/api/face-recognition/flutter-find-employee-embedding`
Cari karyawan berdasarkan embedding wajah.

**Request:**
```json
{
  "face_embedding": [0.1, 0.2, 0.3, ...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Karyawan ditemukan",
  "data": {
    "employee_id": 1,
    "employee_code": "EMP001",
    "employee_name": "John Doe",
    "position": "Developer",
    "department": "IT",
    "similarity": 0.85,
    "verified": true
  }
}
```

### POST `/api/face-recognition/flutter-register-embedding`
Daftarkan wajah karyawan dengan embedding.

**Request:**
```json
{
  "employee_id": "EMP001",
  "face_embedding": [0.1, 0.2, 0.3, ...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data wajah berhasil disimpan",
  "data": {
    "employee_id": 1,
    "employee_code": "EMP001",
    "employee_name": "John Doe",
    "embedding_length": 512
  }
}
```

## 8. Konfigurasi Server

Pastikan server Express.js sudah dikonfigurasi dengan benar:

1. **Python Dependencies:**
```bash
pip install numpy scikit-learn
```

2. **Node.js Dependencies:**
```bash
npm install express multer mysql2
```

3. **Database Schema:**
Pastikan tabel `employee_faces` sudah ada dengan kolom `face_descriptor` yang dapat menyimpan JSON array.

## 9. Testing

### Test Python Service:
```bash
cd python
python compare_embeddings.py
```

### Test API Endpoints:
```bash
# Test verify embedding
curl -X POST http://localhost:3000/api/face-recognition/flutter-verify-embedding \
  -H "Content-Type: application/json" \
  -d '{"employee_id": "EMP001", "face_embedding": [0.1, 0.2, 0.3]}'

# Test find employee
curl -X POST http://localhost:3000/api/face-recognition/flutter-find-employee-embedding \
  -H "Content-Type: application/json" \
  -d '{"face_embedding": [0.1, 0.2, 0.3]}'
```

## 10. Troubleshooting

### Common Issues:

1. **Model tidak load:**
   - Pastikan file `facenet.tflite` ada di `assets/models/`
   - Check pubspec.yaml sudah include assets

2. **Camera permission:**
   - Tambahkan permission di `android/app/src/main/AndroidManifest.xml`
   - Request permission di runtime

3. **Server connection:**
   - Pastikan server Express.js berjalan
   - Check URL API di Flutter app
   - Enable CORS di server

4. **Python service error:**
   - Install dependencies: `pip install numpy scikit-learn`
   - Check Python path di server

### Performance Tips:

1. **Optimize model:**
   - Gunakan model yang sudah dioptimasi untuk mobile
   - Consider quantization untuk mengurangi ukuran

2. **Image preprocessing:**
   - Resize image sebelum inference
   - Normalize pixel values dengan benar

3. **Caching:**
   - Cache model interpreter
   - Reuse camera controller

## 11. Security Considerations

1. **HTTPS:**
   - Gunakan HTTPS untuk komunikasi dengan server
   - Implement certificate pinning

2. **Data Privacy:**
   - Jangan simpan gambar di device
   - Hanya kirim embedding ke server

3. **Authentication:**
   - Implement proper authentication
   - Validate user permissions

4. **Rate Limiting:**
   - Implement rate limiting di server
   - Prevent abuse

Dengan implementasi ini, Anda akan memiliki sistem face recognition yang lengkap menggunakan Flutter + FaceNet TFLite yang terintegrasi dengan server Express.js dan Python service.
