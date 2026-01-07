const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');

console.log('Testing face-api.js...');

try {
  // Configure canvas for face-api.js
  const { Canvas, Image, ImageData } = canvas;
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
  console.log('✅ Canvas monkeyPatch successful');
  
  // Check models path
  const modelsPath = path.join(__dirname, 'models');
  console.log('📁 Models path:', modelsPath);
  
  // Check if models exist
  const fs = require('fs');
  if (fs.existsSync(modelsPath)) {
    const modelFiles = fs.readdirSync(modelsPath);
    console.log('📁 Model files:', modelFiles);
  }
  
  console.log('✅ Face-api.js setup successful');
} catch (error) {
  console.error('❌ Face-api.js error:', error);
}
