// 🔍 REACT APP DEBUG SCRIPT
// Copy dan paste script ini ke browser console React app

console.log('🔍 REACT APP DEBUG STARTED...');

// 1. Check localStorage
console.log('📦 Checking localStorage...');
const token = localStorage.getItem('token');
console.log('Token in localStorage:', token ? 'Found' : 'Not found');

if (token) {
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 50) + '...');
    
    // 2. Test API call dengan token dari localStorage
    console.log('👥 Testing API call with localStorage token...');
    
    fetch('http://localhost:5000/api/employees', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('📡 API Response Status:', response.status);
        console.log('📡 API Response Headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            return response.json();
        } else {
            throw new Error(`API failed with status: ${response.status}`);
        }
    })
    .then(data => {
        console.log('✅ API call successful!');
        console.log('Response data:', data);
        console.log('Employees found:', data.data.length);
    })
    .catch(error => {
        console.error('❌ API call failed:', error.message);
    });
    
} else {
    console.log('❌ No token found in localStorage');
    console.log('💡 Try logging in again');
}

// 3. Check AuthContext state (if available)
console.log('🔐 Checking AuthContext state...');
try {
    // Try to access AuthContext from React DevTools or global scope
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('React DevTools available');
    }
    
    // Check if we can find auth-related variables
    const authVars = {
        'localStorage.token': localStorage.getItem('token'),
        'sessionStorage.token': sessionStorage.getItem('token'),
        'window.authToken': window.authToken,
        'window.user': window.user,
        'window.isAuthenticated': window.isAuthenticated
    };
    
    console.log('Auth variables found:', authVars);
    
} catch (error) {
    console.log('AuthContext not accessible from console');
}

// 4. Check network requests
console.log('🌐 Checking network requests...');
console.log('Current page URL:', window.location.href);
console.log('User Agent:', navigator.userAgent);

// 5. Test login API directly
console.log('🔐 Testing login API directly...');
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
    console.log('📡 Login API Response Status:', response.status);
    return response.json();
})
.then(data => {
    if (data.token) {
        console.log('✅ Login API working, token received');
        console.log('New token:', data.token.substring(0, 50) + '...');
        
        // Store new token
        localStorage.setItem('token', data.token);
        console.log('💾 New token stored in localStorage');
        
        // Test employees API with new token
        console.log('👥 Testing employees API with new token...');
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
        console.log('📡 Employees API Response Status:', response.status);
        return response.json();
    }
})
.then(data => {
    if (data) {
        console.log('✅ Employees API working with new token!');
        console.log('Employees found:', data.data.length);
    }
})
.catch(error => {
    console.error('❌ Login test failed:', error.message);
});

console.log('🔍 DEBUG SCRIPT COMPLETED');
console.log('💡 Check console for results above');
