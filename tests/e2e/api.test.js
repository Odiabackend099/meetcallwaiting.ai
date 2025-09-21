// Comprehensive API End-to-End Tests
const { test, expect } = require('@playwright/test');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8787';

test.describe('Callwaiting AI API Tests', () => {
  let merchantId;
  let orderId;
  let bookingId;

  test('Health Check', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
    expect(data.services).toBeDefined();
  });

  test('Create Merchant', async ({ request }) => {
    const merchantData = {
      name: 'Test Restaurant',
      industry: 'Restaurant/QSR',
      country: 'US',
      timezone: 'EST',
      currency: 'USD',
      website: 'https://testrestaurant.com',
      owner_phone: '+15551234567',
      billing_email: 'owner@testrestaurant.com'
    };

    const response = await request.post(`${API_BASE_URL}/api/merchants/create`, {
      data: merchantData
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.merchant).toBeDefined();
    expect(data.merchant.name).toBe(merchantData.name);
    merchantId = data.merchant.id;
  });

  test('Get Merchant', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/merchants/${merchantId}`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.merchant.id).toBe(merchantId);
    expect(data.merchant.name).toBe('Test Restaurant');
  });

  test('Allocate Phone Number', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/numbers/allocate`, {
      data: {
        merchant_id: merchantId,
        region: 'US'
      }
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.number).toBeDefined();
    expect(data.number).toMatch(/^\+1\d{10}$/);
  });

  test('Connect Payment Provider', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/config/payments/connect`, {
      data: {
        merchant_id: merchantId,
        provider: 'stripe',
        account_id: 'acct_test123',
        webhook_endpoint_secret: 'whsec_test123'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toContain('stripe connected successfully');
  });

  test('Connect Calendar Provider', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/config/calendar/connect`, {
      data: {
        merchant_id: merchantId,
        provider: 'google',
        calendar_id: 'primary',
        access_token: 'ya29.test123',
        refresh_token: '1//test123'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toContain('google calendar connected successfully');
  });

  test('Create Order', async ({ request }) => {
    const orderData = {
      merchant_id: merchantId,
      customer_phone: '+15559876543',
      items: [
        { name: 'Pizza', price: 15.99, quantity: 1 },
        { name: 'Drink', price: 2.99, quantity: 2 }
      ],
      currency: 'USD'
    };

    const response = await request.post(`${API_BASE_URL}/api/orders/create`, {
      data: orderData
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.order_id).toBeDefined();
    expect(data.payment_link_url).toBeDefined();
    orderId = data.order_id;
  });

  test('Create Booking', async ({ request }) => {
    const bookingData = {
      merchant_id: merchantId,
      customer_phone: '+15559876543',
      customer_email: 'customer@example.com',
      service: 'Haircut',
      starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // Tomorrow + 30 min
      location: 'Main Street Location',
      notes: 'First time customer'
    };

    const response = await request.post(`${API_BASE_URL}/api/bookings/create`, {
      data: bookingData
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.eventId).toBeDefined();
    expect(data.booking).toBeDefined();
    bookingId = data.eventId;
  });

  test('Send SMS Notification', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/notifications/sms/send`, {
      data: {
        to: '+15559876543',
        message: 'Your order is ready for pickup!',
        merchant_id: merchantId,
        type: 'order_ready'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message_sid).toBeDefined();
  });

  test('Send Email Notification', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/notifications/email/send`, {
      data: {
        to: 'customer@example.com',
        subject: 'Order Confirmation',
        html: '<h1>Your order has been confirmed!</h1>',
        merchant_id: merchantId,
        type: 'order_confirmation'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('Email sent successfully');
  });

  test('IVR Interaction', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/ivr/handle`, {
      data: {
        path: 'main_menu',
        merchant_id: merchantId,
        caller_phone: '+15559876543'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.gather).toBeDefined();
    expect(data.gather.say).toContain('Welcome to our service');
  });

  test('Rate Limiting', async ({ request }) => {
    // Make multiple requests to test rate limiting
    const promises = [];
    for (let i = 0; i < 105; i++) {
      promises.push(request.get(`${API_BASE_URL}/api/health`));
    }

    const responses = await Promise.all(promises);
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    
    // Should have some rate limited responses
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
