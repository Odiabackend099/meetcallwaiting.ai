// @ts-nocheck
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
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

const app = express();

// Rate limiting middleware (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ 
  autoLogging: true,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      // Redact sensitive headers for PII protection
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED]' : undefined,
        cookie: req.headers.cookie ? '[REDACTED]' : undefined,
      }
    })
  }
}));
app.use(cors());

// Enhanced health check endpoint
app.use('/health', health);

app.get('/', (_req: express.Request, res: express.Response) => res.json({ 
  name: 'callwaiting.ai API',
  version: '1.0.0',
  status: 'ok'
}));

// API routes with standardized prefixes
app.use('/api/auth', auth);
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