/**
 * Authentication Routes
 * User registration, login, and verification with Nigerian phone validation
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * Validate Nigerian phone number format
 */
function validateNigerianPhone(phone) {
    // Nigerian phone number patterns
    const patterns = [
        /^\+234[789][01]\d{8}$/, // +234 format
        /^234[789][01]\d{8}$/,   // 234 format
        /^0[789][01]\d{8}$/,     // Local format starting with 0
        /^[789][01]\d{8}$/       // Without leading 0 or country code
    ];
    
    return patterns.some(pattern => pattern.test(phone));
}

/**
 * Normalize Nigerian phone number to +234 format
 */
function normalizeNigerianPhone(phone) {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (digits.startsWith('234')) {
        return '+' + digits;
    } else if (digits.startsWith('0')) {
        return '+234' + digits.substring(1);
    } else if (digits.length === 10 && digits.startsWith('7') || digits.startsWith('8') || digits.startsWith('9')) {
        return '+234' + digits;
    }
    
    return phone; // Return as-is if can't normalize
}

/**
 * Generate JWT token
 */
function generateToken(userId, email) {
    return jwt.sign(
        { 
            userId, 
            email,
            iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
}

/**
 * Hash password
 */
async function hashPassword(password) {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password
 */
async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
    try {
        const { email, password, businessName, phone, industry } = req.body;
        
        // Validation
        if (!email || !password || !businessName || !phone) {
            return res.status(400).json({
                error: true,
                message: 'Email, password, business name, and phone are required',
                requestId: req.requestId
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: true,
                message: 'Invalid email format',
                requestId: req.requestId
            });
        }
        
        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                error: true,
                message: 'Password must be at least 8 characters long',
                requestId: req.requestId
            });
        }
        
        // Validate Nigerian phone number
        if (!validateNigerianPhone(phone)) {
            return res.status(400).json({
                error: true,
                message: 'Invalid Nigerian phone number format. Please use +234XXXXXXXXXX format',
                requestId: req.requestId
            });
        }
        
        // Normalize phone number
        const normalizedPhone = normalizeNigerianPhone(phone);
        
        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();
        
        if (existingUser) {
            return res.status(409).json({
                error: true,
                message: 'User with this email already exists',
                requestId: req.requestId
            });
        }
        
        // Hash password
        const passwordHash = await hashPassword(password);
        
        // Create user
        const { data: user, error: createError } = await supabase
            .from('users')
            .insert({
                email: email.toLowerCase(),
                password_hash: passwordHash,
                business_name: businessName,
                phone: normalizedPhone,
                industry: industry || 'general',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select('id, email, business_name, phone, industry, created_at')
            .single();
        
        if (createError) {
            logger.error('User registration failed', {
                requestId: req.requestId,
                email: email.toLowerCase(),
                error: createError.message
            });
            
            return res.status(500).json({
                error: true,
                message: 'Registration failed. Please try again.',
                requestId: req.requestId
            });
        }
        
        // Generate JWT token
        const token = generateToken(user.id, user.email);
        
        // Log successful registration
        logger.info('User registered successfully', {
            requestId: req.requestId,
            userId: user.id,
            email: user.email,
            businessName: user.business_name,
            phone: normalizedPhone
        });
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                businessName: user.business_name,
                phone: user.phone,
                industry: user.industry
            },
            token,
            requestId: req.requestId
        });
        
    } catch (error) {
        logger.error('Registration error', {
            requestId: req.requestId,
            error: error.message,
            stack: error.stack
        });
        
        next(error);
    }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                error: true,
                message: 'Email and password are required',
                requestId: req.requestId
            });
        }
        
        // Find user by email
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, password_hash, business_name, phone, industry')
            .eq('email', email.toLowerCase())
            .single();
        
        if (userError || !user) {
            logger.warn('Login attempt with invalid email', {
                requestId: req.requestId,
                email: email.toLowerCase(),
                error: userError?.message
            });
            
            return res.status(401).json({
                error: true,
                message: 'Invalid email or password',
                requestId: req.requestId
            });
        }
        
        // Verify password
        const isValidPassword = await verifyPassword(password, user.password_hash);
        
        if (!isValidPassword) {
            logger.warn('Login attempt with invalid password', {
                requestId: req.requestId,
                userId: user.id,
                email: user.email
            });
            
            return res.status(401).json({
                error: true,
                message: 'Invalid email or password',
                requestId: req.requestId
            });
        }
        
        // Generate JWT token
        const token = generateToken(user.id, user.email);
        
        // Log successful login
        logger.info('User logged in successfully', {
            requestId: req.requestId,
            userId: user.id,
            email: user.email
        });
        
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                businessName: user.business_name,
                phone: user.phone,
                industry: user.industry
            },
            token,
            requestId: req.requestId
        });
        
    } catch (error) {
        logger.error('Login error', {
            requestId: req.requestId,
            error: error.message,
            stack: error.stack
        });
        
        next(error);
    }
});

/**
 * POST /api/auth/verify
 * Verify JWT token
 */
router.post('/verify', verifyToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        user: {
            id: req.user.id,
            email: req.user.email,
            businessName: req.user.business_name,
            phone: req.user.phone,
            industry: req.user.industry
        },
        requestId: req.requestId
    });
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', verifyToken, (req, res) => {
    try {
        // Generate new token
        const newToken = generateToken(req.user.id, req.user.email);
        
        logger.info('Token refreshed', {
            requestId: req.requestId,
            userId: req.user.id,
            email: req.user.email
        });
        
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            token: newToken,
            requestId: req.requestId
        });
        
    } catch (error) {
        logger.error('Token refresh error', {
            requestId: req.requestId,
            userId: req.user.id,
            error: error.message
        });
        
        next(error);
    }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', verifyToken, (req, res) => {
    logger.info('User logged out', {
        requestId: req.requestId,
        userId: req.user.id,
        email: req.user.email
    });
    
    res.json({
        success: true,
        message: 'Logged out successfully',
        requestId: req.requestId
    });
});

module.exports = router;
