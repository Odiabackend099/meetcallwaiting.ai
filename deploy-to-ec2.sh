#!/bin/bash

# Production Deployment Script for Callwaiting AI API
# Deploy to your specific EC2 instance

set -e

echo "🚀 Starting production deployment to EC2..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Your EC2 Configuration
EC2_USER="ubuntu"
EC2_HOST="16.28.128.83"
EC2_KEY_PATH="adaqua-ai-key.pem"
APP_NAME="callwaiting-api"
DOCKER_IMAGE="callwaiting-api:latest"

echo -e "${YELLOW}📦 Building Docker image...${NC}"
cd apps/api
docker build -t $DOCKER_IMAGE .

echo -e "${YELLOW}📤 Saving Docker image...${NC}"
docker save $DOCKER_IMAGE | gzip > ${APP_NAME}.tar.gz

echo -e "${YELLOW}🚀 Uploading to EC2...${NC}"
scp -i ~/.ssh/$EC2_KEY_PATH ${APP_NAME}.tar.gz $EC2_USER@$EC2_HOST:~/

echo -e "${YELLOW}🔧 Deploying on EC2...${NC}"
ssh -i ~/.ssh/$EC2_KEY_PATH $EC2_USER@$EC2_HOST << 'EOF'
    # Load the Docker image
    docker load < callwaiting-api.tar.gz
    
    # Stop existing container
    docker stop callwaiting-api || true
    docker rm callwaiting-api || true
    
    # Run new container
    docker run -d \
        --name callwaiting-api \
        --restart unless-stopped \
        -p 8787:8787 \
        --env-file .env.production \
        callwaiting-api:latest
    
    # Clean up
    rm callwaiting-api.tar.gz
    
    echo "✅ Deployment complete!"
    docker ps | grep callwaiting-api
EOF

echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo -e "${GREEN}API is now running at: http://16.28.128.83:8787${NC}"
echo -e "${GREEN}Health check: http://16.28.128.83:8787/health${NC}"

# Clean up local files
rm ${APP_NAME}.tar.gz

echo -e "${GREEN}✨ Production deployment complete!${NC}"
