/**
 * Twilio Service
 * SMS auto-responder with Nigerian network optimizations
 */

const twilio = require('twilio');
const logger = require('../utils/logger');

class TwilioService {
    constructor() {
        this.client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
        
        if (!this.client || !this.phoneNumber) {
            logger.warn('Twilio configuration missing - SMS features disabled');
        }
    }

    /**
     * Send SMS message with Nigerian network retry logic
     */
    async sendSMS(to, message, businessId) {
        try {
            // Validate Nigerian phone number
            if (!this.isValidNigerianNumber(to)) {
                throw new Error(`Invalid Nigerian phone number: ${to}`);
            }

            // Format message with business branding
            const formattedMessage = this.formatBusinessMessage(message, businessId);

            const result = await this.client.messages.create({
                body: formattedMessage,
                from: this.phoneNumber,
                to: to,
                // Nigerian network optimizations
                statusCallback: `${process.env.API_BASE_URL}/api/webhooks/sms-status`,
                provideFeedback: true,
                maxPrice: '0.50', // Limit cost for Nigerian networks
                messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID // Optional
            });

            logger.info('SMS sent successfully', {
                to: to,
                businessId: businessId,
                messageSid: result.sid,
                status: result.status
            });

            return {
                success: true,
                messageSid: result.sid,
                status: result.status,
                to: to
            };

        } catch (error) {
            logger.error('SMS sending failed', {
                to: to,
                businessId: businessId,
                error: error.message
            });

            // Retry logic for Nigerian networks
            if (this.shouldRetry(error)) {
                return await this.retryWithBackoff(to, message, businessId, 1);
            }

            throw error;
        }
    }

    /**
     * Send auto-responder SMS for missed calls
     */
    async sendMissedCallResponse(callerNumber, businessId, businessName) {
        const message = `Hi! Thank you for calling ${businessName}. We missed your call but will get back to you shortly. You can also reach us via WhatsApp or visit our website.`;
        
        return await this.sendSMS(callerNumber, message, businessId);
    }

    /**
     * Send appointment confirmation SMS
     */
    async sendAppointmentConfirmation(customerNumber, businessId, appointmentDetails) {
        const { date, time, service } = appointmentDetails;
        const businessName = await this.getBusinessName(businessId);
        
        const message = `Your appointment with ${businessName} is confirmed for ${date} at ${time} for ${service}. Reply STOP to opt out.`;
        
        return await this.sendSMS(customerNumber, message, businessId);
    }

    /**
     * Send payment confirmation SMS
     */
    async sendPaymentConfirmation(customerNumber, businessId, paymentDetails) {
        const { amount, plan } = paymentDetails;
        const businessName = await this.getBusinessName(businessId);
        
        const message = `Payment of $${amount} for ${plan} plan received by ${businessName}. Thank you for your business!`;
        
        return await this.sendSMS(customerNumber, message, businessId);
    }

    /**
     * Send follow-up SMS
     */
    async sendFollowUp(customerNumber, businessId, followUpType) {
        const businessName = await this.getBusinessName(businessId);
        let message;

        switch (followUpType) {
            case 'service_feedback':
                message = `Hi! How was your recent experience with ${businessName}? We'd love your feedback!`;
                break;
            case 'appointment_reminder':
                message = `Reminder: You have an upcoming appointment with ${businessName}. Reply YES to confirm or NO to reschedule.`;
                break;
            case 'promotion':
                message = `Special offer from ${businessName}! Get 20% off your next service. Reply SAVE20 to claim.`;
                break;
            default:
                message = `Thank you for choosing ${businessName}! We appreciate your business.`;
        }

        return await this.sendSMS(customerNumber, message, businessId);
    }

