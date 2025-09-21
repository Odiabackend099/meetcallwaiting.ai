import { Request, Response, NextFunction } from 'express';

// Twilio signature verification middleware
export const verifyTwilioSignature = (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  const twilio = require('twilio');
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!twilioAuthToken) {
    console.warn('TWILIO_AUTH_TOKEN not set, skipping signature verification');
    return next();
  }
  
  const signature = req.header('X-Twilio-Signature');
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  
  if (!signature) {
    return res.status(400).json({ error: 'Missing X-Twilio-Signature header' });
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
  
  const requestIsValid = twilio.validateRequest(twilioAuthToken, signature, url, params);
  
  if (!requestIsValid) {
    return res.status(403).json({ error: 'Invalid signature' });
  }
  
  next();
};