// @ts-nocheck
import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';

export const router = Router();

// Handle IVR interactions
router.post('/handle', async (req: Request, res: Response) => {
  try {
    const { path, digits, merchant_id, caller_phone } = req.body || {};
    
    // Log the IVR interaction
    console.log(`IVR interaction: path=${path}, digits=${digits}, merchant=${merchant_id}, caller=${caller_phone}`);
    
    // Handle different IVR paths
    if (path === 'order') {
      return res.json({ 
        say: 'Thank you for your order. We will send you a payment link shortly.',
        action: 'send_payment_link',
        merchant_id: merchant_id,
        caller_phone: caller_phone
      });
    }
    
    if (path === 'booking') {
      return res.json({ 
        say: 'Let us check availability and send you available time slots.',
        action: 'check_availability',
        merchant_id: merchant_id,
        caller_phone: caller_phone
      });
    }
    
    if (path === 'voicemail') {
      return res.json({ 
        say: 'Thanks for leaving a message. We will transcribe it and notify the team.',
        action: 'record_voicemail',
        merchant_id: merchant_id,
        caller_phone: caller_phone
      });
    }
    
    if (path === 'main_menu') {
      return res.json({ 
        gather: {
          say: 'Welcome to our service. Press 1 for orders, 2 for bookings, 3 for support.',
          numDigits: 1,
          timeout: 5
        }
      });
    }
    
    if (path === 'digits') {
      switch (digits) {
        case '1':
          return res.json({ 
            say: 'Please provide your order details after the beep.',
            action: 'record_order',
            merchant_id: merchant_id,
            caller_phone: caller_phone
          });
        case '2':
          return res.json({ 
            say: 'Please provide your booking details after the beep.',
            action: 'record_booking',
            merchant_id: merchant_id,
            caller_phone: caller_phone
          });
        case '3':
          return res.json({ 
            say: 'Please leave your message after the beep. We will call you back shortly.',
            action: 'record_support',
            merchant_id: merchant_id,
            caller_phone: caller_phone
          });
        default:
          return res.json({ 
            say: 'Invalid option. Please try again.',
            redirect: '/ivr/handle',
            params: { path: 'main_menu' }
          });
      }
    }
    
    // Default response
    return res.json({ 
      say: 'Thank you for calling. Your request has been received.',
      action: 'end_call'
    });
  } catch (error: any) {
    console.error('Error handling IVR interaction:', error);
    res.status(500).json({ error: 'Failed to handle IVR interaction', message: error.message });
  }
});

// Get merchant IVR settings
router.get('/settings/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    
    // Fetch merchant settings from database
    const { data, error } = await supabase
      .from('merchants')
      .select('settings, name, industry')
      .eq('id', merchantId)
      .single();
    
    if (error) {
      console.error('Error fetching merchant settings:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch merchant settings', 
        message: error.message 
      });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    res.json({ 
      merchant: {
        id: merchantId,
        name: data.name,
        industry: data.industry,
        settings: data.settings || {}
      }
    });
  } catch (error: any) {
    console.error('Error fetching merchant settings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch merchant settings', 
      message: error.message 
    });
  }
});