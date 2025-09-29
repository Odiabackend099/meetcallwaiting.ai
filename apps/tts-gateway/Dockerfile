# Multi-stage Dockerfile for TTS Gateway with Coqui/XTTS
FROM python:3.10-slim as python-base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    wget \
    curl \
    ffmpeg \
    espeak-ng \
    espeak-ng-data \
    libespeak-ng1 \
    festival \
    festvox-kallpc16k \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for TTS
RUN pip install --upgrade pip && \
    pip install \
    TTS \
    torch \
    torchaudio \
    numpy \
    scipy \
    librosa \
    soundfile \
    pydub \
    psutil \
    requests

# ============================================================================
# Node.js Base Stage
# ============================================================================
FROM node:18-slim as node-base

# Install system dependencies for Node.js
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ============================================================================
# Development Stage
# ============================================================================
FROM node-base as development

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY database/ ./database/

# Install Python dependencies for development
RUN pip3 install \
    TTS \
    torch \
    torchaudio \
    numpy \
    scipy \
    librosa \
    soundfile \
    pydub \
    psutil \
    requests

# Create directories
RUN mkdir -p /app/models /app/voices /app/embeddings /app/temp

# Expose port
EXPOSE 8790

# Start development server
CMD ["npm", "run", "dev"]

# ============================================================================
# Production Build Stage
# ============================================================================
FROM node-base as build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies and build
RUN npm ci && npm run build

# ============================================================================
# Production Stage
# ============================================================================
FROM python-base as production

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Create app user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Copy database schema
COPY database/ ./database/

# Create directories and set permissions
RUN mkdir -p /app/models /app/voices /app/embeddings /app/temp /app/logs && \
    chown -R appuser:appuser /app

# Download and setup XTTS model
USER root
RUN python3 -c "
import os
os.makedirs('/app/models', exist_ok=True)
import torch
from TTS.api import TTS
print('Downloading XTTS model...')
tts = TTS('tts_models/multilingual/multi-dataset/xtts_v2')
print('XTTS model downloaded successfully')
"

# Switch to app user
USER appuser

# Set environment variables
ENV NODE_ENV=production \
    TTS_PORT=8790 \
    TTS_HOST=0.0.0.0 \
    XTTS_MODEL_PATH=/app/models \
    VOICES_DIR=/app/voices \
    EMBEDDINGS_DIR=/app/embeddings \
    TEMP_DIR=/app/temp \
    LOGS_DIR=/app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8790/health || exit 1

# Expose port
EXPOSE 8790

# Start production server
CMD ["npm", "start"]

# ============================================================================
# GPU-enabled Production Stage (Optional)
# ============================================================================
FROM nvidia/cuda:11.8-devel-ubuntu20.04 as production-gpu

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3.10-pip \
    python3.10-dev \
    build-essential \
    cmake \
    git \
    wget \
    curl \
    ffmpeg \
    espeak-ng \
    espeak-ng-data \
    libespeak-ng1 \
    festival \
    festvox-kallpc16k \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Create app user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Copy database schema
COPY database/ ./database/

# Install PyTorch with CUDA support
RUN pip3 install --upgrade pip && \
    pip3 install \
    torch torchaudio --index-url https://download.pytorch.org/whl/cu118 && \
    pip3 install \
    TTS \
    numpy \
    scipy \
    librosa \
    soundfile \
    pydub \
    psutil \
    requests

# Create directories and set permissions
RUN mkdir -p /app/models /app/voices /app/embeddings /app/temp /app/logs && \
    chown -R appuser:appuser /app

# Download and setup XTTS model with GPU support
USER root
RUN python3 -c "
import os
os.makedirs('/app/models', exist_ok=True)
import torch
print(f'CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'CUDA devices: {torch.cuda.device_count()}')
    print(f'Current device: {torch.cuda.current_device()}')
    print(f'Device name: {torch.cuda.get_device_name()}')
from TTS.api import TTS
print('Downloading XTTS model with GPU support...')
tts = TTS('tts_models/multilingual/multi-dataset/xtts_v2')
print('XTTS model downloaded successfully')
"

# Switch to app user
USER appuser

# Set environment variables for GPU
ENV NODE_ENV=production \
    TTS_PORT=8790 \
    TTS_HOST=0.0.0.0 \
    XTTS_MODEL_PATH=/app/models \
    VOICES_DIR=/app/voices \
    EMBEDDINGS_DIR=/app/embeddings \
    TEMP_DIR=/app/temp \
    LOGS_DIR=/app/logs \
    CUDA_VISIBLE_DEVICES=0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8790/health || exit 1

# Expose port
EXPOSE 8790

# Start production server
CMD ["npm", "start"]
