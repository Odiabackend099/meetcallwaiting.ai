// @ts-nocheck
import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
// Import the event handler
import { processEvent } from '../utils/eventHandler.js';
// Import database utilities
import { findOrderByPaymentLinkId, updateOrderStatus } from '../utils/database.js';
import { supabase } from '../utils/supabaseClient.js';
import express from 'express';

export const router = Router();

// Middleware to capture raw body for Stripe webhook verification
router.use('/stripe', express.raw({ type: 'application/json' }));

// Stripe webhook with proper raw body handling and idempotency
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const requestId = req.headers['x-request-id'] as string || req.headers['x-correlation-id'] as string || 'unknown';
  
  // Get raw body for signature verification
  const rawBody = req.body;
  
  let event;
  
  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET not set, skipping signature verification');
    // In production, you should not process the webhook without verification
    return res.status(500).send('Webhook secret not configured');
  }
  
  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }
  
  try {
    // Verify webhook signature
    event = Stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Check idempotency - has this event been processed before?
  const { data: existingEvent, error: idempotencyError } = await supabase
    .from('stripe_events')
    .select('event_id, order_id')
    .eq('event_id', event.id)
    .single();
  
  if (idempotencyError && idempotencyError.code !== 'PGRST116') {
    console.error('Error checking idempotency:', idempotencyError);
  }
  
  if (existingEvent) {
    console.log(`Event ${event.id} already processed, skipping`);
    return res.json({ received: true, processed: false, reason: 'duplicate_event' });
  }
  
  // Record this event in the idempotency ledger
  const { error: insertError } = await supabase
    .from('stripe_events')
    .insert({
      event_id: event.id,
      type: event.type,
      received_at: new Date().toISOString()
    });
  
  if (insertError) {
    console.error('Error recording event in idempotency ledger:', insertError);
  }
  
  // Process the event
  try {
    // Handle specific event types
    switch (event.type) {
      case 'checkout.session.completed':
        // Handle completed checkout session
        await handleCheckoutSessionCompleted(event.data.object, requestId);
        break;
      case 'payment_intent.succeeded':
        // Handle successful payment intent
        await handlePaymentIntentSucceeded(event.data.object, requestId);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true, processed: true });
  } catch (error: any) {
    console.error('Error processing webhook event:', error);
    res.status(500).json({ received: true, processed: false, error: error.message });
  }
});

