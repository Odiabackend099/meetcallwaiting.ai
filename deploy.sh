#!/bin/bash

# CallWaiting.ai - Production Deployment Script
# This script prepares and deploys the CallWaiting.ai project

set -e  # Exit on any error

echo "🚀 CallWaiting.ai - Production Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16+ first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "git is not installed. Please install git first."
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Clean and prepare the project
clean_project() {
    print_status "Cleaning project..."
    
    # Remove node_modules if exists
    if [ -d "node_modules" ]; then
        rm -rf node_modules
        print_status "Removed node_modules"
    fi
    
    # Remove dist if exists
    if [ -d "dist" ]; then
        rm -rf dist
        print_status "Removed dist directory"
    fi
    
    # Remove any temporary files
    find . -name "*.tmp" -delete 2>/dev/null || true
    find . -name ".DS_Store" -delete 2>/dev/null || true
    
    print_success "Project cleaned"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    npm install --production=false
    
    print_success "Dependencies installed"
}

# Build the project
build_project() {
    print_status "Building project..."
    
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "Build failed - dist directory not created"
        exit 1
    fi
    
    print_success "Project built successfully"
}

# Validate the build
validate_build() {
    print_status "Validating build..."
    
    # Check if main files exist
    required_files=(
        "dist/index.html"
        "dist/onboarding.html"
        "dist/business-dashboard.html"
        "dist/how-it-works.html"
        "dist/solutions.html"
        "dist/pricing.html"
        "dist/demo.html"
        "dist/support.html"
        "dist/seamless-voice-assistant.html"
        "dist/voice-only-ai.html"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required file missing: $file"
            exit 1
        fi
    done
    
    print_success "Build validation passed"
}

# Check environment configuration
check_environment() {
    print_status "Checking environment configuration..."
    
    if [ ! -f ".env.production" ]; then
        print_warning "Production environment file not found"
        print_status "Creating from example..."
        
        if [ -f "env.production.example" ]; then
            cp env.production.example .env.production
            print_warning "Please update .env.production with your actual values"
        else
            print_error "No environment example file found"
            exit 1
        fi
    fi
    
    print_success "Environment configuration checked"
}

# Deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Deploy to production
    vercel --prod
    
    print_success "Deployed to Vercel successfully"
}

# Deploy to custom server
deploy_custom() {
    print_status "Deploying to custom server..."
    
    # This would be customized based on your server setup
    print_status "Please implement your custom deployment logic here"
    print_status "Example: rsync, scp, docker, etc."
    
    print_success "Custom deployment completed"
}

# Main deployment function
main() {
    echo ""
    print_status "Starting CallWaiting.ai deployment process..."
    echo ""
    
    # Step 1: Check dependencies
    check_dependencies
    echo ""
    
    # Step 2: Clean project
    clean_project
    echo ""
    
    # Step 3: Install dependencies
    install_dependencies
    echo ""
    
    # Step 4: Check environment
    check_environment
    echo ""
    
    # Step 5: Build project
    build_project
    echo ""
    
    # Step 6: Validate build
    validate_build
    echo ""
    
    # Step 7: Deploy
    if [ "$1" = "vercel" ]; then
        deploy_vercel
    elif [ "$1" = "custom" ]; then
        deploy_custom
    else
        print_status "No deployment target specified"
        print_status "Usage: ./deploy.sh [vercel|custom]"
        print_status "Build completed successfully - ready for deployment"
    fi
    
    echo ""
    print_success "🚀 CallWaiting.ai deployment completed!"
    echo ""
    print_status "Next steps:"
    print_status "1. Update environment variables in production"
    print_status "2. Configure domain and SSL certificates"
    print_status "3. Set up monitoring and analytics"
    print_status "4. Test all functionality in production"
    echo ""
}

# Run main function with arguments
main "$@"
