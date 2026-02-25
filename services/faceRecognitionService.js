const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Configure canvas for face-api.js
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

class FaceRecognitionService {
  constructor() {
    this.isInitialized = false;
    this.modelsPath = path.join(__dirname, '../models');
    this.initializationError = null;
  }

  // ==========================
  //  MODEL INITIALIZATION
  // ==========================
  async initialize() {
    try {
      if (this.isInitialized) return true;

      console.log('🔄 Loading face recognition models...');
      const startTime = Date.now();

      if (!fs.existsSync(this.modelsPath)) {
        throw new Error(`Models directory not found: ${this.modelsPath}`);
      }

      // Load models in parallel untuk speed up
      const loadPromises = [
        faceapi.nets.tinyFaceDetector.loadFromDisk(this.modelsPath),
        faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelsPath),
        faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelsPath)
      ];

      await Promise.all(loadPromises);

      this.isInitialized = true;
      const loadTime = Date.now() - startTime;
      console.log(`🎉 Face recognition models loaded successfully in ${loadTime}ms!`);
      return true;
    } catch (error) {
      console.error('❌ Error loading face recognition models:', error);
      this.initializationError = error.message;
      return false;
    }
  }

  // ==========================
  //  DESCRIPTOR EXTRACTION
  // ==========================
  async extractFaceDescriptor(imagePath) {
    try {
      if (!this.isInitialized) await this.initialize();

      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      console.log('🔄 Loading image for face detection:', imagePath);
      const image = await canvas.loadImage(imagePath);
      console.log('✅ Image loaded, dimensions:', image.width, 'x', image.height);

      // Optimized face detection with timeout
      console.log('🔄 Starting optimized face detection...');
      const detectionStartTime = Date.now();
      
      // Add timeout to face detection (max 30 seconds)
      const detectionPromise = faceapi
        .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions({
          inputSize: 320, // Increased from 224 for better accuracy while maintaining speed
          scoreThreshold: 0.3 // More permissive for faster detection
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Face detection timeout after 30 seconds')), 30000)
      );
      
      const detections = await Promise.race([detectionPromise, timeoutPromise]);
      
      const detectionTime = Date.now() - detectionStartTime;
      console.log(`⏱️ Face detection completed in ${detectionTime}ms`);
      
      if (detections) {
        console.log('✅ Face detected successfully');
      }

      if (!detections) {
        console.log('❌ No face detected with any method');
        // Log some debug info
        const stats = fs.statSync(imagePath);
        console.log('📊 Image file size:', stats.size, 'bytes');
        throw new Error('No face detected in the image. Please ensure the image contains a clear, well-lit face.');
      }

      const descriptor = Array.from(detections.descriptor);
      
      // Check descriptor quality (L2 norm should be ≈ 1.0 for face-api.js)
      const l2Norm = Math.sqrt(descriptor.reduce((sum, x) => sum + x * x, 0));
      const minVal = Math.min(...descriptor);
      const maxVal = Math.max(...descriptor);
      
      console.log('✅ Face descriptor extracted successfully, length:', descriptor.length);
      console.log('📊 Descriptor stats:', {
        l2Norm: l2Norm.toFixed(4),
        min: minVal.toFixed(4),
        max: maxVal.toFixed(4),
        isNormalized: Math.abs(l2Norm - 1.0) < 0.1 ? 'YES (face-api.js default)' : 'NO'
      });
      
      return descriptor;
    } catch (error) {
      console.error('❌ Error extracting face descriptor:', error);
      throw error;
    }
  }

  // ==========================
  //  COMPARE FACES (Recommended: use JS)
  // ==========================
  async compareFaces(descriptor1, descriptor2, threshold = 0.55) {
    try {
      // Use the pure JS implementation for better performance and reliability
      const result = this.compareDescriptors(descriptor1, descriptor2, {
        metric: 'cosine',
        threshold: threshold,
        l2Normalize: true
      });

      return {
        similarity: result.similarity,
        isMatch: result.isMatch,
        distance: result.distance
      };
    } catch (error) {
      console.error('❌ Error comparing faces (JS):', error);
      throw error;
    }
  }

  // Legacy method for Python comparison if needed
  async compareFacesPython(descriptor1, descriptor2, threshold = 0.6) {
    try {
      if (!Array.isArray(descriptor1) || !Array.isArray(descriptor2)) {
        throw new Error('Descriptors must be arrays');
      }

      const scriptPath = path.join(__dirname, '../python/compare_faces.py');
      // Fix: Python script expects stdin with a specific JSON format
      const inputData = {
        input_descriptor: descriptor1,
        stored_faces: [{
          employee_id: 0,
          employee_name: 'comparison',
          face_descriptor: JSON.stringify(descriptor2)
        }]
      };

      const py = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

      return new Promise((resolve, reject) => {
        let output = '';
        let error = '';

        py.stdout.on('data', (data) => (output += data.toString()));
        py.stderr.on('data', (data) => (error += data.toString()));

        py.on('close', (code) => {
          if (code !== 0 || error) {
            console.error('❌ Python error:', error);
            return reject(new Error(error));
          }

          try {
            const result = JSON.parse(output);
            if (result.success && result.match) {
              resolve({
                similarity: result.match.similarity,
                isMatch: result.match.similarity >= threshold,
                distance: result.match.distance
              });
            } else {
              resolve({
                similarity: 0,
                isMatch: false,
                distance: 100
              });
            }
          } catch (e) {
            reject(e);
          }
        });

        py.stdin.write(JSON.stringify(inputData));
        py.stdin.end();
      });
    } catch (error) {
      console.error('❌ Error comparing faces (Python):', error);
      throw error;
    }
  }

  // ==========================
  //  PURE JS COMPARISON (recommended)
  // ==========================
  compareDescriptors(descriptor1, descriptor2, options = {}) {
    const { metric = 'euclidean', threshold = 0.6, l2Normalize = true } = options;

    if (!Array.isArray(descriptor1) || !Array.isArray(descriptor2)) {
      throw new Error('Descriptors must be arrays');
    }
    if (descriptor1.length !== descriptor2.length) {
      throw new Error(`Embedding dimension mismatch: ${descriptor1.length} vs ${descriptor2.length}`);
    }

    const toFloatArray = (arr) => Float32Array.from(arr.map((v) => Number(v)));
    let a = toFloatArray(descriptor1);
    let b = toFloatArray(descriptor2);

    // Check if descriptors are already normalized (face-api.js descriptors are L2 normalized)
    const l2 = (v) => Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    const normA = l2(a);
    const normB = l2(b);
    
    // face-api.js descriptors should have norm ≈ 1.0 (already L2 normalized)
    const isAlreadyNormalized = Math.abs(normA - 1.0) < 0.1 && Math.abs(normB - 1.0) < 0.1;
    
    const normalize = (v) => {
      const norm = l2(v);
      if (norm === 0) return v;
      return Float32Array.from(v.map((x) => x / norm));
    };

    // Only normalize if explicitly requested AND descriptors aren't already normalized
    if (l2Normalize && !isAlreadyNormalized) {
      a = normalize(a);
      b = normalize(b);
    }

    // Calculate both cosine similarity and euclidean distance
    const dot = a.reduce((sum, x, i) => sum + x * b[i], 0);
    const euclidean = Math.sqrt(a.reduce((sum, x, i) => sum + (x - b[i]) * (x - b[i]), 0));

    // For L2-normalized vectors:
    // - Cosine similarity = dot product (range: -1 to 1, but typically 0.3-0.95 for faces)
    // - Euclidean distance range: 0 to sqrt(2) ≈ 1.414
    const cosineSim = dot;

    // Use COSINE SIMILARITY as primary metric (more robust for face recognition)
    // Typical threshold: 0.5-0.6 for cosine similarity
    let similarity, isMatch;
    
    if (metric === 'cosine' || isAlreadyNormalized) {
      // Use cosine similarity (better for normalized vectors)
      similarity = cosineSim;
      // Adjust threshold: 0.5-0.6 for cosine, but we'll use 0.55 as default
      const cosineThreshold = threshold >= 1.0 ? threshold / 100 : threshold; // Handle if threshold is given as percentage
      isMatch = cosineSim >= cosineThreshold;
    } else {
      // Use euclidean distance (lower is better)
      similarity = Math.max(0, Math.min(1, 1 - euclidean / Math.SQRT2));
      isMatch = euclidean <= threshold;
    }

    // Enhanced logging for debugging
    console.log(`📊 Comparison details:`, {
      metric: metric === 'cosine' || isAlreadyNormalized ? 'cosine' : 'euclidean',
      cosineSimilarity: cosineSim.toFixed(4),
      euclideanDistance: euclidean.toFixed(4),
      normalizedSimilarity: similarity.toFixed(4),
      threshold: threshold,
      isMatch: isMatch,
      alreadyNormalized: isAlreadyNormalized,
      normA: normA.toFixed(4),
      normB: normB.toFixed(4)
    });

    return { 
      similarity, 
      distance: euclidean, 
      cosineSimilarity: cosineSim,
      isMatch,
      metric: metric === 'cosine' || isAlreadyNormalized ? 'cosine' : 'euclidean'
    };
  }

  // ==========================
  //  COMPARE EMBEDDINGS (FaceNet TFLite)
  // ==========================
  async compareEmbeddings(embedding1, embedding2, threshold = 0.6) {
    try {
      if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
        throw new Error('Embeddings must be arrays');
      }

      const scriptPath = path.join(__dirname, '../python/compare_embeddings.py');
      const inputData = {
        input_embedding: embedding1,
        stored_embedding: embedding2,
        threshold: threshold
      };

      const py = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

      return new Promise((resolve, reject) => {
        let output = '';
        let error = '';

        py.stdout.on('data', (data) => (output += data.toString()));
        py.stderr.on('data', (data) => (error += data.toString()));

        py.on('close', (code) => {
          if (code !== 0 || error) {
            console.error('❌ Python embedding comparison error:', error);
            return reject(new Error(error));
          }

          try {
            const result = JSON.parse(output);
            if (!result.success) {
              return reject(new Error(result.error || 'Embedding comparison failed'));
            }

            console.log(`📊 Embedding comparison: similarity=${result.similarity.toFixed(3)}, match=${result.is_match}`);
            resolve({
              similarity: result.similarity,
              isMatch: result.is_match,
              distance: result.distance,
              euclideanSimilarity: result.euclidean_similarity
            });
          } catch (e) {
            reject(new Error(`Failed to parse Python output: ${e.message}`));
          }
        });

        // Send input data to Python script
        py.stdin.write(JSON.stringify(inputData));
        py.stdin.end();
      });
    } catch (error) {
      console.error('❌ Error comparing embeddings (Node):', error);
      throw error;
    }
  }

  // ==========================
  //  FIND BEST MATCH BY EMBEDDING (FaceNet TFLite)
  // ==========================
  async findBestMatchByEmbedding(inputEmbedding, databaseFaces, threshold = 0.6) {
    try {
      if (!Array.isArray(inputEmbedding)) {
        throw new Error('Input embedding must be an array');
      }

      let bestMatch = null;
      let bestSimilarity = 0;

      for (const face of databaseFaces) {
        try {
          const storedEmbedding = JSON.parse(face.face_descriptor);
          const comparison = await this.compareEmbeddings(inputEmbedding, storedEmbedding, threshold);
          
          if (comparison.similarity > bestSimilarity && comparison.isMatch) {
            bestSimilarity = comparison.similarity;
            bestMatch = {
              ...face,
              similarity: comparison.similarity,
              confidence: comparison.similarity
            };
          }
        } catch (error) {
          console.error(`Error comparing with employee ${face.employee_id}:`, error.message);
          continue;
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('❌ Error finding best match by embedding:', error);
      throw error;
    }
  }

  // ==========================
  //  FIND BEST MATCH (uses Python)
  // ==========================
  async findBestMatch(inputDescriptor, databaseDescriptors, threshold = 0.6) {
    try {
      let bestMatch = null;
      let highestSimilarity = 0;

      console.log(`🔍 Searching through ${databaseDescriptors.length} registered faces...`);

      for (const face of databaseDescriptors) {
        try {
          const storedDescriptor = JSON.parse(face.face_descriptor);
          const comparison = await this.compareFaces(inputDescriptor, storedDescriptor, threshold);

          if (comparison.isMatch && comparison.similarity > highestSimilarity) {
            highestSimilarity = comparison.similarity;
            bestMatch = {
              ...face,
              similarity: comparison.similarity,
              distance: comparison.distance
            };
            console.log(`✅ Found better match: ${face.employee_name} (similarity: ${comparison.similarity.toFixed(3)})`);
          }
        } catch (parseError) {
          console.error('⚠️ Error parsing face descriptor:', parseError.message);
          continue;
        }
      }

      if (bestMatch) {
        console.log(`🎯 Best match found: ${bestMatch.employee_name} (${bestMatch.similarity.toFixed(3)})`);
      } else {
        console.log('❌ No matching face found');
      }

      return bestMatch;
    } catch (error) {
      console.error('❌ Error finding best match:', error);
      throw error;
    }
  }

  // ==========================
  //  FIND BEST MATCH BY EMBEDDING (FaceNet TFLite)
  // ==========================
  async findBestMatchByEmbedding(inputEmbedding, databaseDescriptors, threshold = 0.6) {
    try {
      if (!Array.isArray(inputEmbedding)) {
        throw new Error('Input embedding must be an array');
      }

      const scriptPath = path.join(__dirname, '../python/compare_embeddings.py');
      const inputData = {
        input_embedding: inputEmbedding,
        stored_faces: databaseDescriptors,
        threshold: threshold
      };

      const py = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

      return new Promise((resolve, reject) => {
        let output = '';
        let error = '';

        py.stdout.on('data', (data) => (output += data.toString()));
        py.stderr.on('data', (data) => (error += data.toString()));

        py.on('close', (code) => {
          if (code !== 0 || error) {
            console.error('❌ Python embedding search error:', error);
            return reject(new Error(error));
          }

          try {
            const result = JSON.parse(output);
            if (!result.success) {
              if (result.message === 'No matching face found') {
                console.log('❌ No matching face found in database');
                return resolve(null);
              }
              return reject(new Error(result.error || 'Embedding search failed'));
            }

            console.log(`🎯 Best match found: ${result.match.employee_name} (similarity: ${result.match.similarity.toFixed(3)})`);
            resolve(result.match);
          } catch (e) {
            reject(new Error(`Failed to parse Python output: ${e.message}`));
          }
        });

        // Send input data to Python script
        py.stdin.write(JSON.stringify(inputData));
        py.stdin.end();
      });
    } catch (error) {
      console.error('❌ Error finding best match by embedding:', error);
      throw error;
    }
  }

  // ==========================
  //  IMAGE VALIDATION
  // ==========================
  async validateImage(imagePath) {
    try {
      if (!this.isInitialized) await this.initialize();

      if (!fs.existsSync(imagePath)) {
        return { isValid: false, faceCount: 0, message: 'Image file not found' };
      }

      const image = await canvas.loadImage(imagePath);
      const detections = await faceapi.detectSingleFace(image, new faceapi.TinyFaceDetectorOptions());

      return {
        isValid: detections !== undefined,
        faceCount: detections ? 1 : 0,
        message: detections ? 'Face detected' : 'No face detected'
      };
    } catch (error) {
      console.error('❌ Error validating image:', error);
      return { isValid: false, faceCount: 0, message: error.message };
    }
  }

  // ==========================
  //  STATUS
  // ==========================
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      modelsPath: this.modelsPath,
      modelsExist: fs.existsSync(this.modelsPath),
      initializationError: this.initializationError,
      availableModels: fs.existsSync(this.modelsPath)
        ? fs.readdirSync(this.modelsPath)
        : []
    };
  }
}

module.exports = new FaceRecognitionService();
