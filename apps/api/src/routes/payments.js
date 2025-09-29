/**
 * Payment Routes
 * Secure Stripe payment processing (server-side only)
 */

const express = require('express');
const { verifyToken } = require('../middleware/auth');
const stripeService = require('../services/stripeService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/payments/create-checkout
 * Create Stripe checkout session (server-side only)
 */
router.post('/create-checkout', verifyToken, async (req, res, next) => {
    try {
        const { planId, businessId } = req.body;
        
        if (!planId || !businessId) {
            return res.status(400).json({
                error: true,
                message: 'Plan ID and Business ID are required',
                requestId: req.requestId
            });
        }

        // Validate plan ID
        const validPlans = ['starter', 'professional', 'enterprise'];
        if (!validPlans.includes(planId)) {
            return res.status(400).json({
                error: true,
                message: 'Invalid plan ID. Must be: starter, professional, or enterprise',
                requestId: req.requestId
            });
        }

        // Create Stripe checkout session
        const checkoutData = await stripeService.createCheckoutSession(
            req.userId,
            planId,
            businessId
        );

        logger.info('Checkout session created', {
            userId: req.userId,
            planId: planId,
            sessionId: checkoutData.sessionId,
            requestId: req.requestId
        });

        res.json({
            success: true,
            message: 'Checkout session created successfully',
            data: checkoutData,
            requestId: req.requestId
        });
        
    } catch (error) {
        logger.error('Checkout session creation failed', {
            userId: req.userId,
            error: error.message,
            requestId: req.requestId
        });
        next(error);
    }
});

/**
 * POST /api/payments/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
    try {
        const signature = req.headers['stripe-signature'];
        
        if (!signature) {
            return res.status(400).json({
                error: true,
                message: 'Missing Stripe signature',
                requestId: req.requestId
            });
        }

        // Handle webhook
        const result = await stripeService.handleWebhook(req.body, signature);

        logger.info('Stripe webhook processed successfully', {
            requestId: req.requestId
        });

        res.json(result);
        
    } catch (error) {
        logger.error('Stripe webhook processing failed', {
            error: error.message,
            requestId: req.requestId
        });
        
        // Return 400 for webhook signature verification failures
        if (error.message.includes('signature')) {
            return res.status(400).json({
                error: true,
                message: 'Webhook signature verification failed',
                requestId: req.requestId
            });
        }
        
        next(error);
    }
});

/**
 * GET /api/payments/subscription-status
 * Get current subscription status
 */
router.get('/subscription-status', verifyToken, async (req, res, next) => {
    try {
        // TODO: Get subscription from database based on userId
        // For now, return mock data
        
        const mockSubscription = {
            active: false,
            plan: null,
            expiryDate: null,
            usage: {
                callsThisMonth: 0,
                maxCalls: 0,
                smsThisMonth: 0,
                maxSms: 0
            }
        };

        logger.info('Subscription status retrieved', {
            userId: req.userId,
            requestId: req.requestId
        });

        res.json({
            success: true,
            message: 'Subscription status retrieved',
            data: mockSubscription,
            requestId: req.requestId
        });
        
    } catch (error) {
        logger.error('Subscription status retrieval failed', {
            userId: req.userId,
            error: error.message,
            requestId: req.requestId
        });
        next(error);
    }
});

/**
 * POST /api/payments/cancel-subscription
 * Cancel current subscription
 */
router.post('/cancel-subscription', verifyToken, async (req, res, next) => {
    try {
        const { subscriptionId } = req.body;
        
        if (!subscriptionId) {
            return res.status(400).json({
                error: true,
                message: 'Subscription ID is required',
                requestId: req.requestId
            });
        }

        // Cancel subscription
        const result = await stripeService.cancelSubscription(subscriptionId);

        logger.info('Subscription cancelled', {
            userId: req.userId,
            subscriptionId: subscriptionId,
            requestId: req.requestId
        });

        res.json({
            success: true,
            message: 'Subscription cancelled successfully',
            data: result,
            requestId: req.requestId
        });
        
    } catch (error) {
        logger.error('Subscription cancellation failed', {
            userId: req.userId,
            error: error.message,
            requestId: req.requestId
        });
        next(error);
    }
});

module.exports = router;
