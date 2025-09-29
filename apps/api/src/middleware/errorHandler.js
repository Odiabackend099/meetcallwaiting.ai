/**
 * Global Error Handler Middleware
 * Handles all unhandled errors with Nigerian network context and user-friendly messages
 */

const logger = require('../utils/logger');

function isOperationalError(error) {
    if (error.isOperational !== undefined) {
        return error.isOperational;
    }
    
    // Common operational errors
    const operationalErrors = [
        'ValidationError',
        'CastError',
        'JsonWebTokenError',
        'TokenExpiredError',
        'MulterError'
    ];
    
    return operationalErrors.includes(error.name);
}

function getNigerianNetworkErrorMessage(error) {
    // Nigerian-specific error messages for common network issues
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        return 'Network connection interrupted. Please check your internet connection and try again.';
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return 'Unable to connect to our servers. Please try again in a moment.';
    }
    
    if (error.message && error.message.includes('timeout')) {
        return 'Request timed out. Please check your network connection and try again.';
    }
    
    return null;
}

function getUserFriendlyMessage(error) {
    // Return user-friendly error messages
    if (error.name === 'ValidationError') {
        return 'Please check your input and try again.';
    }
    
    if (error.name === 'JsonWebTokenError') {
        return 'Invalid authentication token. Please log in again.';
    }
    
    if (error.name === 'TokenExpiredError') {
        return 'Your session has expired. Please log in again.';
    }
    
    if (error.status === 400) {
        return 'Invalid request. Please check your input and try again.';
    }
    
    if (error.status === 401) {
        return 'Authentication required. Please log in to continue.';
    }
    
    if (error.status === 403) {
        return 'You do not have permission to perform this action.';
    }
    
    if (error.status === 404) {
        return 'The requested resource was not found.';
    }
    
    if (error.status === 429) {
        return 'Too many requests. Please wait a moment and try again.';
    }
    
    if (error.status >= 500) {
        return 'Something went wrong on our end. Please try again later.';
    }
    
    // Check for Nigerian network specific errors
    const nigerianError = getNigerianNetworkErrorMessage(error);
    if (nigerianError) {
        return nigerianError;
    }
    
    return 'An unexpected error occurred. Please try again.';
}

function shouldLogError(error) {
    // Don't log operational errors in production
    if (process.env.NODE_ENV === 'production' && isOperationalError(error)) {
        return false;
    }
    
    return true;
}

function createErrorResponse(error, req) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const response = {
        error: true,
        message: getUserFriendlyMessage(error),
        requestId: req.requestId,
        timestamp: new Date().toISOString()
    };
    
    // Include additional details in development
    if (isDevelopment) {
        response.stack = error.stack;
        response.details = {
            name: error.name,
            code: error.code,
            originalMessage: error.message
        };
    }
    
    return response;
}

module.exports = (error, req, res, next) => {
    // Set default error properties
    error.status = error.status || error.statusCode || 500;
    error.isOperational = isOperationalError(error);
    
    // Log error if necessary
    if (shouldLogError(error)) {
        logger.error('Unhandled error occurred', {
            requestId: req.requestId,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                status: error.status,
                code: error.code
            },
            request: {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            }
        });
    }
    
    // Create error response
    const errorResponse = createErrorResponse(error, req);
    
    // Send response
    res.status(error.status).json(errorResponse);
};
