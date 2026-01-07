const axios = require('axios');

async function testFrontendScenario() {
  try {
    console.log('🧪 Testing Frontend Scenario...\n');
    
    // Step 1: Login
    console.log('1️⃣ Login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Step 2: Test token verification (like frontend does)
    console.log('\n2️⃣ Testing token verification...');
    const verifyResponse = await axios.get('http://localhost:5000/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Token verification successful');
    console.log('   User:', verifyResponse.data.user.full_name);
    
    // Step 3: Test employees API (the problematic one)
    console.log('\n3️⃣ Testing employees API...');
    const employeesResponse = await axios.get('http://localhost:5000/api/employees', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Employees API successful');
    console.log('   Status:', employeesResponse.status);
    console.log('   Employees found:', employeesResponse.data.data.length);
    console.log('   First employee:', employeesResponse.data.data[0]?.full_name);
    
    // Step 4: Test with different header format
    console.log('\n4️⃣ Testing with different header format...');
    const employeesResponse2 = await axios.get('http://localhost:5000/api/employees', {
      headers: {
        'authorization': `Bearer ${token}`, // lowercase
        'content-type': 'application/json'  // lowercase
      }
    });
    
    console.log('✅ Employees API with lowercase headers successful');
    
    // Step 5: Test CORS preflight
    console.log('\n5️⃣ Testing CORS preflight...');
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
    
    console.log('\n🎉 All tests passed! Frontend should work.');
    console.log('\n💡 If frontend still has 401 error, check:');
    console.log('   1. Token storage in localStorage');
    console.log('   2. Token expiration');
    console.log('   3. Browser console for CORS errors');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
      console.log('Data:', error.response.data);
    }
  }
}

testFrontendScenario();
