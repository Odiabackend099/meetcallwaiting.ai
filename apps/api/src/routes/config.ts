// @ts-nocheck
import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';

export const router = Router();

// Connect payment provider (Stripe/PayPal)
router.post('/payments/connect', async (req: Request, res: Response) => {
  try {
    const { merchant_id, provider, account_id, webhook_endpoint_secret } = req.body;
    
    if (!merchant_id || !provider) {
      return res.status(400).json({ 
        error: 'Missing required fields: merchant_id, provider' 
      });
    }

    // Update merchant settings with payment provider info
    const { data, error } = await supabase
      .from('merchants')
      .update({ 
        settings: {
          payment_provider: provider,
          payment_account_id: account_id,
          payment_webhook_secret: webhook_endpoint_secret
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', merchant_id)
      .select()
      .single();

    if (error) {
      console.error('Error connecting payment provider:', error);
      return res.status(500).json({ 
        error: 'Failed to connect payment provider', 
        message: error.message 
      });
    }

    res.json({ 
      message: `${provider} connected successfully`,
      merchant: data
    });
  } catch (error: any) {
    console.error('Error connecting payment provider:', error);
    res.status(500).json({ 
      error: 'Failed to connect payment provider', 
      message: error.message 
    });
  }
});

// Connect calendar provider (Google Calendar/Outlook)
router.post('/calendar/connect', async (req: Request, res: Response) => {
  try {
    const { merchant_id, provider, calendar_id, access_token, refresh_token } = req.body;
    
    if (!merchant_id || !provider) {
      return res.status(400).json({ 
        error: 'Missing required fields: merchant_id, provider' 
      });
    }

    // Update merchant with calendar provider info
    const updateData: any = {
      appointment_provider: provider,
      updated_at: new Date().toISOString()
    };

    if (provider === 'google') {
      updateData.google_calendar_id = calendar_id;
      updateData.settings = {
        google_access_token: access_token,
        google_refresh_token: refresh_token
      };
    } else if (provider === 'calendly') {
      updateData.calendly_link = req.body.calendly_link;
      updateData.settings = {
        calendly_access_token: access_token
      };
    }

    const { data, error } = await supabase
      .from('merchants')
      .update(updateData)
      .eq('id', merchant_id)
      .select()
      .single();

    if (error) {
      console.error('Error connecting calendar provider:', error);
      return res.status(500).json({ 
        error: 'Failed to connect calendar provider', 
        message: error.message 
      });
    }

    res.json({ 
      message: `${provider} calendar connected successfully`,
      merchant: data
    });
  } catch (error: any) {
    console.error('Error connecting calendar provider:', error);
    res.status(500).json({ 
      error: 'Failed to connect calendar provider', 
      message: error.message 
    });
  }
});

// Connect email provider (Gmail/SendGrid)
router.post('/email/connect', async (req: Request, res: Response) => {
  try {
    const { merchant_id, provider, sender_email, smtp_config } = req.body;
    
    if (!merchant_id || !provider || !sender_email) {
      return res.status(400).json({ 
        error: 'Missing required fields: merchant_id, provider, sender_email' 
      });
    }

    // Update merchant with email provider info
    const { data, error } = await supabase
      .from('merchants')
      .update({ 
        sender_email: sender_email,
        settings: {
          email_provider: provider,
          smtp_config: smtp_config
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', merchant_id)
      .select()
      .single();

    if (error) {
      console.error('Error connecting email provider:', error);
      return res.status(500).json({ 
        error: 'Failed to connect email provider', 
        message: error.message 
      });
    }

    res.json({ 
      message: `${provider} email connected successfully`,
      merchant: data
    });
  } catch (error: any) {
    console.error('Error connecting email provider:', error);
    res.status(500).json({ 
      error: 'Failed to connect email provider', 
      message: error.message 
    });
  }
});

// Get merchant configuration
router.get('/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', merchantId)
      .single();

    if (error) {
      console.error('Error fetching merchant config:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch merchant config', 
        message: error.message 
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // Redact sensitive information before sending
    const config = {
      id: data.id,
      name: data.name,
      industry: data.industry,
      timezone: data.timezone,
      currency: data.currency,
      website: data.website,
      owner_phone: data.owner_phone,
      billing_email: data.billing_email,
      sender_email: data.sender_email,
      appointment_provider: data.appointment_provider,
      calendly_link: data.calendly_link,
      google_calendar_id: data.google_calendar_id,
      number_assigned: data.number_assigned,
      // Redact sensitive settings
      settings: {
        payment_provider: data.settings?.payment_provider,
        email_provider: data.settings?.email_provider,
        // Don't expose tokens, secrets, etc.
      }
    };

    res.json({ config });
  } catch (error: any) {
    console.error('Error fetching merchant config:', error);
    res.status(500).json({ 
      error: 'Failed to fetch merchant config', 
      message: error.message 
    });
  }
});


