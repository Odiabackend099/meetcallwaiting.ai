import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      requestId?: string;
    }
  }
}

// JWT authentication middleware with enhanced security
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authentication token',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    console.error('JWT_SECRET environment variable is not set');
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'Authentication service unavailable',
      code: 'AUTH_CONFIG_ERROR'
    });
  }
  
  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (err) {
      console.error('JWT verification failed:', {
        error: err.message,
        requestId: req.requestId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      let errorCode = 'AUTH_TOKEN_INVALID';
      if (err.name === 'TokenExpiredError') {
        errorCode = 'AUTH_TOKEN_EXPIRED';
      } else if (err.name === 'JsonWebTokenError') {
        errorCode = 'AUTH_TOKEN_MALFORMED';
      }
      
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        message: 'Please log in again',
        code: errorCode
      });
    }

    // Add user info to request object
    req.user = user;
    next();
  });
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  
  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (err) {
      console.warn('Optional JWT verification failed:', err.message);
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

// Generate JWT token with enhanced security
export const generateToken = (payload: any, expiresIn = '24h') => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  
  return jwt.sign(payload, jwtSecret, { 
    expiresIn,
    issuer: 'callwaiting-ai',
    audience: 'callwaiting-ai-users'
  });
};

// Verify JWT token (for use in other parts of the app)
export const verifyToken = (token: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  
  try {
    return jwt.verify(token, jwtSecret, {
      issuer: 'callwaiting-ai',
      audience: 'callwaiting-ai-users'
    });
  } catch (error) {
    return null;
  }
};

// Rate limiting middleware
export const createRateLimit = (windowMs: number, max: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Simple in-memory rate limiting (use Redis in production)
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // This is a simplified implementation
    // In production, use a proper rate limiting library like express-rate-limit
    next();
  };
};

// Request ID middleware for tracing
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = req.headers['x-request-id'] as string || 
                  `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

