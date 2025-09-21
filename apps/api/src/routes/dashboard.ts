import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

export const router = Router();

// Get dashboard data for authenticated user
router.get('/data', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'User not authenticated' 
      });
    }

    // Get merchant data for the user
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('billing_email', req.user.email)
      .single();

    if (merchantError && merchantError.code !== 'PGRST116') {
      console.error('Error fetching merchant:', merchantError);
      return res.status(500).json({ 
        error: 'Failed to fetch merchant data' 
      });
    }

    if (!merchant) {
      return res.status(404).json({ 
        error: 'No merchant found for this user' 
      });
    }

    // Get orders data
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
    }

    // Get appointments data
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
    }

    // Get events data for call analytics
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('type', 'twilio_call_status')
      .order('created_at', { ascending: false })
      .limit(50);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
    }

    // Calculate KPIs
    const totalOrders = orders?.length || 0;
    const paidOrders = orders?.filter(order => order.status === 'paid').length || 0;
    const totalAppointments = appointments?.length || 0;
    const confirmedAppointments = appointments?.filter(apt => apt.status === 'confirmed').length || 0;
    
    // Calculate call metrics from events
    const callEvents = events?.filter(event => event.type === 'twilio_call_status') || [];
    const totalCalls = callEvents.length;
    const missedCalls = callEvents.filter(event => 
      event.payload?.CallStatus === 'no-answer' || 
      event.payload?.CallStatus === 'busy'
    ).length;

    // Calculate average response time (mock for now)
    const avgResponseTime = 4.6;

    // Format orders for display
    const formattedOrders = orders?.map(order => ({
      id: order.id,
      time: new Date(order.created_at).toLocaleString(),
      caller: order.customer_phone || 'Unknown',
      total: `$${order.total || 0}`,
      status: order.status,
      items: order.items
    })) || [];

    // Format appointments for display
    const formattedAppointments = appointments?.map(appointment => ({
      id: appointment.id,
      time: new Date(appointment.starts_at).toLocaleString(),
      caller: appointment.customer_phone || 'Unknown',
      service: appointment.service || 'General Service',
      status: appointment.status,
      location: appointment.location
    })) || [];

    // Get recent activity
    const recentActivity = [
      ...formattedOrders.slice(0, 3).map(order => ({
        id: order.id,
        type: 'order',
        description: `New order from ${order.caller}`,
        timestamp: order.time,
        amount: order.total
      })),
      ...formattedAppointments.slice(0, 3).map(appointment => ({
        id: appointment.id,
        type: 'appointment',
        description: `Appointment booked: ${appointment.service}`,
        timestamp: appointment.time,
        caller: appointment.caller
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 5);

    const dashboardData = {
      merchant: {
        id: merchant.id,
        name: merchant.name,
        industry: merchant.industry,
        phone: merchant.number_assigned,
        email: merchant.billing_email
      },
      kpi: {
        totalCalls,
        missedCalls,
        totalOrders,
        paidOrders,
        totalAppointments,
        confirmedAppointments,
        avgResponseTime,
        revenue: paidOrders * 25.50 // Mock revenue calculation
      },
      orders: formattedOrders,
      appointments: formattedAppointments,
      recentActivity
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data', 
      message: error.message 
    });
  }
});

// Get merchant settings
router.get('/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'User not authenticated' 
      });
    }

    // Get merchant data
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('billing_email', req.user.email)
      .single();

    if (merchantError) {
      console.error('Error fetching merchant:', merchantError);
      return res.status(500).json({ 
        error: 'Failed to fetch merchant settings' 
      });
    }

    if (!merchant) {
      return res.status(404).json({ 
        error: 'No merchant found for this user' 
      });
    }

    res.json({
      success: true,
      data: {
        merchant: {
          id: merchant.id,
          name: merchant.name,
          industry: merchant.industry,
          country: merchant.country,
          timezone: merchant.timezone,
          currency: merchant.currency,
          website: merchant.website,
          phone: merchant.number_assigned,
          email: merchant.billing_email,
          sender_email: merchant.sender_email,
          appointment_provider: merchant.appointment_provider,
          calendly_link: merchant.calendly_link,
          google_calendar_id: merchant.google_calendar_id,
          settings: merchant.settings
        }
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

// Update merchant settings
router.patch('/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { settings } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'User not authenticated' 
      });
    }

    if (!settings) {
      return res.status(400).json({ 
        error: 'Settings data is required' 
      });
    }

    // Update merchant settings
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .update({ 
        settings: settings,
        updated_at: new Date().toISOString()
      })
      .eq('billing_email', req.user.email)
      .select()
      .single();

    if (merchantError) {
      console.error('Error updating merchant settings:', merchantError);
      return res.status(500).json({ 
        error: 'Failed to update merchant settings' 
      });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        merchant: {
          id: merchant.id,
          name: merchant.name,
          settings: merchant.settings
        }
      }
    });

  } catch (error: any) {
    console.error('Error updating merchant settings:', error);
    res.status(500).json({ 
      error: 'Failed to update merchant settings', 
      message: error.message 
    });
  }
});
