// Enhanced TTS Gateway Server with Coqui/XTTS Integration
// Production-grade multi-tenant TTS service for CallWaiting.ai

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import services
import { createAuthMiddleware } from './auth/tenantAuth.js';
import { xttsEngine } from './engines/xtts.js';
import { voiceManager } from './services/voiceManager.js';
import { streamingService, createStreamingResponse } from './services/streamingService.js';
import { tenantAuthService } from './auth/tenantAuth.js';
import { SSMLParser } from './utils/ssmlParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(pinoHttp({ 
  autoLogging: true,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: req.headers,
      tenant_id: req.tenant?.id
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.headers
    })
  }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// Health check endpoint (no auth required)
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await xttsEngine.getHealthStatus();
    const streamingStats = streamingService.getStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      engine: healthStatus,
      streaming: streamingStats,
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Authentication middleware
const authMiddleware = createAuthMiddleware();

// ============================================================================
// VOICE SYNTHESIS ENDPOINTS
// ============================================================================

/**
 * POST /v1/synthesize
 * Main synthesis endpoint with full feature support
 */
app.post('/v1/synthesize', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      text, 
      voice_id, 
      ssml, 
      language = 'en',
      speed = 1.0,
      pitch = 1.0,
      temperature = 0.75,
      format = 'wav'
    } = req.body;

    const tenantId = req.tenant.id;

    // Validate input
    if (!text && !ssml) {
      return res.status(400).json({
        error: 'Text or SSML is required',
        code: 'MISSING_INPUT'
      });
    }

    // Validate voice access
    if (voice_id) {
      const hasAccess = await tenantAuthService.validateVoiceAccess(tenantId, voice_id);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to specified voice',
          code: 'VOICE_ACCESS_DENIED'
        });
      }
    }

    // Process text/SSML
    const inputText = ssml || text;
    let synthesisText = inputText;
    let synthesisOptions: any = {
      voice_id,
      tenant_id: tenantId,
      language,
      temperature,
      speed,
      pitch
    };

    // Parse SSML if provided
    if (ssml) {
      const parsedSSML = SSMLParser.parse(ssml);
      if (parsedSSML.hasSSML) {
        const processed = SSMLParser.processSSML(parsedSSML);
        synthesisText = processed.text;
        // Apply SSML-derived settings
        if (processed.settings.rate) synthesisOptions.speed = processed.settings.rate;
        if (processed.settings.pitch) synthesisOptions.pitch = processed.settings.pitch;
      }
    }

    // Perform synthesis
    const result = await xttsEngine.synthesize(synthesisText, synthesisOptions);
    
    const latency = Date.now() - startTime;

    // Log usage
    await logUsage(tenantId, {
      text: synthesisText,
      voice_id,
      engine: 'xtts',
      endpoint: 'synthesize',
      success: true,
      latency_ms: latency,
      audio_duration: result.duration,
      audio_size: result.audioBuffer.length
    });

    // Return response based on format
    if (format === 'base64') {
      res.json({
        success: true,
        data: {
          audio_base64: result.audioBuffer.toString('base64'),
          format: result.format,
          duration: result.duration,
          sample_rate: result.sampleRate,
          channels: result.channels,
          latency_ms: latency
        }
      });
    } else {
      // Return raw audio
      res.setHeader('Content-Type', `audio/${result.format}`);
      res.setHeader('Content-Length', result.audioBuffer.length.toString());
      res.setHeader('X-Audio-Duration', result.duration.toString());
      res.setHeader('X-Latency-MS', latency.toString());
      res.send(result.audioBuffer);
    }

  } catch (error) {
    const latency = Date.now() - startTime;
    
    // Log failed usage
    await logUsage(req.tenant.id, {
      text: req.body.text || req.body.ssml || '',
      voice_id: req.body.voice_id,
      engine: 'xtts',
      endpoint: 'synthesize',
      success: false,
      latency_ms: latency,
      error: error.message
    });

    console.error('Synthesis error:', error);
    res.status(500).json({
      error: 'Synthesis failed',
      code: 'SYNTHESIS_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /v1/synthesize/stream
 * Streaming synthesis endpoint for real-time audio
 */
app.post('/v1/synthesize/stream', authMiddleware, async (req, res) => {
  try {
    const { 
      text, 
      voice_id, 
      ssml, 
      language = 'en',
      chunk_size = 1024,
      chunk_delay = 50
    } = req.body;

    const tenantId = req.tenant.id;

    // Validate input
    if (!text && !ssml) {
      return res.status(400).json({
        error: 'Text or SSML is required',
        code: 'MISSING_INPUT'
      });
    }

    // Validate voice access
    if (voice_id) {
      const hasAccess = await tenantAuthService.validateVoiceAccess(tenantId, voice_id);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to specified voice',
          code: 'VOICE_ACCESS_DENIED'
        });
      }
    }

    // Generate session ID
    const sessionId = `stream_${tenantId}_${Date.now()}`;
    
    // Process text/SSML
    const inputText = ssml || text;
    let synthesisText = inputText;
    let synthesisOptions: any = {
      voice_id,
      tenant_id: tenantId,
      language,
      chunkSize: chunk_size,
      chunkDelay: chunk_delay
    };

    // Parse SSML if provided
    if (ssml) {
      const parsedSSML = SSMLParser.parse(ssml);
      if (parsedSSML.hasSSML) {
        const processed = SSMLParser.processSSML(parsedSSML);
        synthesisText = processed.text;
      }
    }

    // Set up streaming response
    createStreamingResponse(sessionId, res, synthesisOptions);

    // Start streaming
    await streamingService.startStreaming(
      sessionId,
      tenantId,
      synthesisText,
      synthesisOptions
    );

  } catch (error) {
    console.error('Streaming synthesis error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Streaming synthesis failed',
        code: 'STREAMING_ERROR',
        message: error.message
      });
    }
  }
});

