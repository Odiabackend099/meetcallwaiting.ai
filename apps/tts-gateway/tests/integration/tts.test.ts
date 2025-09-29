// tests/integration/tts.test.ts
// Integration tests for TTS Gateway API endpoints

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock the server for testing
const mockServer = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  listen: jest.fn()
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_key';

describe('TTS Gateway API Integration Tests', () => {
  let app: any;
  let testApiKey: string;
  let testTenantId: string;

  beforeAll(async () => {
    // Setup test database and server
    testApiKey = 'tts_test_1234567890abcdef1234567890abcdef';
    testTenantId = 'test-tenant';
    
    // Mock the server initialization
    app = mockServer;
  });

  afterAll(async () => {
    // Cleanup test data
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await request(app)
        .post('/v1/synthesize')
        .send({ text: 'Hello world' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Missing or invalid authorization header');
      expect(response.body).toHaveProperty('code', 'AUTH_REQUIRED');
    });

    it('should reject requests with invalid API key', async () => {
      const response = await request(app)
        .post('/v1/synthesize')
        .set('Authorization', 'Bearer invalid_key')
        .send({ text: 'Hello world' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid API key');
      expect(response.body).toHaveProperty('code', 'AUTH_FAILED');
    });

    it('should accept requests with valid API key', async () => {
      // Mock successful authentication
      mockServer.post.mockImplementation((path: string, middleware: any, handler: any) => {
        if (path === '/v1/synthesize') {
          return {
            set: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            expect: jest.fn().mockReturnThis()
          };
        }
      });

      const response = await request(app)
        .post('/v1/synthesize')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({ text: 'Hello world' });

      expect(response.status).not.toBe(401);
    });
  });

  describe('Voice Synthesis', () => {
    it('should synthesize text to speech', async () => {
      // Mock successful synthesis
      const mockAudioBuffer = Buffer.from('mock audio data');
      
      const response = await request(app)
        .post('/v1/synthesize')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({
          text: 'Hello, how can I help you?',
          voice_id: 'en-US-generic',
          format: 'base64'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('audio_base64');
      expect(response.body.data).toHaveProperty('format');
      expect(response.body.data).toHaveProperty('duration');
      expect(response.body.data).toHaveProperty('latency_ms');
    });

    it('should synthesize with SSML', async () => {
      const ssml = `
        <speak>
          <p>Hello, welcome to our service.</p>
          <break time="1s"/>
          <p>How can I help you today?</p>
        </speak>
      `;

      const response = await request(app)
        .post('/v1/synthesize')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({
          ssml: ssml,
          voice_id: 'en-US-generic',
          format: 'base64'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('audio_base64');
    });

    it('should handle synthesis errors gracefully', async () => {
      // Mock synthesis error
      const response = await request(app)
        .post('/v1/synthesize')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({
          text: '', // Empty text should cause error
          voice_id: 'en-US-generic'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'MISSING_INPUT');
    });

    it('should return raw audio when format is not base64', async () => {
      const response = await request(app)
        .post('/v1/synthesize')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({
          text: 'Hello world',
          voice_id: 'en-US-generic',
          format: 'wav'
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('audio/wav');
      expect(response.headers['content-length']).toBeDefined();
      expect(response.headers['x-audio-duration']).toBeDefined();
      expect(response.headers['x-latency-ms']).toBeDefined();
    });
  });

  describe('Streaming Synthesis', () => {
    it('should stream audio in chunks', async () => {
      const response = await request(app)
        .post('/v1/synthesize/stream')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({
          text: 'Hello world, this is a streaming test.',
          voice_id: 'en-US-generic',
          chunk_size: 1024,
          chunk_delay: 50
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/octet-stream');
      expect(response.headers['transfer-encoding']).toBe('chunked');
      expect(response.headers['x-session-id']).toBeDefined();
    });

    it('should handle streaming errors', async () => {
      const response = await request(app)
        .post('/v1/synthesize/stream')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({
          text: '', // Empty text should cause error
          voice_id: 'en-US-generic'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'MISSING_INPUT');
    });
  });

  describe('Voice Management', () => {
    it('should get available voices', async () => {
      const response = await request(app)
        .get('/v1/voices')
        .set('Authorization', `Bearer ${testApiKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('voices');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('custom_voices');
      expect(Array.isArray(response.body.data.voices)).toBe(true);
    });

    it('should upload custom voice', async () => {
      // Create a mock audio file
      const audioBuffer = Buffer.from('mock audio data');
      
      const response = await request(app)
        .post('/v1/voices/upload')
        .set('Authorization', `Bearer ${testApiKey}`)
        .attach('audio', audioBuffer, 'test-voice.wav')
        .field('name', 'Test Voice')
        .field('description', 'A test voice for unit testing')
        .field('language', 'en')
        .field('gender', 'female')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('voice_id');
      expect(response.body.data).toHaveProperty('quality_score');
    });

    it('should get specific voice profile', async () => {
      const voiceId = 'test-voice-id';
      
      const response = await request(app)
        .get(`/v1/voices/${voiceId}`)
        .set('Authorization', `Bearer ${testApiKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', voiceId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('language');
    });

    it('should update voice profile', async () => {
      const voiceId = 'test-voice-id';
      
      const response = await request(app)
        .put(`/v1/voices/${voiceId}`)
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({
          name: 'Updated Voice Name',
          description: 'Updated description'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Voice profile updated successfully');
    });

    it('should delete voice profile', async () => {
      const voiceId = 'test-voice-id';
      
      const response = await request(app)
        .delete(`/v1/voices/${voiceId}`)
        .set('Authorization', `Bearer ${testApiKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Voice profile deleted successfully');
    });
  });

  describe('Tenant Management', () => {
    it('should get tenant configuration', async () => {
      const response = await request(app)
        .get('/v1/tenant/config')
        .set('Authorization', `Bearer ${testApiKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('tenant_id', testTenantId);
      expect(response.body.data).toHaveProperty('rate_limit');
      expect(response.body.data).toHaveProperty('voice_settings');
      expect(response.body.data).toHaveProperty('features');
    });

    it('should get tenant usage statistics', async () => {
      const response = await request(app)
        .get('/v1/tenant/usage')
        .set('Authorization', `Bearer ${testApiKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('total_requests');
      expect(response.body.data).toHaveProperty('successful_requests');
      expect(response.body.data).toHaveProperty('failed_requests');
      expect(response.body.data).toHaveProperty('total_audio_duration');
      expect(response.body.data).toHaveProperty('average_latency');
    });

    it('should get usage statistics for date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      
      const response = await request(app)
        .get(`/v1/tenant/usage?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${testApiKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.period).toHaveProperty('start_date');
      expect(response.body.data.period).toHaveProperty('end_date');
    });
  });

  describe('Utility Endpoints', () => {
    it('should validate SSML', async () => {
      const ssml = `
        <speak>
          <p>Hello world</p>
          <break time="1s"/>
          <emphasis level="strong">Important text</emphasis>
        </speak>
      `;

      const response = await request(app)
        .post('/v1/ssml/validate')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({ ssml })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('valid', true);
      expect(response.body.data).toHaveProperty('has_ssml', true);
      expect(response.body.data).toHaveProperty('plain_text');
      expect(response.body.data).toHaveProperty('segments_count');
      expect(response.body.data).toHaveProperty('estimated_duration');
    });

    it('should get available engines', async () => {
      const response = await request(app)
        .get('/v1/engines')
        .set('Authorization', `Bearer ${testApiKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('engines');
      expect(response.body.data).toHaveProperty('default_engine', 'xtts');
      expect(Array.isArray(response.body.data.engines)).toBe(true);
      expect(response.body.data.engines[0]).toHaveProperty('id', 'xtts');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(app)
            .post('/v1/synthesize')
            .set('Authorization', `Bearer ${testApiKey}`)
            .send({ text: `Test request ${i}` })
        );
      }

      const responses = await Promise.allSettled(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 429
      );
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app)
        .get('/v1/nonexistent')
        .set('Authorization', `Bearer ${testApiKey}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Endpoint not found');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should handle file upload errors', async () => {
      const response = await request(app)
        .post('/v1/voices/upload')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({}) // No file attached
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Audio file is required');
      expect(response.body).toHaveProperty('code', 'MISSING_AUDIO_FILE');
    });

    it('should handle large file uploads', async () => {
      // Create a large buffer (larger than 10MB limit)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
      
      const response = await request(app)
        .post('/v1/voices/upload')
        .set('Authorization', `Bearer ${testApiKey}`)
        .attach('audio', largeBuffer, 'large-file.wav')
        .field('name', 'Large Voice')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'File too large');
      expect(response.body).toHaveProperty('code', 'FILE_TOO_LARGE');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/v1/synthesize')
            .set('Authorization', `Bearer ${testApiKey}`)
            .send({
              text: `Concurrent request ${i}`,
              voice_id: 'en-US-generic'
            })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(30000); // 30 seconds max
    });

    it('should have low latency for short texts', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/v1/synthesize')
        .set('Authorization', `Bearer ${testApiKey}`)
        .send({
          text: 'Hello',
          voice_id: 'en-US-generic'
        })
        .expect(200);

      const endTime = Date.now();
      const latency = endTime - startTime;

      expect(response.body.data.latency_ms).toBeLessThan(2000); // 2 seconds max
      expect(latency).toBeLessThan(3000); // 3 seconds max including network
    });
  });
});

// Mock implementations for testing
jest.mock('../src/server.ts', () => ({
  __esModule: true,
  default: mockServer
}));

jest.mock('../src/engines/xtts.ts', () => ({
  xttsEngine: {
    initialize: jest.fn().mockResolvedValue(undefined),
    synthesize: jest.fn().mockResolvedValue({
      audioBuffer: Buffer.from('mock audio data'),
      duration: 2.5,
      sampleRate: 22050,
      channels: 1,
      format: 'wav'
    }),
    synthesizeStream: jest.fn().mockImplementation(async (text, options, callback) => {
      // Simulate streaming by calling callback with chunks
      const chunk = Buffer.from('mock chunk data');
      callback(chunk);
      callback(chunk);
    }),
    getHealthStatus: jest.fn().mockResolvedValue({
      initialized: true,
      modelLoaded: true,
      device: 'cpu',
      memoryUsage: {
        cpu_memory: { percent: 50 },
        gpu_memory: null
      }
    })
  }
}));

jest.mock('../src/auth/tenantAuth.ts', () => ({
  tenantAuthService: {
    authenticate: jest.fn().mockImplementation((apiKey) => {
      if (apiKey === 'tts_test_1234567890abcdef1234567890abcdef') {
        return {
          valid: true,
          tenant_id: 'test-tenant',
          config: {
            tenant_id: 'test-tenant',
            rate_limit: { requests_per_minute: 100 },
            voice_settings: { max_voice_uploads: 10 },
            features: { streaming: true, ssml: true, voice_cloning: true }
          }
        };
      }
      return { valid: false, error: 'Invalid API key' };
    }),
    validateVoiceAccess: jest.fn().mockResolvedValue(true),
    getTenantConfig: jest.fn().mockResolvedValue({
      tenant_id: 'test-tenant',
      rate_limit: { requests_per_minute: 100 },
      voice_settings: { max_voice_uploads: 10 },
      features: { streaming: true, ssml: true, voice_cloning: true }
    }),
    getUsageStats: jest.fn().mockResolvedValue({
      total_requests: 100,
      successful_requests: 95,
      failed_requests: 5,
      total_audio_duration: 250.5,
      average_latency: 850.2
    })
  },
  createAuthMiddleware: jest.fn().mockReturnValue((req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const apiKey = authHeader.substring(7);
    if (apiKey !== 'tts_test_1234567890abcdef1234567890abcdef') {
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'AUTH_FAILED'
      });
    }
    
    req.tenant = { id: 'test-tenant' };
    next();
  })
}));

jest.mock('../src/services/voiceManager.ts', () => ({
  voiceManager: {
    getTenantVoices: jest.fn().mockResolvedValue([
      {
        id: 'test-voice-id',
        voice_id: 'custom-voice',
        name: 'Custom Voice',
        language: 'en',
        gender: 'female',
        quality_score: 85,
        created_at: '2024-01-01T00:00:00Z'
      }
    ]),
    uploadVoice: jest.fn().mockResolvedValue({
      success: true,
      voice_id: 'custom-voice-123',
      quality_score: 85,
      warnings: []
    }),
    getVoiceProfile: jest.fn().mockResolvedValue({
      voice_id: 'test-voice-id',
      name: 'Test Voice',
      description: 'A test voice',
      language: 'en',
      gender: 'female',
      quality_score: 85,
      created_at: '2024-01-01T00:00:00Z'
    }),
    updateVoiceProfile: jest.fn().mockResolvedValue(undefined),
    deleteVoiceProfile: jest.fn().mockResolvedValue(undefined)
  }
}));
