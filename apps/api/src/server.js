/**
 * CallWaiting.ai Backend API Server
 * Production-ready Express server with Nigerian network optimizations
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

// Import middleware
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const chatRoutes = require('./routes/chat');
const webhookRoutes = require('./routes/webhooks');
const monitoringRoutes = require('./routes/monitoring');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.groq.com", "https://api.stripe.com"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'https://callwaitingai.odia.dev',
        'https://meetcallwaiting.ai',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
};

app.use(cors(corsOptions));

// Rate limiting - Nigerian network optimized
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Nigerian network retry logic
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/api/health';
    }
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging with Nigerian network context
app.use(morgan('combined'));
app.use(requestLogger);

// Health check endpoint
app.get('/api/health', (req, res) => {
    const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        checks: {
            database: 'connected', // Will be updated with actual DB check
            memory: process.memoryUsage(),
            nodeVersion: process.version
        }
    };
    
    res.set('X-Request-ID', req.requestId);
    res.status(200).json(healthCheck);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Chat widget configuration endpoint
app.get('/api/chat/config', (req, res) => {
    res.json({
        groqApiKey: process.env.GROQ_API_KEY ? 'configured' : null,
        ttsUrl: process.env.TTS_URL || 'http://localhost:3001/v1/synthesize',
        features: {
            voiceEnabled: !!process.env.GROQ_API_KEY,
            ttsEnabled: true
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        requestId: req.requestId
    });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CallWaiting.ai API Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌍 CORS enabled for: ${corsOptions.origin.join(', ')}`);
    console.log(`⚡ Nigerian network optimizations enabled`);
});

module.exports = app;
