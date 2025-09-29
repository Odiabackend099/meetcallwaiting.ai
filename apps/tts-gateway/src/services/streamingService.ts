// services/streamingService.ts
// Streaming audio service for real-time TTS synthesis

import { EventEmitter } from 'events';
import { xttsEngine, XTTSOptions } from '../engines/xtts.js';
import { SSMLParser } from '../utils/ssmlParser.js';

export interface StreamingOptions extends XTTSOptions {
  chunkSize?: number;
  chunkDelay?: number;
  preloadSeconds?: number;
  bufferSize?: number;
}

export interface AudioChunk {
  data: Buffer;
  sequence: number;
  timestamp: number;
  isLast: boolean;
  duration?: number;
}

export interface StreamingSession {
  id: string;
  tenantId: string;
  text: string;
  options: StreamingOptions;
  startTime: number;
  isActive: boolean;
  chunksSent: number;
  totalChunks?: number;
}

export class StreamingService extends EventEmitter {
  private activeSessions = new Map<string, StreamingSession>();
  private chunkBuffer = new Map<string, Buffer[]>();
  private maxConcurrentSessions = parseInt(process.env.MAX_CONCURRENT_STREAMS || '50');

  /**
   * Start a streaming TTS session
   */
  async startStreaming(
    sessionId: string,
    tenantId: string,
    text: string,
    options: StreamingOptions = {}
  ): Promise<void> {
    try {
      // Check session limits
      if (this.activeSessions.size >= this.maxConcurrentSessions) {
        throw new Error('Maximum concurrent streaming sessions reached');
      }

      // Check if session already exists
      if (this.activeSessions.has(sessionId)) {
        throw new Error('Session already exists');
      }

      // Parse SSML if present
      const processedText = this.processText(text, options);

      // Create session
      const session: StreamingSession = {
        id: sessionId,
        tenantId,
        text: processedText.text,
        options: {
          chunkSize: 1024,
          chunkDelay: 50,
          preloadSeconds: 1,
          bufferSize: 8192,
          ...options
        },
        startTime: Date.now(),
        isActive: true,
        chunksSent: 0
      };

      this.activeSessions.set(sessionId, session);
      this.chunkBuffer.set(sessionId, []);

      // Start synthesis
      await this.synthesizeAndStream(session);

    } catch (error) {
      console.error('Streaming start error:', error);
      this.cleanupSession(sessionId);
      throw error;
    }
  }

