// api.js - Secure API communication utilities
// This file demonstrates how to communicate with backend APIs securely
// All sensitive operations happen on the backend

import config from './config.js';

class ApiClient {
  constructor() {
    this.baseURL = config.API_BASE_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.authToken = this.getAuthToken();
  }

  // Get authentication token from localStorage or sessionStorage
  getAuthToken() {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }

  // Set authentication token
  setAuthToken(token, persistent = false) {
    if (persistent) {
      localStorage.setItem('auth_token', token);
    } else {
      sessionStorage.setItem('auth_token', token);
    }
    this.authToken = token;
  }

  // Clear authentication token
  clearAuthToken() {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    this.authToken = null;
  }

  // Generic request method with enhanced security and retry logic
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const headers = {
      ...this.defaultHeaders,
      'X-Request-ID': requestId,
      ...options.headers,
    };

    // Add authorization header if token exists
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Retry configuration
    const maxRetries = 3;
    const retryDelay = [250, 500, 1000]; // Exponential backoff

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          // Add timeout
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        // Handle authentication errors
        if (response.status === 401) {
          this.clearAuthToken();
          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/onboarding.html';
          }
          throw new Error('Authentication required. Please log in again.');
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay[attempt] || 1000;
          
          if (attempt < maxRetries) {
            console.warn(`Rate limited. Retrying after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
          error.status = response.status;
          error.code = errorData.code;
          error.requestId = requestId;
          throw error;
        }

        return await response.json();
      } catch (error) {
        // Don't retry on client errors (4xx) except 429
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          console.error('API request failed after all retries:', {
            endpoint,
            requestId,
            error: error.message,
            attempts: attempt + 1
          });
          throw error;
        }

        // Wait before retry
        const delay = retryDelay[attempt] || 1000;
        console.warn(`API request failed, retrying in ${delay}ms...`, {
          endpoint,
          requestId,
          attempt: attempt + 1,
          error: error.message
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Authentication methods
  async login(email, password) {
    try {
      const response = await this.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      if (response.token) {
        this.setAuthToken(response.token, true); // Persistent login
        return {
          success: true,
          message: 'Login successful',
          data: response.user
        };
      }
      
      return {
        success: false,
        message: 'Invalid credentials',
        data: null
      };
    } catch (error) {
      console.error('Error logging in:', error);
      return {
        success: false,
        message: 'Login failed: ' + error.message,
        data: null
      };
    }
  }

  async register(userData) {
    try {
      const response = await this.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      
      if (response.token) {
        this.setAuthToken(response.token, true);
        return {
          success: true,
          message: 'Registration successful',
          data: response.user
        };
      }
      
      return {
        success: false,
        message: 'Registration failed',
        data: null
      };
    } catch (error) {
      console.error('Error registering:', error);
      return {
        success: false,
        message: 'Registration failed: ' + error.message,
        data: null
      };
    }
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      this.clearAuthToken();
    }
  }

  // Create a new merchant
  async submitOnboardingData(data) {
    try {
      const response = await this.request('/api/merchants/create', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      return {
        success: true,
        message: 'Merchant created successfully',
        data: response.merchant
      };
    } catch (error) {
      console.error('Error creating merchant:', error);
      return {
        success: false,
        message: 'Failed to create merchant: ' + error.message,
        data: null
      };
    }
  }

  // Assign a Twilio number to a merchant
  async assignNumber(merchantId, region = 'US') {
    try {
      const response = await this.request('/api/numbers/allocate', {
        method: 'POST',
        body: JSON.stringify({ merchant_id: merchantId, region })
      });
      
      return {
        success: true,
        message: 'Number assigned successfully',
        data: { number: response.number }
      };
    } catch (error) {
      console.error('Error assigning number:', error);
      return {
        success: false,
        message: 'Failed to assign number: ' + error.message,
        data: null
      };
    }
  }

  // Connect payment provider
  async connectPaymentProvider(merchantId, provider, accountId, webhookSecret) {
    try {
      const response = await this.request('/api/config/payments/connect', {
        method: 'POST',
        body: JSON.stringify({
          merchant_id: merchantId,
          provider,
          account_id: accountId,
          webhook_endpoint_secret: webhookSecret
        })
      });
      
      return {
        success: true,
        message: response.message,
        data: response.merchant
      };
    } catch (error) {
      console.error('Error connecting payment provider:', error);
      return {
        success: false,
        message: 'Failed to connect payment provider: ' + error.message,
        data: null
      };
    }
  }

  // Connect calendar provider
  async connectCalendarProvider(merchantId, provider, config) {
    try {
      const response = await this.request('/api/config/calendar/connect', {
        method: 'POST',
        body: JSON.stringify({
          merchant_id: merchantId,
          provider,
          ...config
        })
      });
      
      return {
        success: true,
        message: response.message,
        data: response.merchant
      };
    } catch (error) {
      console.error('Error connecting calendar provider:', error);
      return {
        success: false,
        message: 'Failed to connect calendar provider: ' + error.message,
        data: null
      };
    }
  }

  // Connect email provider
  async connectEmailProvider(merchantId, provider, senderEmail, smtpConfig) {
    try {
      const response = await this.request('/api/config/email/connect', {
        method: 'POST',
        body: JSON.stringify({
          merchant_id: merchantId,
          provider,
          sender_email: senderEmail,
          smtp_config: smtpConfig
        })
      });
      
      return {
        success: true,
        message: response.message,
        data: response.merchant
      };
    } catch (error) {
      console.error('Error connecting email provider:', error);
      return {
        success: false,
        message: 'Failed to connect email provider: ' + error.message,
        data: null
      };
    }
  }

  // Create an order with payment link
  async createOrder(merchantId, items, customerPhone, currency = 'usd') {
    try {
      const response = await this.request('/api/orders/create', {
        method: 'POST',
        body: JSON.stringify({
          merchant_id: merchantId,
          items,
          customer_phone: customerPhone,
          currency
        })
      });
      
      return {
        success: true,
        message: 'Order created successfully',
        data: {
          orderId: response.order_id,
          paymentLinkUrl: response.payment_link_url,
          paymentLinkId: response.payment_link_id
        }
      };
    } catch (error) {
      console.error('Error creating order:', error);
      return {
        success: false,
        message: 'Failed to create order: ' + error.message,
        data: null
      };
    }
  }

  // Create a booking
  async createBooking(merchantId, customerPhone, service, startsAt, endsAt, location, notes) {
    try {
      const response = await this.request('/api/bookings/create', {
        method: 'POST',
        body: JSON.stringify({
          merchant_id: merchantId,
          customer_phone: customerPhone,
          service,
          starts_at: startsAt,
          ends_at: endsAt,
          location,
          notes
        })
      });
      
      return {
        success: true,
        message: 'Booking created successfully',
        data: {
          bookingId: response.eventId,
          status: response.status,
          booking: response.booking
        }
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      return {
        success: false,
        message: 'Failed to create booking: ' + error.message,
        data: null
      };
    }
  }

  // Send notifications
  async sendNotification(type, data) {
    try {
      const response = await this.request(`/api/notifications/${type}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      return {
        success: true,
        message: response.message || 'Notification sent successfully',
        data: response
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        message: 'Failed to send notification: ' + error.message,
        data: null
      };
    }
  }

