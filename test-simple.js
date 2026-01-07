console.log('🧪 Simple Endpoint Test...\n');

console.log('📋 Testing Steps:');
console.log('1. Make sure backend server is running on port 5000');
console.log('2. Server should have the new /register endpoint');
console.log('3. Test with web app or Postman');
console.log('');

console.log('🔗 Test URLs:');
console.log('- Login: POST http://localhost:5000/api/auth/login');
console.log('- Face Register: POST http://localhost:5000/api/face-recognition/register');
console.log('');

console.log('📝 Test Data for Login:');
console.log('POST /api/auth/login');
console.log('Content-Type: application/json');
console.log('Body: {"username": "admin", "password": "admin123"}');
console.log('');

console.log('📝 Test Data for Face Registration:');
console.log('POST /api/face-recognition/register');
console.log('Authorization: Bearer {token_from_login}');
console.log('Content-Type: multipart/form-data');
console.log('Body: employee_id=EMP001&face_images=file1&face_images=file2&face_images=file3');
console.log('');

console.log('✅ Expected Results:');
console.log('- Login: 200 OK with token');
console.log('- Face Register: 400 Bad Request (missing images) or 201 Created (with images)');
console.log('');

console.log('🚀 Next: Test with web app or restart server if needed');



