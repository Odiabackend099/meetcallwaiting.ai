// @ts-nocheck
import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

export const router = Router();

// Handle STOP consent revocation
router.post('/stop', async (req: Request, res: Response) => {
  try {
    const { merchant_id, channel, target } = req.body;
    
    // Validate required fields
    if (!merchant_id || !channel || !target) {
      return res.status(400).json({ 
        error: 'Missing required fields: merchant_id, channel, target' 
      });
    }
    
    // Validate channel
    const validChannels = ['sms', 'whatsapp', 'email'];
    if (!validChannels.includes(channel)) {
      return res.status(400).json({ 
        error: 'Invalid channel. Must be one of: sms, whatsapp, email' 
      });
    }
    
    // Record the consent revocation
    const { data, error } = await supabase
      .from('consents')
      .insert({
        id: uuidv4(),
        merchant_id: merchant_id,
        channel: channel,
        target: target,
        source: 'ivr',
        ts: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error recording consent revocation:', error);
      return res.status(500).json({ 
        error: 'Failed to record consent revocation', 
        message: error.message 
      });
    }
    
    // Return success response
    res.status(201).json({ 
      message: 'You have been successfully opted out.',
      consent: data
    });
  } catch (error: any) {
    console.error('Error handling consent revocation:', error);
    res.status(500).json({ 
      error: 'Failed to handle consent revocation', 
      message: error.message 
    });
  }
});

// Check if a target has given consent
router.get('/check', async (req: Request, res: Response) => {
  try {
    const { merchant_id, channel, target } = req.query;
    
    // Validate required fields
    if (!merchant_id || !channel || !target) {
      return res.status(400).json({ 
        error: 'Missing required query parameters: merchant_id, channel, target' 
      });
    }
    
    // Check if consent exists
    const { data, error } = await supabase
      .from('consents')
      .select('*')
      .eq('merchant_id', merchant_id)
      .eq('channel', channel)
      .eq('target', target)
      .order('ts', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "single row not found"
      console.error('Error checking consent:', error);
      return res.status(500).json({ 
        error: 'Failed to check consent', 
        message: error.message 
      });
    }
    
    // If no consent record found, assume they haven't opted out
    if (!data) {
      return res.json({ 
        has_consent: true,
        message: 'Consent is valid'
      });
    }
    
    // If consent record found, they have opted out
    res.json({ 
      has_consent: false,
      message: 'User has opted out',
      consent: data
    });
  } catch (error: any) {
    console.error('Error checking consent:', error);
    res.status(500).json({ 
      error: 'Failed to check consent', 
      message: error.message 
    });
  }
});