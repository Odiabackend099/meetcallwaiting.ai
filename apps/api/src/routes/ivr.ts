// IVR Routes for CallWaiting.ai
// Handles Twilio webhook callbacks for phone interactions

import { Router, Request, Response } from 'express';
import twilioService from '../services/twilioService.js';

export const router = Router();

// Handle incoming calls
router.post('/incoming', async (req: Request, res: Response) => {
  try {
    const { CallSid, From, To } = req.body;
    
    console.log('Incoming call webhook:', { CallSid, From, To });
    
    const twimlResponse = await twilioService.handleIncomingCall(CallSid, From, To);
    
    res.type('text/xml');
    res.send(twimlResponse);
  } catch (error) {
    console.error('Error handling incoming call:', error);
    res.type('text/xml');
    res.send(`
      <Response>
        <Say>Sorry, we are experiencing technical difficulties. Please try again later.</Say>
        <Hangup/>
      </Response>
    `);
  }
});

// Handle menu response
router.post('/menu-response', async (req: Request, res: Response) => {
  try {
    const { CallSid, Digits, From } = req.body;
    
    console.log('Menu response webhook:', { CallSid, Digits, From });
    
    const twimlResponse = await twilioService.handleMenuResponse(CallSid, Digits, From);
    
    res.type('text/xml');
    res.send(twimlResponse);
  } catch (error) {
    console.error('Error handling menu response:', error);
    res.type('text/xml');
    res.send(`
      <Response>
        <Say>Sorry, we are experiencing technical difficulties.</Say>
        <Hangup/>
      </Response>
    `);
  }
});

// Handle order details from speech
router.post('/order-details', async (req: Request, res: Response) => {
  try {
    const { CallSid, SpeechResult, From } = req.body;
    
    console.log('Order details webhook:', { CallSid, SpeechResult, From });
    
    const twimlResponse = await twilioService.processOrderDetails(CallSid, SpeechResult, From);
    
    res.type('text/xml');
    res.send(twimlResponse);
  } catch (error) {
    console.error('Error processing order details:', error);
    res.type('text/xml');
    res.send(`
      <Response>
        <Say>Sorry, I encountered an error processing your order.</Say>
        <Hangup/>
      </Response>
    `);
  }
});

// Handle booking details from speech
router.post('/booking-details', async (req: Request, res: Response) => {
  try {
    const { CallSid, SpeechResult, From } = req.body;
    
    console.log('Booking details webhook:', { CallSid, SpeechResult, From });
    
    const twimlResponse = await twilioService.processBookingDetails(CallSid, SpeechResult, From);
    
    res.type('text/xml');
    res.send(twimlResponse);
  } catch (error) {
    console.error('Error processing booking details:', error);
    res.type('text/xml');
    res.send(`
      <Response>
        <Say>Sorry, I encountered an error processing your booking.</Say>
        <Hangup/>
      </Response>
    `);
  }
});

// Handle human transfer
router.post('/human-transfer', async (req: Request, res: Response) => {
  try {
    const { CallSid, From } = req.body;
    
    console.log('Human transfer webhook:', { CallSid, From });
    
    res.type('text/xml');
    res.send(`
      <Response>
        <Say>Please hold while I connect you with a human representative.</Say>
        <Dial timeout="30" record="record-from-ringing">
          <Number>+1234567890</Number>
        </Dial>
        <Say>I am sorry, but no one is available right now. Please leave a message after the beep.</Say>
        <Record maxLength="120" action="/api/ivr/voicemail" method="POST"/>
      </Response>
    `);
  } catch (error) {
    console.error('Error handling human transfer:', error);
    res.type('text/xml');
    res.send(`
      <Response>
        <Say>Sorry, we are experiencing technical difficulties.</Say>
        <Hangup/>
      </Response>
    `);
  }
});

// Handle voicemail
router.post('/voicemail', async (req: Request, res: Response) => {
  try {
    const { CallSid, From, RecordingUrl, RecordingDuration } = req.body;
    
    console.log('Voicemail webhook:', { CallSid, From, RecordingUrl, RecordingDuration });
    
    // Log the voicemail
    const { supabase } = await import('../utils/supabaseClient.js');
    
    const { error } = await supabase
      .from('call_logs')
      .update({
        status: 'completed',
        ai_response_type: 'voicemail',
        recording_url: RecordingUrl,
        duration_seconds: parseInt(RecordingDuration)
      })
      .eq('call_sid', CallSid);
    
    if (error) {
      console.error('Error logging voicemail:', error);
    }
    
    res.type('text/xml');
    res.send(`
      <Response>
        <Say>Thank you for your message. We will get back to you as soon as possible.</Say>
        <Hangup/>
      </Response>
    `);
  } catch (error) {
    console.error('Error handling voicemail:', error);
    res.type('text/xml');
    res.send(`
      <Response>
        <Say>Thank you for your message.</Say>
        <Hangup/>
      </Response>
    `);
  }
});

// Fallback for menu
router.post('/fallback', async (req: Request, res: Response) => {
  try {
    const { CallSid, From } = req.body;
    
    console.log('Menu fallback webhook:', { CallSid, From });
    
    res.type('text/xml');
    res.send(`
      <Response>
        <Say>I did not hear anything. Let me transfer you to a human representative.</Say>
        <Redirect>/api/ivr/human-transfer</Redirect>
      </Response>
    `);
  } catch (error) {
    console.error('Error handling fallback:', error);
    res.type('text/xml');
    res.send(`
      <Response>
        <Say>Sorry, we are experiencing technical difficulties.</Say>
        <Hangup/>
      </Response>
    `);
  }
});

// Status callback for call completion
router.post('/status-callback', async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;
    
    console.log('Status callback webhook:', { CallSid, CallStatus, CallDuration });
    
    // Update call log with final status
    const { supabase } = await import('../utils/supabaseClient.js');
    
    const { error } = await supabase
      .from('call_logs')
      .update({
        status: CallStatus === 'completed' ? 'completed' : 'failed',
        duration_seconds: CallDuration ? parseInt(CallDuration) : null
      })
      .eq('call_sid', CallSid);
    
    if (error) {
      console.error('Error updating call status:', error);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling status callback:', error);
    res.status(500).send('Error');
  }
});