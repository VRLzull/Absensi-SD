const fetch = require('node-fetch');

console.log('🧪 Testing Face Registration Endpoint...\n');

async function testRegisterEndpoint() {
  try {
    console.log('🔑 Step 1: Getting authentication token...');
    
    // Login to get token
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
    const token = loginResult.token; // Fixed: removed .data
    
    console.log('✅ Login successful, token obtained');
    console.log('🔑 Token:', token.substring(0, 20) + '...');
    
    console.log('\n📸 Step 2: Testing face registration endpoint...');
    
    // Test the endpoint exists
    const testResponse = await fetch('http://localhost:5000/api/face-recognition/register', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        employee_id: 'EMP001',
        face_images: []
      })
    });

    console.log('📊 Response Status:', testResponse.status);
    
    if (testResponse.status === 400) {
      console.log('✅ Endpoint exists! (400 is expected for missing images)');
      
      const errorData = await testResponse.json();
      console.log('📝 Error message:', errorData.message);
      
      if (errorData.message.includes('Minimal 3 foto wajah diperlukan')) {
        console.log('🎯 Endpoint validation working correctly!');
      }
    } else if (testResponse.status === 404) {
      console.log('❌ Endpoint not found - check server restart');
    } else {
      console.log('⚠️ Unexpected response status');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Possible issues:');
      console.log('1. Backend server not running (port 5000)');
      console.log('2. Server needs restart after adding new endpoint');
      console.log('3. Network connectivity issue');
    }
  }
}

// Check if fetch is available
if (typeof fetch === 'undefined') {
  console.log('⚠️  This script requires node-fetch');
  console.log('💡 Install with: npm install node-fetch');
} else {
  testRegisterEndpoint();
}

console.log('\n📝 Next Steps:');
console.log('1. Restart backend server to load new endpoint');
console.log('2. Test with actual face images from web app');
console.log('3. Check database for inserted records');
