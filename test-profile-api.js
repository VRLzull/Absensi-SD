const fetch = require('node-fetch');

async function testProfileAPI() {
  try {
    console.log('🧪 Testing Profile API...\n');
    
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
    console.log(`User: ${loginData.user.full_name}\n`);
    
    // Test 2: Update Profile
    console.log('2️⃣ Testing Profile Update...');
    const updateResponse = await fetch('http://localhost:5000/api/auth/update-profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        full_name: 'Admin Updated',
        email: 'admin.updated@company.com',
        phone: '+62 812-9999-8888',
        address: 'Jl. Baru No. 456, Jakarta',
        department: 'IT Department Updated',
        position: 'Senior System Administrator',
        bio: 'Updated bio with new information'
      })
    });
    
    const updateData = await updateResponse.json();
    
    if (!updateResponse.ok) {
      throw new Error(`Profile update failed: ${updateData.error}`);
    }
    
    console.log('✅ Profile update successful');
    console.log(`Updated name: ${updateData.user.full_name}`);
    console.log(`Updated phone: ${updateData.user.phone}`);
    console.log(`Updated department: ${updateData.user.department}\n`);
    
    // Test 3: Verify Profile
    console.log('3️⃣ Testing Profile Verification...');
    const verifyResponse = await fetch('http://localhost:5000/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    const verifyData = await verifyResponse.json();
    
    if (!verifyResponse.ok) {
      throw new Error(`Profile verification failed: ${verifyData.error}`);
    }
    
    console.log('✅ Profile verification successful');
    console.log(`Current name: ${verifyData.user.full_name}`);
    console.log(`Current phone: ${verifyData.user.phone}`);
    
    console.log('\n🎉 All Profile API tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProfileAPI();
