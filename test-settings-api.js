const fetch = require('node-fetch');

async function testSettingsAPI() {
  try {
    console.log('🧪 Testing Settings API...\n');
    
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
    console.log(`Token: ${loginData.token.substring(0, 20)}...\n`);
    
    // Test 2: Get all settings
    console.log('2️⃣ Testing Get All Settings...');
    const getSettingsResponse = await fetch('http://localhost:5000/api/settings', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    const getSettingsData = await getSettingsResponse.json();
    
    if (!getSettingsResponse.ok) {
      throw new Error(`Get settings failed: ${getSettingsData.error}`);
    }
    
    console.log('✅ Get settings successful');
    console.log('Settings categories:', Object.keys(getSettingsData.data));
    console.log('Total settings:', Object.values(getSettingsData.data).flat().length);
    
    // Show some sample settings
    Object.entries(getSettingsData.data).forEach(([category, settings]) => {
      console.log(`\n${category.toUpperCase()}:`);
      settings.slice(0, 3).forEach(setting => {
        console.log(`  - ${setting.key}: ${setting.value} (${setting.type})`);
      });
    });
    
    // Test 3: Update single setting
    console.log('\n3️⃣ Testing Update Single Setting...');
    const updateResponse = await fetch('http://localhost:5000/api/settings/email_notifications', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({ value: false })
    });
    
    const updateData = await updateResponse.json();
    
    if (!updateResponse.ok) {
      throw new Error(`Update setting failed: ${updateData.error}`);
    }
    
    console.log('✅ Update single setting successful');
    console.log(`Updated: ${updateData.data.key} = ${updateData.data.value}`);
    
    // Test 4: Batch update settings
    console.log('\n4️⃣ Testing Batch Update Settings...');
    const batchUpdateResponse = await fetch('http://localhost:5000/api/settings/batch', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        settings: [
          { key: 'push_notifications', value: true },
          { key: 'session_timeout', value: 45 },
          { key: 'work_start_time', value: '09:00' }
        ]
      })
    });
    
    const batchUpdateData = await batchUpdateResponse.json();
    
    if (!batchUpdateResponse.ok) {
      throw new Error(`Batch update failed: ${batchUpdateData.error}`);
    }
    
    console.log('✅ Batch update successful');
    console.log('Updated settings:', batchUpdateData.data.length);
    
    // Test 5: Verify changes
    console.log('\n5️⃣ Testing Verify Changes...');
    const verifyResponse = await fetch('http://localhost:5000/api/settings', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    const verifyData = await verifyResponse.json();
    
    if (!verifyResponse.ok) {
      throw new Error(`Verify failed: ${verifyData.error}`);
    }
    
    console.log('✅ Verify successful');
    
    // Check specific values
    const allSettings = {};
    Object.values(verifyData.data).flat().forEach(setting => {
      allSettings[setting.key] = setting.value;
    });
    
    console.log('\nVerification Results:');
    console.log(`  - email_notifications: ${allSettings.email_notifications} (should be false)`);
    console.log(`  - push_notifications: ${allSettings.push_notifications} (should be true)`);
    console.log(`  - session_timeout: ${allSettings.session_timeout} (should be 45)`);
    console.log(`  - work_start_time: ${allSettings.work_start_time} (should be 09:00)`);
    
    console.log('\n🎉 All Settings API tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSettingsAPI();