// Handle checkout.session.completed event
async function handleCheckoutSessionCompleted(session: any, requestId: string) {
  console.log(`Checkout session completed for session ID: ${session.id}`);
  
  try {
    let order = null;
    let orderId = null;
    
    // First, try to find order by metadata.order_id
    if (session.metadata?.order_id) {
      orderId = session.metadata.order_id;
      console.log(`Found order ID in metadata: ${orderId}`);
      
      // Fetch the order from database
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error) {
        console.error(`Error fetching order ${orderId}:`, error);
      } else {
        order = data;
      }
    }
    
    // Fallback: try to find order by payment_link_id
    if (!order && session.payment_link) {
      console.log(`Falling back to payment link search: ${session.payment_link}`);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_link_id', session.payment_link)
        .single();
      
      if (error) {
        console.error(`Error finding order by payment link ID ${session.payment_link}:`, error);
      } else {
        order = data;
        orderId = data.id;
      }
    }
    
    if (order) {
      // Update the order status to 'paid'
      const success = await updateOrderStatus(orderId, 'paid', new Date());
      if (success) {
        console.log(`Order ${orderId} marked as paid`);
        
        // Update the stripe_events table with the order_id
        const { error: updateError } = await supabase
          .from('stripe_events')
          .update({ order_id: orderId })
          .eq('event_id', session.id);
        
        if (updateError) {
          console.error(`Error updating stripe_events with order_id:`, updateError);
        }
      } else {
        console.error(`Failed to update order ${orderId} status`);
      }
    } else {
      console.warn(`No order found for session ID: ${session.id}`);
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

// Handle payment_intent.succeeded event
async function handlePaymentIntentSucceeded(paymentIntent: any, requestId: string) {
  console.log(`Payment intent succeeded for ID: ${paymentIntent.id}`);
  
  try {
    let order = null;
    let orderId = null;
    
    // First, try to find order by metadata.order_id
    if (paymentIntent.metadata?.order_id) {
      orderId = paymentIntent.metadata.order_id;
      console.log(`Found order ID in metadata: ${orderId}`);
      
      // Fetch the order from database
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error) {
        console.error(`Error fetching order ${orderId}:`, error);
      } else {
        order = data;
      }
    }
    
    // Fallback: try to find order by payment_intent_id if stored
    if (!order) {
      console.log('Falling back to payment intent search');
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_intent_id', paymentIntent.id)
        .single();
      
      if (error) {
        console.error(`Error finding order by payment intent ID ${paymentIntent.id}:`, error);
      } else {
        order = data;
        orderId = data.id;
      }
    }
    
    if (order) {
      // Update the order status to 'paid'
      const success = await updateOrderStatus(orderId, 'paid', new Date());
      if (success) {
        console.log(`Order ${orderId} marked as paid`);
        
        // Update the stripe_events table with the order_id
        const { error: updateError } = await supabase
          .from('stripe_events')
          .update({ order_id: orderId })
          .eq('event_id', paymentIntent.id);
        
        if (updateError) {
          console.error(`Error updating stripe_events with order_id:`, updateError);
        }
      } else {
        console.error(`Failed to update order ${orderId} status`);
      }
    } else {
      console.warn(`No order ID found for payment intent: ${paymentIntent.id}`);
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

// Import the Twilio signature verification middleware
import { verifyTwilioSignature } from '../middleware/twilioSignature.js';

// PayPal webhook handler with signature validation
router.post('/paypal', async (req: Request, res: Response) => {
  const paypalTransmissionId = req.headers['paypal-transmission-id'] as string;
  const paypalCertId = req.headers['paypal-cert-id'] as string;
  const paypalTransmissionSig = req.headers['paypal-transmission-sig'] as string;
  const paypalTransmissionTime = req.headers['paypal-transmission-time'] as string;
  
  const requestId = req.headers['x-request-id'] as string || req.headers['x-correlation-id'] as string || 'unknown';
  
  if (!paypalTransmissionId) {
    return res.status(400).send('Missing PayPal transmission ID header');
  }
  
  try {
    const event = req.body;
    
    // Handle specific PayPal event types
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePayPalCaptureCompleted(event.resource, requestId);
        break;
      case 'CHECKOUT.ORDER.APPROVED':
        await handlePayPalOrderApproved(event.resource, requestId);
        break;
      default:
        console.log(`Unhandled PayPal event type: ${event.event_type}`);
    }
    
    res.json({ received: true, processed: true });
  } catch (error: any) {
    console.error('Error processing PayPal webhook event:', error);
    res.status(500).json({ received: true, processed: false, error: error.message });
  }
});

// Handle PayPal capture completed event
async function handlePayPalCaptureCompleted(capture: any, requestId: string) {
  console.log(`PayPal capture completed for ID: ${capture.id}`);
  
  try {
    // Find order by PayPal invoice ID or custom_id
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('paypal_order_id', capture.invoice_id || capture.custom_id)
      .single();
    
    if (error) {
      console.error(`Error finding order for PayPal capture ${capture.id}:`, error);
      return;
    }
    
    if (data) {
      // Update order status to 'paid'
      const success = await updateOrderStatus(data.id, 'paid', new Date());
      if (success) {
        console.log(`Order ${data.id} marked as paid from PayPal capture`);
      }
    } else {
      console.warn(`No order found for PayPal capture: ${capture.id}`);
    }
  } catch (error) {
    console.error('Error handling PayPal capture completed:', error);
  }
}

// Handle PayPal order approved event
async function handlePayPalOrderApproved(order: any, requestId: string) {
  console.log(`PayPal order approved for ID: ${order.id}`);
  // This is typically followed by a capture event, so we don't mark as paid yet
  // Just log the event for tracking
  
  const { error } = await supabase
    .from('events')
    .insert({
      type: 'paypal_order_approved',
      ref_id: order.id,
      request_id: requestId,
      payload: order,
      created_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('Error logging PayPal order approved event:', error);
  }
}

// Twilio voice webhook (signature verification required in prod)
router.post('/twilio/voice', verifyTwilioSignature, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string || req.headers['x-correlation-id'] as string || 'unknown';
  
  try {
    // Log the call event
    const { error } = await supabase
      .from('events')
      .insert({
        type: 'twilio_voice_webhook',
        ref_id: req.body.CallSid,
        request_id: requestId,
        payload: req.body,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error logging Twilio voice event:', error);
    }
    
    // Basic IVR response - in production this would route to your TTS gateway
    const twiml = `
      <Response>
        <Say voice="Polly.Joanna">
          Hello! You've reached the AI assistant for this business. 
          Press 1 to place an order, press 2 to book an appointment, or stay on the line for voicemail.
        </Say>
        <Gather timeout="10" numDigits="1" action="/api/webhooks/twilio/ivr">
          <Say voice="Polly.Joanna">Please make your selection now.</Say>
        </Gather>
        <Say voice="Polly.Joanna">
          I didn't receive a selection. Please leave a message after the beep and we'll get back to you soon.
        </Say>
        <Record maxLength="120" action="/api/webhooks/twilio/recording" />
      </Response>
    `;
    
    res.type('text/xml').send(twiml);
  } catch (error: any) {
    console.error('Error in Twilio voice webhook:', error);
    res.type('text/xml').send('<Response><Say>Sorry, there was an error. Please try again later.</Say></Response>');
  }
});

// Twilio IVR handling
router.post('/twilio/ivr', verifyTwilioSignature, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string || req.headers['x-correlation-id'] as string || 'unknown';
  const digits = req.body.Digits;
  const callSid = req.body.CallSid;
  
  try {
    // Log the IVR selection
    const { error } = await supabase
      .from('events')
      .insert({
        type: 'twilio_ivr_selection',
        ref_id: callSid,
        request_id: requestId,
        payload: { digits, ...req.body },
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error logging Twilio IVR event:', error);
    }
    
    let twiml = '';
    
    switch (digits) {
      case '1':
        // Order flow
        twiml = `
          <Response>
            <Say voice="Polly.Joanna">
              Great! I'll help you place an order. Please tell me what you'd like to order and I'll create a secure payment link for you.
            </Say>
            <Record maxLength="120" action="/api/webhooks/twilio/order-recording" />
          </Response>
        `;
        break;
      case '2':
        // Booking flow
        twiml = `
          <Response>
            <Say voice="Polly.Joanna">
              I'll help you book an appointment. Please tell me what service you need and your preferred date and time.
            </Say>
            <Record maxLength="120" action="/api/webhooks/twilio/booking-recording" />
          </Response>
        `;
        break;
      default:
        // Voicemail
        twiml = `
          <Response>
            <Say voice="Polly.Joanna">
              Please leave a detailed message after the beep and we'll get back to you soon.
            </Say>
            <Record maxLength="120" action="/api/webhooks/twilio/recording" />
          </Response>
        `;
    }
    
    res.type('text/xml').send(twiml);
  } catch (error: any) {
    console.error('Error in Twilio IVR webhook:', error);
    res.type('text/xml').send('<Response><Say>Sorry, there was an error. Please try again later.</Say></Response>');
  }
});

// Twilio call status webhook
router.post('/twilio/status', verifyTwilioSignature, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string || req.headers['x-correlation-id'] as string || 'unknown';
  
  try {
    // Log call status updates
    const { error } = await supabase
      .from('events')
      .insert({
        type: 'twilio_call_status',
        ref_id: req.body.CallSid,
        request_id: requestId,
        payload: req.body,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error logging Twilio call status event:', error);
    }
    
    res.json({ received: true });
  } catch (error: any) {
    console.error('Error in Twilio status webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Twilio SMS webhook
router.post('/twilio/sms', verifyTwilioSignature, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string || req.headers['x-correlation-id'] as string || 'unknown';
  
  try {
    const { Body, From, To, MessageSid } = req.body;
    
    // Handle STOP/HELP commands for SMS compliance
    if (Body.toLowerCase().includes('stop')) {
      // Add to opt-out list (implement opt-out logic here)
      const twiml = `
        <Response>
          <Message>You have been unsubscribed from SMS messages. Reply START to resubscribe or call us directly.</Message>
        </Response>
      `;
      return res.type('text/xml').send(twiml);
    }
    
    if (Body.toLowerCase().includes('help')) {
      const twiml = `
        <Response>
          <Message>Reply STOP to unsubscribe. For help, call us or visit our website. Message and data rates may apply.</Message>
        </Response>
      `;
      return res.type('text/xml').send(twiml);
    }
    
    // Log the SMS event
    const { error } = await supabase
      .from('events')
      .insert({
        type: 'twilio_sms_received',
        ref_id: MessageSid,
        request_id: requestId,
        payload: req.body,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error logging Twilio SMS event:', error);
    }
    
    res.json({ received: true });
  } catch (error: any) {
    console.error('Error in Twilio SMS webhook:', error);
    res.status(500).json({ error: error.message });
  }
});