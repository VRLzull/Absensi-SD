// Debug script untuk frontend
// Copy dan paste ke browser console

console.log('🔍 Debug Frontend Token...');

// 1. Check localStorage
console.log('📦 localStorage token:', localStorage.getItem('token'));

// 2. Check if token exists
const token = localStorage.getItem('token');
if (token) {
  console.log('✅ Token found in localStorage');
  console.log('Token length:', token.length);
  console.log('Token preview:', token.substring(0, 50) + '...');
  
  // 3. Test API call manually
  fetch('http://localhost:5000/api/employees', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('📡 API Response Status:', response.status);
    console.log('📡 API Response Headers:', response.headers);
    return response.json();
  })
  .then(data => {
    console.log('📡 API Response Data:', data);
  })
  .catch(error => {
    console.error('❌ API Error:', error);
  });
  
} else {
  console.log('❌ No token found in localStorage');
  console.log('💡 Try logging in again');
}

// 4. Check AuthContext state
console.log('🔐 AuthContext state:', {
  user: window.authUser || 'Not available',
  token: window.authToken || 'Not available',
  isAuthenticated: window.isAuthenticated || 'Not available'
});

console.log('🔍 Debug completed. Check console for results.');
