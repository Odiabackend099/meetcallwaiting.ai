// Messaging Service for CallWaiting.ai
// Handles WhatsApp and SMS notifications

import twilio from 'twilio';
import fetch from 'node-fetch';
import { supabase } from '../utils/supabaseClient.js';

interface MessagingConfig {
  twilioAccountSid: string;
  twilioAuthToken: string;
  whatsappBusinessApiKey: string;
  whatsappBusinessApiUrl: string;
  whatsappPhoneNumberId: string;
  whatsappAccessToken: string;
}

interface MessageTemplate {
  name: string;
  language: string;
  components: any[];
}

class MessagingService {
  private twilioClient: twilio.Twilio;
  private config: MessagingConfig;

  constructor() {
    this.config = {
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
      whatsappBusinessApiKey: process.env.WHATSAPP_BUSINESS_API_KEY || '',
      whatsappBusinessApiUrl: process.env.WHATSAPP_BUSINESS_API_URL || 'https://graph.facebook.com/v18.0',
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || ''
    };

    if (this.config.twilioAccountSid && this.config.twilioAuthToken) {
      this.twilioClient = twilio(this.config.twilioAccountSid, this.config.twilioAuthToken);
    } else {
      console.warn('Twilio messaging credentials not configured');
    }
  }

  // Send missed call notification via WhatsApp
  async sendMissedCallWhatsApp(phoneNumber: string, businessName: string, callTime: string): Promise<boolean> {
    try {
      const message = `Hi! You missed a call from ${businessName} at ${callTime}. 

We're here to help! You can:
• Call us back anytime
• Book an appointment
• Place an order
• Get support

Reply with your request and we'll assist you right away!`;

      const success = await this.sendWhatsAppMessage(phoneNumber, message);
      
      if (success) {
        await this.logMessage({
          phoneNumber,
          messageType: 'whatsapp',
          messageContent: message,
          status: 'sent'
        });
      }

      return success;
    } catch (error) {
      console.error('Error sending missed call WhatsApp:', error);
      return false;
    }
  }

  // Send missed call notification via SMS
  async sendMissedCallSMS(phoneNumber: string, businessName: string, callTime: string): Promise<boolean> {
    try {
      const message = `You missed a call from ${businessName} at ${callTime}. Call back or text us for assistance!`;

      const success = await this.sendSMS(phoneNumber, message);
      
      if (success) {
        await this.logMessage({
          phoneNumber,
          messageType: 'sms',
          messageContent: message,
          status: 'sent'
        });
      }

      return success;
    } catch (error) {
      console.error('Error sending missed call SMS:', error);
      return false;
    }
  }

  // Send payment link via WhatsApp
  async sendPaymentLinkWhatsApp(phoneNumber: string, businessName: string, orderId: string, amount: number, currency: string, paymentLink: string): Promise<boolean> {
    try {
      const message = `Your order from ${businessName} is ready!

Order #${orderId}
Total: ${currency} ${amount.toFixed(2)}

Pay securely here: ${paymentLink}

Your order will be processed once payment is confirmed.`;

      const success = await this.sendWhatsAppMessage(phoneNumber, message);
      
      if (success) {
        await this.logMessage({
          phoneNumber,
          messageType: 'whatsapp',
          messageContent: message,
          status: 'sent'
        });
      }

      return success;
    } catch (error) {
      console.error('Error sending payment link WhatsApp:', error);
      return false;
    }
  }

  // Send payment link via SMS
  async sendPaymentLinkSMS(phoneNumber: string, businessName: string, orderId: string, amount: number, currency: string, paymentLink: string): Promise<boolean> {
    try {
      const message = `${businessName} - Order #${orderId}: ${currency} ${amount.toFixed(2)}. Pay: ${paymentLink}`;

      const success = await this.sendSMS(phoneNumber, message);
      
      if (success) {
        await this.logMessage({
          phoneNumber,
          messageType: 'sms',
          messageContent: message,
          status: 'sent'
        });
      }

      return success;
    } catch (error) {
      console.error('Error sending payment link SMS:', error);
      return false;
    }
  }

  // Send appointment confirmation via WhatsApp
  async sendAppointmentConfirmationWhatsApp(phoneNumber: string, businessName: string, appointmentDate: string, appointmentTime: string, service?: string): Promise<boolean> {
    try {
      const message = `✅ Appointment Confirmed!

${businessName}
Date: ${appointmentDate}
Time: ${appointmentTime}
${service ? `Service: ${service}` : ''}

We'll send you a reminder 1 hour before your appointment. 

Need to reschedule? Reply "RESCHEDULE" or call us.`;

      const success = await this.sendWhatsAppMessage(phoneNumber, message);
      
      if (success) {
        await this.logMessage({
          phoneNumber,
          messageType: 'whatsapp',
          messageContent: message,
          status: 'sent'
        });
      }

      return success;
    } catch (error) {
      console.error('Error sending appointment confirmation WhatsApp:', error);
      return false;
    }
  }

