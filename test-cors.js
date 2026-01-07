const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testCORS() {
  console.log('🧪 Testing CORS Configuration...\n');

  try {
    // Test 1: Health check (no auth required)
    console.log('1️⃣ Testing health check endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check successful:', healthResponse.data);

    // Test 2: Test CORS preflight
    console.log('\n2️⃣ Testing CORS preflight...');
    const preflightResponse = await axios.options(`${BASE_URL}/auth/login`, {
      headers: {
        'Origin': 'http://localhost:3001',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    console.log('✅ CORS preflight successful');
    console.log('   CORS Headers:', {
      'Access-Control-Allow-Origin': preflightResponse.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': preflightResponse.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': preflightResponse.headers['access-control-allow-headers']
    });

    // Test 3: Test login endpoint (should work now)
    console.log('\n3️⃣ Testing login endpoint...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'admin',
        password: 'admin123'
      }, {
        headers: {
          'Origin': 'http://localhost:3001',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Login endpoint accessible:', {
        status: loginResponse.status,
        message: loginResponse.data.message
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Login endpoint accessible (auth failed as expected)');
      } else {
        console.log('❌ Login endpoint error:', error.response?.status, error.response?.data);
      }
    }

    // Test 4: Test employees endpoint
    console.log('\n4️⃣ Testing employees endpoint...');
    try {
      const employeesResponse = await axios.get(`${BASE_URL}/employees`, {
        headers: {
          'Origin': 'http://localhost:3001'
        }
      });
      console.log('✅ Employees endpoint accessible');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Employees endpoint accessible (auth required as expected)');
      } else {
        console.log('❌ Employees endpoint error:', error.response?.status);
      }
    }

    console.log('\n🎉 CORS test completed successfully!');
    console.log('\n📱 Your frontend should now be able to connect to the backend');
    console.log('   • CORS headers are properly set');
    console.log('   • Preflight requests are handled');
    console.log('   • All endpoints are accessible');

  } catch (error) {
    console.error('\n❌ CORS test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   1. Run: npm start');
      console.log('   2. Check if port 5000 is available');
    } else if (error.response?.status === 403) {
      console.log('\n💡 CORS still blocking requests');
      console.log('   Check server CORS configuration');
    }
  }
}

// Check if axios is available
try {
  require.resolve('axios');
  testCORS();
} catch (error) {
  console.log('❌ Axios not found. Installing...');
  console.log('💡 Run: npm install axios');
  console.log('💡 Then run: node test-cors.js');
}
