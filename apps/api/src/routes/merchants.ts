// @ts-nocheck
import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

export const router = Router();

// In-memory storage for testing when database is not available
let merchants: any[] = [];
let databaseAvailable = true;

console.log('Testing database connection...');

// Test database connection
supabase
  .from('merchants')
  .select('id')
  .limit(1)
  .then(({ data, error }) => {
    if (error && error.message.includes('merchants')) {
      console.log('⚠️  Database not available, using mock implementation');
      console.log('⚠️  Please set up the database schema using the schema.sql file');
      databaseAvailable = false;
    } else if (error) {
      console.log('⚠️  Database connection error:', error.message);
      databaseAvailable = false;
    } else {
      console.log('✅ Database connection successful');
      databaseAvailable = true;
    }
  })
  .catch((error) => {
    console.log('⚠️  Database not available, using mock implementation');
    console.log('⚠️  Error details:', error.message);
    console.log('⚠️  Please set up the database schema using the schema.sql file');
    databaseAvailable = false;
  });

// Create a new merchant
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      industry, 
      timezone, 
      country, 
      currency, 
      website,
      owner_phone,
      billing_email,
      sender_email,
      appointment_provider,
      calendly_link,
      google_calendar_id,
      number_assigned
    } = req.body;
    
    // Validate required fields
    if (!name || !industry || !timezone || !country || !currency) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, industry, timezone, country, currency' 
      });
    }
    
    console.log('Creating merchant:', { name, industry, country });
    
    // Use mock implementation if database is not available
    if (!databaseAvailable) {
      console.log('⚠️  Using mock implementation for merchant creation');
      
      const merchant = {
        id: uuidv4(),
        name: name,
        industry: industry,
        timezone: timezone,
        country: country,
        currency: currency,
        website: website || null,
        owner_phone: owner_phone || null,
        billing_email: billing_email || null,
        sender_email: sender_email || null,
        appointment_provider: appointment_provider || null,
        calendly_link: calendly_link || null,
        google_calendar_id: google_calendar_id || null,
        number_assigned: number_assigned || null,
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      merchants.push(merchant);
      
      return res.status(201).json({ 
        message: 'Merchant created successfully (mock implementation)',
        merchant: merchant
      });
    }
    
    console.log('✅ Using database for merchant creation');
    
    // Create merchant in database
    const { data, error } = await supabase
      .from('merchants')
      .insert({
        id: uuidv4(),
        name: name,
        industry: industry,
        timezone: timezone,
        country: country,
        currency: currency,
        website: website || null,
        owner_phone: owner_phone || null,
        billing_email: billing_email || null,
        sender_email: sender_email || null,
        appointment_provider: appointment_provider || null,
        calendly_link: calendly_link || null,
        google_calendar_id: google_calendar_id || null,
        number_assigned: number_assigned || null,
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating merchant:', error);
      return res.status(500).json({ 
        error: 'Failed to create merchant', 
        message: error.message 
      });
    }
    
    res.status(201).json({ 
      message: 'Merchant created successfully',
      merchant: data
    });
  } catch (error: any) {
    console.error('Error creating merchant:', error);
    res.status(500).json({ 
      error: 'Failed to create merchant', 
      message: error.message 
    });
  }
});

// Get merchant by ID
router.get('/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    
    console.log('Fetching merchant:', merchantId);
    
    // Use mock implementation if database is not available
    if (!databaseAvailable) {
      console.log('⚠️  Using mock implementation for fetching merchant');
      
      const merchant = merchants.find(m => m.id === merchantId);
      
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
      }
      
      return res.json({ merchant: merchant });
    }
    
    console.log('✅ Using database for fetching merchant');
    
    // Fetch merchant from database
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', merchantId)
      .single();
    
    if (error) {
      console.error('Error fetching merchant:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch merchant', 
        message: error.message 
      });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    res.json({ merchant: data });
  } catch (error: any) {
    console.error('Error fetching merchant:', error);
    res.status(500).json({ 
      error: 'Failed to fetch merchant', 
      message: error.message 
    });
  }
});

// Update merchant settings
router.patch('/:merchantId/settings', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { settings } = req.body;
    
    console.log('Updating merchant settings:', merchantId);
    
    // Use mock implementation if database is not available
    if (!databaseAvailable) {
      console.log('⚠️  Using mock implementation for updating merchant settings');
      
      const merchantIndex = merchants.findIndex(m => m.id === merchantId);
      
      if (merchantIndex === -1) {
        return res.status(404).json({ error: 'Merchant not found' });
      }
      
      merchants[merchantIndex] = {
        ...merchants[merchantIndex],
        settings: settings,
        updated_at: new Date().toISOString()
      };
      
      return res.json({ 
        message: 'Merchant settings updated successfully (mock implementation)',
        merchant: merchants[merchantIndex]
      });
    }
    
    console.log('✅ Using database for updating merchant settings');
    
    // Update merchant settings in database
    const { data, error } = await supabase
      .from('merchants')
      .update({ 
        settings: settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', merchantId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating merchant settings:', error);
      return res.status(500).json({ 
        error: 'Failed to update merchant settings', 
        message: error.message 
      });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    
    res.json({ 
      message: 'Merchant settings updated successfully',
      merchant: data
    });
  } catch (error: any) {
    console.error('Error updating merchant settings:', error);
    res.status(500).json({ 
      error: 'Failed to update merchant settings', 
      message: error.message 
    });
  }
});

// Get all merchants (with pagination)
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('Fetching all merchants');
    
    // Use mock implementation if database is not available
    if (!databaseAvailable) {
      console.log('⚠️  Using mock implementation for fetching all merchants');
      
      const { limit = 30, offset = 0 } = req.query;
      
      // Return merchants from memory with pagination
      const startIndex = Number(offset);
      const endIndex = startIndex + Number(limit);
      const paginatedMerchants = merchants.slice(startIndex, endIndex);
      
      return res.json({ merchants: paginatedMerchants });
    }
    
    console.log('✅ Using database for fetching all merchants');
    
    const { limit = 30, offset = 0 } = req.query;
    
    // Fetch merchants from database
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .range(Number(offset), Number(offset) + Number(limit) - 1)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching merchants:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch merchants', 
        message: error.message 
      });
    }
    
    res.json({ merchants: data });
  } catch (error: any) {
    console.error('Error fetching merchants:', error);
    res.status(500).json({ 
      error: 'Failed to fetch merchants', 
      message: error.message 
    });
  }
});