// ============================================================================
// VOICE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /v1/voices
 * Get available voices for tenant
 */
app.get('/v1/voices', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const voices = await voiceManager.getTenantVoices(tenantId);
    
    // Add default voices
    const defaultVoices = [
      {
        id: 'en-US-generic',
        name: 'Generic English (US)',
        language: 'en-US',
        gender: 'neutral',
        type: 'default'
      },
      {
        id: 'en-US-male',
        name: 'Male English (US)',
        language: 'en-US',
        gender: 'male',
        type: 'default'
      },
      {
        id: 'en-US-female',
        name: 'Female English (US)',
        language: 'en-US',
        gender: 'female',
        type: 'default'
      }
    ];

    const allVoices = [...defaultVoices, ...voices.map(v => ({
      id: v.voice_id,
      name: v.name,
      description: v.description,
      language: v.language,
      gender: v.gender,
      accent: v.accent,
      quality_score: v.quality_score,
      type: 'custom',
      created_at: v.created_at
    }))];

    res.json({
      success: true,
      data: {
        voices: allVoices,
        total: allVoices.length,
        custom_voices: voices.length
      }
    });

  } catch (error) {
    console.error('Get voices error:', error);
    res.status(500).json({
      error: 'Failed to get voices',
      code: 'VOICES_FETCH_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /v1/voices/upload
 * Upload custom voice reference audio
 */
app.post('/v1/voices/upload', authMiddleware, upload.single('audio'), async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        error: 'Audio file is required',
        code: 'MISSING_AUDIO_FILE'
      });
    }

    const {
      name,
      description,
      language = 'en',
      gender,
      age_range,
      accent
    } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Voice name is required',
        code: 'MISSING_VOICE_NAME'
      });
    }

    // Upload voice
    const result = await voiceManager.uploadVoice(tenantId, {
      name,
      description,
      language,
      gender,
      age_range,
      accent,
      audioBuffer: file.buffer,
      filename: file.originalname
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: 'VOICE_UPLOAD_FAILED',
        warnings: result.warnings
      });
    }

    res.json({
      success: true,
      data: {
        voice_id: result.voice_id,
        quality_score: result.quality_score,
        warnings: result.warnings
      }
    });

  } catch (error) {
    console.error('Voice upload error:', error);
    res.status(500).json({
      error: 'Voice upload failed',
      code: 'VOICE_UPLOAD_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /v1/voices/:voiceId
 * Get specific voice profile
 */
app.get('/v1/voices/:voiceId', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const voiceId = req.params.voiceId;
    
    const voice = await voiceManager.getVoiceProfile(tenantId, voiceId);
    
    if (!voice) {
      return res.status(404).json({
        error: 'Voice not found',
        code: 'VOICE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        id: voice.voice_id,
        name: voice.name,
        description: voice.description,
        language: voice.language,
        gender: voice.gender,
        accent: voice.accent,
        quality_score: voice.quality_score,
        created_at: voice.created_at,
        metadata: voice.metadata
      }
    });

  } catch (error) {
    console.error('Get voice error:', error);
    res.status(500).json({
      error: 'Failed to get voice',
      code: 'VOICE_FETCH_ERROR',
      message: error.message
    });
  }
});

/**
 * PUT /v1/voices/:voiceId
 * Update voice profile
 */
app.put('/v1/voices/:voiceId', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const voiceId = req.params.voiceId;
    const updates = req.body;

    await voiceManager.updateVoiceProfile(tenantId, voiceId, updates);

    res.json({
      success: true,
      message: 'Voice profile updated successfully'
    });

  } catch (error) {
    console.error('Update voice error:', error);
    res.status(500).json({
      error: 'Failed to update voice',
      code: 'VOICE_UPDATE_ERROR',
      message: error.message
    });
  }
});

