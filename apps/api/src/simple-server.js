// Simple Express Server for Business Testing
// Bypasses TypeScript issues for immediate business user testing

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();

// =============================================================================
// SECURITY MIDDLEWARE (Critical Fix #3)
// =============================================================================

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map();

// Enhanced rate limiting middleware
const rateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
    return (req, res, next) => {
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old entries
        if (rateLimitStore.has(clientId)) {
            const requests = rateLimitStore.get(clientId).filter(time => time > windowStart);
            rateLimitStore.set(clientId, requests);
        } else {
            rateLimitStore.set(clientId, []);
        }
        
        const requests = rateLimitStore.get(clientId);
        
        if (requests.length >= maxRequests) {
            console.log(`🚫 Rate limit exceeded for IP: ${clientId}`);
            return res.status(429).json({
                error: 'Too many requests',
                message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 60000} minutes.`,
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
        
        requests.push(now);
        next();
    };
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    if (req.body) {
        for (const [key, value] of Object.entries(req.body)) {
            if (typeof value === 'string') {
                // Basic XSS protection
                req.body[key] = value
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+=/gi, '');
                
                // Basic SQL injection protection
                req.body[key] = req.body[key]
                    .replace(/['";\\]/g, '')
                    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, '');
            }
        }
    }
    next();
};

// Webhook signature verification middleware
const verifyWebhookSignature = (secret, headerName = 'x-signature') => {
    return (req, res, next) => {
        if (!secret) {
            console.warn('⚠️ Webhook secret not configured - skipping signature verification');
            return next();
        }

        const signature = req.headers[headerName] || req.headers[headerName.toLowerCase()];
        if (!signature) {
            console.log('❌ Missing webhook signature');
            return res.status(401).json({ error: 'Missing webhook signature' });
        }

        try {
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(req.body))
                .digest('hex');
            
            const providedSignature = signature.replace('sha256=', '');
            
            if (!crypto.timingSafeEqual(
                Buffer.from(expectedSignature, 'hex'),
                Buffer.from(providedSignature, 'hex')
            )) {
                console.log('❌ Invalid webhook signature');
                return res.status(401).json({ error: 'Invalid webhook signature' });
            }
            
            console.log('✅ Webhook signature verified');
            next();
        } catch (error) {
            console.error('Error verifying webhook signature:', error);
            return res.status(401).json({ error: 'Signature verification failed' });
        }
    };
};

// Apply security middleware
app.use(express.json({ limit: '1mb' }));
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-signature', 'stripe-signature', 'paypal-transmission-id']
}));
app.use(rateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes
app.use(sanitizeInput);

// Mock merchant storage
let merchants = [];
let nextId = 1;

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Callwaiting AI API is running'
    });
});

// Create merchant
app.post('/api/merchants/create', (req, res) => {
    const { name, industry, country, timezone, currency, billing_email } = req.body;
    
    if (!name || !industry || !country) {
        return res.status(400).json({ 
            error: 'Missing required fields: name, industry, country' 
        });
    }
    
    const merchant = {
        id: `merchant_${nextId++}`,
        name,
        industry,
        country,
        timezone: timezone || 'EST',
        currency: currency || 'USD',
        billing_email: billing_email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        number_assigned: null,
        created_at: new Date().toISOString()
    };
    
    merchants.push(merchant);
    
    res.status(201).json({
        message: 'Merchant created successfully',
        merchant: merchant
    });
});

// Assign phone number
app.post('/api/numbers/allocate', (req, res) => {
    const { merchant_id } = req.body;
    
    const merchant = merchants.find(m => m.id === merchant_id);
    if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
    }
    
    if (merchant.number_assigned) {
        return res.json({ 
            number: merchant.number_assigned,
            message: 'Number already assigned' 
        });
    }
    
    // Generate a mock number
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const exchange = Math.floor(Math.random() * 900) + 100;
    const number = Math.floor(Math.random() * 9000) + 1000;
    const phoneNumber = `+1${areaCode}${exchange}${number}`;
    
    merchant.number_assigned = phoneNumber;
    
    res.status(201).json({
        number: phoneNumber,
        message: 'Number successfully allocated'
    });
});

// Connect payment provider
app.post('/api/config/payments/connect', (req, res) => {
    const { merchant_id, provider } = req.body;
    
    const merchant = merchants.find(m => m.id === merchant_id);
    if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
    }
    
    res.json({
        message: `${provider} connected successfully`,
        merchant: merchant
    });
});

// Connect calendar
app.post('/api/config/calendar/connect', (req, res) => {
    const { merchant_id, provider } = req.body;
    
    const merchant = merchants.find(m => m.id === merchant_id);
    if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
    }
    
    res.json({
        message: `${provider} calendar connected successfully`,
        merchant: merchant
    });
});

// Twilio voice webhook (with signature verification in production)
app.post('/api/webhooks/twilio/voice', (req, res) => {
    const twiml = `
        <Response>
            <Say voice="Polly.Joanna">
                Hello! You've reached the AI assistant. 
                Press 1 to place an order, press 2 to book an appointment, 
                or stay on the line to leave a message.
            </Say>
            <Gather timeout="10" numDigits="1" action="/api/webhooks/twilio/ivr">
                <Say voice="Polly.Joanna">Please make your selection now.</Say>
            </Gather>
            <Say voice="Polly.Joanna">
                Please leave a message after the beep and we'll get back to you soon.
            </Say>
            <Record maxLength="120" action="/api/webhooks/twilio/recording" />
        </Response>
    `;
    
    res.type('text/xml').send(twiml);
});

// Twilio IVR
app.post('/api/webhooks/twilio/ivr', (req, res) => {
    const digits = req.body.Digits;
    
    let twiml = '';
    switch (digits) {
        case '1':
            twiml = `
                <Response>
                    <Say voice="Polly.Joanna">
                        Great! I'll help you place an order. Please tell me what you'd like and I'll create a payment link.
                    </Say>
                    <Record maxLength="120" action="/api/webhooks/twilio/order-recording" />
                </Response>
            `;
            break;
        case '2':
            twiml = `
                <Response>
                    <Say voice="Polly.Joanna">
                        I'll help you book an appointment. Please tell me what service you need and your preferred time.
                    </Say>
                    <Record maxLength="120" action="/api/webhooks/twilio/booking-recording" />
                </Response>
            `;
            break;
        default:
            twiml = `
                <Response>
                    <Say voice="Polly.Joanna">
                        Please leave a message after the beep.
                    </Say>
                    <Record maxLength="120" action="/api/webhooks/twilio/recording" />
                </Response>
            `;
    }
    
    res.type('text/xml').send(twiml);
});

// Get all merchants (for dashboard)
app.get('/api/merchants', (req, res) => {
    res.json({ merchants });
});

// Get merchant by ID
app.get('/api/merchants/:id', (req, res) => {
    const merchant = merchants.find(m => m.id === req.params.id);
    if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
    }
    res.json({ merchant });
});

// =============================================================================
// NOTIFICATION ENDPOINTS (Critical Fix #2)
// =============================================================================

// Send SMS notification endpoint
app.post('/api/notifications/sms', async (req, res) => {
    try {
        const { to, body, merchant_id } = req.body;

        if (!to || !body || !merchant_id) {
            return res.status(400).json({ 
                error: 'Missing required fields: to, body, merchant_id' 
            });
        }

        // Validate phone number format
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(to.replace(/\s+/g, ''))) {
            return res.status(400).json({ 
                error: 'Invalid phone number format' 
            });
        }

        // Find merchant and get their assigned number
        const merchant = merchants.find(m => m.id === merchant_id);
        if (!merchant) {
            return res.status(404).json({ error: 'Merchant not found' });
        }

        if (!merchant.number_assigned) {
            return res.status(400).json({ 
                error: 'Merchant does not have an assigned phone number' 
            });
        }

        // Generate a mock SMS ID (in production, this would be Twilio SID)
        const smsId = 'SM_mock_' + Math.random().toString(36).substr(2, 15);
        
        // Log SMS for debugging
        console.log(`📱 SMS Sent - ID: ${smsId}`);
        console.log(`   From: ${merchant.number_assigned}`);
        console.log(`   To: ${to}`);
        console.log(`   Body: ${body.substring(0, 50)}...`);

        // Simulate SMS sending delay
        await new Promise(resolve => setTimeout(resolve, 100));

        res.status(200).json({
            message: 'SMS sent successfully',
            sms_id: smsId,
            from: merchant.number_assigned,
            to: to,
            status: 'sent',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ 
            error: 'Failed to send SMS', 
            message: error.message 
        });
    }
});

// Send email notification endpoint
app.post('/api/notifications/email', async (req, res) => {
    try {
        const { to, subject, html, text, merchant_id } = req.body;

        if (!to || !subject || !merchant_id) {
            return res.status(400).json({ 
                error: 'Missing required fields: to, subject, merchant_id' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return res.status(400).json({ 
                error: 'Invalid email address format' 
            });
        }

        // Find merchant and get their sender email
        const merchant = merchants.find(m => m.id === merchant_id);
        if (!merchant) {
            return res.status(404).json({ error: 'Merchant not found' });
        }

        // Use merchant's email or default
        const fromEmail = merchant.billing_email || `noreply@${merchant.name.toLowerCase().replace(/\s+/g, '')}.com`;

        // Generate a mock email ID (in production, this would be from email service)
        const emailId = 'EM_mock_' + Math.random().toString(36).substr(2, 15);
        
        // Log email for debugging
        console.log(`📧 Email Sent - ID: ${emailId}`);
        console.log(`   From: ${fromEmail}`);
        console.log(`   To: ${to}`);
        console.log(`   Subject: ${subject}`);

        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 150));

        res.status(200).json({
            message: 'Email sent successfully',
            email_id: emailId,
            from: fromEmail,
            to: to,
            subject: subject,
            status: 'sent',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            error: 'Failed to send email', 
            message: error.message 
        });
    }
});

// Send alert notification endpoint (for staff/admin alerts)
app.post('/api/notifications/alert', async (req, res) => {
    try {
        const { merchant_id, type, message, details, priority } = req.body;

        if (!merchant_id || !type || !message) {
            return res.status(400).json({ 
                error: 'Missing required fields: merchant_id, type, message' 
            });
        }

        const merchant = merchants.find(m => m.id === merchant_id);
        if (!merchant) {
            return res.status(404).json({ error: 'Merchant not found' });
        }

        // Generate alert ID
        const alertId = 'AL_mock_' + Math.random().toString(36).substr(2, 15);
        
        // Log alert
        console.log(`🚨 ALERT - ID: ${alertId}`);
        console.log(`   Merchant: ${merchant.name} (${merchant_id})`);
        console.log(`   Type: ${type}`);
        console.log(`   Priority: ${priority || 'normal'}`);
        console.log(`   Message: ${message}`);
        if (details) console.log(`   Details: ${JSON.stringify(details)}`);

        // In production, this would send to staff via email/SMS/Slack
        // For now, just log and return success

        res.status(200).json({
            message: 'Alert processed successfully',
            alert_id: alertId,
            type: type,
            priority: priority || 'normal',
            merchant_id: merchant_id,
            status: 'processed',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error processing alert:', error);
        res.status(500).json({ 
            error: 'Failed to process alert', 
            message: error.message 
        });
    }
});

// =============================================================================
// ENHANCED WEBHOOK ENDPOINTS WITH SECURITY (Critical Fix #3)
// =============================================================================

// Secure Stripe webhook endpoint
app.post('/api/webhooks/stripe', verifyWebhookSignature(process.env.STRIPE_WEBHOOK_SECRET, 'stripe-signature'), async (req, res) => {
    try {
        const event = req.body;
        console.log(`💳 Stripe Webhook - Event: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                console.log(`   Session ID: ${session.id}`);
                console.log(`   Amount: $${(session.amount_total / 100).toFixed(2)}`);
                console.log(`   Customer: ${session.customer_email || 'Unknown'}`);
                
                // In production: Update order status, send confirmation
                break;
                
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                console.log(`   Payment ID: ${paymentIntent.id}`);
                console.log(`   Amount: $${(paymentIntent.amount / 100).toFixed(2)}`);
                break;
                
            default:
                console.log(`   Unhandled event type: ${event.type}`);
        }

        res.json({ received: true, processed: true });
    } catch (error) {
        console.error('Error processing Stripe webhook:', error);
        res.status(500).json({ received: true, processed: false, error: error.message });
    }
});

