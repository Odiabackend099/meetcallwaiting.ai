// @ts-nocheck
import { supabase } from './supabaseClient.js';

export interface OrderUpdate {
  id: string;
  status: 'pending_payment' | 'paid' | 'failed';
  paid_at?: Date;
}

// Function to update order status in the database
export async function updateOrderStatus(orderId: string, status: 'pending_payment' | 'paid' | 'failed', paidAt?: Date): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status: status, 
        paid_at: paidAt,
        updated_at: new Date()
      })
      .eq('id', orderId);

    if (error) {
      console.error(`Error updating order ${orderId} status:`, error);
      return false;
    }

    console.log(`Successfully updated order ${orderId} status to ${status}`);
    return true;
  } catch (error) {
    console.error(`Error updating order ${orderId} status:`, error);
    return false;
  }
}

// Function to find an order by payment link ID
export async function findOrderByPaymentLinkId(paymentLinkId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_link_id', paymentLinkId)
      .single();

    if (error) {
      console.error(`Error finding order by payment link ID ${paymentLinkId}:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error finding order by payment link ID ${paymentLinkId}:`, error);
    return null;
  }
}

// Function to create a new order
export async function createOrder(orderData: any): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating order:', error);
    return null;
  }
}