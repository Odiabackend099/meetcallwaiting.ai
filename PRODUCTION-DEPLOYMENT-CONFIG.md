# Production Deployment Configuration

## Overview
This document provides comprehensive configuration for deploying Callwaiting AI to production with enterprise-grade security and scalability.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Vercel)      │◄──►│   (Render/EC2)  │◄──►│   (Supabase)    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Assets    │    │   Webhooks      │    │   File Storage  │
│   (Vercel)      │    │   (Twilio/      │    │   (Supabase)    │
│                 │    │   Stripe/PayPal)│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Deployment (Vercel)

### Environment Variables
```bash
# Vercel Environment Variables
VITE_API_BASE_URL=https://your-api-domain.com
VITE_APP_ENV=production
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
VITE_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
VITE_FEATURE_DEMO_MODE=false
VITE_FEATURE_VOICE_INPUT=true
```

### Vercel Configuration
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node.js Version**: 18.x

### Security Headers
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

## Backend Deployment (Render/EC2)

### Environment Variables
```bash
# Core Configuration
NODE_ENV=production
PORT=8787
CORS_ORIGIN=https://your-frontend-domain.com

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=postgresql://user:password@host:port/database

# Security
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_EXPIRES_IN=24h
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Payment Providers
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id

# Email
SENDGRID_API_KEY=your_sendgrid_api_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Google Calendar
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback

# n8n
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_API_KEY=your_n8n_api_key

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
```

### Render Deployment
1. **Service Type**: Web Service
2. **Build Command**: `cd apps/api && npm install && npm run build`
3. **Start Command**: `cd apps/api && npm start`
4. **Environment**: Node.js 18
5. **Health Check**: `/health`

### EC2 Deployment
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone repository
git clone https://github.com/Odiabackend099/meetcallwaiting.ai.git
cd meetcallwaiting.ai

# Install dependencies
cd apps/api
npm install
npm run build

# Start with PM2
pm2 start dist/index.js --name "callwaiting-api"
pm2 startup
pm2 save
```

## Database Configuration (Supabase)

### RLS Policies
Execute the RLS policies from `database/rls-policies.sql`:

```sql
-- Enable RLS on all tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
-- ... (see full file for complete policies)
```

### Database Migrations
```bash
# Run migrations
supabase db push

# Apply RLS policies
psql -h your-db-host -U postgres -d postgres -f database/rls-policies.sql
```

## Security Checklist

### ✅ Authentication & Authorization
- [ ] JWT tokens with proper expiration
- [ ] Row Level Security (RLS) enabled
- [ ] API endpoints protected with authentication middleware
- [ ] Webhook signature verification implemented

### ✅ Data Protection
- [ ] PII redaction in logs
- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced for all communications
- [ ] CORS properly configured

### ✅ Rate Limiting & DDoS Protection
- [ ] Rate limiting: 100 requests per 15 minutes per IP
- [ ] Request timeout: 30 seconds
- [ ] Retry logic with exponential backoff
- [ ] Health check endpoints

### ✅ Webhook Security
- [ ] Stripe signature verification
- [ ] PayPal signature verification
- [ ] Twilio signature verification
- [ ] Idempotency checks
- [ ] Replay attack prevention

### ✅ Monitoring & Logging
- [ ] Request ID tracking
- [ ] Structured logging with Pino
- [ ] Error tracking with Sentry
- [ ] Health check endpoints

## Deployment Steps

### 1. Frontend (Vercel)
```bash
# Connect GitHub repository to Vercel
# Set environment variables in Vercel dashboard
# Deploy automatically on push to main branch
```

### 2. Backend (Render)
```bash
# Create new Web Service in Render
# Connect GitHub repository
# Set environment variables
# Deploy automatically
```

### 3. Database (Supabase)
```bash
# Create new Supabase project
# Run database migrations
# Apply RLS policies
# Configure webhook endpoints
```

### 4. Domain Configuration
```bash
# Configure custom domain in Vercel
# Set up SSL certificates
# Configure DNS records
# Update CORS_ORIGIN in backend
```

## Testing Production Deployment

### Health Checks
```bash
# Frontend
curl https://your-frontend-domain.com

# Backend
curl https://your-api-domain.com/health

# Database
curl https://your-api-domain.com/api/health
```

### Security Tests
```bash
# Test authentication
curl -H "Authorization: Bearer invalid-token" https://your-api-domain.com/api/merchants

# Test rate limiting
for i in {1..110}; do curl https://your-api-domain.com/api/health; done

# Test webhook signatures
curl -X POST https://your-api-domain.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Monitoring & Maintenance

### Log Monitoring
- Monitor application logs for errors
- Set up alerts for failed webhook processing
- Track API response times and error rates

### Security Monitoring
- Monitor for suspicious authentication attempts
- Track webhook signature verification failures
- Monitor rate limiting triggers

### Performance Monitoring
- Track API response times
- Monitor database query performance
- Set up alerts for high error rates

## Backup & Recovery

### Database Backups
- Supabase automatic backups (daily)
- Point-in-time recovery available
- Cross-region replication

### Code Backups
- GitHub repository with full history
- Automated deployments from main branch
- Rollback capability via Vercel/Render

## Support & Maintenance

### Regular Tasks
- [ ] Monitor application logs daily
- [ ] Review security alerts weekly
- [ ] Update dependencies monthly
- [ ] Test disaster recovery quarterly

### Emergency Procedures
- [ ] Rollback deployment process
- [ ] Database recovery procedures
- [ ] Incident response plan
- [ ] Communication protocols

## Cost Optimization

### Frontend (Vercel)
- Free tier: 100GB bandwidth/month
- Pro tier: $20/month for unlimited bandwidth

### Backend (Render)
- Free tier: 750 hours/month
- Starter tier: $7/month for always-on

### Database (Supabase)
- Free tier: 500MB database, 2GB bandwidth
- Pro tier: $25/month for 8GB database, 250GB bandwidth

### Total Estimated Cost
- **Development**: Free (using free tiers)
- **Production**: ~$52/month (Pro tiers)
- **Enterprise**: Custom pricing based on usage
