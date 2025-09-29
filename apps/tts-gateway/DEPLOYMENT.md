# TTS Gateway Deployment Guide

This guide covers deploying the production-grade TTS Gateway service with Coqui/XTTS integration for CallWaiting.ai.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.10+ (for XTTS models)
- Supabase account or PostgreSQL database
- NVIDIA GPU (recommended for production)

### 1. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd apps/tts-gateway

# Copy environment configuration
cp env.example .env

# Edit configuration
nano .env
```

### 2. Database Configuration

#### Option A: Supabase (Recommended)

1. Create a new Supabase project
2. Run the database schema:
   ```sql
   -- Copy and execute: database/tts-schema.sql
   ```
3. Update `.env` with your Supabase credentials:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

#### Option B: PostgreSQL

1. Install PostgreSQL 15+
2. Create database:
   ```bash
   createdb tts_gateway
   psql tts_gateway < database/tts-schema.sql
   ```
3. Update `.env` with PostgreSQL credentials

### 3. Deploy with Docker

```bash
# Start all services
docker-compose up -d

# Check health
curl http://localhost:8790/health

# View logs
docker-compose logs -f tts-gateway
```

## 🐳 Docker Deployment Options

### Development Environment

```bash
# Build development image
docker-compose -f docker-compose.yml up -d --build

# Access development container
docker-compose exec tts-gateway bash
```

### Production Environment

```bash
# Build production image
docker build -t tts-gateway:latest .

# Run with GPU support
docker run --gpus all \
  -p 8790:8790 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  -e CUDA_VISIBLE_DEVICES=0 \
  tts-gateway:latest
```

### Production with Docker Compose

```bash
# Use production configuration
BUILD_TARGET=production docker-compose up -d

# Scale the service
docker-compose up -d --scale tts-gateway=3
```

## ☁️ Cloud Deployment

### AWS Deployment

#### 1. EC2 Instance Setup

```bash
# Launch EC2 instance (g4dn.xlarge or larger for GPU)
# AMI: Deep Learning AMI (Ubuntu 20.04)

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
```

#### 2. Deploy Application

```bash
# Clone repository
git clone <repository-url>
cd apps/tts-gateway

# Configure environment
cp env.example .env
nano .env

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

#### 3. Configure Load Balancer

```bash
# Create Application Load Balancer
# Target Group: tts-gateway:8790
# Health Check: /health
# SSL Certificate: your-domain.com
```

### Google Cloud Platform

#### 1. Compute Engine Setup

```bash
# Create VM instance with GPU
gcloud compute instances create tts-gateway \
  --zone=us-central1-a \
  --machine-type=n1-standard-4 \
  --accelerator=type=nvidia-tesla-t4,count=1 \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=100GB

# Install Docker and NVIDIA drivers
gcloud compute ssh tts-gateway --zone=us-central1-a
```

#### 2. Deploy with Cloud Run (Alternative)

```bash
# Build and push image
docker build -t gcr.io/your-project/tts-gateway .
docker push gcr.io/your-project/tts-gateway

# Deploy to Cloud Run
gcloud run deploy tts-gateway \
  --image gcr.io/your-project/tts-gateway \
  --platform managed \
  --region us-central1 \
  --memory 8Gi \
  --cpu 4 \
  --concurrency 10 \
  --max-instances 10
```

### Azure Deployment

#### 1. Container Instances

```bash
# Create resource group
az group create --name tts-gateway-rg --location eastus

# Create container instance
az container create \
  --resource-group tts-gateway-rg \
  --name tts-gateway \
  --image your-registry/tts-gateway:latest \
  --cpu 4 \
  --memory 8 \
  --ports 8790 \
  --environment-variables \
    SUPABASE_URL=your_url \
    SUPABASE_SERVICE_ROLE_KEY=your_key
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Production Value |
|----------|-------------|------------------|
| `NODE_ENV` | Environment mode | `production` |
| `TTS_PORT` | Server port | `8790` |
| `SUPABASE_URL` | Database URL | Your Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Database key | Your service key |
| `CUDA_VISIBLE_DEVICES` | GPU devices | `0` |
| `MAX_CONCURRENT_STREAMS` | Max streams | `50` |
| `CORS_ORIGIN` | CORS origin | Your domain |

### Resource Requirements

#### Minimum (Development)
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB
- GPU: Optional

#### Recommended (Production)
- CPU: 8 cores
- RAM: 16GB
- Storage: 100GB SSD
- GPU: NVIDIA T4 or better

#### High-Performance (Enterprise)
- CPU: 16 cores
- RAM: 32GB
- Storage: 500GB NVMe SSD
- GPU: NVIDIA V100 or A100

### Scaling Configuration

#### Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  tts-gateway:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
        reservations:
          memory: 2G
          cpus: '1.0'
```

#### Load Balancer Configuration

```nginx
# nginx.conf
upstream tts_backend {
    server tts-gateway-1:8790;
    server tts-gateway-2:8790;
    server tts-gateway-3:8790;
}

server {
    listen 80;
    server_name tts.odia.dev;

    location / {
        proxy_pass http://tts_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://tts_backend/health;
        access_log off;
    }
}
```

## 📊 Monitoring & Observability

### Health Checks

```bash
# Basic health check
curl http://localhost:8790/health

# Detailed health check
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:8790/health
```

