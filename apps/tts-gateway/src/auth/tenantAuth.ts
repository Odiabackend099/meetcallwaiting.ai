// auth/tenantAuth.ts
// Multi-tenant authentication and authorization system

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface TenantConfig {
  tenant_id: string;
  api_key: string;
  rate_limit: {
    requests_per_minute: number;
    requests_per_hour: number;
    requests_per_day: number;
  };
  voice_settings: {
    default_voice_id: string;
    allowed_voice_ids: string[];
    max_voice_uploads: number;
  };
  features: {
    streaming: boolean;
    ssml: boolean;
    voice_cloning: boolean;
    custom_models: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface AuthResult {
  valid: boolean;
  tenant_id?: string;
  config?: TenantConfig;
  error?: string;
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  reset_time: number;
  limit: number;
}

export class TenantAuthService {
  private supabase;
  private rateLimitCache = new Map<string, { count: number; resetTime: number }>();
  private tenantCache = new Map<string, TenantConfig>();

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Authenticate API key and get tenant configuration
   */
  async authenticate(apiKey: string): Promise<AuthResult> {
    try {
      // Check cache first
      if (this.tenantCache.has(apiKey)) {
        const config = this.tenantCache.get(apiKey)!;
        return {
          valid: true,
          tenant_id: config.tenant_id,
          config
        };
      }

      // Query database
      const { data, error } = await this.supabase
        .from('tenant_configs')
        .select('*')
        .eq('api_key', apiKey)
        .eq('active', true)
        .single();

      if (error || !data) {
        return {
          valid: false,
          error: 'Invalid API key'
        };
      }

      // Cache the result
      this.tenantCache.set(apiKey, data);

      return {
        valid: true,
        tenant_id: data.tenant_id,
        config: data
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        valid: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Check rate limits for a tenant
   */
  async checkRateLimit(tenantId: string, window: 'minute' | 'hour' | 'day' = 'minute'): Promise<RateLimitInfo> {
    try {
      const config = await this.getTenantConfig(tenantId);
      if (!config) {
        return {
          allowed: false,
          remaining: 0,
          reset_time: Date.now() + 60000,
          limit: 0
        };
      }

      const limit = config.rate_limit[`requests_per_${window}`];
      const cacheKey = `${tenantId}:${window}`;
      const now = Date.now();
      
      // Calculate reset time based on window
      let resetTime: number;
      switch (window) {
        case 'minute':
          resetTime = now + 60000;
          break;
        case 'hour':
          resetTime = now + 3600000;
          break;
        case 'day':
          resetTime = now + 86400000;
          break;
      }

      const cached = this.rateLimitCache.get(cacheKey);
      
      if (!cached || cached.resetTime <= now) {
        // Reset or initialize counter
        this.rateLimitCache.set(cacheKey, { count: 1, resetTime });
        return {
          allowed: true,
          remaining: limit - 1,
          reset_time: resetTime,
          limit
        };
      }

      if (cached.count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          reset_time: cached.resetTime,
          limit
        };
      }

      // Increment counter
      cached.count++;
      this.rateLimitCache.set(cacheKey, cached);

      return {
        allowed: true,
        remaining: limit - cached.count,
        reset_time: cached.resetTime,
        limit
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return {
        allowed: false,
        remaining: 0,
        reset_time: Date.now() + 60000,
        limit: 0
      };
    }
  }

  /**
   * Get tenant configuration by tenant ID
   */
  async getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('tenant_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting tenant config:', error);
      return null;
    }
  }

  /**
   * Generate API key for a tenant
   */
  async generateApiKey(tenantId: string, metadata?: any): Promise<string> {
    try {
      const apiKey = this.generateSecureApiKey();
      
      const { error } = await this.supabase
        .from('tenant_configs')
        .insert({
          tenant_id,
          api_key: apiKey,
          rate_limit: {
            requests_per_minute: 100,
            requests_per_hour: 5000,
            requests_per_day: 50000
          },
          voice_settings: {
            default_voice_id: 'en-US-generic',
            allowed_voice_ids: ['en-US-generic', 'en-US-male', 'en-US-female'],
            max_voice_uploads: 10
          },
          features: {
            streaming: true,
            ssml: true,
            voice_cloning: true,
            custom_models: false
          },
          metadata: metadata || {},
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Failed to create API key: ${error.message}`);
      }

      return apiKey;
    } catch (error) {
      console.error('Error generating API key:', error);
      throw error;
    }
  }

  /**
   * Validate tenant access to specific voice
   */
  async validateVoiceAccess(tenantId: string, voiceId: string): Promise<boolean> {
    try {
      const config = await this.getTenantConfig(tenantId);
      if (!config) {
        return false;
      }

      // Check if voice is in allowed list
      if (!config.voice_settings.allowed_voice_ids.includes(voiceId)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating voice access:', error);
      return false;
    }
  }

  /**
   * Check if tenant has specific feature enabled
   */
  async hasFeature(tenantId: string, feature: keyof TenantConfig['features']): Promise<boolean> {
    try {
      const config = await this.getTenantConfig(tenantId);
      if (!config) {
        return false;
      }

      return config.features[feature] === true;
    } catch (error) {
      console.error('Error checking feature:', error);
      return false;
    }
  }

  /**
   * Update tenant configuration
   */
  async updateTenantConfig(tenantId: string, updates: Partial<TenantConfig>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tenant_configs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId);

      if (error) {
        throw new Error(`Failed to update tenant config: ${error.message}`);
      }

      // Clear cache
      this.tenantCache.clear();
    } catch (error) {
      console.error('Error updating tenant config:', error);
      throw error;
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKey: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tenant_configs')
        .update({ active: false })
        .eq('api_key', apiKey);

      if (error) {
        throw new Error(`Failed to revoke API key: ${error.message}`);
      }

      // Clear cache
      this.tenantCache.delete(apiKey);
    } catch (error) {
      console.error('Error revoking API key:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics for a tenant
   */
  async getUsageStats(tenantId: string, startDate?: Date, endDate?: Date): Promise<{
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    total_audio_duration: number;
    average_latency: number;
  }> {
    try {
      let query = this.supabase
        .from('tts_usage_logs')
        .select('*')
        .eq('tenant_id', tenantId);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get usage stats: ${error.message}`);
      }

      const stats = {
        total_requests: data.length,
        successful_requests: data.filter(log => log.success).length,
        failed_requests: data.filter(log => !log.success).length,
        total_audio_duration: data.reduce((sum, log) => sum + (log.audio_duration || 0), 0),
        average_latency: data.reduce((sum, log) => sum + (log.latency_ms || 0), 0) / data.length || 0
      };

      return stats;
    } catch (error) {
      console.error('Error getting usage stats:', error);
      throw error;
    }
  }

  /**
   * Generate secure API key
   */
  private generateSecureApiKey(): string {
    const prefix = 'tts_';
    const randomBytes = crypto.randomBytes(32);
    const key = randomBytes.toString('hex');
    return `${prefix}${key}`;
  }

  /**
   * Clear rate limit cache (useful for testing)
   */
  clearRateLimitCache(): void {
    this.rateLimitCache.clear();
  }

  /**
   * Clear tenant cache (useful for testing)
   */
  clearTenantCache(): void {
    this.tenantCache.clear();
  }
}

// Export singleton instance
export const tenantAuthService = new TenantAuthService();

// Middleware factory for Express
export function createAuthMiddleware() {
  return async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Missing or invalid authorization header',
          code: 'AUTH_REQUIRED'
        });
      }

      const apiKey = authHeader.substring(7);
      const authResult = await tenantAuthService.authenticate(apiKey);

      if (!authResult.valid) {
        return res.status(401).json({
          error: authResult.error || 'Invalid API key',
          code: 'AUTH_FAILED'
        });
      }

      // Check rate limits
      const rateLimit = await tenantAuthService.checkRateLimit(authResult.tenant_id!);
      
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          reset_time: rateLimit.reset_time,
          limit: rateLimit.limit
        });
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.reset_time.toString()
      });

      // Attach tenant info to request
      req.tenant = {
        id: authResult.tenant_id,
        config: authResult.config
      };

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        error: 'Authentication service error',
        code: 'AUTH_SERVICE_ERROR'
      });
    }
  };
}
