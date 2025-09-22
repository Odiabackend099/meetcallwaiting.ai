// config.js - Application configuration
// This file demonstrates how to use environment variables safely
// Only non-sensitive configuration should be exposed to the frontend

const config = {
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://16.28.128.83:8787',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'production',
  
  // Feature Flags
  FEATURES: {
    DEMO_MODE: import.meta.env.VITE_FEATURE_DEMO_MODE === 'true',
    VOICE_INPUT: import.meta.env.VITE_FEATURE_VOICE_INPUT !== 'false'
  },
  
  // Third-party integrations (public keys only)
  INTEGRATIONS: {
    STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY || null,
    GOOGLE_ANALYTICS_ID: import.meta.env.VITE_GOOGLE_ANALYTICS_ID || null
  }
};

// Validate configuration
if (config.APP_ENV === 'production' && !config.API_BASE_URL) {
  console.warn('API_BASE_URL is not set. Using default value.');
}

export default config;