    /**
     * Handle incoming SMS (webhook)
     */
    async handleIncomingSMS(req) {
        try {
            const { From, To, Body, MessageSid } = req.body;
            
            logger.info('Incoming SMS received', {
                from: From,
                to: To,
                messageSid: MessageSid,
                body: Body.substring(0, 50) + '...'
            });

            // Parse message body for commands
            const response = await this.processIncomingMessage(From, Body, To);
            
            if (response.shouldReply) {
                await this.sendSMS(From, response.message, response.businessId);
            }

            // Store message in database
            await this.storeMessage({
                messageSid: MessageSid,
                from: From,
                to: To,
                body: Body,
                direction: 'inbound',
                status: 'received'
            });

            return { success: true };

        } catch (error) {
            logger.error('Failed to handle incoming SMS', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Process incoming message and determine response
     */
    async processIncomingMessage(from, body, to) {
        const message = body.toLowerCase().trim();

        // Stop/Unsubscribe
        if (message.includes('stop') || message.includes('unsubscribe')) {
            await this.handleUnsubscribe(from);
            return {
                shouldReply: true,
                message: 'You have been unsubscribed from SMS notifications. Reply START to resubscribe.',
                businessId: null
            };
        }

        // Start/Subscribe
        if (message.includes('start') || message.includes('subscribe')) {
            return {
                shouldReply: true,
                message: 'Thank you for subscribing to our SMS updates!',
                businessId: await this.getBusinessByPhone(to)
            };
        }

        // Appointment confirmation
        if (message === 'yes' || message === 'confirm') {
            return {
                shouldReply: true,
                message: 'Appointment confirmed! We will send you a reminder 24 hours before.',
                businessId: await this.getBusinessByPhone(to)
            };
        }

        // Appointment reschedule
        if (message === 'no' || message.includes('reschedule')) {
            return {
                shouldReply: true,
                message: 'No problem! Please call us to reschedule your appointment.',
                businessId: await this.getBusinessByPhone(to)
            };
        }

        // Default response
        return {
            shouldReply: true,
            message: 'Thank you for your message. A team member will get back to you soon.',
            businessId: await this.getBusinessByPhone(to)
        };
    }

    /**
     * Handle SMS status webhook
     */
    async handleSMSStatus(req) {
        try {
            const { MessageSid, MessageStatus, ErrorCode } = req.body;
            
            logger.info('SMS status update', {
                messageSid: MessageSid,
                status: MessageStatus,
                errorCode: ErrorCode
            });

            // Update message status in database
            await this.updateMessageStatus(MessageSid, MessageStatus, ErrorCode);

            return { success: true };

        } catch (error) {
            logger.error('Failed to handle SMS status', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Nigerian network retry logic with exponential backoff
     */
    async retryWithBackoff(to, message, businessId, attempt) {
        const maxAttempts = 3;
        const baseDelay = 2000; // 2 seconds
        
        if (attempt > maxAttempts) {
            throw new Error('Max retry attempts reached for Nigerian network');
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        
        logger.info('Retrying SMS send', {
            to: to,
            attempt: attempt,
            delay: delay
        });

        await this.sleep(delay);

        try {
            return await this.sendSMS(to, message, businessId);
        } catch (error) {
            if (this.shouldRetry(error) && attempt < maxAttempts) {
                return await this.retryWithBackoff(to, message, businessId, attempt + 1);
            }
            throw error;
        }
    }

    /**
     * Validate Nigerian phone number
     */
    isValidNigerianNumber(phoneNumber) {
        // Remove any non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Check for Nigerian format: +234XXXXXXXXXX or 234XXXXXXXXXX
        const nigerianRegex = /^(?:\+?234)?[789]\d{9}$/;
        return nigerianRegex.test(cleaned);
    }

    /**
     * Format message with business branding
     */
    formatBusinessMessage(message, businessId) {
        // TODO: Get business name and formatting preferences from database
        const businessName = 'Your Business'; // Placeholder
        
        return `${message}\n\n- ${businessName}\nReply STOP to unsubscribe`;
    }

    /**
     * Determine if error should trigger retry
     */
    shouldRetry(error) {
        const retryableErrors = [
            'ECONNRESET',
            'ETIMEDOUT',
            'ENOTFOUND',
            'temporarily unavailable',
            'network error'
        ];

        return retryableErrors.some(retryableError => 
            error.message.toLowerCase().includes(retryableError)
        );
    }

    /**
     * Utility function to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Mock functions for database operations
     * TODO: Replace with actual Supabase calls
     */
    async getBusinessName(businessId) {
        // TODO: Query database for business name
        return 'CallWaiting.ai Business';
    }

    async getBusinessByPhone(phoneNumber) {
        // TODO: Query database for business by phone number
        return 'business_123';
    }

    async storeMessage(messageData) {
        // TODO: Store message in Supabase
        logger.info('Message stored', { messageSid: messageData.messageSid });
    }

    async updateMessageStatus(messageSid, status, errorCode) {
        // TODO: Update message status in Supabase
        logger.info('Message status updated', { messageSid, status, errorCode });
    }

    async handleUnsubscribe(phoneNumber) {
        // TODO: Update subscription status in Supabase
        logger.info('User unsubscribed', { phoneNumber });
    }
}

module.exports = new TwilioService();
