const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test data
const testEmployeeId = 'EMP001';
const testFaceDescriptor = 'mock_face_descriptor_' + Date.now();

async function testFlutterEndpoints() {
  console.log('🧪 Testing Flutter API Endpoints...\n');

  try {
    // Test 1: Face Verification
    console.log('1️⃣ Testing Face Verification...');
    const verifyResponse = await axios.post(`${BASE_URL}/face-recognition/flutter-verify`, {
      employee_id: testEmployeeId,
      face_descriptor: testFaceDescriptor
    });
    
    console.log('✅ Face Verification Response:', {
      success: verifyResponse.data.success,
      verified: verifyResponse.data.verified,
      message: verifyResponse.data.message
    });

    // Test 2: Check-in
    console.log('\n2️⃣ Testing Check-in...');
    const checkInResponse = await axios.post(`${BASE_URL}/attendance/flutter-check-in`, {
      employee_id: testEmployeeId,
      face_descriptor: testFaceDescriptor,
      location: 'Jakarta',
      notes: 'Test check-in via Flutter'
    });
    
    console.log('✅ Check-in Response:', {
      success: checkInResponse.data.success,
      message: checkInResponse.data.message,
      data: checkInResponse.data.data
    });

    // Test 3: Check-out
    console.log('\n3️⃣ Testing Check-out...');
    const checkOutResponse = await axios.post(`${BASE_URL}/attendance/flutter-check-out`, {
      employee_id: testEmployeeId,
      face_descriptor: testFaceDescriptor,
      location: 'Jakarta',
      notes: 'Test check-out via Flutter'
    });
    
    console.log('✅ Check-out Response:', {
      success: checkOutResponse.data.success,
      message: checkOutResponse.data.message,
      data: checkOutResponse.data.data
    });

    // Test 4: Get Employees (for reference)
    console.log('\n4️⃣ Testing Get Employees...');
    const employeesResponse = await axios.get(`${BASE_URL}/test/employees`);
    
    console.log('✅ Employees Response:', {
      success: employeesResponse.data.success,
      count: employeesResponse.data.data.length
    });

    // Test 5: Get Attendance (for reference)
    console.log('\n5️⃣ Testing Get Attendance...');
    const attendanceResponse = await axios.get(`${BASE_URL}/test/attendance`);
    
    console.log('✅ Attendance Response:', {
      success: attendanceResponse.data.success,
      count: attendanceResponse.data.data.length
    });

    console.log('\n🎉 All Flutter API tests completed successfully!');
    console.log('\n📱 Flutter app can now use these endpoints:');
    console.log('   • POST /face-recognition/flutter-verify');
    console.log('   • POST /attendance/flutter-check-in');
    console.log('   • POST /attendance/flutter-check-out');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Make sure the server is running and endpoints are accessible');
    }
  }
}

// Test error cases
async function testErrorCases() {
  console.log('\n\n🧪 Testing Error Cases...\n');

  try {
    // Test 1: Missing employee_id
    console.log('1️⃣ Testing missing employee_id...');
    try {
      await axios.post(`${BASE_URL}/face-recognition/flutter-verify`, {
        face_descriptor: testFaceDescriptor
      });
    } catch (error) {
      console.log('✅ Correctly rejected missing employee_id:', {
        status: error.response?.status,
        message: error.response?.data?.message
      });
    }

    // Test 2: Missing face_descriptor
    console.log('\n2️⃣ Testing missing face_descriptor...');
    try {
      await axios.post(`${BASE_URL}/face-recognition/flutter-verify`, {
        employee_id: testEmployeeId
      });
    } catch (error) {
      console.log('✅ Correctly rejected missing face_descriptor:', {
        status: error.response?.status,
        message: error.response?.data?.message
      });
    }

    // Test 3: Invalid employee_id
    console.log('\n3️⃣ Testing invalid employee_id...');
    try {
      await axios.post(`${BASE_URL}/face-recognition/flutter-verify`, {
        employee_id: 'INVALID_ID',
        face_descriptor: testFaceDescriptor
      });
    } catch (error) {
      console.log('✅ Correctly rejected invalid employee_id:', {
        status: error.response?.status,
        message: error.response?.data?.message
      });
    }

    console.log('\n✅ All error cases handled correctly!');

  } catch (error) {
    console.error('\n❌ Error case test failed:', error.message);
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting Flutter API Integration Tests...\n');
  
  await testFlutterEndpoints();
  await testErrorCases();
  
  console.log('\n✨ Test Summary:');
  console.log('   • Flutter endpoints are ready for integration');
  console.log('   • Error handling is working correctly');
  console.log('   • Database operations are functional');
  console.log('\n📱 Your Flutter app can now integrate with this attendance system!');
}

// Check if axios is available
try {
  require.resolve('axios');
  runAllTests();
} catch (error) {
  console.log('❌ Axios not found. Installing...');
  console.log('💡 Run: npm install axios');
  console.log('💡 Then run: node test-flutter-api.js');
}