  // Send appointment confirmation via SMS
  async sendAppointmentConfirmationSMS(phoneNumber: string, businessName: string, appointmentDate: string, appointmentTime: string, service?: string): Promise<boolean> {
    try {
      const message = `Appointment confirmed with ${businessName} on ${appointmentDate} at ${appointmentTime}. ${service ? `Service: ${service}` : ''} Reply RESCHEDULE to change.`;

      const success = await this.sendSMS(phoneNumber, message);
      
      if (success) {
        await this.logMessage({
          phoneNumber,
          messageType: 'sms',
          messageContent: message,
          status: 'sent'
        });
      }

      return success;
    } catch (error) {
      console.error('Error sending appointment confirmation SMS:', error);
      return false;
    }
  }

  // Send appointment reminder
  async sendAppointmentReminder(phoneNumber: string, businessName: string, appointmentDate: string, appointmentTime: string, viaWhatsApp: boolean = true): Promise<boolean> {
    try {
      const message = `🔔 Reminder: Your appointment with ${businessName} is in 1 hour!

Date: ${appointmentDate}
Time: ${appointmentTime}

See you soon!`;

      const success = viaWhatsApp 
        ? await this.sendWhatsAppMessage(phoneNumber, message)
        : await this.sendSMS(phoneNumber, message);
      
      if (success) {
        await this.logMessage({
          phoneNumber,
          messageType: viaWhatsApp ? 'whatsapp' : 'sms',
          messageContent: message,
          status: 'sent'
        });
      }

      return success;
    } catch (error) {
      console.error('Error sending appointment reminder:', error);
      return false;
    }
  }

  // Send order confirmation
  async sendOrderConfirmation(phoneNumber: string, businessName: string, orderId: string, items: string[], total: number, currency: string, viaWhatsApp: boolean = true): Promise<boolean> {
    try {
      const itemsList = items.map(item => `• ${item}`).join('\n');
      const message = `✅ Order Confirmed!

${businessName}
Order #${orderId}

Items:
${itemsList}

Total: ${currency} ${total.toFixed(2)}

We'll prepare your order and notify you when it's ready!`;

      const success = viaWhatsApp 
        ? await this.sendWhatsAppMessage(phoneNumber, message)
        : await this.sendSMS(phoneNumber, message);
      
      if (success) {
        await this.logMessage({
          phoneNumber,
          messageType: viaWhatsApp ? 'whatsapp' : 'sms',
          messageContent: message,
          status: 'sent'
        });
      }

      return success;
    } catch (error) {
      console.error('Error sending order confirmation:', error);
      return false;
    }
  }

  // Core messaging methods
  private async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      if (!this.config.whatsappAccessToken || !this.config.whatsappPhoneNumberId) {
        console.warn('WhatsApp credentials not configured, falling back to SMS');
        return this.sendSMS(phoneNumber, message);
      }

      // Format phone number for WhatsApp (remove + and add country code if needed)
      const formattedNumber = this.formatPhoneForWhatsApp(phoneNumber);

      const url = `${this.config.whatsappBusinessApiUrl}/${this.config.whatsappPhoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.whatsappAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('WhatsApp API error:', result);
        return false;
      }

      console.log('WhatsApp message sent successfully:', result);
      return true;

    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  private async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        console.error('Twilio client not configured');
        return false;
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER || '',
        to: phoneNumber
      });

      console.log('SMS sent successfully:', result.sid);
      return true;

    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  // Handle incoming WhatsApp messages
  async handleIncomingWhatsApp(phoneNumber: string, message: string, messageId: string): Promise<string> {
    try {
      console.log(`Incoming WhatsApp from ${phoneNumber}: ${message}`);

      // Find merchant by phone number
      const merchant = await this.findMerchantByPhoneNumber(phoneNumber);
      if (!merchant) {
        return this.sendWhatsAppMessage(phoneNumber, "Sorry, this number is not configured for our service.");
      }

      // Simple keyword-based responses
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('reschedule') || lowerMessage.includes('change')) {
        return this.handleRescheduleRequest(phoneNumber, merchant);
      }

      if (lowerMessage.includes('cancel')) {
        return this.handleCancelRequest(phoneNumber, merchant);
      }

      if (lowerMessage.includes('order') || lowerMessage.includes('menu')) {
        return this.handleOrderRequest(phoneNumber, merchant);
      }

      if (lowerMessage.includes('appointment') || lowerMessage.includes('book')) {
        return this.handleBookingRequest(phoneNumber, merchant);
      }

      if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
        return this.handleHelpRequest(phoneNumber, merchant);
      }

      // Default response
      const defaultMessage = `Hi! Thanks for messaging ${merchant.name}. 

How can we help you today?
• Reply "ORDER" for menu/ordering
• Reply "BOOK" for appointments  
• Reply "RESCHEDULE" to change appointment
• Reply "HELP" for support

We're here to assist you!`;