  /**
   * Stop a streaming session
   */
  stopStreaming(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.cleanupSession(sessionId);
    }
  }

  /**
   * Get session status
   */
  getSessionStatus(sessionId: string): StreamingSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): StreamingSession[] {
    return Array.from(this.activeSessions.values()).filter(s => s.isActive);
  }

  /**
   * Get buffered chunks for a session
   */
  getBufferedChunks(sessionId: string, maxChunks: number = 10): Buffer[] {
    const buffer = this.chunkBuffer.get(sessionId) || [];
    return buffer.slice(-maxChunks);
  }

  /**
   * Process text (handle SSML)
   */
  private processText(text: string, options: StreamingOptions): {
    text: string;
    settings: any;
    segments: any[];
  } {
    try {
      const parsedSSML = SSMLParser.parse(text);
      
      if (parsedSSML.hasSSML) {
        return SSMLParser.processSSML(parsedSSML);
      }

      return {
        text: text,
        settings: {},
        segments: [{ text, settings: {} }]
      };
    } catch (error) {
      console.error('Text processing error:', error);
      return {
        text: text,
        settings: {},
        segments: [{ text, settings: {} }]
      };
    }
  }

  /**
   * Synthesize and stream audio
   */
  private async synthesizeAndStream(session: StreamingSession): Promise<void> {
    try {
      let chunkSequence = 0;
      let audioBuffer = Buffer.alloc(0);
      let isFirstChunk = true;

      // Callback for receiving audio chunks from XTTS
      const chunkCallback = (chunk: Buffer) => {
        if (!session.isActive) return;

        audioBuffer = Buffer.concat([audioBuffer, chunk]);

        // Split into smaller chunks for streaming
        const targetChunkSize = session.options.chunkSize || 1024;
        
        while (audioBuffer.length >= targetChunkSize) {
          const audioChunk = audioBuffer.slice(0, targetChunkSize);
          audioBuffer = audioBuffer.slice(targetChunkSize);

          const audioChunkData: AudioChunk = {
            data: audioChunk,
            sequence: chunkSequence++,
            timestamp: Date.now(),
            isLast: false,
            duration: this.calculateChunkDuration(audioChunk, session.options)
          };

          // Add to buffer
          const buffer = this.chunkBuffer.get(session.id) || [];
          buffer.push(audioChunk);
          this.chunkBuffer.set(session.id, buffer);

          // Emit chunk event
          this.emit('chunk', session.id, audioChunkData);

          // Update session
          session.chunksSent++;

          // Apply chunk delay
          if (session.options.chunkDelay && session.options.chunkDelay > 0) {
            setTimeout(() => {}, session.options.chunkDelay);
          }

          // Mark first chunk
          if (isFirstChunk) {
            isFirstChunk = false;
            this.emit('firstChunk', session.id, audioChunkData);
          }
        }
      };

      // Start synthesis with streaming
      await xttsEngine.synthesizeStream(session.text, session.options, chunkCallback);

      // Send any remaining audio
      if (audioBuffer.length > 0) {
        const finalChunk: AudioChunk = {
          data: audioBuffer,
          sequence: chunkSequence++,
          timestamp: Date.now(),
          isLast: true,
          duration: this.calculateChunkDuration(audioBuffer, session.options)
        };

        const buffer = this.chunkBuffer.get(session.id) || [];
        buffer.push(audioBuffer);
        this.chunkBuffer.set(session.id, buffer);

        this.emit('chunk', session.id, finalChunk);
        session.chunksSent++;
      }

      // Mark session as complete
      session.isActive = false;
      this.emit('complete', session.id);

    } catch (error) {
      console.error('Synthesis streaming error:', error);
      session.isActive = false;
      this.emit('error', session.id, error);
      this.cleanupSession(session.id);
    }
  }

  /**
   * Calculate chunk duration in seconds
   */
  private calculateChunkDuration(chunk: Buffer, options: StreamingOptions): number {
    // Assuming 16-bit PCM, mono, 22050 Hz
    const sampleRate = 22050;
    const bytesPerSample = 2;
    const channels = 1;
    
    const samples = chunk.length / (bytesPerSample * channels);
    return samples / sampleRate;
  }

  /**
   * Cleanup session resources
   */
  private cleanupSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    this.chunkBuffer.delete(sessionId);
    this.emit('cleanup', sessionId);
  }

  /**
   * Get service statistics
   */
  getStats(): {
    activeSessions: number;
    totalSessions: number;
    maxConcurrentSessions: number;
    averageChunksPerSession: number;
  } {
    const sessions = Array.from(this.activeSessions.values());
    const totalChunks = sessions.reduce((sum, s) => sum + s.chunksSent, 0);
    
    return {
      activeSessions: sessions.filter(s => s.isActive).length,
      totalSessions: sessions.length,
      maxConcurrentSessions: this.maxConcurrentSessions,
      averageChunksPerSession: sessions.length > 0 ? totalChunks / sessions.length : 0
    };
  }

  /**
   * Preload audio for faster streaming
   */
  async preloadAudio(
    tenantId: string,
    text: string,
    options: StreamingOptions = {}
  ): Promise<Buffer> {
    try {
      const result = await xttsEngine.synthesize(text, options);
      
      // Cache the result (in production, you'd use Redis or similar)
      const cacheKey = this.generateCacheKey(tenantId, text, options);
      // TODO: Implement caching mechanism
      
      return result.audioBuffer;
    } catch (error) {
      console.error('Preload error:', error);
      throw error;
    }
  }

  /**
   * Generate cache key for preloaded audio
   */
  private generateCacheKey(tenantId: string, text: string, options: StreamingOptions): string {
    const optionsStr = JSON.stringify(options);
    const hash = require('crypto')
      .createHash('md5')
      .update(`${tenantId}:${text}:${optionsStr}`)
      .digest('hex');
    
    return `preload:${hash}`;
  }

  /**
   * Validate streaming options
   */
  validateStreamingOptions(options: StreamingOptions): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate chunk size
    if (options.chunkSize) {
      if (options.chunkSize < 256) {
        warnings.push('Chunk size too small, may cause excessive overhead');
      }
      if (options.chunkSize > 8192) {
        warnings.push('Chunk size too large, may cause latency issues');
      }
    }

    // Validate chunk delay
    if (options.chunkDelay) {
      if (options.chunkDelay < 10) {
        warnings.push('Chunk delay too small, may cause network congestion');
      }
      if (options.chunkDelay > 1000) {
        warnings.push('Chunk delay too large, may cause poor user experience');
      }
    }

    // Validate buffer size
    if (options.bufferSize) {
      if (options.bufferSize < 1024) {
        warnings.push('Buffer size too small, may cause audio dropouts');
      }
      if (options.bufferSize > 65536) {
        warnings.push('Buffer size too large, may cause memory issues');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Cleanup all sessions (for shutdown)
   */
  shutdown(): void {
    const sessionIds = Array.from(this.activeSessions.keys());
    sessionIds.forEach(id => this.cleanupSession(id));
    this.removeAllListeners();
  }
}

// Export singleton instance
export const streamingService = new StreamingService();

// Utility functions for Express integration
export function createStreamingResponse(
  sessionId: string,
  res: any,
  options: StreamingOptions = {}
): void {
  const chunkDelay = options.chunkDelay || 50;
  const bufferSize = options.bufferSize || 8192;

  // Set headers for streaming
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Session-ID', sessionId);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let isFirstChunk = true;
  let startTime = Date.now();

  // Handle chunk events
  streamingService.on('chunk', (id: string, chunk: AudioChunk) => {
    if (id !== sessionId) return;

    if (isFirstChunk) {
      const firstChunkLatency = Date.now() - startTime;
      res.setHeader('X-First-Chunk-Latency', firstChunkLatency.toString());
      isFirstChunk = false;
    }

    // Write chunk with size prefix (chunked transfer encoding)
    const chunkSize = chunk.data.length.toString(16);
    res.write(`${chunkSize}\r\n`);
    res.write(chunk.data);
    res.write('\r\n');

    // Add delay between chunks
    if (chunkDelay > 0) {
      setTimeout(() => {}, chunkDelay);
    }
  });

  // Handle completion
  streamingService.on('complete', (id: string) => {
    if (id !== sessionId) return;
    
    // Send end chunk
    res.write('0\r\n\r\n');
    res.end();
  });

  // Handle errors
  streamingService.on('error', (id: string, error: Error) => {
    if (id !== sessionId) return;
    
    console.error('Streaming error:', error);
    res.status(500).json({
      error: 'Streaming failed',
      message: error.message
    });
  });

  // Handle cleanup
  streamingService.on('cleanup', (id: string) => {
    if (id !== sessionId) return;
    
    // Remove listeners for this session
    streamingService.removeAllListeners('chunk');
    streamingService.removeAllListeners('complete');
    streamingService.removeAllListeners('error');
    streamingService.removeAllListeners('cleanup');
  });
}
