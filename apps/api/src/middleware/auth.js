/**
 * Authentication Middleware
 * JWT token verification with Nigerian network optimizations
 */

const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET not found in environment variables');
    process.exit(1);
}

/**
 * Verify JWT token and extract user information
 */
async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                error: true,
                message: 'Authorization header is required',
                requestId: req.requestId
            });
        }
        
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;
        
        if (!token) {
            return res.status(401).json({
                error: true,
                message: 'Token is required',
                requestId: req.requestId
            });
        }
        
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Fetch user from database to ensure they still exist
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, business_name, phone, industry, created_at, updated_at')
            .eq('id', decoded.userId)
            .single();
        
        if (error || !user) {
            logger.warn('Token verification failed - user not found', {
                requestId: req.requestId,
                userId: decoded.userId,
                error: error?.message
            });
            
            return res.status(401).json({
                error: true,
                message: 'Invalid token - user not found',
                requestId: req.requestId
            });
        }
        
        // Add user to request object
        req.user = user;
        req.userId = user.id;
        
        // Log successful authentication
        logger.info('User authenticated successfully', {
            requestId: req.requestId,
            userId: user.id,
            email: user.email
        });
        
        next();
        
    } catch (error) {
        logger.error('Token verification failed', {
            requestId: req.requestId,
            error: error.message,
            token: token ? `${token.substring(0, 20)}...` : 'none'
        });
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: true,
                message: 'Invalid token',
                requestId: req.requestId
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: true,
                message: 'Token has expired',
                requestId: req.requestId
            });
        }
        
        return res.status(500).json({
            error: true,
            message: 'Authentication failed',
            requestId: req.requestId
        });
    }
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            req.user = null;
            req.userId = null;
            return next();
        }
        
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;
        
        if (!token) {
            req.user = null;
            req.userId = null;
            return next();
        }
        
        // Verify token (same logic as verifyToken but doesn't fail)
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, business_name, phone, industry')
            .eq('id', decoded.userId)
            .single();
        
        if (error || !user) {
            req.user = null;
            req.userId = null;
        } else {
            req.user = user;
            req.userId = user.id;
        }
        
        next();
        
    } catch (error) {
        // For optional auth, just set user to null on any error
        req.user = null;
        req.userId = null;
        next();
    }
}

/**
 * Check if user has specific role or permission
 */
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: true,
                message: 'Authentication required',
                requestId: req.requestId
            });
        }
        
        // For now, we'll implement basic role checking
        // In the future, you can add role-based access control
        if (req.user.role && req.user.role !== role) {
            return res.status(403).json({
                error: true,
                message: 'Insufficient permissions',
                requestId: req.requestId
            });
        }
        
        next();
    };
}

/**
 * Check if user owns the resource
 */
function requireOwnership(resourceUserIdField = 'user_id') {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: true,
                message: 'Authentication required',
                requestId: req.requestId
            });
        }
        
        const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
        
        if (resourceUserId && resourceUserId !== req.userId) {
            return res.status(403).json({
                error: true,
                message: 'Access denied - resource ownership required',
                requestId: req.requestId
            });
        }
        
        next();
    };
}

module.exports = {
    verifyToken,
    optionalAuth,
    requireRole,
    requireOwnership
};
