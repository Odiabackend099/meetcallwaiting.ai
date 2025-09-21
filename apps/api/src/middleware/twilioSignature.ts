import { Request, Response, NextFunction } from 'express';
import twilio from 'twilio';
import crypto from 'crypto';

// Enhanced Twilio signature verification middleware
export const verifyTwilioSignature = (req: Request, res: Response, next: NextFunction) => {
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!twilioAuthToken) {
    console.warn('TWILIO_AUTH_TOKEN not set, skipping signature verification');
    return next();
  }
  
  const signature = req.header('X-Twilio-Signature');
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  
  if (!signature) {
    console.error('Missing X-Twilio-Signature header', {
      requestId: (req as any).requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    return res.status(400).json({ 
      error: 'Missing X-Twilio-Signature header',
      code: 'TWILIO_SIGNATURE_MISSING'
    });
  }
  
  // Create a copy of the request body with only string values
  const params: Record<string, string> = {};
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        params[key] = value;
      } else if (typeof value !== 'undefined') {
        params[key] = String(value);
      }
    }
  }
  
  try {
    const requestIsValid = twilio.validateRequest(twilioAuthToken, signature, url, params);
    
    if (!requestIsValid) {
      console.error('Invalid Twilio signature', {
        requestId: (req as any).requestId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url,
        signature: signature.substring(0, 10) + '...' // Log partial signature for debugging
      });
      return res.status(403).json({ 
        error: 'Invalid signature',
        code: 'TWILIO_SIGNATURE_INVALID'
      });
    }
    
    next();
  } catch (error) {
    console.error('Twilio signature verification error:', {
      requestId: (req as any).requestId,
      error: error.message,
      ip: req.ip
    });
    return res.status(500).json({ 
      error: 'Signature verification failed',
      code: 'TWILIO_SIGNATURE_ERROR'
    });
  }
};

// Stripe signature verification middleware
export const verifyStripeSignature = (req: Request, res: Response, next: NextFunction) => {
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!stripeWebhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET not set, skipping signature verification');
    return next();
  }
  
  const signature = req.header('stripe-signature');
  const rawBody = (req as any).rawBody;
  
  if (!signature) {
    console.error('Missing stripe-signature header', {
      requestId: (req as any).requestId,
      ip: req.ip
    });
    return res.status(400).json({ 
      error: 'Missing stripe-signature header',
      code: 'STRIPE_SIGNATURE_MISSING'
    });
  }
  
  if (!rawBody) {
    console.error('Missing raw body for Stripe signature verification', {
      requestId: (req as any).requestId
    });
    return res.status(400).json({ 
      error: 'Missing request body',
      code: 'STRIPE_BODY_MISSING'
    });
  }
  
  try {
    const elements = signature.split(',');
    const signatureHash = elements.find(el => el.startsWith('v1='))?.split('=')[1];
    const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];
    
    if (!signatureHash || !timestamp) {
      throw new Error('Invalid signature format');
    }
    
    // Check timestamp (prevent replay attacks)
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp);
    
    if (Math.abs(currentTime - requestTime) > 300) { // 5 minutes tolerance
      throw new Error('Request timestamp too old');
    }
    
    // Verify signature
    const payload = timestamp + '.' + rawBody.toString();
    const expectedSignature = crypto
      .createHmac('sha256', stripeWebhookSecret)
      .update(payload, 'utf8')
      .digest('hex');
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signatureHash, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    
    if (!isValid) {
      console.error('Invalid Stripe signature', {
        requestId: (req as any).requestId,
        ip: req.ip,
        timestamp,
        signatureHash: signatureHash.substring(0, 10) + '...'
      });
      return res.status(403).json({ 
        error: 'Invalid signature',
        code: 'STRIPE_SIGNATURE_INVALID'
      });
    }
    
    next();
  } catch (error) {
    console.error('Stripe signature verification error:', {
      requestId: (req as any).requestId,
      error: error.message,
      ip: req.ip
    });
    return res.status(500).json({ 
      error: 'Signature verification failed',
      code: 'STRIPE_SIGNATURE_ERROR'
    });
  }
};

// PayPal signature verification middleware
export const verifyPayPalSignature = (req: Request, res: Response, next: NextFunction) => {
  const paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID;
  
  if (!paypalWebhookId) {
    console.warn('PAYPAL_WEBHOOK_ID not set, skipping signature verification');
    return next();
  }
  
  const signature = req.header('PAYPAL-TRANSMISSION-SIG');
  const certId = req.header('PAYPAL-CERT-ID');
  const transmissionId = req.header('PAYPAL-TRANSMISSION-ID');
  const timestamp = req.header('PAYPAL-TRANSMISSION-TIME');
  
  if (!signature || !certId || !transmissionId || !timestamp) {
    console.error('Missing PayPal webhook headers', {
      requestId: (req as any).requestId,
      ip: req.ip,
      headers: {
        signature: !!signature,
        certId: !!certId,
        transmissionId: !!transmissionId,
        timestamp: !!timestamp
      }
    });
    return res.status(400).json({ 
      error: 'Missing PayPal webhook headers',
      code: 'PAYPAL_HEADERS_MISSING'
    });
  }
  
  // For production, you would verify the certificate and signature
  // This is a simplified version
  try {
    // Check timestamp (prevent replay attacks)
    const requestTime = new Date(timestamp).getTime();
    const currentTime = Date.now();
    
    if (Math.abs(currentTime - requestTime) > 300000) { // 5 minutes tolerance
      throw new Error('Request timestamp too old');
    }
    
    // In production, verify the certificate and signature
    // For now, we'll just validate the format
    if (!signature.match(/^[A-Za-z0-9+/=]+$/)) {
      throw new Error('Invalid signature format');
    }
    
    next();
  } catch (error) {
    console.error('PayPal signature verification error:', {
      requestId: (req as any).requestId,
      error: error.message,
      ip: req.ip
    });
    return res.status(500).json({ 
      error: 'Signature verification failed',
      code: 'PAYPAL_SIGNATURE_ERROR'
    });
  }
};