// Payment routes for CallWaiting.ai
// Handles Flutterwave integration for subscriptions and billing

import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import flutterwaveService from '../services/flutterwaveService.js';
import { supabase } from '../utils/supabaseClient.js';

export const router = Router();

// Middleware to verify authentication
const requireAuth = (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ 
      error: 'Invalid or expired token' 
    });
  }

  (req as any).user = decoded;
  next();
};

// Create payment link for subscription
router.post('/create-subscription-link', requireAuth, async (req: Request, res: Response) => {
  try {
    const { planType, phoneNumber } = req.body;
    const user = (req as any).user;

    if (!planType || !['starter', 'pro', 'premium'].includes(planType)) {
      return res.status(400).json({
        error: 'Invalid plan type. Must be starter, pro, or premium'
      });
    }

    // Get user details from Supabase
    const { data: userData, error: userError } = await supabase.auth.getUser(user.userId);
    
    if (userError || !userData.user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const userEmail = userData.user.email!;
    const userName = userData.user.user_metadata?.name || userData.user.user_metadata?.full_name || 'User';

    // Create payment link
    const paymentResponse = await flutterwaveService.createCallWaitingPaymentLink(
      planType,
      userEmail,
      userName,
      phoneNumber
    );

    // Store payment reference in database for tracking
    const { error: dbError } = await supabase
      .from('payment_references')
      .insert({
        user_id: user.userId,
        tx_ref: paymentResponse.data?.reference,
        plan_type: planType,
        status: 'pending',
        amount: paymentResponse.data ? getPlanAmount(planType) : 0,
        currency: 'USD',
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Error storing payment reference:', dbError);
    }

    res.json({
      success: true,
      message: 'Payment link created successfully',
      data: {
        payment_link: paymentResponse.data?.link,
        reference: paymentResponse.data?.reference,
        plan_type: planType,
        amount: getPlanAmount(planType),
        currency: 'USD'
      }
    });

  } catch (error) {
    console.error('Error creating subscription payment link:', error);
    res.status(500).json({
      error: 'Failed to create payment link',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create one-time payment link (for add-ons, etc.)
router.post('/create-payment-link', requireAuth, async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'USD', description, phoneNumber } = req.body;
    const user = (req as any).user;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Valid amount is required'
      });
    }

    // Get user details from Supabase
    const { data: userData, error: userError } = await supabase.auth.getUser(user.userId);
    
    if (userError || !userData.user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const userEmail = userData.user.email!;
    const userName = userData.user.user_metadata?.name || userData.user.user_metadata?.full_name || 'User';
    const txRef = `cw_onetime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment link
    const paymentResponse = await flutterwaveService.createPaymentLink({
      amount,
      currency,
      email: userEmail,
      phone_number: phoneNumber,
      name: userName,
      tx_ref: txRef,
      customizations: {
        title: 'CallWaiting.ai Payment',
        description: description || 'Payment for CallWaiting.ai services',
        logo: 'https://meetcallwaiting.ai/logo.png'
      }
    });

    // Store payment reference in database
    const { error: dbError } = await supabase
      .from('payment_references')
      .insert({
        user_id: user.userId,
        tx_ref: paymentResponse.data?.reference || txRef,
        plan_type: 'onetime',
        status: 'pending',
        amount,
        currency,
        description,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Error storing payment reference:', dbError);
    }

    res.json({
      success: true,
      message: 'Payment link created successfully',
      data: {
        payment_link: paymentResponse.data?.link,
        reference: paymentResponse.data?.reference || txRef,
        amount,
        currency
      }
    });

  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({
      error: 'Failed to create payment link',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify payment
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { transaction_id, tx_ref } = req.body;

    if (!transaction_id && !tx_ref) {
      return res.status(400).json({
        error: 'Transaction ID or reference is required'
      });
    }

    // Verify with Flutterwave
    const verificationResult = await flutterwaveService.verifyPayment(transaction_id || tx_ref);

    if (verificationResult.status !== 'success') {
      return res.status(400).json({
        error: 'Payment verification failed',
        message: verificationResult.message
      });
    }

    const transactionData = verificationResult.data;

    // Update payment reference in database
    const { error: updateError } = await supabase
      .from('payment_references')
      .update({
        status: 'completed',
        transaction_id: transactionData.id,
        flutterwave_reference: transactionData.flw_ref,
        updated_at: new Date().toISOString()
      })
      .eq('tx_ref', transactionData.tx_ref);

    if (updateError) {
      console.error('Error updating payment reference:', updateError);
    }

    // Handle subscription activation
    if (transactionData.tx_ref.includes('_starter_') || 
        transactionData.tx_ref.includes('_pro_') || 
        transactionData.tx_ref.includes('_premium_')) {
      
      const planType = transactionData.tx_ref.includes('_starter_') ? 'starter' :
                      transactionData.tx_ref.includes('_pro_') ? 'pro' : 'premium';

      // Update user subscription
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: transactionData.customer.email, // This should be the user ID, not email
          plan_type: planType,
          status: 'active',
          payment_reference: transactionData.tx_ref,
          starts_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          created_at: new Date().toISOString()
        });

      if (subscriptionError) {
        console.error('Error updating user subscription:', subscriptionError);
      }
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        transaction_id: transactionData.id,
        amount: transactionData.amount,
        currency: transactionData.currency,
        status: transactionData.status,
        customer_email: transactionData.customer.email
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get payment history
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const { data: payments, error } = await supabase
      .from('payment_references')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment history:', error);
      return res.status(500).json({
        error: 'Failed to fetch payment history'
      });
    }

    res.json({
      success: true,
      data: payments || []
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      error: 'Failed to fetch payment history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get current subscription
router.get('/subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching subscription:', error);
      return res.status(500).json({
        error: 'Failed to fetch subscription'
      });
    }

    res.json({
      success: true,
      data: subscription || null
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cancel subscription
router.post('/cancel-subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Update subscription status
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('user_id', user.userId)
      .eq('status', 'active');

    if (updateError) {
      console.error('Error cancelling subscription:', updateError);
      return res.status(500).json({
        error: 'Failed to cancel subscription'
      });
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Webhook endpoint for Flutterwave
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['verif-hash'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    if (!flutterwaveService.verifyWebhookSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // Handle different webhook events
    switch (event.event) {
      case 'charge.completed':
        await handlePaymentCompleted(event.data);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.data);
        break;
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.json({ status: 'success' });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Helper functions
function getPlanAmount(planType: string): number {
  const amounts = {
    starter: 29,
    pro: 79,
    premium: 149
  };
  return amounts[planType as keyof typeof amounts] || 0;
}

async function handlePaymentCompleted(data: any) {
  try {
    // Update payment reference
    const { error } = await supabase
      .from('payment_references')
      .update({
        status: 'completed',
        transaction_id: data.id,
        flutterwave_reference: data.flw_ref,
        updated_at: new Date().toISOString()
      })
      .eq('tx_ref', data.tx_ref);

    if (error) {
      console.error('Error updating payment reference in webhook:', error);
    }

    // Handle subscription activation if applicable
    if (data.tx_ref.includes('_starter_') || 
        data.tx_ref.includes('_pro_') || 
        data.tx_ref.includes('_premium_')) {
      
      const planType = data.tx_ref.includes('_starter_') ? 'starter' :
                      data.tx_ref.includes('_pro_') ? 'pro' : 'premium';

      // Update user subscription
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: data.customer.email, // This should be the user ID
          plan_type: planType,
          status: 'active',
          payment_reference: data.tx_ref,
          starts_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        });

      if (subscriptionError) {
        console.error('Error updating user subscription in webhook:', subscriptionError);
      }
    }
  } catch (error) {
    console.error('Error handling payment completed:', error);
  }
}

async function handleSubscriptionCancelled(data: any) {
  try {
    // Update subscription status
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('payment_reference', data.tx_ref);

    if (error) {
      console.error('Error updating subscription status in webhook:', error);
    }
  } catch (error) {
    console.error('Error handling subscription cancelled:', error);
  }
}
