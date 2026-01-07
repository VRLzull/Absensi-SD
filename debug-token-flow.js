const axios = require('axios');

async function debugTokenFlow() {
  try {
    console.log('🔍 DEBUGGING TOKEN FLOW...\n');
    
    // Step 1: Login dan dapatkan token
    console.log('1️⃣ LOGIN PROCESS...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status: ${loginResponse.status}`);
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('   Token length:', token.length);
    console.log('   Token preview:', token.substring(0, 50) + '...');
    console.log('   User:', loginResponse.data.user.full_name);
    
    // Step 2: Test token verification
    console.log('\n2️⃣ TOKEN VERIFICATION...');
    const verifyResponse = await axios.get('http://localhost:5000/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Token verification successful');
    console.log('   Status:', verifyResponse.status);
    console.log('   User verified:', verifyResponse.data.user.full_name);
    
    // Step 3: Test employees API dengan token yang sama
    console.log('\n3️⃣ EMPLOYEES API TEST...');
    const employeesResponse = await axios.get('http://localhost:5000/api/employees', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Employees API successful');
    console.log('   Status:', employeesResponse.status);
    console.log('   Employees found:', employeesResponse.data.data.length);
    
    // Step 4: Test dengan header yang berbeda
    console.log('\n4️⃣ TESTING DIFFERENT HEADER FORMATS...');
    
    // Test 1: Standard headers
    console.log('   Testing standard headers...');
    const test1 = await axios.get('http://localhost:5000/api/employees', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('   ✅ Standard headers: OK');
    
    // Test 2: Lowercase headers
    console.log('   Testing lowercase headers...');
    const test2 = await axios.get('http://localhost:5000/api/employees', {
      headers: {
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json'
      }
    });
    console.log('   ✅ Lowercase headers: OK');
    
    // Test 3: Only Authorization header
    console.log('   Testing only Authorization header...');
    const test3 = await axios.get('http://localhost:5000/api/employees', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('   ✅ Only Authorization: OK');
    
    // Step 5: Test CORS preflight
    console.log('\n5️⃣ CORS PREFLIGHT TEST...');
    const preflightResponse = await axios.options('http://localhost:5000/api/employees', {
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type'
      }
    });
    
    console.log('✅ CORS preflight successful');
    console.log('   CORS headers:', {
      'access-control-allow-origin': preflightResponse.headers['access-control-allow-origin'],
      'access-control-allow-methods': preflightResponse.headers['access-control-allow-methods'],
      'access-control-allow-headers': preflightResponse.headers['access-control-allow-headers']
    });
    
    // Step 6: Simulate frontend request
    console.log('\n6️⃣ FRONTEND SIMULATION...');
    console.log('   Simulating exact frontend request...');
    
    const frontendSimulation = await axios.get('http://localhost:5000/api/employees', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173',
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ Frontend simulation successful');
    console.log('   Status:', frontendSimulation.status);
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\n💡 POSSIBLE FRONTEND ISSUES:');
    console.log('   1. Token not stored in localStorage');
    console.log('   2. Token expired before use');
    console.log('   3. React app not running');
    console.log('   4. Browser CORS issues');
    console.log('   5. Network connectivity problems');
    
  } catch (error) {
    console.error('\n❌ DEBUG FAILED:', error.message);
    
    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Data:', error.response.data);
      console.log('Response Headers:', error.response.headers);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server not running. Start with: node server.js');
    }
  }
}

debugTokenFlow();