/**
 * DELETE /v1/voices/:voiceId
 * Delete voice profile
 */
app.delete('/v1/voices/:voiceId', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const voiceId = req.params.voiceId;

    await voiceManager.deleteVoiceProfile(tenantId, voiceId);

    res.json({
      success: true,
      message: 'Voice profile deleted successfully'
    });

  } catch (error) {
    console.error('Delete voice error:', error);
    res.status(500).json({
      error: 'Failed to delete voice',
      code: 'VOICE_DELETE_ERROR',
      message: error.message
    });
  }
});

// ============================================================================
// TENANT MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /v1/tenant/config
 * Get tenant configuration
 */
app.get('/v1/tenant/config', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const config = await tenantAuthService.getTenantConfig(tenantId);
    
    if (!config) {
      return res.status(404).json({
        error: 'Tenant configuration not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Remove sensitive information
    const safeConfig = {
      tenant_id: config.tenant_id,
      rate_limit: config.rate_limit,
      voice_settings: config.voice_settings,
      features: config.features,
      created_at: config.created_at,
      updated_at: config.updated_at
    };

    res.json({
      success: true,
      data: safeConfig
    });

  } catch (error) {
    console.error('Get tenant config error:', error);
    res.status(500).json({
      error: 'Failed to get tenant configuration',
      code: 'TENANT_CONFIG_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /v1/tenant/usage
 * Get tenant usage statistics
 */
app.get('/v1/tenant/usage', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const { start_date, end_date } = req.query;
    
    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;
    
    const stats = await tenantAuthService.getUsageStats(tenantId, startDate, endDate);

    res.json({
      success: true,
      data: {
        ...stats,
        period: {
          start_date: startDate?.toISOString(),
          end_date: endDate?.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({
      error: 'Failed to get usage statistics',
      code: 'USAGE_STATS_ERROR',
      message: error.message
    });
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * POST /v1/ssml/validate
 * Validate SSML markup
 */
app.post('/v1/ssml/validate', authMiddleware, async (req, res) => {
  try {
    const { ssml } = req.body;
    
    if (!ssml) {
      return res.status(400).json({
        error: 'SSML is required',
        code: 'MISSING_SSML'
      });
    }

    const parsed = SSMLParser.parse(ssml);
    const processed = SSMLParser.processSSML(parsed);

    res.json({
      success: true,
      data: {
        valid: true,
        has_ssml: parsed.hasSSML,
        plain_text: parsed.plainText,
        segments_count: processed.segments.length,
        estimated_duration: processed.segments.reduce((sum, seg) => {
          // Rough estimation: 150 words per minute
          const words = seg.text.split(' ').length;
          return sum + (words / 150) * 60;
        }, 0)
      }
    });

  } catch (error) {
    console.error('SSML validation error:', error);
    res.status(400).json({
      error: 'Invalid SSML',
      code: 'SSML_VALIDATION_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /v1/engines
 * Get available TTS engines
 */
app.get('/v1/engines', authMiddleware, async (req, res) => {
  try {
    const engines = [
      {
        id: 'xtts',
        name: 'Coqui XTTS',
        description: 'Multilingual neural TTS with voice cloning',
        capabilities: [
          'voice_cloning',
          'multilingual',
          'ssml',
          'streaming',
          'custom_voices'
        ],
        status: 'active'
      }
    ];

    res.json({
      success: true,
      data: {
        engines,
        default_engine: 'xtts'
      }
    });

  } catch (error) {
    console.error('Get engines error:', error);
    res.status(500).json({
      error: 'Failed to get engines',
      code: 'ENGINES_FETCH_ERROR',
      message: error.message
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        code: 'FILE_TOO_LARGE',
        max_size: '10MB'
      });
    }
  }

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Log usage statistics
 */
async function logUsage(tenantId: string, data: any): Promise<void> {
  try {
    // In production, you would log to your database
    console.log('Usage logged:', { tenant_id: tenantId, ...data });
  } catch (error) {
    console.error('Failed to log usage:', error);
  }
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

const port = process.env.TTS_PORT || 8790;
const host = process.env.TTS_HOST || '0.0.0.0';

// Initialize XTTS engine on startup
xttsEngine.initialize()
  .then(() => {
    console.log('XTTS engine initialized successfully');
  })
  .catch((error) => {
    console.error('Failed to initialize XTTS engine:', error);
    process.exit(1);
  });

app.listen(port, host, () => {
  console.log(`🚀 TTS Gateway Server running on ${host}:${port}`);
  console.log(`📊 Health check: http://${host}:${port}/health`);
  console.log(`🎯 Main synthesis: http://${host}:${port}/v1/synthesize`);
  console.log(`🌊 Streaming: http://${host}:${port}/v1/synthesize/stream`);
  console.log(`🎤 Voices: http://${host}:${port}/v1/voices`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  streamingService.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  streamingService.shutdown();
  process.exit(0);
});