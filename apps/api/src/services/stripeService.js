/**
 * Stripe Service
 * Secure server-side payment processing with Nigerian network optimizations
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');

class StripeService {
    constructor() {
        this.stripe = stripe;
        this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        
        if (!this.stripe || !this.webhookSecret) {
            logger.warn('Stripe configuration missing - payment features disabled');
        }
    }

    /**
     * Create Stripe checkout session
     */
    async createCheckoutSession(userId, planId, businessId) {
        try {
            const plans = {
                starter: {
                    price: 2900, // $29.00 in cents
                    name: 'Starter Plan',
                    description: 'Perfect for small businesses getting started'
                },
                professional: {
                    price: 7900, // $79.00 in cents
                    name: 'Professional Plan',
                    description: 'Advanced features for growing businesses'
                },
                enterprise: {
                    price: 19900, // $199.00 in cents
                    name: 'Enterprise Plan',
                    description: 'Full features for large organizations'
                }
            };

            const plan = plans[planId];
            if (!plan) {
                throw new Error(`Invalid plan: ${planId}`);
            }

            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: plan.name,
                                description: plan.description,
                                metadata: {
                                    businessId: businessId,
                                    userId: userId
                                }
                            },
                            unit_amount: plan.price,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/pricing?payment=cancelled`,
                customer_email: userId, // Will be replaced with actual email
                metadata: {
                    userId: userId,
                    businessId: businessId,
                    planId: planId
                },
                subscription_data: {
                    metadata: {
                        userId: userId,
                        businessId: businessId,
                        planId: planId
                    }
                }
            });

            logger.info('Stripe checkout session created', {
                sessionId: session.id,
                userId: userId,
                planId: planId,
                amount: plan.price
            });

            return {
                sessionId: session.id,
                checkoutUrl: session.url
            };

        } catch (error) {
            logger.error('Stripe checkout session creation failed', {
                userId: userId,
                planId: planId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Handle Stripe webhook events
     */
    async handleWebhook(payload, signature) {
        try {
            const event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                this.webhookSecret
            );

            logger.info('Stripe webhook received', {
                type: event.type,
                id: event.id
            });

            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event.data.object);
                    break;
                
                case 'invoice.paid':
                    await this.handleInvoicePaid(event.data.object);
                    break;
                
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;
                
                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;
                
                default:
                    logger.info('Unhandled Stripe webhook event', {
                        type: event.type
                    });
            }

            return { received: true };

        } catch (error) {
            logger.error('Stripe webhook handling failed', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Handle successful checkout completion
     */
    async handleCheckoutCompleted(session) {
        try {
            const { userId, businessId, planId } = session.metadata;
            
            // Create or update subscription record
            const subscription = await this.stripe.subscriptions.retrieve(
                session.subscription
            );

            // TODO: Update database with subscription details
            logger.info('Checkout completed successfully', {
                userId: userId,
                businessId: businessId,
                planId: planId,
                subscriptionId: subscription.id,
                customerId: subscription.customer
            });

            // TODO: Send confirmation email
            // TODO: Update user subscription status in database

        } catch (error) {
            logger.error('Failed to handle checkout completion', {
                sessionId: session.id,
                error: error.message
            });
        }
    }

    /**
     * Handle successful invoice payment
     */
    async handleInvoicePaid(invoice) {
        try {
            const subscription = await this.stripe.subscriptions.retrieve(
                invoice.subscription
            );

            logger.info('Invoice paid successfully', {
                invoiceId: invoice.id,
                subscriptionId: subscription.id,
                customerId: subscription.customer,
                amount: invoice.amount_paid
            });

            // TODO: Update subscription status in database
            // TODO: Send payment confirmation email

        } catch (error) {
            logger.error('Failed to handle invoice payment', {
                invoiceId: invoice.id,
                error: error.message
            });
        }
    }

    /**
     * Handle subscription cancellation
     */
    async handleSubscriptionDeleted(subscription) {
        try {
            logger.info('Subscription cancelled', {
                subscriptionId: subscription.id,
                customerId: subscription.customer
            });

            // TODO: Update subscription status in database
            // TODO: Send cancellation confirmation email

        } catch (error) {
            logger.error('Failed to handle subscription cancellation', {
                subscriptionId: subscription.id,
                error: error.message
            });
        }
    }

    /**
     * Handle failed payment
     */
    async handlePaymentFailed(invoice) {
        try {
            logger.warn('Payment failed', {
                invoiceId: invoice.id,
                customerId: invoice.customer,
                amount: invoice.amount_due
            });

            // TODO: Send payment failure notification
            // TODO: Update subscription status in database

        } catch (error) {
            logger.error('Failed to handle payment failure', {
                invoiceId: invoice.id,
                error: error.message
            });
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId) {
        try {
            const subscription = await this.stripe.subscriptions.update(
                subscriptionId,
                {
                    cancel_at_period_end: true
                }
            );

            logger.info('Subscription cancellation scheduled', {
                subscriptionId: subscriptionId,
                cancelAt: subscription.cancel_at
            });

            return {
                success: true,
                cancelAt: subscription.cancel_at
            };

        } catch (error) {
            logger.error('Failed to cancel subscription', {
                subscriptionId: subscriptionId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get subscription details
     */
    async getSubscription(subscriptionId) {
        try {
            const subscription = await this.stripe.subscriptions.retrieve(
                subscriptionId,
                {
                    expand: ['latest_invoice', 'customer']
                }
            );

            return {
                id: subscription.id,
                status: subscription.status,
                currentPeriodStart: subscription.current_period_start,
                currentPeriodEnd: subscription.current_period_end,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                planId: subscription.items.data[0]?.price?.nickname || 'unknown',
                customer: subscription.customer
            };

        } catch (error) {
            logger.error('Failed to retrieve subscription', {
                subscriptionId: subscriptionId,
                error: error.message
            });
            throw error;
        }
    }
}

module.exports = new StripeService();
