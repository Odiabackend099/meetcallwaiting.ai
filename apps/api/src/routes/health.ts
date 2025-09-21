// @ts-nocheck
import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';

export const router = Router();

// Enhanced health check endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {} as any,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };
    
    // Check database connectivity
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('id')
        .limit(1);
      
      healthCheck.services.database = {
        status: error ? 'error' : 'ok',
        message: error ? error.message : 'Connected successfully',
        data: data || null
      };
    } catch (dbError: any) {
      healthCheck.services.database = {
        status: 'error',
        message: dbError.message,
        data: null
      };
    }
    
    // Check if required environment variables are set
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'STRIPE_SECRET_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    healthCheck.services.environment = {
      status: missingEnvVars.length > 0 ? 'warning' : 'ok',
      message: missingEnvVars.length > 0 
        ? `Missing environment variables: ${missingEnvVars.join(', ')}`
        : 'All required environment variables are set',
      missing: missingEnvVars
    };
    
    // Overall status
    const serviceStatuses = Object.values(healthCheck.services).map((service: any) => service.status);
    const hasErrors = serviceStatuses.includes('error');
    const hasWarnings = serviceStatuses.includes('warning');
    
    healthCheck.status = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok';
    
    // Set appropriate HTTP status code
    let statusCode = 200;
    if (hasErrors) {
      statusCode = 503; // Service Unavailable
    } else if (hasWarnings) {
      statusCode = 200; // Still OK but with warnings
    }
    
    res.status(statusCode).json(healthCheck);
  } catch (error: any) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});