const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');
const fs = require('fs');

console.log('Testing face recognition functionality...');

async function testFaceRecognition() {
  try {
    // Configure canvas for face-api.js
    const { Canvas, Image, ImageData } = canvas;
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
    console.log('✅ Canvas monkeyPatch successful');
    
    const modelsPath = path.join(__dirname, 'models');
    console.log('📁 Loading models from:', modelsPath);
    
    // Load models
    await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
    console.log('✅ All models loaded');
    
    // Check if we have any face images to test with
    const faceRecognitionDir = path.join(__dirname, 'uploads/face-recognition');
    if (fs.existsSync(faceRecognitionDir)) {
      const files = fs.readdirSync(faceRecognitionDir);
      console.log('📁 Face recognition images:', files);
      
      if (files.length > 0) {
        const testImagePath = path.join(faceRecognitionDir, files[0]);
        console.log('🔄 Testing with image:', files[0]);
        
        // Load and test image
        const image = await canvas.loadImage(testImagePath);
        console.log('✅ Image loaded successfully');
        
        // Detect faces
        const detections = await faceapi.detectSingleFace(image)
          .withFaceLandmarks()
          .withFaceDescriptor();
        
        if (detections) {
          console.log('✅ Face detected successfully');
          console.log('📊 Face descriptor length:', detections.descriptor.length);
          console.log('📊 Sample values:', detections.descriptor.slice(0, 5));
        } else {
          console.log('⚠️ No face detected in image');
        }
      } else {
        console.log('📁 No face images found for testing');
      }
    } else {
      console.log('📁 Face recognition directory not found');
    }
    
    console.log('🎉 Face recognition test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Face recognition test error:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

// Run test
testFaceRecognition().then(success => {
  if (success) {
    console.log('✅ Face recognition test PASSED');
  } else {
    console.log('❌ Face recognition test FAILED');
  }
});
