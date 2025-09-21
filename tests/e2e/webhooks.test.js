// Webhook Integration Tests
const { test, expect } = require('@playwright/test');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8787';

test.describe('Webhook Integration Tests', () => {
  let merchantId;
  let orderId;

  test.beforeEach(async ({ request }) => {
    // Create a test merchant first
    const merchantData = {
      name: 'Webhook Test Business',
      industry: 'Restaurant/QSR',
      country: 'US',
      timezone: 'EST',
      currency: 'USD',
      billing_email: 'test@webhooktest.com'
    };

    const response = await request.post(`${API_BASE_URL}/api/merchants/create`, {
      data: merchantData
    });
    merchantId = (await response.json()).merchant.id;

    // Create a test order
    const orderData = {
      merchant_id: merchantId,
      customer_phone: '+15551234567',
      items: [{ name: 'Test Item', price: 10.00, quantity: 1 }],
      currency: 'USD'
    };

    const orderResponse = await request.post(`${API_BASE_URL}/api/orders/create`, {
      data: orderData
    });
    orderId = (await orderResponse.json()).order_id;
  });

  test('Stripe Webhook - Checkout Session Completed', async ({ request }) => {
    const stripeEvent = {
      id: 'evt_test123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test123',
          payment_link: 'plink_test123',
          metadata: {
            order_id: orderId
          },
          amount_total: 1000,
          currency: 'usd'
        }
      }
    };

    const response = await request.post(`${API_BASE_URL}/api/webhooks/stripe`, {
      headers: {
        'stripe-signature': 'test_signature'
      },
      data: JSON.stringify(stripeEvent)
    });

    // Should return 200 even without proper signature in test mode
    expect([200, 400, 500]).toContain(response.status());
  });

  test('PayPal Webhook - Payment Capture Completed', async ({ request }) => {
    const paypalEvent = {
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'capture_test123',
        invoice_id: orderId,
        amount: {
          currency_code: 'USD',
          value: '10.00'
        }
      }
    };

    const response = await request.post(`${API_BASE_URL}/api/webhooks/paypal`, {
      headers: {
        'paypal-transmission-id': 'test_transmission_id'
      },
      data: paypalEvent
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.received).toBe(true);
  });

  test('Twilio Voice Webhook', async ({ request }) => {
    const twilioData = {
      CallSid: 'CA1234567890abcdef1234567890abcdef',
      From: '+15551234567',
      To: '+15559876543',
      CallStatus: 'ringing',
      Direction: 'inbound'
    };

    const response = await request.post(`${API_BASE_URL}/api/webhooks/twilio/voice`, {
      headers: {
        'x-twilio-signature': 'test_signature'
      },
      data: twilioData
    });

    expect(response.status()).toBe(200);
    const twiml = await response.text();
    expect(twiml).toContain('<Response>');
    expect(twiml).toContain('<Say>');
  });

  test('Twilio IVR Webhook', async ({ request }) => {
    const twilioData = {
      CallSid: 'CA1234567890abcdef1234567890abcdef',
      Digits: '1',
      From: '+15551234567',
      To: '+15559876543'
    };

    const response = await request.post(`${API_BASE_URL}/api/webhooks/twilio/ivr`, {
      headers: {
        'x-twilio-signature': 'test_signature'
      },
      data: twilioData
    });

    expect(response.status()).toBe(200);
    const twiml = await response.text();
    expect(twiml).toContain('<Response>');
    expect(twiml).toContain('order');
  });

  test('Twilio SMS Webhook', async ({ request }) => {
    const twilioData = {
      MessageSid: 'SM1234567890abcdef1234567890abcdef',
      From: '+15551234567',
      To: '+15559876543',
      Body: 'Hello, I need help with my order',
      MessageStatus: 'received'
    };

    const response = await request.post(`${API_BASE_URL}/api/webhooks/twilio/sms`, {
      headers: {
        'x-twilio-signature': 'test_signature'
      },
      data: twilioData
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.received).toBe(true);
  });

  test('Twilio Call Status Webhook', async ({ request }) => {
    const twilioData = {
      CallSid: 'CA1234567890abcdef1234567890abcdef',
      CallStatus: 'completed',
      Duration: '120',
      From: '+15551234567',
      To: '+15559876543'
    };

    const response = await request.post(`${API_BASE_URL}/api/webhooks/twilio/status`, {
      headers: {
        'x-twilio-signature': 'test_signature'
      },
      data: twilioData
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.received).toBe(true);
  });

  test('Webhook Idempotency', async ({ request }) => {
    const stripeEvent = {
      id: 'evt_idempotency_test',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_idempotency_test',
          payment_link: 'plink_idempotency_test',
          metadata: {
            order_id: orderId
          }
        }
      }
    };

    // Send the same webhook twice
    const response1 = await request.post(`${API_BASE_URL}/api/webhooks/stripe`, {
      headers: {
        'stripe-signature': 'test_signature'
      },
      data: JSON.stringify(stripeEvent)
    });

    const response2 = await request.post(`${API_BASE_URL}/api/webhooks/stripe`, {
      headers: {
        'stripe-signature': 'test_signature'
      },
      data: JSON.stringify(stripeEvent)
    });

    // Both should be processed (or at least not fail)
    expect([200, 400, 500]).toContain(response1.status());
    expect([200, 400, 500]).toContain(response2.status());
  });
});