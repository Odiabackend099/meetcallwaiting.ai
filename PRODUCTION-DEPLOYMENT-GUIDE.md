# 🚀 Production Deployment Guide - Callwaiting AI

## Overview
This guide will help you deploy Callwaiting AI from simulation to production MVP with real backend services, email authentication, and live integrations.

## Prerequisites
- AWS EC2 t3.small instance
- Domain name (optional but recommended)
- Supabase account
- SendGrid account
- Twilio account
- Stripe account

---

## Phase 1: Backend API Deployment

### Step 1: Launch EC2 Instance

1. **Launch EC2 t3.small instance**:
   - AMI: Ubuntu Server 20.04 LTS
   - Instance Type: t3.small (2 vCPU, 2 GB RAM)
   - Storage: 20 GB GP3
   - Security Group: Allow HTTP (80), HTTPS (443), Custom TCP (8787), SSH (22)

2. **Connect to instance**:
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

### Step 2: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Logout and login to apply docker group changes
exit
```

### Step 3: Deploy Backend API

```bash
# Clone repository
git clone https://github.com/Odiabackend099/meetcallwaiting.ai.git
cd meetcallwaiting.ai/apps/api

# Create production environment file
cp env.production.example .env.production
nano .env.production  # Edit with your production values
```

### Step 4: Configure Production Environment

Edit `.env.production` with your actual values:

```bash
# Server Configuration
NODE_ENV=production
PORT=8787
CORS_ORIGIN=https://meetcallwaiting-1iyocgch4-odia-backends-projects.vercel.app

# Database Configuration (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

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
TWILIO_WEBHOOK_URL=https://your-api-domain.com/api/webhooks/twilio

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Frontend URL
FRONTEND_URL=https://meetcallwaiting-1iyocgch4-odia-backends-projects.vercel.app
```

### Step 5: Deploy with Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Check if container is running
docker ps

# View logs
docker-compose logs -f
```

### Step 6: Test API

```bash
# Test health endpoint
curl http://localhost:8787/health

# Test from external
curl http://your-ec2-ip:8787/health
```

---

## Phase 2: Supabase Email Configuration

### Step 1: Configure Email Templates

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project → **Authentication** → **Email Templates**
3. Configure templates using the content from `SUPABASE-EMAIL-SETUP.md`

### Step 2: Configure SMTP Settings

1. Go to **Authentication** → **Settings**
2. Under **SMTP Settings**:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Username: `apikey`
   - Password: Your SendGrid API key
   - Sender email: `noreply@callwaitingai.com`

### Step 3: Configure Redirect URLs

In **Authentication** → **URL Configuration**:
- Site URL: `https://meetcallwaiting-1iyocgch4-odia-backends-projects.vercel.app`
- Redirect URLs:
  - `https://meetcallwaiting-1iyocgch4-odia-backends-projects.vercel.app/verify-email`
  - `https://meetcallwaiting-1iyocgch4-odia-backends-projects.vercel.app/reset-password`
  - `https://meetcallwaiting-1iyocgch4-odia-backends-projects.vercel.app/dashboard`

---

## Phase 3: SendGrid Email Service

### Step 1: Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for free account (100 emails/day)
3. Verify your email address

### Step 2: Create API Key

1. Go to **Settings** → **API Keys**
2. Create **Restricted Access** key with **Mail Send** permissions
3. Copy the API key

### Step 3: Verify Sender Identity

1. Go to **Settings** → **Sender Authentication**
2. Verify single sender: `noreply@callwaitingai.com`
3. Or authenticate your domain for better deliverability

### Step 4: Create Email Templates

1. Go to **Email API** → **Dynamic Templates**
2. Create templates using content from `SENDGRID-SETUP.md`

---

## Phase 4: Frontend Configuration

### Step 1: Update API Endpoints

1. Edit `src/config.js`:
   ```javascript
   API_BASE_URL: 'https://your-api-domain.com'
   ```

2. Create `env.production` file:
   ```bash
   VITE_API_BASE_URL=https://your-api-domain.com
   VITE_APP_ENV=production
   VITE_FEATURE_DEMO_MODE=false
   ```

