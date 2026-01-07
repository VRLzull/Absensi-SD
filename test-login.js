const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔐 Testing login API...');
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    console.log('Status:', response.status);
    console.log('Response:', response.data);

    if (response.status === 200) {
      console.log('✅ Login successful!');
      console.log('Token:', response.data.token);
      
      // Test employees API with token
      console.log('\n👥 Testing employees API...');
      const empResponse = await axios.get('http://localhost:5000/api/employees', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Employees Status:', empResponse.status);
      console.log('Employees Response:', empResponse.data);
    } else {
      console.log('❌ Login failed!');
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

testLogin();
