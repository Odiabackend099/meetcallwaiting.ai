# Callwaiting AI - Production Deployment Guide

## 🚀 Complete Setup & Deployment Instructions

This guide provides comprehensive instructions for deploying the fully connected Callwaiting AI system to production.

## ✅ System Architecture Overview

**Frontend (Next.js/Vite)**: Hosted on Vercel  
**Backend API**: Node.js/Express on Render or AWS  
**Database**: Supabase (PostgreSQL)  
**Telephony**: Twilio Voice & SMS  
**Payments**: Stripe & PayPal  
**Calendar**: Google Calendar & Calendly integration  
**TTS Gateway**: CosyVoice, Piper, RIVA  
**Automation**: n8n workflows  
**Monitoring**: Built-in health checks + n8n alerts  

## 🔧 Prerequisites

1. **Supabase Project** with schema deployed
2. **Twilio Account** with phone numbers
3. **Stripe Account** with Connect enabled
4. **Google Cloud Project** for Calendar API
5. **n8n Instance** for workflow automation
6. **Vercel Account** for frontend hosting
7. **Render/AWS Account** for API hosting

## 🗄️ Database Setup

### 1. Supabase Configuration

```sql
-- Apply the complete schema
-- This creates all tables with proper RLS policies
\i database/schema.sql
```

### 2. Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# PayPal
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-client-secret
PAYPAL_WEBHOOK_ID=your-webhook-id

# Google Calendar
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# n8n
N8N_API_KEY=your-n8n-api-key
N8N_WEBHOOK_URL=https://your-n8n.app

# API Configuration
API_BASE_URL=https://your-api.render.com
PORT=8787
NODE_ENV=production
```

## 🏗️ Backend API Deployment

### 1. Render Deployment

```yaml
# render.yaml
services:
  - type: web
    name: callwaiting-api
    env: node
    plan: starter
    buildCommand: cd apps/api && npm install && npm run build
    startCommand: cd apps/api && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 8787
    healthCheckPath: /health
```

### 2. Environment Setup

```bash
# Install dependencies
cd apps/api
npm install

# Build for production
npm run build

