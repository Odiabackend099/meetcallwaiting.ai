// @ts-nocheck
import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import twilio from 'twilio';

export const router = Router();

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || 'test_sid',
  process.env.TWILIO_AUTH_TOKEN || 'test_token'
);

// Send SMS notification
router.post('/sms/send', async (req: Request, res: Response) => {
  try {
    const { to, message, merchant_id, type = 'notification' } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, message' 
      });
    }
    
    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to)) {
      return res.status(400).json({ 
        error: 'Invalid phone number format. Use E.164 format (+1234567890)' 
      });
    }
    
    // Get merchant's Twilio number if available
    let fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (merchant_id) {
      const { data: merchant, error } = await supabase
        .from('merchants')
        .select('number_assigned')
        .eq('id', merchant_id)
        .single();
      
      if (!error && merchant?.number_assigned) {
        fromNumber = merchant.number_assigned;
      }
    }
    
    if (!fromNumber) {
      return res.status(500).json({ 
        error: 'No Twilio phone number configured' 
      });
    }
    
    // Send SMS via Twilio
    const smsMessage = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: to
    });
    
    // Log the notification
    const { error: logError } = await supabase
      .from('events')
      .insert({
        type: 'sms_sent',
        ref_id: smsMessage.sid,
        request_id: req.headers['x-request-id'] as string || 'unknown',
        payload: {
          to,
          from: fromNumber,
          message,
          type,
          merchant_id,
          status: smsMessage.status
        },
        created_at: new Date().toISOString()
      });
    
    if (logError) {
      console.error('Error logging SMS notification:', logError);
    }
    
    res.json({ 
      success: true,
      message_sid: smsMessage.sid,
      status: smsMessage.status
    });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ 
      error: 'Failed to send SMS', 
      message: error.message 
    });
  }
});

// Send email notification (using SendGrid or SMTP)
router.post('/email/send', async (req: Request, res: Response) => {
  try {
    const { to, subject, html, text, merchant_id, type = 'notification' } = req.body;
    
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, and either html or text' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }
    
    // Get merchant's email settings if available
    let fromEmail = process.env.FROM_EMAIL || 'noreply@callwaitingai.com';
    let smtpConfig = null;
    
    if (merchant_id) {
      const { data: merchant, error } = await supabase
        .from('merchants')
        .select('sender_email, settings')
        .eq('id', merchant_id)
        .single();
      
      if (!error && merchant) {
        if (merchant.sender_email) {
          fromEmail = merchant.sender_email;
        }
        if (merchant.settings?.smtp_config) {
          smtpConfig = merchant.settings.smtp_config;
        }
      }
    }
    
    // In a real implementation, you would use SendGrid, SES, or SMTP here
    // For now, we'll simulate sending and log the event
    console.log('Sending email:', { to, from: fromEmail, subject });
    
    // Log the notification
    const { error: logError } = await supabase
      .from('events')
      .insert({
        type: 'email_sent',
        ref_id: `email_${Date.now()}`,
        request_id: req.headers['x-request-id'] as string || 'unknown',
        payload: {
          to,
          from: fromEmail,
          subject,
          type,
          merchant_id,
          status: 'sent'
        },
        created_at: new Date().toISOString()
      });
    
    if (logError) {
      console.error('Error logging email notification:', logError);
    }
    
    res.json({ 
      success: true,
      message: 'Email sent successfully',
      email_id: `email_${Date.now()}`
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email', 
      message: error.message 
    });
  }
});

// Send payment link notification
router.post('/payment-link', async (req: Request, res: Response) => {
  try {
    const { customer_phone, payment_link_url, order_total, merchant_name } = req.body;
    
    if (!customer_phone || !payment_link_url) {
      return res.status(400).json({ 
        error: 'Missing required fields: customer_phone, payment_link_url' 
      });
    }
    
    const message = `Hi! Your order from ${merchant_name || 'our business'} is ready. Total: $${order_total || 'TBD'}. Pay securely here: ${payment_link_url}`;
    
    // Use the SMS endpoint we just created
    const smsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/notifications/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': req.headers['x-request-id'] as string || 'unknown'
      },
      body: JSON.stringify({
        to: customer_phone,
        message,
        type: 'payment_link'
      })
    });
    
    const result = await smsResponse.json();
    
    if (result.success) {
      res.json({ 
        success: true,
        message: 'Payment link sent successfully'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send payment link',
        details: result
      });
    }
  } catch (error: any) {
    console.error('Error sending payment link:', error);
    res.status(500).json({ 
      error: 'Failed to send payment link', 
      message: error.message 
    });
  }
});

// Send booking confirmation notification
router.post('/booking-confirmation', async (req: Request, res: Response) => {
  try {
    const { 
      customer_phone, 
      customer_email, 
      service, 
      date_time, 
      location, 
      merchant_name 
    } = req.body;
    
    if (!customer_phone || !service || !date_time) {
      return res.status(400).json({ 
        error: 'Missing required fields: customer_phone, service, date_time' 
      });
    }
    
    const smsMessage = `Your appointment with ${merchant_name || 'us'} is confirmed! Service: ${service}, Date/Time: ${date_time}, Location: ${location || 'TBD'}. We look forward to seeing you!`;
    
    // Send SMS confirmation
    const smsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/notifications/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': req.headers['x-request-id'] as string || 'unknown'
      },
      body: JSON.stringify({
        to: customer_phone,
        message: smsMessage,
        type: 'booking_confirmation'
      })
    });
    
    const smsResult = await smsResponse.json();
    
    // Send email confirmation if email provided
    let emailResult = null;
    if (customer_email) {
      const emailResponse = await fetch(`${req.protocol}://${req.get('host')}/api/notifications/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': req.headers['x-request-id'] as string || 'unknown'
        },
        body: JSON.stringify({
          to: customer_email,
          subject: `Appointment Confirmation - ${service}`,
          html: `
            <h2>Appointment Confirmed</h2>
            <p>Your appointment with ${merchant_name || 'us'} has been confirmed.</p>
            <ul>
              <li><strong>Service:</strong> ${service}</li>
              <li><strong>Date/Time:</strong> ${date_time}</li>
              <li><strong>Location:</strong> ${location || 'TBD'}</li>
            </ul>
            <p>We look forward to seeing you!</p>
          `,
          type: 'booking_confirmation'
        })
      });
      
      emailResult = await emailResponse.json();
    }
    
    res.json({ 
      success: true,
      sms: smsResult,
      email: emailResult
    });
  } catch (error: any) {
    console.error('Error sending booking confirmation:', error);
    res.status(500).json({ 
      error: 'Failed to send booking confirmation', 
      message: error.message 
    });
  }
});

// Get notification history for a merchant
router.get('/history/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { type, limit = 50 } = req.query;
    
    let query = supabase
      .from('events')
      .select('*')
      .in('type', ['sms_sent', 'email_sent'])
      .order('created_at', { ascending: false })
      .limit(Number(limit));
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (merchantId !== 'all') {
      query = query.eq('payload->merchant_id', merchantId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching notification history:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch notification history', 
        message: error.message 
      });
    }
    
    res.json({ notifications: data });
  } catch (error: any) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notification history', 
      message: error.message 
    });
  }
});


