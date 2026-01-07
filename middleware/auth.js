const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    console.log('🔐 Auth middleware - Headers:', req.headers);
    console.log('🔐 Auth middleware - Authorization:', req.headers.authorization);
    
    const token = req.headers.authorization?.split(' ')[1];
    console.log('🔐 Auth middleware - Extracted token:', token ? `${token.substring(0, 20)}...` : 'null');
    
    if (!token) {
      console.log('❌ Auth middleware - No token found');
      return res.status(401).json({ 
        error: 'Token tidak ditemukan' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Auth middleware - Token verified, user:', decoded);
    req.user = decoded;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token tidak valid' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token sudah expired' 
      });
    }
    
    console.error('Token verification error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server' 
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Token tidak valid' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Akses ditolak' 
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  requireRole
};