  // Get merchant by ID
  async getMerchant(merchantId) {
    try {
      const response = await this.request(`/api/merchants/${merchantId}`);
      return {
        success: true,
        message: 'Merchant fetched successfully',
        data: response.merchant
      };
    } catch (error) {
      console.error('Error fetching merchant:', error);
      return {
        success: false,
        message: 'Failed to fetch merchant: ' + error.message,
        data: null
      };
    }
  }

  // Update merchant settings
  async updateMerchantSettings(merchantId, settings) {
    try {
      const response = await this.request(`/api/merchants/${merchantId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ settings })
      });
      
      return {
        success: true,
        message: 'Merchant settings updated successfully',
        data: response.merchant
      };
    } catch (error) {
      console.error('Error updating merchant settings:', error);
      return {
        success: false,
        message: 'Failed to update merchant settings: ' + error.message,
        data: null
      };
    }
  }

  // Get dashboard data
  async getDashboardData() {
    // In a real implementation, this would fetch data from your backend
    // The backend would:
    // - Authenticate the user
    // - Fetch data from your database
    // - Return only the data the user is authorized to see
    return {
      kpi: {
        capturedCalls: 42,
        paidOrders: 27,
        bookings: 18,
        avgResponseTime: 4.6
      },
      orders: [
        { time: '10:30 AM', caller: '+1 (555) 123-4567', total: '$24.99', status: 'paid' },
        { time: '9:15 AM', caller: '+1 (555) 987-6543', total: '$18.50', status: 'paid' },
        { time: 'Yesterday, 4:20 PM', caller: '+1 (555) 456-7890', total: '$32.75', status: 'paid' },
        { time: 'Yesterday, 1:45 PM', caller: '+1 (555) 234-5678', total: '$15.00', status: 'paid' }
      ],
      appointments: [
        { time: 'Tomorrow, 10:30 AM', caller: '+1 (555) 123-4567', service: 'Haircut & Color', status: 'booked' },
        { time: 'Tomorrow, 2:00 PM', caller: '+1 (555) 987-6543', service: 'Consultation', status: 'booked' },
        { time: 'Today, 11:00 AM', caller: '+1 (555) 456-7890', service: 'Follow-up', status: 'completed' }
      ]
    };
  }
}

// Export a singleton instance
const apiClient = new ApiClient();
export default apiClient;