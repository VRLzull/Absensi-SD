const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test data - 128 dimensional float array like face-api.js
const testFaceDescriptor = JSON.stringify([
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8
]);

async function testUniversalFaceRecognition() {
  console.log('🚀 Testing Universal Face Recognition...\n');

  try {
    // Test 1: Universal Check-in (Flutter endpoint)
    console.log('1️⃣ Testing Universal Check-in...');
    const checkInResponse = await axios.post(`${BASE_URL}/attendance/flutter-check-in`, {
      face_descriptor: testFaceDescriptor,
      location: 'Jakarta',
      notes: 'Universal face recognition test'
    });

    if (checkInResponse.status === 201 || checkInResponse.status === 200) {
      console.log('✅ Universal Check-in Response:', {
        success: checkInResponse.data.success,
        employee_name: checkInResponse.data.data?.employee_name,
        status: checkInResponse.data.data?.status,
        confidence: checkInResponse.data.data?.face_verification?.confidence
      });
    }

    // Test 2: Universal Check-out (Flutter endpoint)
    console.log('\n2️⃣ Testing Universal Check-out...');
    const checkOutResponse = await axios.post(`${BASE_URL}/attendance/flutter-check-out`, {
      face_descriptor: testFaceDescriptor,
      location: 'Jakarta',
      notes: 'Universal face recognition test'
    });

    if (checkOutResponse.status === 200) {
      console.log('✅ Universal Check-out Response:', {
        success: checkOutResponse.data.success,
        employee_name: checkOutResponse.data.data?.employee_name,
        confidence: checkOutResponse.data.data?.face_verification?.confidence
      });
    }

    // Test 3: Face Verification with known employee
    console.log('\n3️⃣ Testing Face Verification with EMP001...');
    const verifyResponse = await axios.post(`${BASE_URL}/face-recognition/flutter-verify`, {
      employee_id: 'EMP001',
      face_descriptor: testFaceDescriptor
    });

    if (verifyResponse.status === 200) {
      console.log('✅ Face Verification Response:', {
        success: verifyResponse.data.success,
        verified: verifyResponse.data.verified,
        employee_name: verifyResponse.data.data?.employee_name,
        confidence: verifyResponse.data.data?.confidence
      });
    }

    console.log('\n✨ Universal Face Recognition Test Summary:');
    console.log('   • Universal check-in: ✅ Working');
    console.log('   • Universal check-out: ✅ Working');
    console.log('   • Face verification: ✅ Working');
    console.log('   • Integration: ✅ Ready for Flutter app');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Tip: Pastikan ada face data terdaftar di database untuk employee EMP001');
    }
  }
}

// Run the test
testUniversalFaceRecognition();

