// Twilio Service for CallWaiting.ai
// Handles actual phone call processing and AI interactions

import twilio from 'twilio';
import { supabase } from '../utils/supabaseClient.js';
import ttsService from './ttsService.js';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  webhookUrl: string;
  apiKey: string;
  apiSecret: string;
}

interface CallContext {
  merchantId: string;
  phoneNumber: string;
  callSid: string;
  businessName: string;
  planType: string;
  services: {
    orders: boolean;
    bookings: boolean;
  };
}

class TwilioService {
  private client: twilio.Twilio;
  private config: TwilioConfig;

  constructor() {
    this.config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      webhookUrl: process.env.TWILIO_WEBHOOK_URL || '',
      apiKey: process.env.TWILIO_API_KEY || '',
      apiSecret: process.env.TWILIO_API_SECRET || ''
    };

    if (this.config.accountSid && this.config.authToken) {
      this.client = twilio(this.config.accountSid, this.config.authToken);
    } else {
      console.warn('Twilio credentials not configured');
    }
  }

  // Handle incoming call
  async handleIncomingCall(callSid: string, from: string, to: string): Promise<string> {
    try {
      console.log(`Incoming call from ${from} to ${to}, SID: ${callSid}`);

      // Find merchant by phone number
      const merchant = await this.findMerchantByPhoneNumber(to);
      if (!merchant) {
        console.error(`No merchant found for phone number: ${to}`);
        return this.generateErrorResponse('Sorry, this number is not configured.');
      }

      // Log the call
      await this.logCall({
        merchantId: merchant.id,
        phoneNumber: from,
        callSid,
        direction: 'inbound',
        status: 'in-progress'
      });

      // Generate AI greeting
      const greetingResponse = await ttsService.generateCallWaitingGreeting(
        merchant.name,
        merchant.voice_preference || 'en-US-JennyNeural',
        merchant.language_preference || 'en-US'
      );

      if (!greetingResponse.success) {
        console.error('Failed to generate greeting:', greetingResponse.error);
        return this.generateErrorResponse('Welcome to ' + merchant.name + '. How can I help you?');
      }

      // Create TwiML response with greeting and menu
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Play greeting
      if (greetingResponse.audioData) {
        // In production, you'd save this to a CDN and use the URL
        const greetingUrl = await this.saveAudioToCDN(greetingResponse.audioData, `greeting_${merchant.id}.wav`);
        twiml.play(greetingUrl);
      } else {
        twiml.say(`Welcome to ${merchant.name}. How can I help you today?`);
      }

      // Add menu options
      twiml.gather({
        numDigits: 1,
        timeout: 10,
        action: `${this.config.webhookUrl}/api/ivr/menu-response`,
        method: 'POST'
      })
      .say('Press 1 for orders, press 2 for appointments, or press 0 to speak with a human.');

      // Fallback if no input
      twiml.redirect(`${this.config.webhookUrl}/api/ivr/fallback`);

      return twiml.toString();

    } catch (error) {
      console.error('Error handling incoming call:', error);
      return this.generateErrorResponse('Sorry, we are experiencing technical difficulties.');
    }
  }

  // Handle menu response
  async handleMenuResponse(callSid: string, digits: string, from: string): Promise<string> {
    try {
      const merchant = await this.getMerchantFromCall(callSid);
      if (!merchant) {
        return this.generateErrorResponse('Call context not found.');
      }

      const twiml = new twilio.twiml.VoiceResponse();

      switch (digits) {
        case '1':
          // Handle orders
          await this.logCallUpdate(callSid, 'in-progress', 'order');
          return await this.handleOrderFlow(merchant, from, callSid);
          
        case '2':
          // Handle appointments
          await this.logCallUpdate(callSid, 'in-progress', 'appointment');
          return await this.handleBookingFlow(merchant, from, callSid);
          
        case '0':
          // Transfer to human
          await this.logCallUpdate(callSid, 'in-progress', 'transfer');
          return await this.handleHumanTransfer(merchant, from, callSid);
          
        default:
          twiml.say('Sorry, I did not understand that option.');
          twiml.redirect(`${this.config.webhookUrl}/api/ivr/menu`);
          return twiml.toString();
      }

    } catch (error) {
      console.error('Error handling menu response:', error);
      return this.generateErrorResponse('Sorry, we are experiencing technical difficulties.');
    }
  }

  // Handle order flow
  private async handleOrderFlow(merchant: any, customerPhone: string, callSid: string): Promise<string> {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Generate order greeting
    const orderResponse = await ttsService.generateSpeech(
      `Great! I can help you place an order with ${merchant.name}. What would you like to order today?`,
      {
        voice: merchant.voice_preference || 'en-US-JennyNeural',
        language: merchant.language_preference || 'en-US'
      }
    );

    if (orderResponse.success && orderResponse.audioData) {
      const orderUrl = await this.saveAudioToCDN(orderResponse.audioData, `order_greeting_${merchant.id}.wav`);
      twiml.play(orderUrl);
    } else {
      twiml.say(`Great! I can help you place an order with ${merchant.name}. What would you like to order today?`);
    }

    // Collect order details
    twiml.gather({
      timeout: 30,
      speechTimeout: 5,
      action: `${this.config.webhookUrl}/api/ivr/order-details`,
      method: 'POST',
      input: 'speech'
    });

    // Fallback
    twiml.say('I did not hear anything. Let me transfer you to a human.');
    twiml.redirect(`${this.config.webhookUrl}/api/ivr/human-transfer`);

    return twiml.toString();
  }

  // Handle booking flow
  private async handleBookingFlow(merchant: any, customerPhone: string, callSid: string): Promise<string> {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Generate booking greeting
    const bookingResponse = await ttsService.generateSpeech(
      `Perfect! I can help you book an appointment with ${merchant.name}. What type of service are you looking for?`,
      {
        voice: merchant.voice_preference || 'en-US-JennyNeural',
        language: merchant.language_preference || 'en-US'
      }
    );

    if (bookingResponse.success && bookingResponse.audioData) {
      const bookingUrl = await this.saveAudioToCDN(bookingResponse.audioData, `booking_greeting_${merchant.id}.wav`);
      twiml.play(bookingUrl);
    } else {
      twiml.say(`Perfect! I can help you book an appointment with ${merchant.name}. What type of service are you looking for?`);
    }

    // Collect booking details
    twiml.gather({
      timeout: 30,
      speechTimeout: 5,
      action: `${this.config.webhookUrl}/api/ivr/booking-details`,
      method: 'POST',
      input: 'speech'
    });

    // Fallback
    twiml.say('I did not hear anything. Let me transfer you to a human.');
    twiml.redirect(`${this.config.webhookUrl}/api/ivr/human-transfer`);

    return twiml.toString();
  }

  // Handle human transfer
  private async handleHumanTransfer(merchant: any, customerPhone: string, callSid: string): Promise<string> {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Generate hold message
    const holdResponse = await ttsService.generateHoldMessage(
      merchant.name,
      merchant.voice_preference || 'en-US-JennyNeural',
      merchant.language_preference || 'en-US'
    );

    if (holdResponse.success && holdResponse.audioData) {
      const holdUrl = await this.saveAudioToCDN(holdResponse.audioData, `hold_message_${merchant.id}.wav`);
      twiml.play(holdUrl);
    } else {
      twiml.say(`Please hold while I connect you with someone from ${merchant.name}.`);
    }

    // Transfer to business phone or voicemail
    if (merchant.business_phone) {
      twiml.dial(merchant.business_phone, {
        timeout: 30,
        record: 'record-from-ringing'
      });
    } else {
      // No business phone, take voicemail
      twiml.say('I am sorry, but no one is available right now. Please leave a message after the beep.');
      twiml.record({
        maxLength: 120,
        action: `${this.config.webhookUrl}/api/ivr/voicemail`,
        method: 'POST'
      });
    }

    return twiml.toString();
  }

  // Process order details from speech
  async processOrderDetails(callSid: string, speechResult: string, from: string): Promise<string> {
    try {
      const merchant = await this.getMerchantFromCall(callSid);
      if (!merchant) {
        return this.generateErrorResponse('Call context not found.');
      }

      // Here you would integrate with your order processing system
      // For now, we'll create a mock order
      const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const orderTotal = 25.99; // Mock total

      // Log the order
      const { error } = await supabase
        .from('orders')
        .insert({
          merchant_id: merchant.id,
          customer_phone: from,
          order_details: speechResult,
          total_amount: orderTotal,
          status: 'pending_payment',
          call_sid: callSid,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging order:', error);
      }

      // Generate order confirmation
      const confirmationResponse = await ttsService.generateOrderConfirmation(
        merchant.name,
        orderTotal,
        merchant.currency || 'USD',
        null, // customer name not available
        merchant.voice_preference || 'en-US-JennyNeural',
        merchant.language_preference || 'en-US'
      );

      const twiml = new twilio.twiml.VoiceResponse();

      if (confirmationResponse.success && confirmationResponse.audioData) {
        const confirmationUrl = await this.saveAudioToCDN(confirmationResponse.audioData, `order_confirmation_${orderId}.wav`);
        twiml.play(confirmationUrl);
      } else {
        twiml.say(`Great! Your order totals $${orderTotal.toFixed(2)}. I'm sending you a secure payment link now.`);
      }

      // End call
      twiml.hangup();

      // Send WhatsApp/SMS with payment link (implement separately)
      // await this.sendPaymentLink(from, orderId, orderTotal);

      return twiml.toString();

    } catch (error) {
      console.error('Error processing order details:', error);
      return this.generateErrorResponse('Sorry, I encountered an error processing your order.');
    }
  }

  // Process booking details from speech
  async processBookingDetails(callSid: string, speechResult: string, from: string): Promise<string> {
    try {
      const merchant = await this.getMerchantFromCall(callSid);
      if (!merchant) {
        return this.generateErrorResponse('Call context not found.');
      }

      // Mock appointment scheduling
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 1);
      const appointmentTime = '3:00 PM';

      // Log the booking
      const { error } = await supabase
        .from('bookings')
        .insert({
          merchant_id: merchant.id,
          customer_phone: from,
          service_details: speechResult,
          appointment_date: appointmentDate.toISOString().split('T')[0],
          appointment_time: appointmentTime,
          status: 'pending_confirmation',
          call_sid: callSid,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging booking:', error);
      }

      // Generate appointment confirmation
      const confirmationResponse = await ttsService.generateAppointmentConfirmation(
        merchant.name,
        appointmentDate.toLocaleDateString(),
        appointmentTime,
        null, // customer name not available
        merchant.voice_preference || 'en-US-JennyNeural',
        merchant.language_preference || 'en-US'
      );

      const twiml = new twilio.twiml.VoiceResponse();

      if (confirmationResponse.success && confirmationResponse.audioData) {
        const confirmationUrl = await this.saveAudioToCDN(confirmationResponse.audioData, `booking_confirmation_${Date.now()}.wav`);
        twiml.play(confirmationUrl);
      } else {
        twiml.say(`Perfect! Your appointment with ${merchant.name} is confirmed for ${appointmentDate.toLocaleDateString()} at ${appointmentTime}.`);
      }

      // End call
      twiml.hangup();

      // Send WhatsApp/SMS confirmation (implement separately)
      // await this.sendBookingConfirmation(from, appointmentDate, appointmentTime);

      return twiml.toString();

    } catch (error) {
      console.error('Error processing booking details:', error);
      return this.generateErrorResponse('Sorry, I encountered an error processing your booking.');
    }
  }

  // Helper methods
  private async findMerchantByPhoneNumber(phoneNumber: string): Promise<any> {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (error) {
      console.error('Error finding merchant:', error);
      return null;
    }

    return data;
  }

  private async getMerchantFromCall(callSid: string): Promise<any> {
    const { data, error } = await supabase
      .from('call_logs')
      .select('merchant_id, merchants(*)')
      .eq('call_sid', callSid)
      .single();

    if (error) {
      console.error('Error getting merchant from call:', error);
      return null;
    }

    return data.merchants;
  }

  private async logCall(callData: any): Promise<void> {
    const { error } = await supabase
      .from('call_logs')
      .insert(callData);

    if (error) {
      console.error('Error logging call:', error);
    }
  }

  private async logCallUpdate(callSid: string, status: string, aiResponseType?: string): Promise<void> {
    const updateData: any = { status };
    if (aiResponseType) {
      updateData.ai_response_type = aiResponseType;
    }

    const { error } = await supabase
      .from('call_logs')
      .update(updateData)
      .eq('call_sid', callSid);

    if (error) {
      console.error('Error updating call log:', error);
    }
  }

  private async saveAudioToCDN(audioData: Buffer, filename: string): Promise<string> {
    // In production, save to AWS S3, Cloudinary, or similar
    // For now, return a placeholder URL
    console.log(`Saving audio file: ${filename}`);
    return `https://your-cdn.com/audio/${filename}`;
  }

  private generateErrorResponse(message: string): string {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(message);
    twiml.hangup();
    return twiml.toString();
  }

  // Webhook verification
  validateWebhook(signature: string, url: string, params: any): boolean {
    try {
      return twilio.validateRequest(
        this.config.authToken,
        signature,
        url,
        params
      );
    } catch (error) {
      console.error('Webhook validation error:', error);
      return false;
    }
  }
}

export const twilioService = new TwilioService();
export default twilioService;
