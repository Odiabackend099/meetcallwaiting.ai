/**
 * Monitoring Routes
 * Health checks and metrics endpoints
 */

const express = require('express');
const { supabase, testConnection } = require('../config/supabase');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/monitoring/health
 * Comprehensive health check
 */
router.get('/health', async (req, res, next) => {
    try {
        const healthCheck = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0',
            checks: {
                database: 'unknown',
                memory: process.memoryUsage(),
                nodeVersion: process.version,
                platform: process.platform
            }
        };
        
        // Test database connection
        const dbHealthy = await testConnection();
        healthCheck.checks.database = dbHealthy ? 'connected' : 'disconnected';
        
        // Determine overall status
        healthCheck.status = dbHealthy ? 'healthy' : 'unhealthy';
        
        const statusCode = dbHealthy ? 200 : 503;
        
        res.status(statusCode).json(healthCheck);
        
    } catch (error) {
        logger.error('Health check failed', {
            requestId: req.requestId,
            error: error.message
        });
        
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
            requestId: req.requestId
        });
    }
});

/**
 * GET /api/monitoring/metrics
 * Basic metrics endpoint
 */
router.get('/metrics', async (req, res, next) => {
    try {
        // TODO: Implement comprehensive metrics
        // This will be enhanced in Command 10
        
        const metrics = {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            version: '1.0.0',
            requestId: req.requestId
        };
        
        res.json(metrics);
        
    } catch (error) {
        next(error);
    }
});

module.exports = router;
