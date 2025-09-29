// Enhanced TTS Service for CallWaiting.ai
// Integrates with the new TTS Gateway (Coqui/XTTS) for production-grade voice synthesis

import fetch from 'node-fetch';

interface TTSConfig {
  baseUrl: string;
  apiKey: string;
  defaultVoice: string;
  defaultLanguage: string;
  tenantId: string;
}

interface TTSRequest {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  format?: 'wav' | 'mp3' | 'ogg' | 'base64';
  ssml?: string;
  streaming?: boolean;
}

interface TTSResponse {
  success: boolean;
  audioUrl?: string;
  audioData?: Buffer;
  audioBase64?: string;
  error?: string;
  metadata?: {
    duration: number;
    size: number;
    voice: string;
    language: string;
    latency_ms: number;
    sample_rate: number;
    channels: number;
  };
}

interface StreamingOptions {
  chunkSize?: number;
  chunkDelay?: number;
}

class TTSService {
  private config: TTSConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.TTS_GATEWAY_URL || 'http://localhost:8790',
      apiKey: process.env.TTS_GATEWAY_API_KEY || '',
      defaultVoice: process.env.TTS_DEFAULT_VOICE || 'en-US-generic',
      defaultLanguage: process.env.TTS_DEFAULT_LANGUAGE || 'en',
      tenantId: process.env.TTS_TENANT_ID || 'callwaiting-main'
    };

    if (!this.config.apiKey) {
      console.warn('TTS Gateway API key not configured');
    }

    // Log configuration
    console.log(`TTS Service initialized with gateway: ${this.config.baseUrl}`);
  }

  // Generate speech from text using the new TTS Gateway
  async generateSpeech(request: TTSRequest): Promise<TTSResponse> {
    try {
      const endpoint = request.streaming ? '/v1/synthesize/stream' : '/v1/synthesize';
      const url = `${this.config.baseUrl}${endpoint}`;
      
      const payload: any = {
        text: request.text,
        voice_id: request.voice || this.config.defaultVoice,
        language: request.language || this.config.defaultLanguage,
        speed: request.speed || 1.0,
        pitch: request.pitch || 1.0,
        format: request.format || 'wav'
      };

      // Add SSML if provided
      if (request.ssml) {
        payload.ssml = request.ssml;
        delete payload.text; // Use SSML instead of text
      }

      // Add streaming options if streaming
      if (request.streaming) {
        payload.chunk_size = 1024;
        payload.chunk_delay = 50;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`TTS Gateway error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        // JSON response (base64 format or error)
        const result = await response.json();
        
        if (!result.success) {
          return {
            success: false,
            error: result.error || result.message || 'TTS generation failed'
          };
        }

        // Handle base64 response
        if (result.data && result.data.audio_base64) {
          const audioBuffer = Buffer.from(result.data.audio_base64, 'base64');
          
          return {
            success: true,
            audioData: audioBuffer,
            audioBase64: result.data.audio_base64,
            metadata: {
              duration: result.data.duration || 0,
              size: audioBuffer.length,
              voice: result.data.voice || payload.voice_id,
              language: result.data.language || payload.language,
              latency_ms: result.data.latency_ms || 0,
              sample_rate: result.data.sample_rate || 22050,
              channels: result.data.channels || 1
            }
          };
        }
      } else {
        // Raw audio response
        const audioBuffer = await response.buffer();
        
        // Extract metadata from headers
        const duration = parseFloat(response.headers.get('x-audio-duration') || '0');
        const latency = parseInt(response.headers.get('x-latency-ms') || '0');
        const size = audioBuffer.length;
        const voice = response.headers.get('x-voice-used') || payload.voice_id;
        const language = response.headers.get('x-language-used') || payload.language;

        return {
          success: true,
          audioData: audioBuffer,
          metadata: {
            duration,
            size,
            voice,
            language,
            latency_ms: latency,
            sample_rate: 22050,
            channels: 1
          }
        };
      }

      // Fallback error
      return {
        success: false,
        error: 'Unexpected response format from TTS Gateway'
      };

    } catch (error) {
      console.error('Error generating TTS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown TTS error'
      };
    }
  }

  // Generate streaming speech
  async generateStreamingSpeech(
    request: TTSRequest, 
    options: StreamingOptions = {}
  ): Promise<NodeJS.ReadableStream> {
    try {
      const url = `${this.config.baseUrl}/v1/synthesize/stream`;
      
      const payload = {
        text: request.text,
        voice_id: request.voice || this.config.defaultVoice,
        language: request.language || this.config.defaultLanguage,
        speed: request.speed || 1.0,
        pitch: request.pitch || 1.0,
        chunk_size: options.chunkSize || 1024,
        chunk_delay: options.chunkDelay || 50
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`TTS Gateway streaming error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received for streaming');
      }

      return response.body;

    } catch (error) {
      console.error('Error generating streaming TTS:', error);
      throw error;
    }
  }

  // Generate speech and return as base64 data URL
  async generateSpeechDataUrl(request: TTSRequest): Promise<TTSResponse> {
    try {
      // Request base64 format directly from gateway
      const base64Request = { ...request, format: 'base64' as const };
      const result = await this.generateSpeech(base64Request);
      
      if (!result.success) {
        return result;
      }

      // If we already have base64 data, create data URL
      if (result.audioBase64) {
        const format = request.format || 'wav';
        const mimeType = format === 'mp3' ? 'audio/mpeg' : 
                        format === 'ogg' ? 'audio/ogg' : 'audio/wav';
        
        const dataUrl = `data:${mimeType};base64,${result.audioBase64}`;

        return {
          success: true,
          audioUrl: dataUrl,
          audioBase64: result.audioBase64,
          metadata: result.metadata
        };
      }

      // Fallback: convert audio data to base64
      if (result.audioData) {
        const format = request.format || 'wav';
        const mimeType = format === 'mp3' ? 'audio/mpeg' : 
                        format === 'ogg' ? 'audio/ogg' : 'audio/wav';
        
        const base64Audio = result.audioData.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Audio}`;

        return {
          success: true,
          audioUrl: dataUrl,
          audioBase64: base64Audio,
          metadata: result.metadata
        };
      }

      return {
        success: false,
        error: 'No audio data received from TTS Gateway'
      };

    } catch (error) {
      console.error('Error generating TTS data URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown TTS error'
      };
    }
  }

  // Generate speech and save to file
  async generateSpeechFile(request: TTSRequest, filePath: string): Promise<TTSResponse> {
    try {
      const result = await this.generateSpeech(request);
      
      if (!result.success || !result.audioData) {
        return result;
      }

      // Save audio data to file
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, result.audioData);

      return {
        success: true,
        audioUrl: filePath,
        metadata: result.metadata
      };

    } catch (error) {
      console.error('Error generating TTS file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown TTS error'
      };
    }
  }

  // Get available voices from TTS Gateway
  async getAvailableVoices(): Promise<{ voices: any[], error?: string }> {
    try {
      const url = `${this.config.baseUrl}/v1/voices`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`TTS Gateway error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          voices: [],
          error: result.error || 'Failed to fetch voices'
        };
      }

      return {
        voices: result.data?.voices || []
      };

    } catch (error) {
      console.error('Error fetching available voices:', error);
      return {
        voices: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Upload custom voice to TTS Gateway
  async uploadCustomVoice(
    audioBuffer: Buffer,
    voiceData: {
      name: string;
      description?: string;
      language?: string;
      gender?: string;
      filename: string;
    }
  ): Promise<{ success: boolean; voice_id?: string; error?: string }> {
    try {
      const url = `${this.config.baseUrl}/v1/voices/upload`;
      
      // Create form data
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      formData.append('audio', blob, voiceData.filename);
      formData.append('name', voiceData.name);
      if (voiceData.description) formData.append('description', voiceData.description);
      if (voiceData.language) formData.append('language', voiceData.language);
      if (voiceData.gender) formData.append('gender', voiceData.gender);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`TTS Gateway error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to upload voice'
        };
      }

      return {
        success: true,
        voice_id: result.data?.voice_id
      };

    } catch (error) {
      console.error('Error uploading custom voice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get voice profile from TTS Gateway
  async getVoiceProfile(voiceId: string): Promise<{ voice?: any; error?: string }> {
    try {
      const url = `${this.config.baseUrl}/v1/voices/${voiceId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`TTS Gateway error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          error: result.error || 'Failed to get voice profile'
        };
      }

      return {
        voice: result.data
      };

    } catch (error) {
      console.error('Error getting voice profile:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Validate SSML using TTS Gateway
  async validateSSML(ssml: string): Promise<{ valid: boolean; error?: string; details?: any }> {
    try {
      const url = `${this.config.baseUrl}/v1/ssml/validate`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ssml })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`TTS Gateway error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          valid: false,
          error: result.error || 'SSML validation failed'
        };
      }

      return {
        valid: true,
        details: result.data
      };

    } catch (error) {
      console.error('Error validating SSML:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get TTS Gateway health status
  async getGatewayHealth(): Promise<{ healthy: boolean; status?: any; error?: string }> {
    try {
      const url = `${this.config.baseUrl}/health`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        healthy: result.status === 'healthy',
        status: result
      };

    } catch (error) {
      console.error('Error checking TTS Gateway health:', error);
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get supported languages
  async getSupportedLanguages(): Promise<{ languages: any[], error?: string }> {
    try {
      const url = `${this.config.baseUrl}/api/v1/languages`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return {
        languages: result.languages || result.data || []
      };

    } catch (error) {
      console.error('Error fetching supported languages:', error);
      return {
        languages: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Generate CallWaiting.ai specific greetings
  async generateCallWaitingGreeting(
    businessName: string,
    voice?: string,
    language?: string
  ): Promise<TTSResponse> {
    const greetingText = `Hello! You've reached ${businessName}. I'm your AI assistant and I'm here to help you. 
    You can book an appointment, place an order, or I can connect you with a human if needed. 
    How can I assist you today?`;

    return this.generateSpeech({
      text: greetingText,
      voice: voice || this.config.defaultVoice,
      language: language || this.config.defaultLanguage,
      speed: 0.9, // Slightly slower for clarity
      pitch: 1.0
    });
  }

  // Generate appointment booking confirmation
  async generateAppointmentConfirmation(
    businessName: string,
    appointmentDate: string,
    appointmentTime: string,
    customerName?: string,
    voice?: string,
    language?: string
  ): Promise<TTSResponse> {
    const confirmationText = customerName 
      ? `Perfect ${customerName}! Your appointment with ${businessName} is confirmed for ${appointmentDate} at ${appointmentTime}. You'll receive a confirmation message shortly. Is there anything else I can help you with?`
      : `Perfect! Your appointment with ${businessName} is confirmed for ${appointmentDate} at ${appointmentTime}. You'll receive a confirmation message shortly. Is there anything else I can help you with?`;

    return this.generateSpeech({
      text: confirmationText,
      voice: voice || this.config.defaultVoice,
      language: language || this.config.defaultLanguage,
      speed: 0.9,
      pitch: 1.0
    });
  }

  // Generate order confirmation
  async generateOrderConfirmation(
    businessName: string,
    orderTotal: number,
    currency: string = 'USD',
    customerName?: string,
    voice?: string,
    language?: string
  ): Promise<TTSResponse> {
    const confirmationText = customerName
      ? `Great ${customerName}! Your order from ${businessName} totals ${currency} ${orderTotal.toFixed(2)}. I'm sending you a secure payment link now. Once payment is confirmed, your order will be processed. Anything else I can help you with?`
      : `Great! Your order from ${businessName} totals ${currency} ${orderTotal.toFixed(2)}. I'm sending you a secure payment link now. Once payment is confirmed, your order will be processed. Anything else I can help you with?`;

    return this.generateSpeech({
      text: confirmationText,
      voice: voice || this.config.defaultVoice,
      language: language || this.config.defaultLanguage,
      speed: 0.9,
      pitch: 1.0
    });
  }

  // Generate goodbye message
  async generateGoodbyeMessage(
    businessName: string,
    voice?: string,
    language?: string
  ): Promise<TTSResponse> {
    const goodbyeText = `Thank you for calling ${businessName}. Have a wonderful day, and we look forward to serving you soon. Goodbye!`;

    return this.generateSpeech({
      text: goodbyeText,
      voice: voice || this.config.defaultVoice,
      language: language || this.config.defaultLanguage,
      speed: 0.9,
      pitch: 1.0
    });
  }

  // Generate hold music message
  async generateHoldMessage(
    businessName: string,
    voice?: string,
    language?: string
  ): Promise<TTSResponse> {
    const holdText = `Please hold while I connect you with someone from ${businessName}. Thank you for your patience.`;

    return this.generateSpeech({
      text: holdText,
      voice: voice || this.config.defaultVoice,
      language: language || this.config.defaultLanguage,
      speed: 0.8, // Slower for hold message
      pitch: 1.0
    });
  }

  // Generate error message
  async generateErrorMessage(
    voice?: string,
    language?: string
  ): Promise<TTSResponse> {
    const errorText = `I'm sorry, I'm having trouble understanding right now. Please try again or I can connect you with a human representative.`;

    return this.generateSpeech({
      text: errorText,
      voice: voice || this.config.defaultVoice,
      language: language || this.config.defaultLanguage,
      speed: 0.8,
      pitch: 1.0
    });
  }

  // Check TTS service health
  async checkHealth(): Promise<{ healthy: boolean, error?: string }> {
    try {
      const url = `${this.config.baseUrl}/health`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        healthy: response.ok
      };

    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const ttsService = new TTSService();
export default ttsService;
