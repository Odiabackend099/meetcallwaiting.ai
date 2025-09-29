// Flutterwave Service for CallWaiting.ai
// Handles payment processing, subscriptions, and billing for Nigeria/Global markets

import fetch from 'node-fetch';
import crypto from 'crypto';

interface FlutterwaveConfig {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
  webhookSecret: string;
}

interface PaymentRequest {
  amount: number;
  currency: string;
  email: string;
  phone_number?: string;
  name: string;
  tx_ref: string;
  redirect_url?: string;
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
  customer?: {
    email: string;
    phonenumber?: string;
    name: string;
  };
}

interface SubscriptionRequest {
  amount: number;
  currency: string;
  email: string;
  phone_number?: string;
  name: string;
  tx_ref: string;
  plan_id?: string;
  redirect_url?: string;
}

interface PaymentResponse {
  status: string;
  message: string;
  data?: {
    link: string;
    reference: string;
    status: string;
  };
}

class FlutterwaveService {
  private config: FlutterwaveConfig;

  constructor() {
    this.config = {
      publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || '',
      secretKey: process.env.FLUTTERWAVE_SECRET_KEY || '',
      baseUrl: process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3',
      webhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET || ''
    };

    if (!this.config.publicKey || !this.config.secretKey) {
      console.warn('Flutterwave credentials not configured');
    }
  }

  // Generate payment link for one-time payments
  async createPaymentLink(paymentData: PaymentRequest): Promise<PaymentResponse> {
    try {
      const url = `${this.config.baseUrl}/payments`;
      
      const payload = {
        tx_ref: paymentData.tx_ref,
        amount: paymentData.amount,
        currency: paymentData.currency,
        redirect_url: paymentData.redirect_url || `${process.env.FRONTEND_URL}/payment/success`,
        payment_options: 'card,mobilemoney,ussd,banktransfer',
        customer: {
          email: paymentData.email,
          phonenumber: paymentData.phone_number,
          name: paymentData.name
        },
        customizations: {
          title: paymentData.customizations?.title || 'CallWaiting.ai Payment',
          description: paymentData.customizations?.description || 'Payment for CallWaiting.ai services',
          logo: paymentData.customizations?.logo || 'https://meetcallwaiting.ai/logo.png'
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json() as PaymentResponse;
      
      if (!response.ok) {
        throw new Error(`Flutterwave API error: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('Error creating Flutterwave payment link:', error);
      throw new Error(`Failed to create payment link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create subscription plan
  async createSubscriptionPlan(planData: {
    name: string;
    amount: number;
    currency: string;
    interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
    duration?: number;
  }): Promise<any> {
    try {
      const url = `${this.config.baseUrl}/payment-plans`;
      
      const payload = {
        name: planData.name,
        amount: planData.amount,
        currency: planData.currency,
        interval: planData.interval,
        duration: planData.duration || 12 // Default to 12 intervals
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Flutterwave API error: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('Error creating subscription plan:', error);
      throw new Error(`Failed to create subscription plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create subscription
  async createSubscription(subscriptionData: SubscriptionRequest): Promise<PaymentResponse> {
    try {
      const url = `${this.config.baseUrl}/subscriptions`;
      
      const payload = {
        tx_ref: subscriptionData.tx_ref,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency,
        redirect_url: subscriptionData.redirect_url || `${process.env.FRONTEND_URL}/subscription/success`,
        payment_options: 'card,mobilemoney,ussd,banktransfer',
        customer: {
          email: subscriptionData.email,
          phonenumber: subscriptionData.phone_number,
          name: subscriptionData.name
        },
        customizations: {
          title: 'CallWaiting.ai Subscription',
          description: 'Subscribe to CallWaiting.ai services',
          logo: 'https://meetcallwaiting.ai/logo.png'
        },
        ...(subscriptionData.plan_id && { plan_id: subscriptionData.plan_id })
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json() as PaymentResponse;
      
      if (!response.ok) {
        throw new Error(`Flutterwave API error: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('Error creating Flutterwave subscription:', error);
      throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Verify payment
  async verifyPayment(transactionId: string): Promise<any> {
    try {
      const url = `${this.config.baseUrl}/transactions/${transactionId}/verify`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Flutterwave API error: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('Error verifying Flutterwave payment:', error);
      throw new Error(`Failed to verify payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  // Get transaction details
  async getTransaction(transactionId: string): Promise<any> {
    try {
      const url = `${this.config.baseUrl}/transactions/${transactionId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Flutterwave API error: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('Error getting Flutterwave transaction:', error);
      throw new Error(`Failed to get transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string): Promise<any> {
    try {
      const url = `${this.config.baseUrl}/subscriptions/${subscriptionId}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Flutterwave API error: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('Error cancelling Flutterwave subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get subscription details
  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const url = `${this.config.baseUrl}/subscriptions/${subscriptionId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Flutterwave API error: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('Error getting Flutterwave subscription:', error);
      throw new Error(`Failed to get subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get supported currencies
  async getSupportedCurrencies(): Promise<string[]> {
    try {
      const url = `${this.config.baseUrl}/currencies`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Flutterwave API error: ${result.message}`);
      }

      return result.data || [];
    } catch (error) {
      console.error('Error getting supported currencies:', error);
      return ['NGN', 'USD', 'GBP', 'EUR']; // Fallback to common currencies
    }
  }

  // Create payment link for CallWaiting.ai plans
  async createCallWaitingPaymentLink(planType: 'starter' | 'pro' | 'premium', userEmail: string, userName: string, phoneNumber?: string): Promise<PaymentResponse> {
    const plans = {
      starter: { amount: 29, name: 'CallWaiting.ai Starter Plan' },
      pro: { amount: 79, name: 'CallWaiting.ai Pro Plan' },
      premium: { amount: 149, name: 'CallWaiting.ai Premium Plan' }
    };

    const plan = plans[planType];
    const txRef = `cw_${planType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return this.createPaymentLink({
      amount: plan.amount,
      currency: 'USD', // Default to USD, can be made dynamic based on user location
      email: userEmail,
      phone_number: phoneNumber,
      name: userName,
      tx_ref: txRef,
      customizations: {
        title: plan.name,
        description: `Subscribe to ${plan.name} - 7-day free trial included`,
        logo: 'https://meetcallwaiting.ai/logo.png'
      }
    });
  }
}

export const flutterwaveService = new FlutterwaveService();
export default flutterwaveService;
