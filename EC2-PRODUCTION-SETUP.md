# 🚀 EC2 Production Setup Guide

## Prerequisites
- AWS EC2 t3.small instance running Ubuntu 20.04+
- Docker and Docker Compose installed
- Domain name or Elastic IP for the API

## Step 1: Launch EC2 Instance

### Instance Configuration
- **Instance Type**: t3.small (2 vCPU, 2 GB RAM)
- **AMI**: Ubuntu Server 20.04 LTS
- **Storage**: 20 GB GP3
- **Security Group**: Allow HTTP (80), HTTPS (443), and Custom TCP (8787)

### Security Group Rules
```
Type: HTTP, Port: 80, Source: 0.0.0.0/0
Type: HTTPS, Port: 443, Source: 0.0.0.0/0
Type: Custom TCP, Port: 8787, Source: 0.0.0.0/0
Type: SSH, Port: 22, Source: Your IP
```

## Step 2: Connect to EC2 Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

## Step 3: Install Docker and Dependencies

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

# Install Node.js (for development)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Logout and login to apply docker group changes
exit
```

## Step 4: Clone and Setup Application

```bash
# Clone the repository
git clone https://github.com/Odiabackend099/meetcallwaiting.ai.git
cd meetcallwaiting.ai/apps/api

# Create production environment file
cp env.production.example .env.production
nano .env.production  # Edit with your production values
```

## Step 5: Configure Production Environment

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

## Step 6: Deploy with Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Check if container is running
docker ps

# View logs
docker-compose logs -f
```

## Step 7: Setup Nginx Reverse Proxy (Optional)

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
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

## Step 8: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-api-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 9: Setup Monitoring and Logs

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Setup log rotation
sudo nano /etc/logrotate.d/callwaiting-api

# Add this content:
/var/log/callwaiting-api/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
}
```

## Step 10: Health Check and Testing

```bash
# Test API health
curl http://localhost:8787/health

# Test from external
curl http://your-ec2-ip:8787/health

# Check container status
docker ps
docker logs callwaiting-api
```

## Production URLs

- **API Health**: `http://your-ec2-ip:8787/health`
- **API Base**: `http://your-ec2-ip:8787/api`
- **With Domain**: `https://your-api-domain.com/api`

## Monitoring Commands

```bash
# View container logs
docker logs -f callwaiting-api

# Check resource usage
docker stats callwaiting-api

# Restart container
docker-compose restart

# Update application
git pull
docker-compose down
docker-compose up -d --build
```

## Security Checklist

- [ ] Firewall configured (only necessary ports open)
- [ ] SSH key authentication enabled
- [ ] Regular security updates scheduled
- [ ] Environment variables secured
- [ ] SSL certificate installed
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Database access restricted
