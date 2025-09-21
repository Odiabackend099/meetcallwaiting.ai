// @ts-nocheck
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../utils/supabaseClient.js';
import { bookAppointmentWithCalendar, CalendlyService } from '../utils/calendarService.js';

export const router = Router();

// Create a new booking with calendar integration
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { 
      merchant_id, 
      customer_phone, 
      customer_email,
      service, 
      starts_at, 
      ends_at, 
      location,
      notes 
    } = req.body;
    
    // Validate required fields
    if (!merchant_id || !customer_phone || !service || !starts_at) {
      return res.status(400).json({ 
        error: 'Missing required fields: merchant_id, customer_phone, service, starts_at' 
      });
    }
    
    // Validate date format
    const startDate = new Date(starts_at);
    const endDate = ends_at ? new Date(ends_at) : new Date(startDate.getTime() + 30 * 60000); // Default 30 min
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)' 
      });
    }
    
    // Use calendar integration service
    const result = await bookAppointmentWithCalendar(merchant_id, {
      customer_phone,
      customer_email,
      service,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      location: location || 'Phone Call',
      notes: notes || ''
    });
    
    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to create booking with calendar integration', 
        message: result.error 
      });
    }
    
    // Return the created booking with calendar info
    res.status(201).json({ 
      eventId: result.booking.id, 
      status: result.booking.status,
      booking: result.booking,
      calendar: result.calendar
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      error: 'Failed to create booking', 
      message: error.message 
    });
  }
});

// Get bookings for a merchant
router.get('/merchant/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { status, limit = 30 } = req.query;
    
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('starts_at', { ascending: true })
      .limit(Number(limit));
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching bookings:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch bookings', 
        message: error.message 
      });
    }
    
    res.json({ bookings: data });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bookings', 
      message: error.message 
    });
  }
});

// Update booking status
router.patch('/:bookingId/status', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['proposed', 'confirmed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: proposed, confirmed, cancelled' 
      });
    }
    
    // Update booking status
    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating booking status:', error);
      return res.status(500).json({ 
        error: 'Failed to update booking status', 
        message: error.message 
      });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({ booking: data });
  } catch (error: any) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ 
      error: 'Failed to update booking status', 
      message: error.message 
    });
  }
});

// Calendly webhook handler
router.post('/calendly/webhook', async (req: Request, res: Response) => {
  try {
    const result = await CalendlyService.handleWebhook(req.body);
    
    if (result.success) {
      res.json({ received: true, processed: true });
    } else {
      res.status(500).json({ received: true, processed: false, error: result.error });
    }
  } catch (error: any) {
    console.error('Error handling Calendly webhook:', error);
    res.status(500).json({ received: true, processed: false, error: error.message });
  }
});

// Get available time slots for a merchant
router.get('/availability/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { date, duration = 30 } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        error: 'Date parameter is required (YYYY-MM-DD format)' 
      });
    }
    
    // Get merchant's calendar configuration
    const { data: merchant, error } = await supabase
      .from('merchants')
      .select('appointment_provider, google_calendar_id, settings')
      .eq('id', merchantId)
      .single();
    
    if (error) {
      return res.status(500).json({ 
        error: 'Failed to fetch merchant', 
        message: error.message 
      });
    }
    
    if (!merchant.appointment_provider) {
      return res.status(400).json({ 
        error: 'No calendar provider configured for this merchant' 
      });
    }
    
    // For demo purposes, return mock available slots
    const mockSlots = [
      { start: '09:00', end: '09:30', available: true },
      { start: '09:30', end: '10:00', available: true },
      { start: '10:00', end: '10:30', available: false },
      { start: '10:30', end: '11:00', available: true },
      { start: '11:00', end: '11:30', available: true },
      { start: '14:00', end: '14:30', available: true },
      { start: '14:30', end: '15:00', available: true },
      { start: '15:00', end: '15:30', available: false },
      { start: '15:30', end: '16:00', available: true },
      { start: '16:00', end: '16:30', available: true }
    ];
    
    const availableSlots = mockSlots.filter(slot => slot.available);
    
    res.json({ 
      date: date,
      duration: Number(duration),
      slots: availableSlots,
      timezone: merchant.timezone || 'America/New_York'
    });
  } catch (error: any) {
    console.error('Error getting availability:', error);
    res.status(500).json({ 
      error: 'Failed to get availability', 
      message: error.message 
    });
  }
});