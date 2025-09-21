// @ts-nocheck
import { supabase } from './supabaseClient.js';

// Google Calendar API integration
export class CalendarService {
  constructor(accessToken, refreshToken, calendarId = 'primary') {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.calendarId = calendarId;
    this.baseUrl = 'https://www.googleapis.com/calendar/v3';
  }

  // Create a calendar event
  async createEvent(eventData) {
    try {
      const event = {
        summary: eventData.service || 'Appointment',
        description: eventData.notes || '',
        start: {
          dateTime: eventData.starts_at,
          timeZone: eventData.timezone || 'America/New_York'
        },
        end: {
          dateTime: eventData.ends_at,
          timeZone: eventData.timezone || 'America/New_York'
        },
        location: eventData.location || 'Phone Call',
        attendees: eventData.customer_email ? [{ email: eventData.customer_email }] : [],
        reminders: {
          useDefault: true
        }
      };

      // In a real implementation, you would make an HTTP request to Google Calendar API
      // For demo purposes, we'll simulate the response
      const mockEventId = 'event_' + Math.random().toString(36).substr(2, 9);
      
      console.log('Creating Google Calendar event:', event);
      
      // Simulate API response
      return {
        success: true,
        eventId: mockEventId,
        htmlLink: `https://calendar.google.com/calendar/event?eid=${mockEventId}`,
        event: {
          id: mockEventId,
          summary: event.summary,
          start: event.start,
          end: event.end,
          location: event.location
        }
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update a calendar event
  async updateEvent(eventId, eventData) {
    try {
      // In a real implementation, you would make an HTTP PUT request to Google Calendar API
      console.log('Updating Google Calendar event:', eventId, eventData);
      
      return {
        success: true,
        eventId: eventId,
        event: eventData
      };
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete a calendar event
  async deleteEvent(eventId) {
    try {
      // In a real implementation, you would make an HTTP DELETE request to Google Calendar API
      console.log('Deleting Google Calendar event:', eventId);
      
      return {
        success: true,
        eventId: eventId
      };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get available time slots (simplified)
  async getAvailableSlots(date, duration = 30) {
    try {
      // In a real implementation, you would query the calendar for busy times
      // and calculate available slots
      console.log('Getting available slots for:', date);
      
      // Mock available slots
      const mockSlots = [
        { start: '09:00', end: '09:30' },
        { start: '10:00', end: '10:30' },
        { start: '11:00', end: '11:30' },
        { start: '14:00', end: '14:30' },
        { start: '15:00', end: '15:30' },
        { start: '16:00', end: '16:30' }
      ];
      
      return {
        success: true,
        slots: mockSlots,
        date: date
      };
    } catch (error) {
      console.error('Error getting available slots:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Calendly integration (webhook-based)
export class CalendlyService {
  constructor(accessToken, organizationUri) {
    this.accessToken = accessToken;
    this.organizationUri = organizationUri;
    this.baseUrl = 'https://api.calendly.com';
  }

  // Create a one-off meeting link
  async createOneOffMeeting(eventData) {
    try {
      // In a real implementation, you would use Calendly's API to create a one-off meeting
      console.log('Creating Calendly one-off meeting:', eventData);
      
      const mockSchedulingUrl = `https://calendly.com/one-off/${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        scheduling_url: mockSchedulingUrl,
        event: eventData
      };
    } catch (error) {
      console.error('Error creating Calendly meeting:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Handle Calendly webhook events
  static async handleWebhook(payload) {
    try {
      const { event, created_at, created_by, payload: eventPayload } = payload;
      
      switch (event) {
        case 'invitee.created':
          await CalendlyService.handleInviteeCreated(eventPayload);
          break;
        case 'invitee.canceled':
          await CalendlyService.handleInviteeCanceled(eventPayload);
          break;
        default:
          console.log('Unhandled Calendly webhook event:', event);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error handling Calendly webhook:', error);
      return { success: false, error: error.message };
    }
  }

  static async handleInviteeCreated(payload) {
    const { invitee, event } = payload;
    
    // Find the corresponding booking in our database
    const { data: booking, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('provider_ref', event.uuid)
      .single();
    
    if (!error && booking) {
      // Update booking status to confirmed
      await supabase
        .from('appointments')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);
      
      console.log('Booking confirmed via Calendly:', booking.id);
    }
  }

  static async handleInviteeCanceled(payload) {
    const { invitee, event } = payload;
    
    // Find the corresponding booking in our database
    const { data: booking, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('provider_ref', event.uuid)
      .single();
    
    if (!error && booking) {
      // Update booking status to cancelled
      await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);
      
      console.log('Booking cancelled via Calendly:', booking.id);
    }
  }
}

// Factory function to create calendar service based on provider
export function createCalendarService(provider, config) {
  switch (provider) {
    case 'google':
      return new CalendarService(
        config.access_token,
        config.refresh_token,
        config.calendar_id
      );
    case 'calendly':
      return new CalendlyService(
        config.access_token,
        config.organization_uri
      );
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`);
  }
}

// Helper function to book an appointment with calendar integration
export async function bookAppointmentWithCalendar(merchantId, bookingData) {
  try {
    // Get merchant's calendar configuration
    const { data: merchant, error } = await supabase
      .from('merchants')
      .select('appointment_provider, google_calendar_id, calendly_link, settings')
      .eq('id', merchantId)
      .single();
    
    if (error) {
      throw new Error(`Failed to fetch merchant: ${error.message}`);
    }
    
    if (!merchant.appointment_provider) {
      throw new Error('No calendar provider configured for this merchant');
    }
    
    // Create booking in our database first
    const { data: booking, error: bookingError } = await supabase
      .from('appointments')
      .insert({
        merchant_id: merchantId,
        customer_phone: bookingData.customer_phone,
        service: bookingData.service,
        starts_at: bookingData.starts_at,
        ends_at: bookingData.ends_at,
        location: bookingData.location,
        notes: bookingData.notes,
        status: 'proposed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (bookingError) {
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }
    
    // Create calendar event
    let calendarResult = null;
    
    if (merchant.appointment_provider === 'google' && merchant.settings?.google_access_token) {
      const calendarService = new CalendarService(
        merchant.settings.google_access_token,
        merchant.settings.google_refresh_token,
        merchant.google_calendar_id
      );
      
      calendarResult = await calendarService.createEvent({
        ...bookingData,
        timezone: merchant.timezone || 'America/New_York'
      });
      
      if (calendarResult.success) {
        // Update booking with calendar event ID
        await supabase
          .from('appointments')
          .update({ 
            provider_ref: calendarResult.eventId,
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);
      }
    } else if (merchant.appointment_provider === 'calendly' && merchant.calendly_link) {
      // For Calendly, we just provide the scheduling link
      calendarResult = {
        success: true,
        scheduling_url: merchant.calendly_link,
        eventId: null
      };
    }
    
    return {
      success: true,
      booking: booking,
      calendar: calendarResult
    };
  } catch (error) {
    console.error('Error booking appointment with calendar:', error);
    return {
      success: false,
      error: error.message
    };
  }
}


