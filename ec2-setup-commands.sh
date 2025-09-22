#!/bin/bash

# EC2 Setup Commands for Callwaiting AI API
# Run these commands on your EC2 instance

echo "🚀 Setting up EC2 instance for Callwaiting AI API..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for development)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install monitoring tools
sudo apt install htop iotop nethogs curl -y

# Create application directory
mkdir -p /home/ubuntu/callwaiting-api
cd /home/ubuntu/callwaiting-api

# Clone the repository
git clone https://github.com/Odiabackend099/meetcallwaiting.ai.git .

# Navigate to API directory
cd apps/api

# Create production environment file
cat > .env.production << 'EOF'
# Production Environment Variables for Callwaiting AI API

# Server Configuration
NODE_ENV=production
PORT=8787
CORS_ORIGIN=https://meetcallwaiting-7sxjcat9y-odia-backends-projects.vercel.app

# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here_minimum_32_characters
JWT_EXPIRES_IN=7d

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@callwaitingai.com
SENDGRID_FROM_NAME=Callwaiting AI

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_WEBHOOK_URL=http://16.28.128.83:8787/api/webhooks/twilio

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend URL
FRONTEND_URL=https://meetcallwaiting-7sxjcat9y-odia-backends-projects.vercel.app

# Logging
LOG_LEVEL=info
EOF

echo "✅ EC2 setup complete!"
echo "📝 Next steps:"
echo "1. Edit .env.production with your actual values"
echo "2. Run: docker-compose up -d"
echo "3. Test: curl http://localhost:8787/health"
