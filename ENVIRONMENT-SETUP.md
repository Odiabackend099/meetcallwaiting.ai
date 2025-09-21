# Environment Configuration Guide

## Frontend Environment Variables (Vite)
These are safe to expose in the frontend build:

```bash
# .env.production
VITE_API_BASE_URL=https://your-api-domain.com
VITE_APP_ENV=production
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
VITE_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
VITE_FEATURE_DEMO_MODE=false
VITE_FEATURE_VOICE_INPUT=true
```

## Backend Environment Variables (Server-side only)
These are NEVER exposed to the frontend:

```bash
# Backend .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_EXPIRES_IN=24h

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Payment Providers
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id

# Email Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Google Calendar
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback

# Security
CORS_ORIGIN=https://your-frontend-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# n8n Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_API_KEY=your_n8n_api_key

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
```

## Security Best Practices

1. **Never commit .env files to version control**
2. **Use different secrets for development and production**
3. **Rotate secrets regularly**
4. **Use environment-specific configurations**
5. **Validate all environment variables on startup**
