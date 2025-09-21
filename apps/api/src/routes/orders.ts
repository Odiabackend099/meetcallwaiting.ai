// @ts-nocheck
import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { createOrder, findOrderByPaymentLinkId, updateOrderStatus } from '../utils/database.js';
import { v4 as uuidv4 } from 'uuid';

export const router = Router();

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-04-10',
});

// Create a new order with payment link
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { items, currency = 'usd', customer_email, merchant_id, customer_phone } = req.body;
    
    // Validate required fields
    if (!merchant_id) {
      return res.status(400).json({ error: 'merchant_id is required' });
    }
    
    // Create a Stripe Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: items?.map((item: any) => ({
        price_data: {
          currency: currency,
          product_data: {
            name: item.name || 'Service',
          },
          unit_amount: Math.round((item.price || 0) * 100), // Convert to cents
        },
        quantity: item.quantity || 1,
      })) || [{ price_data: { currency: 'usd', product_data: { name: 'Service' }, unit_amount: 100 }, quantity: 1 }],
      metadata: {
        merchant_id: merchant_id,
      },
      ...(customer_email && { customer_email }),
    });
    
    // Create order in database
    const orderData = {
      id: uuidv4(),
      merchant_id: merchant_id,
      customer_phone: customer_phone,
      items: items || [],
      total: items?.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1), 0) || 0,
      currency: currency,
      payment_link_id: paymentLink.id,
      payment_link_url: paymentLink.url,
      status: 'pending_payment',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const order = await createOrder(orderData);
    
    // Return the payment link URL and order ID
    res.status(201).json({ 
      payment_link_url: paymentLink.url,
      payment_link_id: paymentLink.id,
      order_id: order?.id,
      order: order
    });
  } catch (error: any) {
    console.error('Error creating payment link:', error);
    res.status(500).json({ error: 'Failed to create payment link', message: error.message });
  }
});

// Get order by ID
router.get('/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    // In a real implementation, you would query the database
    // For now, we'll return a mock response
    res.json({ 
      order: {
        id: orderId,
        status: 'pending_payment',
        created_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order', message: error.message });
  }
});

// Get orders by merchant ID
router.get('/merchant/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { status, limit = 30 } = req.query;
    
    // In a real implementation, you would query the database
    // For now, we'll return a mock response
    res.json({ 
      orders: [
        {
          id: 'order_123',
          merchant_id: merchantId,
          status: 'paid',
          total: 29.99,
          currency: 'usd',
          created_at: new Date().toISOString()
        }
      ]
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders', message: error.message });
  }
});

// Update order status
router.patch('/:orderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, paid_at } = req.body;
    
    // Validate status
    const validStatuses = ['pending_payment', 'paid', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: pending_payment, paid, failed' 
      });
    }
    
    // Update order status in database
    const success = await updateOrderStatus(orderId, status, paid_at ? new Date(paid_at) : undefined);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update order status' });
    }
    
    res.json({ 
      message: 'Order status updated successfully',
      order_id: orderId,
      status: status
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status', message: error.message });
  }
});