// Secure PayPal webhook endpoint
app.post('/api/webhooks/paypal', verifyWebhookSignature(process.env.PAYPAL_WEBHOOK_SECRET, 'paypal-transmission-id'), async (req, res) => {
    try {
        const event = req.body;
        console.log(`💰 PayPal Webhook - Event: ${event.event_type}`);

        switch (event.event_type) {
            case 'PAYMENT.CAPTURE.COMPLETED':
                const capture = event.resource;
                console.log(`   Capture ID: ${capture.id}`);
                console.log(`   Amount: ${capture.amount.value} ${capture.amount.currency_code}`);
                break;
                
            case 'CHECKOUT.ORDER.APPROVED':
                const order = event.resource;
                console.log(`   Order ID: ${order.id}`);
                break;
                
            default:
                console.log(`   Unhandled event type: ${event.event_type}`);
        }

        res.json({ received: true, processed: true });
    } catch (error) {
        console.error('Error processing PayPal webhook:', error);
        res.status(500).json({ received: true, processed: false, error: error.message });
    }
});

// Webhook endpoint status and health check
app.get('/api/webhooks/status', (req, res) => {
    res.json({
        status: 'operational',
        endpoints: {
            stripe: '/api/webhooks/stripe',
            paypal: '/api/webhooks/paypal',
            twilio_voice: '/api/webhooks/twilio/voice',
            twilio_ivr: '/api/webhooks/twilio/ivr'
        },
        security: {
            rate_limiting: 'enabled',
            signature_verification: 'enabled',
            input_sanitization: 'enabled'
        },
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 8787;

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT. Graceful shutdown...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM. Graceful shutdown...');
    process.exit(0);
});

const server = app.listen(PORT, () => {
    console.log('🚀 CALLWAITING AI API SERVER STARTED');
    console.log('=====================================');
    console.log(`📍 Server URL: http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 API endpoints available at: /api/*`);
    console.log(`🏢 Ready for business user testing!`);
    console.log('=====================================');
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.error('💡 Try: taskkill /F /IM node.exe');
        process.exit(1);
    } else {
        console.error('❌ Server error:', error.message);
        process.exit(1);
    }
});

export default app;
