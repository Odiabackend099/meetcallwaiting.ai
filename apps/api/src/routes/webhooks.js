/**
 * Webhook Routes
 * Handle external service webhooks (Stripe, Twilio, etc.)
 */

const express = require('express');
const twilioService = require('../services/twilioService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhooks
 */
router.post('/stripe', async (req, res, next) => {
    try {
        // Stripe webhooks are handled in payments.js
        // This endpoint is kept for backward compatibility
        
        res.status(200).json({
            success: true,
            message: 'Stripe webhook handled by payments route',
            requestId: req.requestId
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/webhooks/twilio
 * Handle Twilio SMS webhooks
 */
router.post('/twilio', async (req, res, next) => {
    try {
        // Handle incoming SMS
        await twilioService.handleIncomingSMS(req);

        logger.info('Twilio webhook processed successfully', {
            requestId: req.requestId
        });

        // Twilio expects a TwiML response or empty response
        res.type('text/xml');
        res.send('<Response></Response>');
        
    } catch (error) {
        logger.error('Twilio webhook processing failed', {
            error: error.message,
            requestId: req.requestId
        });
        next(error);
    }
});

/**
 * POST /api/webhooks/twilio/sms
 * Handle incoming SMS webhooks from Twilio (specific endpoint)
 */
router.post('/twilio/sms', async (req, res, next) => {
    try {
        // Handle incoming SMS
        await twilioService.handleIncomingSMS(req);

        logger.info('Twilio SMS webhook processed successfully', {
            requestId: req.requestId
        });

        // Twilio expects a TwiML response or empty response
        res.type('text/xml');
        res.send('<Response></Response>');
        
    } catch (error) {
        logger.error('Twilio SMS webhook processing failed', {
            error: error.message,
            requestId: req.requestId
        });
        next(error);
    }
});

/**
 * POST /api/webhooks/twilio/voice
 * Handle voice call webhooks from Twilio
 */
router.post('/twilio/voice', async (req, res, next) => {
    try {
        const { CallSid, From, To, CallStatus } = req.body;
        
        logger.info('Voice call webhook received', {
            callSid: CallSid,
            from: From,
            to: To,
            status: CallStatus,
            requestId: req.requestId
        });

        // TODO: Handle different call statuses
        // - ringing: Start recording, prepare auto-responder
        // - completed: Send missed call SMS if no answer
        // - busy: Send busy response SMS
        // - no-answer: Send missed call SMS

        switch (CallStatus) {
            case 'completed':
                // Check if call was answered or missed
                // TODO: Implement missed call detection and SMS sending
                break;
            case 'busy':
                // TODO: Send busy response SMS
                break;
            case 'no-answer':
                // TODO: Send missed call SMS
                break;
        }

        // Return empty TwiML response
        res.type('text/xml');
        res.send('<Response></Response>');
        
    } catch (error) {
        logger.error('Voice webhook processing failed', {
            error: error.message,
            requestId: req.requestId
        });
        next(error);
    }
});

/**
 * POST /api/webhooks/sms-status
 * Handle SMS status updates from Twilio
 */
router.post('/sms-status', async (req, res, next) => {
    try {
        await twilioService.handleSMSStatus(req);

        logger.info('SMS status webhook processed successfully', {
            requestId: req.requestId
        });

        res.json({ success: true });
        
    } catch (error) {
        logger.error('SMS status webhook processing failed', {
            error: error.message,
            requestId: req.requestId
        });
        next(error);
    }
});

/**
 * GET /api/webhooks/health
 * Webhook health check
 */
router.get('/health', async (req, res, next) => {
    try {
        res.json({
            success: true,
            message: 'Webhooks service is healthy',
            services: {
                stripe: 'active',
                twilio: 'active',
                voice: 'active'
            },
            requestId: req.requestId
        });
        
    } catch (error) {
        next(error);
    }
});

module.exports = router;
