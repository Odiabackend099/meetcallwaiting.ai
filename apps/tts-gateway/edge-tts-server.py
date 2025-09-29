#!/usr/bin/env python3
"""
EDGE TTS SERVER - VERIFIED WORKING
Real Microsoft Edge TTS service using verified edge-tts library
"""

import os
import sys
import json
import time
import logging
import asyncio
import tempfile
from typing import Optional, Dict, Any
from pathlib import Path

# FastAPI for production server
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Edge TTS - VERIFIED WORKING
try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
    print("✅ Edge TTS library loaded successfully")
except ImportError:
    EDGE_TTS_AVAILABLE = False
    print("❌ Edge TTS library not available")
    print("Install with: pip install edge-tts")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EdgeTTSServer:
    """Edge TTS server - verified working"""
    
    def __init__(self):
        if not EDGE_TTS_AVAILABLE:
            raise RuntimeError("Edge TTS library not available. Install with: pip install edge-tts")
            
        self.app = FastAPI(
            title="CallWaiting.ai Edge TTS Gateway",
            description="Verified working Microsoft Edge TTS service",
            version="1.0.0"
        )
        
        # Statistics
        self.stats = {
            'requests_total': 0,
            'requests_successful': 0,
            'requests_failed': 0,
            'start_time': time.time()
        }
        
        # Edge TTS voices mapping
        self.voice_map = {
            'alloy': 'en-US-AriaNeural',
            'echo': 'en-US-GuyNeural', 
            'fable': 'en-US-JennyNeural',
            'onyx': 'en-US-DavisNeural',
            'nova': 'en-US-SaraNeural',
            'shimmer': 'en-US-MichelleNeural'
        }
        
        self._setup_middleware()
        self._setup_routes()
        self._initialize_edge_tts()
    
    def _setup_middleware(self):
        """Setup FastAPI middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint"""
            return {
                "status": "healthy",
                "timestamp": time.time(),
                "uptime": time.time() - self.stats['start_time'],
                "stats": self.stats,
                "service": "edge-tts",
                "engine": "microsoft-edge"
            }
        
        @self.app.post("/v1/synthesize/stream")
        async def stream_synthesize_text(request: Request):
            """Streaming synthesis endpoint for real-time voice"""
            try:
                from fastapi.responses import StreamingResponse
                
                self.stats['requests_total'] += 1
                
                # Parse request
                data = await request.json()
                text = data.get('text', '').strip()
                voice = data.get('voice', 'en-US-AriaNeural')
                language = data.get('language', 'en')
                
                if not text:
                    raise HTTPException(status_code=400, detail="Text is required")
                
                if len(text) > 1000:
                    raise HTTPException(status_code=400, detail="Text too long (max 1000 characters)")
                
                logger.info(f"🎵 Streaming synthesis: {text[:50]}...")
                
                async def generate_audio_stream():
                    try:
                        communicate = edge_tts.Communicate(text, voice, rate="+0%", volume="+0%")
                        
                        chunk_count = 0
                        async for chunk in communicate.stream():
                            if chunk["type"] == "audio":
                                chunk_count += 1
                                logger.debug(f"🎵 Streaming chunk {chunk_count}: {len(chunk['data'])} bytes")
                                yield chunk["data"]
                            elif chunk["type"] == "WordBoundary":
                                # Optional: Send word boundary info for real-time highlighting
                                pass

                        self.stats['requests_successful'] += 1
                        logger.info(f"✅ Streaming synthesis completed: {chunk_count} chunks")
                    except Exception as e:
                        self.stats['requests_failed'] += 1
                        logger.error(f"❌ Streaming synthesis failed: {e}")
                        raise

                return StreamingResponse(
                    generate_audio_stream(),
                    media_type="audio/mpeg",
                    headers={
                        "X-Service": "edge-tts",
                        "X-Engine": "microsoft-edge",
                        "X-Streaming": "true",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive"
                    }
                )
                
            except Exception as e:
                self.stats['requests_failed'] += 1
                logger.error(f"❌ Streaming synthesis failed: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Streaming synthesis failed: {str(e)}")

        @self.app.post("/v1/synthesize")
        async def synthesize_text(request: Request):
            """Main synthesis endpoint"""
            try:
                self.stats['requests_total'] += 1
                
                # Parse request
                data = await request.json()
                text = data.get('text', '').strip()
                voice = data.get('voice', 'en-US-AriaNeural')
                language = data.get('language', 'en')
                format_type = data.get('format', 'wav')
                
                if not text:
                    raise HTTPException(status_code=400, detail="Text is required")
                
                if len(text) > 1000:
                    raise HTTPException(status_code=400, detail="Text too long (max 1000 characters)")
                
                logger.info(f"🎵 Synthesizing with Edge TTS: {text[:50]}...")
                
                # Generate audio using Edge TTS
                audio_data = await self._synthesize_with_edge_tts(text, voice, language)
                
                self.stats['requests_successful'] += 1
                logger.info("✅ Edge TTS synthesis completed successfully")
                
                return Response(
                    content=audio_data,
                    media_type="audio/mpeg",  # Edge TTS returns MP3 format
                    headers={"X-Service": "edge-tts", "X-Engine": "microsoft-edge"}
                )
                
            except Exception as e:
                self.stats['requests_failed'] += 1
                logger.error(f"❌ Edge TTS synthesis failed: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Edge TTS synthesis failed: {str(e)}")
        
        @self.app.get("/v1/voices")
        async def get_voices():
            """Get available voices"""
            return {
                "voices": [
                    {"id": "alloy", "name": "Aria", "language": "en", "gender": "female", "edge_voice": "en-US-AriaNeural"},
                    {"id": "echo", "name": "Guy", "language": "en", "gender": "male", "edge_voice": "en-US-GuyNeural"},
                    {"id": "fable", "name": "Jenny", "language": "en", "gender": "female", "edge_voice": "en-US-JennyNeural"},
                    {"id": "onyx", "name": "Davis", "language": "en", "gender": "male", "edge_voice": "en-US-DavisNeural"},
                    {"id": "nova", "name": "Sara", "language": "en", "gender": "female", "edge_voice": "en-US-SaraNeural"},
                    {"id": "shimmer", "name": "Michelle", "language": "en", "gender": "female", "edge_voice": "en-US-MichelleNeural"}
                ]
            }
        
        @self.app.get("/v1/stats")
        async def get_stats():
            """Get server statistics"""
            return {
                "stats": self.stats,
                "uptime": time.time() - self.stats['start_time'],
                "service": "edge-tts",
                "engine": "microsoft-edge"
            }
    
    def _initialize_edge_tts(self):
        """Initialize Edge TTS"""
        logger.info("🚀 Initializing Edge TTS Service...")
        
        try:
            # Test Edge TTS with a simple synthesis
            logger.info("🧪 Testing Edge TTS with sample text...")
            
            # Run a test synthesis
            async def test_synthesis():
                communicate = edge_tts.Communicate("Hello, this is a test.", "en-US-AriaNeural")
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        break  # Just test that it works
            
            # Run the test
            asyncio.run(test_synthesis())
            
            logger.info("✅ Edge TTS test successful")
            logger.info("✅ Edge TTS Service initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Edge TTS initialization failed: {e}")
            raise RuntimeError(f"Edge TTS initialization failed: {e}")
    
    async def _synthesize_with_edge_tts(self, text: str, voice: str, language: str) -> bytes:
        """Synthesize using Edge TTS - VERIFIED WORKING"""
        try:
            # Get Edge TTS voice
            edge_voice = self.voice_map.get(voice, 'en-US-AriaNeural')
            
            logger.info(f"🎵 Generating audio with Edge TTS voice: {edge_voice}")
            
            # Create Edge TTS communicate object
            communicate = edge_tts.Communicate(text, edge_voice)
            
            # Collect audio data
            audio_chunks = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_chunks.append(chunk["data"])
            
            # Combine all audio chunks
            audio_data = b''.join(audio_chunks)
            
            logger.info(f"✅ Edge TTS generated {len(audio_data)} bytes of audio")
            return audio_data
            
        except Exception as e:
            logger.error(f"❌ Edge TTS synthesis failed: {e}")
            raise
    
    def run(self, host="0.0.0.0", port=3001):
        """Run the Edge TTS server"""
        logger.info(f"🚀 Starting Edge TTS Server on {host}:{port}")
        logger.info("✅ Service: Edge TTS")
        logger.info("✅ Engine: Microsoft Edge")
        logger.info("✅ Quality: Neural voices")
        
        uvicorn.run(
            self.app,
            host=host,
            port=port,
            log_level="info",
            access_log=True
        )

if __name__ == "__main__":
    server = EdgeTTSServer()
    server.run()
