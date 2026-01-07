// 🔍 REACT APP COMPLETE DEBUG SCRIPT
// Copy paste script ini ke browser console React app

console.log('🔍 REACT APP COMPLETE DEBUG STARTED...');
console.log('=====================================');

// 1. Check current page and environment
console.log('📱 PAGE INFO:');
console.log('   URL:', window.location.href);
console.log('   User Agent:', navigator.userAgent);
console.log('   Timestamp:', new Date().toISOString());

// 2. Check localStorage and sessionStorage
console.log('\n💾 STORAGE CHECK:');
const token = localStorage.getItem('token');
const sessionToken = sessionStorage.getItem('token');
console.log('   localStorage.token:', token ? 'Found' : 'Not found');
console.log('   sessionStorage.token:', sessionToken ? 'Found' : 'Not found');

if (token) {
    console.log('   Token length:', token.length);
    console.log('   Token preview:', token.substring(0, 50) + '...');
    
    // Check if token is valid JWT format
    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            console.log('   ✅ Token format: Valid JWT (3 parts)');
            const payload = JSON.parse(atob(parts[1]));
            console.log('   Token payload:', payload);
            console.log('   Token expires:', new Date(payload.exp * 1000).toLocaleString());
            console.log('   Token expired:', Date.now() > payload.exp * 1000 ? 'Yes' : 'No');
        } else {
            console.log('   ❌ Token format: Invalid JWT');
        }
    } catch (e) {
        console.log('   ❌ Token format: Error parsing JWT');
    }
} else {
    console.log('   ❌ No token found in storage');
}

// 3. Check global variables and React state
console.log('\n🔐 AUTH STATE CHECK:');
try {
    // Try to find auth-related variables
    const authVars = {
        'window.authToken': window.authToken,
        'window.user': window.user,
        'window.isAuthenticated': window.isAuthenticated,
        'window.token': window.token
    };
    
    console.log('   Global auth variables:', authVars);
    
    // Check if React DevTools are available
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('   ✅ React DevTools available');
    } else {
        console.log('   ❌ React DevTools not available');
    }
    
} catch (error) {
    console.log('   Auth state check error:', error.message);
}

// 4. Test backend connectivity
console.log('\n🌐 BACKEND CONNECTIVITY TEST:');
console.log('   Testing connection to backend...');

fetch('http://localhost:5000/api/health')
.then(response => {
    console.log('   ✅ Backend health check:', response.status);
    return response.json();
})
.then(data => {
    console.log('   Backend response:', data);
})
.catch(error => {
    console.log('   ❌ Backend connection failed:', error.message);
});

// 5. Test login API directly
console.log('\n🔐 LOGIN API TEST:');
console.log('   Testing login API...');

fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
    })
})
.then(response => {
    console.log('   Login response status:', response.status);
    console.log('   Login response headers:', Object.fromEntries(response.headers.entries()));
    return response.json();
})
.then(data => {
    if (data.token) {
        console.log('   ✅ Login API working, token received');
        console.log('   New token length:', data.token.length);
        console.log('   User:', data.user.full_name);
        
        // Store new token for testing
        localStorage.setItem('debug_token', data.token);
        console.log('   💾 New token stored as debug_token');
        
        // Test employees API with new token
        console.log('\n👥 EMPLOYEES API TEST WITH NEW TOKEN:');
        return fetch('http://localhost:5000/api/employees', {
            headers: {
                'Authorization': `Bearer ${data.token}`,
                'Content-Type': 'application/json'
            }
        });
    } else {
        throw new Error('No token in login response');
    }
})
.then(response => {
    if (response) {
        console.log('   Employees API response status:', response.status);
        console.log('   Employees API response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            return response.json();
        } else {
            throw new Error(`Employees API failed: ${response.status}`);
        }
    }
})
.then(data => {
    if (data) {
        console.log('   ✅ Employees API working with new token!');
        console.log('   Employees found:', data.data.length);
        console.log('   First employee:', data.data[0]?.full_name || 'None');
    }
})
.catch(error => {
    console.log('   ❌ Login/API test failed:', error.message);
});

// 6. Test with existing token (if any)
if (token) {
    console.log('\n👥 EMPLOYEES API TEST WITH EXISTING TOKEN:');
    console.log('   Testing with token from localStorage...');
    
    fetch('http://localhost:5000/api/employees', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('   API response status:', response.status);
        console.log('   API response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            return response.json();
        } else {
            throw new Error(`API failed: ${response.status}`);
        }
    })
    .then(data => {
        console.log('   ✅ API call successful with existing token!');
        console.log('   Employees found:', data.data.length);
    })
    .catch(error => {
        console.log('   ❌ API call failed with existing token:', error.message);
    });
}

// 7. Check network requests in console
console.log('\n📡 NETWORK DEBUGGING:');
console.log('   Check Network tab in DevTools for:');
console.log('   - Request headers (especially Authorization)');
console.log('   - Response status codes');
console.log('   - CORS errors');
console.log('   - Request/response timing');

// 8. Manual token test
console.log('\n🔧 MANUAL TOKEN TEST:');
console.log('   To test manually, run this in console:');
console.log('   localStorage.getItem("token")');
console.log('   fetch("http://localhost:5000/api/employees", {');
console.log('     headers: { "Authorization": "Bearer " + localStorage.getItem("token") }');
console.log('   })');

console.log('\n=====================================');
console.log('🔍 DEBUG SCRIPT COMPLETED');
console.log('💡 Check results above and Network tab');
console.log('💡 If 401 persists, check token storage and format');