      await this.sendWhatsAppMessage(phoneNumber, defaultMessage);
      return 'handled';

    } catch (error) {
      console.error('Error handling incoming WhatsApp:', error);
      return 'error';
    }
  }

  // Handle incoming SMS messages
  async handleIncomingSMS(phoneNumber: string, message: string, messageSid: string): Promise<string> {
    try {
      console.log(`Incoming SMS from ${phoneNumber}: ${message}`);

      // Find merchant by phone number
      const merchant = await this.findMerchantByPhoneNumber(phoneNumber);
      if (!merchant) {
        return this.sendSMS(phoneNumber, "Sorry, this number is not configured for our service.");
      }

      // Simple keyword-based responses
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('reschedule') || lowerMessage.includes('change')) {
        return this.handleRescheduleRequest(phoneNumber, merchant);
      }

      if (lowerMessage.includes('cancel')) {
        return this.handleCancelRequest(phoneNumber, merchant);
      }

      if (lowerMessage.includes('order') || lowerMessage.includes('menu')) {
        return this.handleOrderRequest(phoneNumber, merchant);
      }

      if (lowerMessage.includes('appointment') || lowerMessage.includes('book')) {
        return this.handleBookingRequest(phoneNumber, merchant);
      }

      if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
        return this.handleHelpRequest(phoneNumber, merchant);
      }

      // Default response
      const defaultMessage = `Thanks for texting ${merchant.name}! Reply ORDER for menu, BOOK for appointments, or HELP for support.`;

      await this.sendSMS(phoneNumber, defaultMessage);
      return 'handled';

    } catch (error) {
      console.error('Error handling incoming SMS:', error);
      return 'error';
    }
  }

  // Helper methods
  private async handleRescheduleRequest(phoneNumber: string, merchant: any): Promise<string> {
    const message = `To reschedule your appointment with ${merchant.name}, please call us at ${merchant.business_phone || merchant.phone_number} or visit our website.`;
    
    await this.sendWhatsAppMessage(phoneNumber, message);
    return 'handled';
  }

  private async handleCancelRequest(phoneNumber: string, merchant: any): Promise<string> {
    const message = `To cancel your appointment with ${merchant.name}, please call us at ${merchant.business_phone || merchant.phone_number} as soon as possible.`;
    
    await this.sendWhatsAppMessage(phoneNumber, message);
    return 'handled';
  }

  private async handleOrderRequest(phoneNumber: string, merchant: any): Promise<string> {
    const message = `Here's our menu for ${merchant.name}:

🍕 Pizza - $12.99
🍔 Burger - $8.99
🍜 Pasta - $10.99
🥗 Salad - $7.99

To place an order, call us at ${merchant.business_phone || merchant.phone_number} or visit our website.`;
    
    await this.sendWhatsAppMessage(phoneNumber, message);
    return 'handled';
  }

  private async handleBookingRequest(phoneNumber: string, merchant: any): Promise<string> {
    const message = `To book an appointment with ${merchant.name}, please call us at ${merchant.business_phone || merchant.phone_number} or visit our booking page.`;
    
    await this.sendWhatsAppMessage(phoneNumber, message);
    return 'handled';
  }

  private async handleHelpRequest(phoneNumber: string, merchant: any): Promise<string> {
    const message = `Need help with ${merchant.name}?

📞 Call us: ${merchant.business_phone || merchant.phone_number}
🌐 Website: ${merchant.website || 'Coming soon'}
📍 Location: ${merchant.address || 'Contact us for address'}

We're here to help!`;
    
    await this.sendWhatsAppMessage(phoneNumber, message);
    return 'handled';
  }

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

  private formatPhoneForWhatsApp(phoneNumber: string): string {
    // Remove + and any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 1 (US/Canada), remove it for WhatsApp
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
    }
    
    return cleaned;
  }

  private async logMessage(messageData: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('message_logs')
        .insert({
          ...messageData,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging message:', error);
      }
    } catch (error) {
      console.error('Error in logMessage:', error);
    }
  }
}

export const messagingService = new MessagingService();
export default messagingService;
