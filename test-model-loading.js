const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');

console.log('Testing model loading...');

async function testModelLoading() {
  try {
    // Configure canvas for face-api.js
    const { Canvas, Image, ImageData } = canvas;
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
    console.log('✅ Canvas monkeyPatch successful');
    
    const modelsPath = path.join(__dirname, 'models');
    console.log('📁 Loading models from:', modelsPath);
    
    // Test loading models one by one
    console.log('🔄 Loading tiny face detector...');
    await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath);
    console.log('✅ Tiny face detector loaded');
    
    console.log('🔄 Loading face landmark model...');
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
    console.log('✅ Face landmark model loaded');
    
    console.log('🔄 Loading face recognition model...');
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
    console.log('✅ Face recognition model loaded');
    
    console.log('🎉 All models loaded successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Model loading error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return false;
  }
}

// Run test
testModelLoading().then(success => {
  if (success) {
    console.log('✅ Model loading test PASSED');
  } else {
    console.log('❌ Model loading test FAILED');
  }
});