### Step 2: Deploy Frontend

```bash
# Build and deploy to Vercel
npm run build
npx vercel --prod --yes
```

---

## Phase 5: Domain and SSL Setup (Optional)

### Step 1: Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx -y

# Create configuration
sudo nano /etc/nginx/sites-available/callwaiting-api

# Add this configuration:
server {
    listen 80;
    server_name your-api-domain.com;

    location / {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/callwaiting-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 2: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-api-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## Phase 6: Testing and Validation

### Step 1: Test Email Verification Flow

1. Go to your onboarding page
2. Register a new user
3. Check email for verification link
4. Click verification link
5. Verify user can log in

### Step 2: Test Dashboard Access

1. Log in with verified user
2. Access dashboard
3. Verify real data is displayed
4. Test all dashboard features

### Step 3: Test API Endpoints

```bash
# Test registration
curl -X POST https://your-api-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"testpass123"}'

# Test health
curl https://your-api-domain.com/health

# Test dashboard data
curl -H "Authorization: Bearer your-jwt-token" \
  https://your-api-domain.com/api/dashboard/data
```

---

## Phase 7: Monitoring and Maintenance

### Step 1: Setup Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Setup log rotation
sudo nano /etc/logrotate.d/callwaiting-api
```

### Step 2: Setup Alerts

1. **SendGrid Alerts**: High bounce rate, spam rate
2. **Supabase Alerts**: Database errors, auth issues
3. **EC2 Monitoring**: CPU, memory, disk usage

### Step 3: Backup Strategy

```bash
# Database backups (Supabase handles this)
# Application backups
git clone https://github.com/Odiabackend099/meetcallwaiting.ai.git

# Environment variables backup
cp .env.production ~/backup-env-$(date +%Y%m%d).txt
```

---

## Production URLs

- **Frontend**: `https://meetcallwaiting-1iyocgch4-odia-backends-projects.vercel.app`
- **API Health**: `https://your-api-domain.com/health`
- **API Base**: `https://your-api-domain.com/api`
- **Dashboard**: `https://meetcallwaiting-1iyocgch4-odia-backends-projects.vercel.app/dashboard`

---

## Cost Estimation

### Monthly Costs:
- **EC2 t3.small**: $15-20/month
- **Supabase Pro**: $25/month
- **SendGrid**: $15-30/month (depending on volume)
- **Twilio**: $1-5/month per number
- **Stripe**: 2.9% + $0.30 per transaction
- **Domain**: $10-15/year
- **Total**: $55-75/month + transaction fees

---

## Security Checklist

- [ ] Firewall configured (only necessary ports open)
- [ ] SSH key authentication enabled
- [ ] Environment variables secured
- [ ] SSL certificate installed
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Database access restricted
- [ ] API keys rotated regularly
- [ ] Logs monitored for suspicious activity
- [ ] Regular security updates scheduled

---

## Troubleshooting

### Common Issues:

1. **API not accessible**: Check security groups and firewall
2. **Emails not sending**: Verify SendGrid configuration and sender authentication
3. **Database errors**: Check Supabase connection and RLS policies
4. **CORS errors**: Verify CORS_ORIGIN in environment variables
5. **SSL issues**: Check certificate installation and domain configuration

### Support Resources:

- **Supabase**: https://supabase.com/docs
- **SendGrid**: https://docs.sendgrid.com/
- **Twilio**: https://www.twilio.com/docs
- **Stripe**: https://stripe.com/docs
- **AWS EC2**: https://docs.aws.amazon.com/ec2/

---

## Next Steps

1. **Deploy backend API** to EC2
2. **Configure Supabase** email templates
3. **Setup SendGrid** for email delivery
4. **Update frontend** to use real API endpoints
5. **Test end-to-end** flow
6. **Setup monitoring** and alerts
7. **Configure domain** and SSL
8. **Go live** with production MVP

**Ready to start? Begin with Phase 1: Backend API Deployment!**
