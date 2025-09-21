import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { router as ivr } from './routes/ivr.js';
import { router as webhooks } from './routes/webhooks.js';
import { router as orders } from './routes/orders.js';
import { router as bookings } from './routes/bookings.js';
import { router as merchants } from './routes/merchants.js';
import { router as consent } from './routes/consent.js';
import { router as numberPool } from './routes/numberPool.js';
import { router as health } from './routes/health.js';
import { router as config } from './routes/config.js';
import { router as notifications } from './routes/notifications.js';
import { router as auth } from './routes/auth.js';
import { router as dashboard } from './routes/dashboard.js';
import { requestId } from './middleware/auth.js';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Request ID middleware for tracing
app.use(requestId);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
};
app.use(cors(corsOptions));

// Rate limiting middleware (configurable)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/';
  }
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ 
  limit: '1mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook signature verification
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Enhanced logging with PII protection
app.use(pinoHttp({ 
  autoLogging: true,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      requestId: (req as any).requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      // Redact sensitive headers for PII protection
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED]' : undefined,
        cookie: req.headers.cookie ? '[REDACTED]' : undefined,
        'x-api-key': req.headers['x-api-key'] ? '[REDACTED]' : undefined,
      }
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      requestId: (res as any).requestId
    })
  }
}));

// Enhanced health check endpoint
app.use('/health', health);

app.get('/', (_req: express.Request, res: express.Response) => res.json({ 
  name: 'callwaiting.ai API',
  version: '1.0.0',
  status: 'ok'
}));

// API routes with standardized prefixes
app.use('/api/auth', auth);
app.use('/api/dashboard', dashboard);
app.use('/api/ivr', ivr);
app.use('/api/webhooks', webhooks);
app.use('/api/orders', orders);
app.use('/api/bookings', bookings);
app.use('/api/merchants', merchants);
app.use('/api/consent', consent);
app.use('/api/numbers', numberPool);
app.use('/api/config', config);
app.use('/api/notifications', notifications);

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});