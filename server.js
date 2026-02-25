// Load environment variables
require('dotenv').config({ path: './config.env' });

// Validate required environment variables
function validateEnvironment() {
  const required = ['JWT_SECRET', 'NODE_ENV'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const faceRecognitionService = require('./services/faceRecognitionService');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false, // relax for dev API
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📤 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs - Increased for development
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// CORS configuration - Allow all origins for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // For development, allow all origins
    // In production, you should restrict this to specific domains
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept', 
    'Origin', 
    'X-Requested-With',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Handle preflight requests
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/models', express.static(path.join(__dirname, 'models')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/face-recognition', require('./routes/faceRecognition'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Initialize face recognition service
app.get('/api/init-face-recognition', async (req, res) => {
  try {
    const result = await faceRecognitionService.initialize();
    res.json({
      success: result,
      message: result ? 'Face recognition service initialized' : 'Failed to initialize service',
      status: faceRecognitionService.getStatus()
    });
  } catch (error) {
    console.error('Face recognition initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize face recognition service',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize face recognition service on server start
async function initializeServices() {
  try {
    console.log('🚀 Initializing face recognition service...');
    const result = await faceRecognitionService.initialize();
    if (result) {
      console.log('✅ Face recognition service initialized successfully!');
    } else {
      console.log('❌ Failed to initialize face recognition service');
    }
  } catch (error) {
    console.error('❌ Error initializing face recognition service:', error);
  }
}

const server = app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Validate environment before starting services
  validateEnvironment();
  
  // Initialize services after server starts
  await initializeServices();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
