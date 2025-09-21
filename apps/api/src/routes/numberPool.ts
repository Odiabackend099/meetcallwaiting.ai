// @ts-nocheck
import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';

export const router = Router();

// In a real implementation, this would interface with Twilio's API
// For now, we'll simulate the number pool functionality

// Mock number pool - in production this would be populated from Twilio
let numberPool: string[] = [];
let assignedNumbers: Map<string, string> = new Map(); // merchant_id -> number

// Initialize with some mock numbers if pool is empty
if (numberPool.length === 0) {
  numberPool = [
    '+15551234567',
    '+15551234568',
    '+15551234569',
    '+15551234570',
    '+15551234571'
  ];
}

// Allocate a number from the pool
router.post('/allocate', async (req: Request, res: Response) => {
  try {
    const { merchant_id, region } = req.body;
    
    // Validate required fields
    if (!merchant_id) {
      return res.status(400).json({ 
        error: 'Missing required field: merchant_id' 
      });
    }
    
    // Check if merchant already has an assigned number
    if (assignedNumbers.has(merchant_id)) {
      return res.json({ 
        number: assignedNumbers.get(merchant_id),
        message: 'Merchant already has an assigned number'
      });
    }
    
    // Check if pool has available numbers
    if (numberPool.length === 0) {
      return res.status(500).json({ 
        error: 'No numbers available in pool' 
      });
    }
    
    // Allocate the first available number
    const allocatedNumber = numberPool.shift();
    
    if (!allocatedNumber) {
      return res.status(500).json({ 
        error: 'Failed to allocate number' 
      });
    }
    
    // Record the assignment
    assignedNumbers.set(merchant_id, allocatedNumber);
    
    // Update merchant record in database
    const { error: updateError } = await supabase
      .from('merchants')
      .update({ 
        number_assigned: allocatedNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', merchant_id);
    
    if (updateError) {
      console.error('Error updating merchant with assigned number:', updateError);
      // Return the number anyway but log the error
    }
    
    res.status(201).json({ 
      number: allocatedNumber,
      message: 'Number successfully allocated'
    });
  } catch (error: any) {
    console.error('Error allocating number:', error);
    res.status(500).json({ 
      error: 'Failed to allocate number', 
      message: error.message 
    });
  }
});

// Release a number back to the pool
router.post('/release', async (req: Request, res: Response) => {
  try {
    const { merchant_id, number } = req.body;
    
    // Validate required fields
    if (!merchant_id && !number) {
      return res.status(400).json({ 
        error: 'Missing required field: merchant_id or number' 
      });
    }
    
    let numberToRelease = number;
    
    // If number not provided, get it from the assigned numbers map
    if (!numberToRelease && assignedNumbers.has(merchant_id)) {
      numberToRelease = assignedNumbers.get(merchant_id);
    }
    
    // If we still don't have a number, return error
    if (!numberToRelease) {
      return res.status(400).json({ 
        error: 'No number found to release' 
      });
    }
    
    // Remove from assigned numbers
    assignedNumbers.delete(merchant_id);
    
    // Add back to pool
    numberPool.push(numberToRelease);
    
    // Update merchant record in database
    if (merchant_id) {
      const { error: updateError } = await supabase
        .from('merchants')
        .update({ 
          number_assigned: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', merchant_id);
      
      if (updateError) {
        console.error('Error updating merchant to remove assigned number:', updateError);
        // Continue anyway but log the error
      }
    }
    
    res.json({ 
      message: 'Number successfully released back to pool'
    });
  } catch (error: any) {
    console.error('Error releasing number:', error);
    res.status(500).json({ 
      error: 'Failed to release number', 
      message: error.message 
    });
  }
});

// Get available numbers count
router.get('/available', async (_req: Request, res: Response) => {
  try {
    res.json({ 
      available: numberPool.length,
      assigned: assignedNumbers.size,
      total: numberPool.length + assignedNumbers.size
    });
  } catch (error: any) {
    console.error('Error getting pool status:', error);
    res.status(500).json({ 
      error: 'Failed to get pool status', 
      message: error.message 
    });
  }
});

// Get assigned number for merchant
router.get('/assigned/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    
    if (assignedNumbers.has(merchantId)) {
      return res.json({ 
        number: assignedNumbers.get(merchantId)
      });
    }
    
    // Check in database
    const { data, error } = await supabase
      .from('merchants')
      .select('number_assigned')
      .eq('id', merchantId)
      .single();
    
    if (error) {
      console.error('Error fetching assigned number from database:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch assigned number', 
        message: error.message 
      });
    }
    
    if (data && data.number_assigned) {
      return res.json({ 
        number: data.number_assigned
      });
    }
    
    res.status(404).json({ 
      error: 'No number assigned to this merchant'
    });
  } catch (error: any) {
    console.error('Error getting assigned number:', error);
    res.status(500).json({ 
      error: 'Failed to get assigned number', 
      message: error.message 
    });
  }
});