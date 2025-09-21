# callwaiting.ai Deployment Guide

## Prerequisites

1. Node.js v18+ installed
2. npm v8+ installed
3. Supabase account and project
4. Twilio account (for production)
5. Stripe account (for production)

## Initial Setup

1. Clone or extract the project files
2. Navigate to the project root directory
3. Install dependencies for both services:

```bash
# Install API service dependencies
cd apps/api
npm install
cd ../..

# Install TTS Gateway dependencies
cd apps/tts-gateway
npm install
cd ../..
```

## Environment Configuration

1. Copy `.env.example` to `.env` in the root directory and in each service directory:
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/tts-gateway/.env.example apps/tts-gateway/.env
   ```

2. Update the `.env` files with your actual credentials:
   - Supabase URL and service role key
   - Twilio credentials (for production)
   - Stripe secret key and webhook secret (for production)
   - Other service credentials as needed

## Database Setup

1. Create a Supabase project
2. Apply the schema from `database/schema.sql`:
   ```sql
   -- Run this in your Supabase SQL editor
   -- Contents of database/schema.sql
   ```
3. Note the Supabase URL and service role key for your `.env` files

## Starting Services

### Method 1: Using the Provided Scripts (Windows)

```cmd
# Run the final startup script
START-SERVICES-FINAL.bat
```

### Method 2: Manual Start

```bash
# Start TTS Gateway (port 8790)
cd apps/tts-gateway
npm run dev

# In a new terminal, start API Service (port 8787)
cd apps/api
npm run dev
```

### Method 3: Using PM2 (for production)

```bash
# Install PM2 globally
npm install -g pm2

# Start services with PM2
pm2 start apps/tts-gateway/ecosystem.config.js
pm2 start apps/api/ecosystem.config.js
```

## Service Endpoints

### API Service (http://localhost:8787)

- `GET /health` - Health check
- `POST /orders/create` - Create order with payment link
- `GET /orders/merchant/{merchantId}` - Get orders for merchant
- `PATCH /orders/{orderId}/status` - Update order status
- `POST /ivr/handle` - Handle IVR interactions
- `GET /ivr/settings/{merchantId}` - Get IVR settings
- `POST /bookings/create` - Create booking
- `GET /bookings/merchant/{merchantId}` - Get bookings for merchant
- `PATCH /bookings/{bookingId}/status` - Update booking status
- `POST /merchants/create` - Create merchant
- `GET /merchants/{merchantId}` - Get merchant
- `PATCH /merchants/{merchantId}/settings` - Update merchant settings
- `GET /merchants` - List merchants
- `POST /webhooks/stripe` - Stripe webhook handler
- `POST /webhooks/twilio/voice` - Twilio voice webhook handler

### TTS Gateway (http://localhost:8790)

- `GET /health` - Health check
- `POST /v1/tts:synthesize` - Text-to-speech synthesis
- `POST /v1/tts:stream` - Streaming TTS
- `GET /v1/tts:engines` - List available TTS engines

## Testing

Run the comprehensive test script to verify all services:

```bash
node comprehensive-test.js
```

## Twilio Integration

1. Import the Studio flow from `twilio/studio-flow.json`
2. Update the webhook URLs in the Studio flow to point to your deployed API service
3. Configure the Twilio phone number to use the Studio flow

## Stripe Integration

1. Set up Stripe webhooks to point to `http://your-domain.com/webhooks/stripe`
2. Copy the webhook signing secret to your `.env` file
3. Create products and prices in your Stripe dashboard

## n8n Workflows

1. Import the workflow stubs from the `n8n/` directory
2. Configure the workflow credentials
3. Test and deploy the workflows

## Feature Flags

The following feature flags can be configured in your `.env` files:

- `ENABLE_PAYMENT_LINKS=true` - Enable Stripe payment link generation
- `ENABLE_CALENDAR_BOOKING=true` - Enable calendar booking integration
- `ENABLE_TTS_STREAMING=true` - Enable TTS streaming functionality

## Monitoring

### Health Checks

Both services expose health check endpoints:
- API Service: `GET http://localhost:8787/health`
- TTS Gateway: `GET http://localhost:8790/health`

### Logs

Services use pino for structured logging:
- Request logging is automatically enabled
- Custom log messages can be added with `console.log`, `console.info`, etc.

### Error Tracking

- All errors are logged to the console
- Consider integrating with a service like Sentry for production error tracking

## Scaling

### Horizontal Scaling

Both services are stateless and can be scaled horizontally:
1. Deploy multiple instances behind a load balancer
2. Use a shared database (Supabase)
3. Use external message queues for inter-service communication

### Vertical Scaling

Increase resources for individual service instances:
- More CPU for TTS processing
- More memory for handling concurrent requests
- Faster network for external API calls

## Security

### Webhook Verification

- Twilio webhooks are verified using signature headers
- Stripe webhooks are verified using signature headers
- Both verifications can be disabled in development by not setting the auth tokens

### Database Security

- Services use Supabase service role keys for database access
- Service role keys should only be used server-side
- Row-level security should be configured in Supabase for additional protection

### API Security

- CORS is enabled but can be configured in the service code
- Rate limiting should be implemented at the infrastructure level
- Consider adding authentication for sensitive endpoints in production

## Troubleshooting

### Services Won't Start

1. Check that Node.js and npm are properly installed
2. Verify all dependencies are installed (`npm install` in each service directory)
3. Ensure ports 8787 and 8790 are not in use
4. Check that environment variables are properly configured

### Database Connection Issues

1. Verify Supabase URL and service role key
2. Check that the Supabase project is not paused
3. Ensure the schema has been applied correctly

### TTS Synthesis Issues

1. Verify the TTS Gateway is running
2. Check that the engine selection is correct
3. Ensure the text input is properly formatted

### Webhook Verification Failures

1. Verify that auth tokens are properly configured
2. Check that the webhook URLs are correctly set in external services
3. Ensure that the services are accessible from the internet (for external webhooks)

## Updating the Services

1. Pull the latest code changes
2. Run `npm install` in each service directory to update dependencies
3. Restart the services
4. Verify functionality with the test script

## Backup and Recovery

### Database Backup

1. Use Supabase's built-in backup features
2. Regularly export important data
3. Test restore procedures periodically

### Service Configuration Backup

1. Keep copies of `.env` files in a secure location
2. Version control configuration files (excluding secrets)
3. Document any manual configuration steps

## Performance Optimization

### Caching

- Consider implementing Redis for caching frequently accessed data
- Cache merchant settings and TTS configurations
- Use CDN for static assets if serving web content

### Database Optimization

- Add indexes to frequently queried columns
- Use Supabase's query performance insights
- Optimize complex queries

### TTS Performance

- Use appropriate sample rates for different use cases
- Implement caching for frequently synthesized phrases
- Consider using GPU acceleration for TTS engines that support it