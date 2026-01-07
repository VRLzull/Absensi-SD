const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Face Registration API...\n');

// Test data
const testData = {
  employee_id: 'EMP001', // Use existing employee ID from your database
  face_images: [
    // Create dummy image files for testing
    Buffer.from('fake-image-data-1'),
    Buffer.from('fake-image-data-2'),
    Buffer.from('fake-image-data-3')
  ]
};

console.log('📋 Test Data:');
console.log('- Employee ID:', testData.employee_id);
console.log('- Face Images Count:', testData.face_images.length);
console.log('');

// Test API endpoint
async function testFaceRegistrationAPI() {
  try {
    console.log('🚀 Testing POST /api/face-recognition/register...');
    
    // First, get a valid token by logging in
    console.log('🔑 Getting authentication token...');
    
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginResult = await loginResponse.json();
    const token = loginResult.data.token;
    
    console.log('✅ Login successful, token obtained');
    
    // Now test face registration
    console.log('📸 Testing face registration...');
    
    const formData = new FormData();
    formData.append('employee_id', testData.employee_id);
    
    testData.face_images.forEach((imageData, index) => {
      const blob = new Blob([imageData], { type: 'image/jpeg' });
      formData.append('face_images', blob, `face_${index + 1}.jpg`);
    });

    const faceRegResponse = await fetch('http://localhost:5000/api/face-recognition/register', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    console.log('📊 Response Status:', faceRegResponse.status);
    
    if (!faceRegResponse.ok) {
      const errorData = await faceRegResponse.json();
      console.log('❌ Error Response:', errorData);
      throw new Error(`Face registration failed: ${faceRegResponse.status}`);
    }

    const result = await faceRegResponse.json();
    console.log('✅ Face Registration Response:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Possible issues:');
      console.log('1. Backend server not running (port 5000)');
      console.log('2. CORS configuration problem');
      console.log('3. Network connectivity issue');
    }
  }
}

// Check if running in Node.js environment
if (typeof fetch === 'undefined') {
  console.log('⚠️  This script requires Node.js 18+ with fetch support');
  console.log('💡 Alternative: Use browser console or Postman to test');
} else {
  testFaceRegistrationAPI();
}

console.log('\n📝 Manual Testing Steps:');
console.log('1. Ensure backend server is running on port 5000');
console.log('2. Check if /api/face-recognition/register endpoint exists');
console.log('3. Verify employee_faces table structure in database');
console.log('4. Test with actual face images from the web app');
