### Prometheus Metrics

```bash
# Enable metrics endpoint
curl http://localhost:8790/metrics

# Configure Prometheus
# Add to prometheus.yml:
- job_name: 'tts-gateway'
  static_configs:
    - targets: ['tts-gateway:8790']
  metrics_path: '/metrics'
  scrape_interval: 30s
```

### Logging

```bash
# View application logs
docker-compose logs -f tts-gateway

# View structured logs
docker-compose logs -f tts-gateway | jq

# Log aggregation with Fluentd
docker-compose up -d fluentd
```

### Grafana Dashboard

Import the provided dashboard configuration:
- File: `monitoring/grafana/dashboards/tts-gateway.json`
- Metrics: Request rate, latency, error rate, GPU utilization

## 🔒 Security

### SSL/TLS Configuration

```bash
# Generate SSL certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/tts-gateway.key \
  -out /etc/ssl/certs/tts-gateway.crt

# Update nginx configuration
server {
    listen 443 ssl;
    ssl_certificate /etc/ssl/certs/tts-gateway.crt;
    ssl_certificate_key /etc/ssl/private/tts-gateway.key;
}
```

### API Key Management

```bash
# Generate API key for tenant
curl -X POST http://localhost:8790/v1/tenant/api-keys \
  -H "Authorization: Bearer ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "your-tenant", "name": "production-key"}'
```

### Network Security

```bash
# Firewall configuration
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8790/tcp  # TTS Gateway
ufw enable
```

## 🔄 Backup & Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
gzip backup_$DATE.sql
aws s3 cp backup_$DATE.sql.gz s3://your-backup-bucket/
```

### Voice Files Backup

```bash
# Backup voice files
tar -czf voices_backup_$(date +%Y%m%d).tar.gz /app/voices/
aws s3 cp voices_backup_$(date +%Y%m%d).tar.gz s3://your-backup-bucket/
```

### Recovery Procedure

```bash
# Restore database
psql $DATABASE_URL < backup_20240101_120000.sql

# Restore voice files
tar -xzf voices_backup_20240101.tar.gz -C /

# Restart services
docker-compose restart
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Model Loading Errors

```bash
# Check Python environment
docker-compose exec tts-gateway python3 -c "import torch; print(torch.__version__)"

# Verify CUDA
docker-compose exec tts-gateway python3 -c "import torch; print(torch.cuda.is_available())"

# Re-download model
docker-compose exec tts-gateway python3 -c "
from TTS.api import TTS
tts = TTS('tts_models/multilingual/multi-dataset/xtts_v2')
"
```

#### 2. Memory Issues

```bash
# Check memory usage
docker stats tts-gateway

# Increase memory limit
# Update docker-compose.yml:
services:
  tts-gateway:
    deploy:
      resources:
        limits:
          memory: 8G
```

#### 3. GPU Issues

```bash
# Check GPU availability
nvidia-smi

# Test GPU in container
docker run --gpus all nvidia/cuda:11.8-base-ubuntu20.04 nvidia-smi
```

#### 4. Database Connection Issues

```bash
# Test database connection
docker-compose exec tts-gateway node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Connected to Supabase');
"
```

### Performance Optimization

#### 1. Enable Caching

```bash
# Update .env
CACHE_TTL=3600
CACHE_MAX_SIZE=1000
REDIS_URL=redis://redis:6379
```

#### 2. Optimize GPU Usage

```bash
# Set GPU memory growth
export CUDA_VISIBLE_DEVICES=0
export TF_FORCE_GPU_ALLOW_GROWTH=true
```

#### 3. Tune Streaming Parameters

```bash
# Optimize for low latency
STREAM_CHUNK_SIZE=512
STREAM_CHUNK_DELAY=25
STREAM_BUFFER_SIZE=4096
```

## 📈 Performance Monitoring

### Key Metrics

- **Latency**: First chunk < 200ms, full synthesis < 1s
- **Throughput**: 50+ concurrent streams
- **Error Rate**: < 0.1%
- **Uptime**: > 99.9%

### Alerting Rules

```yaml
# prometheus-alerts.yml
groups:
- name: tts-gateway
  rules:
  - alert: HighLatency
    expr: tts_latency_p95 > 2000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "TTS Gateway high latency"
      
  - alert: HighErrorRate
    expr: rate(tts_errors_total[5m]) > 0.01
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "TTS Gateway high error rate"
```

## 🎯 Production Checklist

### Pre-deployment

- [ ] Environment variables configured
- [ ] Database schema applied
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security review completed
- [ ] Load testing performed

### Post-deployment

- [ ] Health checks passing
- [ ] Metrics collection working
- [ ] Log aggregation configured
- [ ] Alerting rules active
- [ ] Documentation updated
- [ ] Team trained on operations

### Maintenance

- [ ] Regular security updates
- [ ] Performance monitoring
- [ ] Capacity planning
- [ ] Disaster recovery testing
- [ ] Cost optimization review

## 📞 Support

For deployment issues:

1. Check the troubleshooting section
2. Review application logs
3. Verify configuration
4. Contact support team

**Emergency Contacts:**
- Technical Lead: [contact info]
- DevOps Team: [contact info]
- On-call Engineer: [contact info]

---

**Happy Deploying! 🚀**
