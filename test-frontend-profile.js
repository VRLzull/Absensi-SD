const fetch = require('node-fetch');

async function testFrontendProfile() {
  try {
    console.log('🧪 Testing Frontend Profile Data Loading...\n');
    
    // Test 1: Login to get token
    console.log('1️⃣ Testing Login...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginData.error}`);
    }
    
    console.log('✅ Login successful');
    console.log(`Token: ${loginData.token.substring(0, 20)}...`);
    console.log(`User data from login:`);
    console.log(`  - full_name: ${loginData.user.full_name}`);
    console.log(`  - email: ${loginData.user.email}`);
    console.log(`  - phone: ${loginData.user.phone}`);
    console.log(`  - department: ${loginData.user.department}`);
    console.log(`  - position: ${loginData.user.position}\n`);
    
    // Test 2: Verify token to get complete user data
    console.log('2️⃣ Testing Token Verification...');
    const verifyResponse = await fetch('http://localhost:5000/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    const verifyData = await verifyResponse.json();
    
    if (!verifyResponse.ok) {
      throw new Error(`Profile verification failed: ${verifyData.error}`);
    }
    
    console.log('✅ Token verification successful');
    console.log(`Complete user data from verify:`);
    console.log(`  - full_name: ${verifyData.user.full_name}`);
    console.log(`  - email: ${verifyData.user.email}`);
    console.log(`  - phone: ${verifyData.user.phone}`);
    console.log(`  - address: ${verifyData.user.address}`);
    console.log(`  - department: ${verifyData.user.department}`);
    console.log(`  - position: ${verifyData.user.position}`);
    console.log(`  - bio: ${verifyData.user.bio}\n`);
    
    // Test 3: Check if data matches what should be displayed
    console.log('3️⃣ Checking Data Consistency...');
    const expectedName = 'Admin Updated';
    const expectedPhone = '+62 812-9999-8888';
    const expectedDepartment = 'IT Department Updated';
    
    if (verifyData.user.full_name === expectedName) {
      console.log('✅ Full name matches expected: ' + expectedName);
    } else {
      console.log('❌ Full name mismatch. Expected: ' + expectedName + ', Got: ' + verifyData.user.full_name);
    }
    
    if (verifyData.user.phone === expectedPhone) {
      console.log('✅ Phone matches expected: ' + expectedPhone);
    } else {
      console.log('❌ Phone mismatch. Expected: ' + expectedPhone + ', Got: ' + verifyData.user.phone);
    }
    
    if (verifyData.user.department === expectedDepartment) {
      console.log('✅ Department matches expected: ' + expectedDepartment);
    } else {
      console.log('❌ Department mismatch. Expected: ' + expectedDepartment + ', Got: ' + verifyData.user.department);
    }
    
    console.log('\n🎉 Frontend Profile Data Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendProfile();
