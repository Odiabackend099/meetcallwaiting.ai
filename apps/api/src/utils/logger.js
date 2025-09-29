/**
 * Winston Logger Configuration
 * Production-ready logging with Nigerian network context
 */

const winston = require('winston');
const path = require('path');

// Ensure logs directory exists
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for Nigerian network context
const nigerianFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
        const logEntry = {
            timestamp,
            level,
            message,
            requestId,
            ...meta
        };
        
        // Add Nigerian timezone context
        logEntry.timezone = 'WAT'; // West Africa Time
        logEntry.location = 'Nigeria';
        
        return JSON.stringify(logEntry);
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: nigerianFormat,
    defaultMeta: {
        service: 'callwaiting-api',
        version: '1.0.0'
    },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf(({ timestamp, level, message, requestId }) => {
                    const reqId = requestId ? `[${requestId}]` : '';
                    return `${timestamp} ${level}: ${reqId} ${message}`;
                })
            )
        }),
        
        // File transport for errors
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        
        // File transport for all logs
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ],
    
    // Handle uncaught exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ],
    
    // Handle unhandled promise rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ]
});

// Add Nigerian network specific logging methods
logger.nigerianNetwork = (message, meta = {}) => {
    logger.info(message, {
        ...meta,
        networkContext: {
            country: 'Nigeria',
            timezone: 'WAT',
            commonIssues: ['slow-3g', 'intermittent-connection', 'high-latency']
        }
    });
};

logger.nigerianError = (message, error, meta = {}) => {
    logger.error(message, {
        ...meta,
        error: {
            message: error.message,
            stack: error.stack,
            code: error.code
        },
        networkContext: {
            country: 'Nigeria',
            likelyCause: getNigerianNetworkCause(error)
        }
    });
};

function getNigerianNetworkCause(error) {
    if (error.code === 'ECONNRESET') {
        return 'Connection reset - common on Nigerian mobile networks';
    }
    if (error.code === 'ETIMEDOUT') {
        return 'Timeout - slow network connection';
    }
    if (error.message && error.message.includes('timeout')) {
        return 'Request timeout - network latency issue';
    }
    return 'Unknown network issue';
}

// Log startup information
logger.info('Logger initialized', {
    level: logger.level,
    transports: logger.transports.map(t => t.name),
    logsDirectory: logsDir,
    environment: process.env.NODE_ENV || 'development'
});

module.exports = logger;
