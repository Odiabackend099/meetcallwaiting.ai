/**
 * Request Logger Middleware
 * Generates unique request IDs and logs request details with Nigerian network context
 */

const { v4: uuidv4 } = require('crypto').webcrypto || require('crypto');

function generateRequestId() {
    try {
        return uuidv4();
    } catch (error) {
        // Fallback for older Node.js versions
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
}

function estimateConnectionSpeed(req) {
    // Estimate connection speed based on headers and patterns
    const userAgent = req.get('User-Agent') || '';
    const connection = req.get('Connection') || '';
    
    // Nigerian network indicators
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
        return 'mobile'; // Likely 3G/4G
    }
    
    if (connection.includes('keep-alive')) {
        return 'fast'; // Likely broadband
    }
    
    return 'unknown';
}

function redactSensitiveData(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
    const redacted = { ...obj };
    
    for (const key in redacted) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            redacted[key] = '[REDACTED]';
        } else if (typeof redacted[key] === 'object') {
            redacted[key] = redactSensitiveData(redacted[key]);
        }
    }
    
    return redacted;
}

module.exports = (req, res, next) => {
    // Generate unique request ID
    const requestId = generateRequestId();
    req.requestId = requestId;
    
    // Add request ID to response headers
    res.set('X-Request-ID', requestId);
    
    // Capture request start time
    const startTime = Date.now();
    
    // Estimate connection speed
    const connectionSpeed = estimateConnectionSpeed(req);
    
    // Log request details
    const requestLog = {
        requestId,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        connectionSpeed,
        timestamp: new Date().toISOString(),
        headers: redactSensitiveData(req.headers),
        body: req.method !== 'GET' ? redactSensitiveData(req.body) : undefined
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.log(`📥 ${requestLog.method} ${requestLog.url} [${requestId}] - ${connectionSpeed} connection`);
    }
    
    // Store request info for response logging
    req.requestLog = requestLog;
    req.startTime = startTime;
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        const responseLog = {
            requestId,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.get('Content-Length') || 0,
            timestamp: new Date().toISOString()
        };
        
        // Log response in development
        if (process.env.NODE_ENV === 'development') {
            const statusEmoji = res.statusCode < 400 ? '✅' : res.statusCode < 500 ? '⚠️' : '❌';
            console.log(`📤 ${statusEmoji} ${responseLog.statusCode} [${requestId}] - ${responseLog.duration}`);
        }
        
        // Call original end method
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
};
