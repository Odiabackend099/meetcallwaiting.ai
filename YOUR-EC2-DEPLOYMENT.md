# 🚀 Deploy to Your EC2 Instance

## Your EC2 Details
- **Instance ID**: i-06e20b6405f0ebcf8
- **Public IP**: 16.28.128.83
- **Public DNS**: ec2-16-28-128-83.af-south-1.compute.amazonaws.com
- **Key Pair**: adaqua-ai-key
- **Instance Type**: t3.small ✅
- **AMI**: Ubuntu 24.04 LTS ✅

---

## Step 1: Connect to Your EC2 Instance

```bash
# Make sure your key file is in ~/.ssh/
ssh -i ~/.ssh/adaqua-ai-key.pem ubuntu@16.28.128.83
```

---

## Step 2: Setup EC2 Instance

Run these commands on your EC2 instance:

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

# Install monitoring tools
sudo apt install htop iotop nethogs curl -y

# Logout and login to apply docker group changes
exit
```

---

## Step 3: Clone and Setup Application

```bash
# Connect again
ssh -i ~/.ssh/adaqua-ai-key.pem ubuntu@16.28.128.83

# Create application directory
mkdir -p /home/ubuntu/callwaiting-api
cd /home/ubuntu/callwaiting-api

# Clone the repository
git clone https://github.com/Odiabackend099/meetcallwaiting.ai.git .

# Navigate to API directory
cd apps/api
```

---

## Step 4: Configure Production Environment

```bash
# Create production environment file
nano .env.production
```

Add this content (replace with your actual values):

```bash
# Production Environment Variables for Callwaiting AI API

# Server Configuration
NODE_ENV=production
PORT=8787
CORS_ORIGIN=https://meetcallwaiting-7sxjcat9y-odia-backends-projects.vercel.app

# Database Configuration (Supabase)
SUPABASE_URL=https://your-project.supabase.co
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

# Frontend URL
FRONTEND_URL=https://meetcallwaiting-7sxjcat9y-odia-backends-projects.vercel.app

# Logging
LOG_LEVEL=info
```

---

## Step 5: Deploy with Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Check if container is running
docker ps

# View logs
docker-compose logs -f
```

---

## Step 6: Test API

```bash
# Test health endpoint
curl http://localhost:8787/health

# Test from external
curl http://16.28.128.83:8787/health
```

---

## Step 7: Update Frontend Configuration

Update your frontend to use the new API endpoint:

```bash
# Edit src/config.js
nano src/config.js
```

Change the API_BASE_URL to:
```javascript
API_BASE_URL: 'http://16.28.128.83:8787'
```

---

## Step 8: Deploy Updated Frontend

```bash
# Build and deploy to Vercel
npm run build
npx vercel --prod --yes
```

---

## Production URLs

- **API Health**: http://16.28.128.83:8787/health
- **API Base**: http://16.28.128.83:8787/api
- **Frontend**: https://meetcallwaiting-7sxjcat9y-odia-backends-projects.vercel.app

---

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

---

## Security Group Configuration

Make sure your EC2 security group allows:
- **HTTP (80)**: 0.0.0.0/0
- **HTTPS (443)**: 0.0.0.0/0
- **Custom TCP (8787)**: 0.0.0.0/0
- **SSH (22)**: Your IP only

---

## Next Steps

1. **Configure Supabase**: Follow SUPABASE-EMAIL-SETUP.md
2. **Setup SendGrid**: Follow SENDGRID-SETUP.md
3. **Test Email Flow**: Register a user and test email verification
4. **Setup Domain**: Configure a custom domain (optional)
5. **Setup SSL**: Use Let's Encrypt for HTTPS (optional)

---

## Troubleshooting

### Common Issues:

1. **Cannot connect to EC2**:
   - Check security group settings
   - Verify key file permissions: `chmod 400 adaqua-ai-key.pem`

2. **Docker permission denied**:
   - Add user to docker group: `sudo usermod -aG docker ubuntu`
   - Logout and login again

3. **API not accessible**:
   - Check if container is running: `docker ps`
   - Check logs: `docker logs callwaiting-api`
   - Verify port 8787 is open in security group

4. **Environment variables not working**:
   - Check .env.production file exists
   - Verify file permissions
   - Restart container after changes

---

## Quick Test Commands

```bash
# Test API health
curl http://16.28.128.83:8787/health

# Test registration endpoint
curl -X POST http://16.28.128.83:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"testpass123"}'

# Check container status
docker ps | grep callwaiting-api
```

**Ready to deploy? Start with Step 1!**
