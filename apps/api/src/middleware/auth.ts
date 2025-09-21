// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT authentication middleware
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
  }

  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  
  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (err) {
      console.error('JWT verification failed:', err.message);
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        message: 'Please log in again'
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

// Generate JWT token
export const generateToken = (payload: any, expiresIn = '24h') => {
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(payload, jwtSecret, { expiresIn });
};

// Verify JWT token (for use in other parts of the app)
export const verifyToken = (token: string) => {
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
};

