#!/usr/bin/env node

/**
 * Test script untuk Flutter FaceNet TFLite API endpoints
 * Test semua endpoint yang baru dibuat untuk integrasi Flutter
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:5000/api/face-recognition';

// Sample embedding data (512 dimensions seperti FaceNet)
const sampleEmbedding = Array.from({ length: 512 }, (_, i) => Math.random() * 2 - 1);

// Test data
const testData = {
  employeeId: 'EMP001',
  faceEmbedding: sampleEmbedding
};

// Helper function untuk membuat HTTP request
function makeRequest(path, method = 'POST', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsedData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testFlutterVerifyEmbedding() {
  console.log('\n🧪 Testing Flutter Verify Embedding...');
  
  try {
    const result = await makeRequest('/api/face-recognition/flutter-verify-embedding', 'POST', {
      employee_id: testData.employeeId,
      face_embedding: testData.faceEmbedding
    });

    console.log(`Status: ${result.statusCode}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));

    if (result.statusCode === 200 || result.statusCode === 404) {
      console.log('✅ Flutter verify embedding endpoint working');
    } else {
      console.log('❌ Flutter verify embedding endpoint failed');
    }
  } catch (error) {
    console.log('❌ Error testing verify embedding:', error.message);
  }
}

async function testFlutterFindEmployeeEmbedding() {
  console.log('\n🧪 Testing Flutter Find Employee Embedding...');
  
  try {
    const result = await makeRequest('/api/face-recognition/flutter-find-employee-embedding', 'POST', {
      face_embedding: testData.faceEmbedding
    });

    console.log(`Status: ${result.statusCode}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));

    if (result.statusCode === 200 || result.statusCode === 404) {
      console.log('✅ Flutter find employee embedding endpoint working');
    } else {
      console.log('❌ Flutter find employee embedding endpoint failed');
    }
  } catch (error) {
    console.log('❌ Error testing find employee embedding:', error.message);
  }
}

async function testFlutterRegisterEmbedding() {
  console.log('\n🧪 Testing Flutter Register Embedding...');
  
  try {
    const result = await makeRequest('/api/face-recognition/flutter-register-embedding', 'POST', {
      employee_id: testData.employeeId,
      face_embedding: testData.faceEmbedding
    });

    console.log(`Status: ${result.statusCode}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));

    if (result.statusCode === 200 || result.statusCode === 404) {
      console.log('✅ Flutter register embedding endpoint working');
    } else {
      console.log('❌ Flutter register embedding endpoint failed');
    }
  } catch (error) {
    console.log('❌ Error testing register embedding:', error.message);
  }
}

async function testPythonEmbeddingComparison() {
  console.log('\n🧪 Testing Python Embedding Comparison...');
  
  try {
    const { spawn } = require('child_process');
    const path = require('path');
    
    const scriptPath = path.join(__dirname, 'python/compare_embeddings.py');
    const inputData = {
      input_embedding: sampleEmbedding,
      stored_embedding: sampleEmbedding,
      threshold: 0.6
    };

    const py = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

    return new Promise((resolve, reject) => {
      let output = '';
      let error = '';

      py.stdout.on('data', (data) => (output += data.toString()));
      py.stderr.on('data', (data) => (error += data.toString()));

      py.on('close', (code) => {
        if (code !== 0 || error) {
          console.log('❌ Python embedding comparison error:', error);
          reject(error);
        } else {
          try {
            const result = JSON.parse(output);
            console.log('Python Comparison Result:', JSON.stringify(result, null, 2));
            
            if (result.success) {
              console.log('✅ Python embedding comparison working');
              console.log(`Similarity: ${result.similarity.toFixed(3)}`);
              console.log(`Is Match: ${result.is_match}`);
            } else {
              console.log('❌ Python embedding comparison failed');
            }
            resolve(result);
          } catch (e) {
            console.log('❌ Error parsing Python output:', e.message);
            reject(e);
          }
        }
      });

      // Send input data to Python script
      py.stdin.write(JSON.stringify(inputData));
      py.stdin.end();
    });
  } catch (error) {
    console.log('❌ Error testing Python embedding comparison:', error.message);
  }
}

async function testServerStatus() {
  console.log('\n🧪 Testing Server Status...');
  
  try {
    const result = await makeRequest('/api/face-recognition/status', 'GET');

    console.log(`Status: ${result.statusCode}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));

    if (result.statusCode === 200) {
      console.log('✅ Server status endpoint working');
    } else {
      console.log('❌ Server status endpoint failed');
    }
  } catch (error) {
    console.log('❌ Error testing server status:', error.message);
  }
}

async function testInvalidRequests() {
  console.log('\n🧪 Testing Invalid Requests...');
  
  // Test missing employee_id
  try {
    const result = await makeRequest('/api/face-recognition/flutter-verify-embedding', 'POST', {
      face_embedding: testData.faceEmbedding
    });

    console.log('Missing employee_id test:');
    console.log(`Status: ${result.statusCode}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));

    if (result.statusCode === 400) {
      console.log('✅ Missing employee_id validation working');
    } else {
      console.log('❌ Missing employee_id validation failed');
    }
  } catch (error) {
    console.log('❌ Error testing missing employee_id:', error.message);
  }

  // Test invalid embedding format
  try {
    const result = await makeRequest('/api/face-recognition/flutter-verify-embedding', 'POST', {
      employee_id: testData.employeeId,
      face_embedding: 'invalid_embedding'
    });

    console.log('\nInvalid embedding format test:');
    console.log(`Status: ${result.statusCode}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));

    if (result.statusCode === 400) {
      console.log('✅ Invalid embedding format validation working');
    } else {
      console.log('❌ Invalid embedding format validation failed');
    }
  } catch (error) {
    console.log('❌ Error testing invalid embedding format:', error.message);
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting Flutter FaceNet TFLite API Tests...');
  console.log('=' .repeat(60));
  
  // Test server status first
  await testServerStatus();
  
  // Test Python embedding comparison
  await testPythonEmbeddingComparison();
  
  // Test Flutter API endpoints
  await testFlutterVerifyEmbedding();
  await testFlutterFindEmployeeEmbedding();
  await testFlutterRegisterEmbedding();
  
  // Test validation
  await testInvalidRequests();
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 All tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('- Flutter verify embedding endpoint');
  console.log('- Flutter find employee embedding endpoint');
  console.log('- Flutter register embedding endpoint');
  console.log('- Python embedding comparison service');
  console.log('- Input validation');
  console.log('- Server status');
  
  console.log('\n💡 Next Steps:');
  console.log('1. Implement Flutter app dengan FaceNet TFLite');
  console.log('2. Test dengan real face embeddings');
  console.log('3. Register beberapa karyawan untuk testing');
  console.log('4. Optimize threshold untuk akurasi terbaik');
}

// Run tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testFlutterVerifyEmbedding,
  testFlutterFindEmployeeEmbedding,
  testFlutterRegisterEmbedding,
  testPythonEmbeddingComparison,
  testServerStatus,
  testInvalidRequests
};
