// @ts-nocheck
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logTtsEvent, getMerchantTtsSettings } from './utils/database.js';
import { synthRiva } from './engines/riva.js';
import { synthCosy } from './engines/cosyvoice.js';
import { synthPiper } from './engines/piper.js';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ autoLogging: true }));
app.use(cors());

app.get('/health', (_req,res)=> res.json({ ok:true }));

// Enhanced synth endpoint with engine selection
app.post('/v1/tts:synthesize', async (req, res) => {
  const { text, voice_id='en-US-generic', merchant_id, engine } = req.body || {};
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  // Determine which TTS engine to use
  let selectedEngine = engine || 'piper'; // Default to Piper
  let ttsSettings = null;
  
  // If merchant_id is provided, get their TTS settings
  if (merchant_id) {
    ttsSettings = await getMerchantTtsSettings(merchant_id);
    if (ttsSettings) {
      selectedEngine = ttsSettings.tts_engine || selectedEngine;
      console.log(`Using merchant TTS settings: engine=${selectedEngine}`);
    }
  }
  
  try {
    let audioBuffer: Buffer;
    
    // Synthesize using the selected engine
    switch (selectedEngine) {
      case 'riva':
        audioBuffer = await synthRiva(text, { voice_id, merchant_id });
        break;
      case 'cosyvoice':
        audioBuffer = await synthCosy(text, { voice_id, merchant_id });
        break;
      case 'piper':
      default:
        audioBuffer = await synthPiper(text, { voice_id, merchant_id });
        break;
    }
    
    // Log the TTS event
    await logTtsEvent({
      text: text,
      voice_id: voice_id,
      merchant_id: merchant_id,
      engine: selectedEngine,
      endpoint: 'synthesize',
      timestamp: new Date()
    });
    
    // Return the synthesized audio as base64
    res.json({ 
      voice_id, 
      engine: selectedEngine,
      format: 'wav', 
      audio_base64: audioBuffer.toString('base64') 
    });
  } catch (error) {
    console.error('TTS synthesis error:', error);
    res.status(500).json({ error: 'TTS synthesis failed', message: error.message });
  }
});

// Streaming endpoint with engine selection
app.post('/v1/tts:stream', async (req, res) => {
  const { text, voice_id='en-US-generic', merchant_id, engine } = req.body || {};
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  // Determine which TTS engine to use
  let selectedEngine = engine || 'piper'; // Default to Piper
  let ttsSettings = null;
  
  // If merchant_id is provided, get their TTS settings
  if (merchant_id) {
    ttsSettings = await getMerchantTtsSettings(merchant_id);
    if (ttsSettings) {
      selectedEngine = ttsSettings.tts_engine || selectedEngine;
      console.log(`Using merchant TTS settings for streaming: engine=${selectedEngine}`);
    }
  }
  
  try {
    // Log the TTS event
    await logTtsEvent({
      text: text,
      voice_id: voice_id,
      merchant_id: merchant_id,
      engine: selectedEngine,
      endpoint: 'stream',
      timestamp: new Date()
    });
    
    // For streaming, we'll simulate chunks of audio data
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Simulate streaming by sending chunks
    const chunkSize = 1024;
    let sent = 0;
    
    // Create a larger buffer for streaming simulation
    const totalSize = 16000; // 16KB of data
    const buffer = Buffer.alloc(totalSize, 0);
    
    while (sent < totalSize) {
      const remaining = totalSize - sent;
      const currentChunkSize = Math.min(chunkSize, remaining);
      const chunk = buffer.slice(sent, sent + currentChunkSize);
      res.write(chunk);
      sent += currentChunkSize;
      
      // Small delay to simulate real streaming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    res.end();
  } catch (error) {
    console.error('TTS streaming error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'TTS streaming failed', message: error.message });
    }
  }
});

// Endpoint to get available TTS engines
app.get('/v1/tts:engines', async (_req, res) => {
  res.json({
    engines: [
      { id: 'piper', name: 'Piper TTS', description: 'Local neural TTS engine' },
      { id: 'cosyvoice', name: 'CosyVoice', description: 'Alibaba neural TTS engine' },
      { id: 'riva', name: 'NVIDIA Riva', description: 'GPU-accelerated TTS engine' }
    ]
  });
});

const port = process.env.TTS_PORT || 8790;
app.listen(port, ()=> console.log(`TTS gateway on :${port}`));