#!/bin/bash

# Bash script to start both services
echo -e "\033[0;32mStarting callwaiting.ai services...\033[0m"

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo -e "\033[0;31mError: Node.js is not installed or not in PATH\033[0m"
    echo -e "\033[0;33mPlease install Node.js from https://nodejs.org/\033[0m"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null
then
    echo -e "\033[0;31mError: npm is not available\033[0m"
    exit 1
fi

# Show versions
echo -e "\033[0;36mNode.js version: $(node --version)\033[0m"
echo -e "\033[0;36mnpm version: $(npm --version)\033[0m"

# Install dependencies if node_modules doesn't exist
if [ ! -d "apps/api/node_modules" ]; then
    echo -e "\033[0;33mInstalling API service dependencies...\033[0m"
    cd apps/api
    npm install
    cd ../..
fi

if [ ! -d "apps/tts-gateway/node_modules" ]; then
    echo -e "\033[0;33mInstalling TTS Gateway dependencies...\033[0m"
    cd apps/tts-gateway
    npm install
    cd ../..
fi

# Start both services in background
echo -e "\033[0;33mStarting API service...\033[0m"
cd apps/api
npm run dev > ../../api.log 2>&1 &
API_PID=$!
cd ../..

echo -e "\033[0;33mStarting TTS Gateway service...\033[0m"
cd apps/tts-gateway
npm run dev > ../../tts.log 2>&1 &
TTS_PID=$!
cd ../..

echo -e "\033[0;32mServices started successfully!\033[0m"
echo -e "\033[0;36mAPI Service running on http://localhost:8787 (PID: $API_PID)\033[0m"
echo -e "\033[0;36mTTS Gateway running on http://localhost:8790 (PID: $TTS_PID)\033[0m"
echo -e "\033[0;33mLogs are being written to api.log and tts.log\033[0m"
echo -e "\033[0;33mUse 'kill $API_PID $TTS_PID' to stop the services\033[0m"