# Start the server
npm start
```

### 3. Health Check Verification

```bash
curl https://your-api.render.com/health
# Should return: {"status": "ok", "timestamp": "..."}
```

## 🌐 Frontend Deployment

### 1. Vercel Configuration

```json
// vercel.json
{
  "builds": [
    {
      "src": "index.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-api.render.com/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://your-api.render.com",
    "NEXT_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key"
  }
}
```

### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

## 📞 Twilio Configuration

### 1. Phone Number Setup

```bash
# Configure webhook URLs for your Twilio numbers
Voice URL: https://your-api.render.com/api/webhooks/twilio/voice
SMS URL: https://your-api.render.com/api/webhooks/twilio/sms
Status Callback: https://your-api.render.com/api/webhooks/twilio/status
```

### 2. TwiML Apps Configuration

```xml
<!-- Voice webhook response -->
<Response>
  <Say voice="Polly.Joanna">Hello! Press 1 for orders, 2 for bookings.</Say>
  <Gather action="/api/webhooks/twilio/ivr" timeout="10" numDigits="1">
    <Say>Please make your selection.</Say>
  </Gather>
  <Record action="/api/webhooks/twilio/recording" maxLength="120"/>
</Response>
```

## 💳 Payment Provider Setup

### 1. Stripe Configuration

```bash
# Set webhook endpoint
https://your-api.render.com/api/webhooks/stripe

# Events to subscribe to:
- checkout.session.completed
- payment_intent.succeeded
- payment_intent.payment_failed
```

### 2. PayPal Configuration

```bash
# Set webhook endpoint
https://your-api.render.com/api/webhooks/paypal

# Events to subscribe to:
- PAYMENT.CAPTURE.COMPLETED
- CHECKOUT.ORDER.APPROVED
- PAYMENT.CAPTURE.DENIED
```

## 📅 Calendar Integration

### 1. Google Calendar OAuth

```bash
# OAuth 2.0 configuration
Authorized redirect URIs:
- https://your-frontend.vercel.app/auth/google/callback
- https://your-api.render.com/api/auth/google/callback

# Scopes required:
- https://www.googleapis.com/auth/calendar
- https://www.googleapis.com/auth/calendar.events
```

### 2. Calendly Webhooks

```bash
# Webhook URL
https://your-api.render.com/api/bookings/calendly/webhook

# Events:
- invitee.created
- invitee.canceled
```

## 🤖 n8n Workflow Deployment

### 1. Import Workflows

```bash
# Import the workflow files
- n8n/webhook_retry_dlq.json
- n8n/daily_merchant_summary.json
- n8n/health_watch.json (updated)
```

### 2. Environment Variables in n8n

```bash
API_BASE_URL=https://your-api.render.com
TTS_GATEWAY_URL=https://your-tts.render.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
DASHBOARD_URL=https://your-frontend.vercel.app
N8N_API_KEY=your-secure-api-key
```

### 3. Activate Workflows

1. **Webhook Retry & DLQ**: Handles failed webhook retries
2. **Daily Merchant Summary**: Sends daily reports at 8 AM
3. **Health Watch**: Monitors system health every 5 minutes

## 🧪 End-to-End Testing

### 1. Install Test Dependencies

```bash
cd tests
npm install
npx playwright install
```

### 2. Run Complete Test Suite

```bash
# Set test environment variables
export API_BASE_URL=https://your-api.render.com
export FRONTEND_URL=https://your-frontend.vercel.app

# Run all tests
npm test

# Run specific test suites
npm run test:e2e
npm run test:webhooks
npm run test:api
```

### 3. Test Coverage Verification

```bash
# Expected test results:
✅ Onboarding Flow (6 tests)
✅ API Integration (5 tests)  
✅ Webhook Tests (8 tests)
✅ Rate Limiting (1 test)
✅ Error Handling (3 tests)
✅ Notifications (3 tests)

Total: 26 tests passing
```

## 🔐 Security Checklist

### ✅ Authentication & Authorization
- [x] JWT tokens for API authentication
- [x] Supabase RLS policies enabled
- [x] Rate limiting (100 req/15min per IP)
- [x] Webhook signature verification

### ✅ Data Protection
- [x] PII redaction in logs
- [x] HTTPS/TLS encryption in transit
- [x] Database encryption at rest
- [x] API key rotation procedures

### ✅ Monitoring & Alerts
- [x] Health check endpoints
- [x] Error logging with request IDs
- [x] Failed webhook retry & DLQ
- [x] Daily system health reports

## 📊 Production Monitoring

### 1. Key Metrics to Monitor

```bash
# API Performance
- Response time < 500ms
- Error rate < 1%
- Uptime > 99.5%

# Webhook Processing
- Success rate > 98%
- Retry attempts < 5%
- DLQ events < 0.1%

# Business Metrics
- Daily active merchants
- Call capture rate
- Payment conversion rate
- Booking completion rate
```

### 2. Alert Thresholds

```bash
# Critical Alerts
- API down for > 2 minutes
- Database connection failures
- Webhook failure rate > 10%
- Payment processing errors

# Warning Alerts  
- Response time > 1s
- Memory usage > 80%
- Disk usage > 85%
- Rate limit approaching
```

## 🚀 Go-Live Checklist

### Pre-Launch
- [ ] Database schema applied and verified
- [ ] All environment variables configured
- [ ] API health checks passing
- [ ] Frontend builds and deploys successfully
- [ ] Twilio numbers configured and tested
- [ ] Payment webhooks verified
- [ ] Calendar integration tested
- [ ] n8n workflows imported and active
- [ ] End-to-end tests passing
- [ ] Security audit completed

### Launch
- [ ] DNS records updated
- [ ] SSL certificates installed
- [ ] Monitoring dashboards configured
- [ ] Team alerts configured
- [ ] Backup procedures tested
- [ ] Rollback plan documented

### Post-Launch
- [ ] Monitor system metrics for 24 hours
- [ ] Verify webhook processing
- [ ] Check daily summary emails
- [ ] Validate payment flows
- [ ] Test call forwarding
- [ ] Review error logs
- [ ] Confirm n8n automation

## 🔄 Maintenance & Updates

### Daily
- Monitor health check alerts
- Review webhook processing logs
- Check payment transaction reports

### Weekly  
- Review system performance metrics
- Update security patches
- Test backup & recovery procedures

### Monthly
- Rotate API keys and secrets
- Update dependencies
- Performance optimization review
- Security audit

## 📞 Support & Troubleshooting

### Common Issues

1. **Webhook Failures**
   - Check signature verification
   - Verify webhook URLs are accessible
   - Review n8n retry logs

2. **Payment Issues**
   - Verify Stripe/PayPal webhook configuration
   - Check API keys and permissions
   - Review payment event logs

3. **Call Routing Problems**
   - Verify Twilio webhook URLs
   - Check phone number configuration
   - Test TwiML responses

### Emergency Contacts
- **System Admin**: admin@callwaitingai.com
- **Technical Lead**: tech@callwaitingai.com  
- **Twilio Support**: support case portal
- **Stripe Support**: dashboard.stripe.com
- **Supabase Support**: support@supabase.com

---

## 🎉 System Successfully Deployed!

Your Callwaiting AI system is now fully connected and operational with:

✅ **Frontend ↔ Backend API Integration**  
✅ **Twilio Voice & SMS Webhooks**  
✅ **Stripe & PayPal Payment Processing**  
✅ **Google Calendar & Calendly Integration**  
✅ **SMS & Email Notifications**  
✅ **n8n Workflow Automation**  
✅ **Comprehensive Security Measures**  
✅ **End-to-End Test Coverage**  
✅ **Production Monitoring & Alerts**  

The system handles the complete customer journey from missed calls to payment completion and appointment booking, with robust error handling, retry logic, and monitoring in place.



