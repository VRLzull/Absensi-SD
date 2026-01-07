const canvas = require('canvas');

console.log('Testing canvas package...');

try {
  // Test basic canvas functionality
  const canvasInstance = canvas.createCanvas(100, 100);
  console.log('✅ Canvas created successfully');
  
  // Test image loading
  const fs = require('fs');
  const path = require('path');
  
  // Check if we have any test images
  const uploadsDir = path.join(__dirname, 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    console.log('📁 Uploads directory files:', files);
  }
  
  console.log('✅ Canvas package is working');
} catch (error) {
  console.error('❌ Canvas package error:', error);
}
