// engines/xtts.ts
// Coqui XTTS engine implementation for production-grade voice synthesis

import { spawn, ChildProcess } from 'child_process';
import { createWriteStream, readFileSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface XTTSOptions {
  voice_id?: string;
  tenant_id?: string;
  language?: string;
  speaker_wav?: string;
  temperature?: number;
  length_penalty?: number;
  repetition_penalty?: number;
  top_k?: number;
  top_p?: number;
  speed?: number;
}

export interface XTTSResult {
  audioBuffer: Buffer;
  duration: number;
  sampleRate: number;
  channels: number;
  format: string;
}

export class XTTSEngine {
  private pythonProcess: ChildProcess | null = null;
  private isInitialized = false;
  private modelPath: string;
  private configPath: string;
  private voicesCache = new Map<string, string>();

  constructor() {
    this.modelPath = process.env.XTTS_MODEL_PATH || '/app/models/xtts-v2';
    this.configPath = process.env.XTTS_CONFIG_PATH || '/app/config/xtts_config.json';
  }

  /**
   * Initialize the XTTS engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing XTTS engine...');
      
      // Check if model files exist
      if (!existsSync(this.modelPath)) {
        throw new Error(`XTTS model not found at ${this.modelPath}`);
      }

      // Preload the model
      await this.preloadModel();
      
      this.isInitialized = true;
      console.log('XTTS engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize XTTS engine:', error);
      throw error;
    }
  }

  /**
   * Preload the XTTS model for faster inference
   */
  private async preloadModel(): Promise<void> {
    return new Promise((resolve, reject) => {
      const pythonScript = `
import sys
import os
import torch
import torchaudio
import numpy as np
from TTS.api import TTS

# Set device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Initialize TTS
try:
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    print("XTTS model loaded successfully")
    
    # Test synthesis to warm up the model
    test_audio = tts.tts("Hello, this is a test.", speaker_wav=None, language="en")
    print("Model warmed up successfully")
    
    # Save model state for reuse
    torch.save({
        'model_loaded': True,
        'device': device
    }, '/tmp/xtts_model_state.pt')
    
except Exception as e:
    print(f"Error loading XTTS model: {e}")
    sys.exit(1)
`;

      const tempScript = '/tmp/xtts_preload.py';
      require('fs').writeFileSync(tempScript, pythonScript);

      const process = spawn('python3', [tempScript], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
        console.log('XTTS preload output:', data.toString().trim());
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
        console.error('XTTS preload error:', data.toString().trim());
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`XTTS preload failed with code ${code}: ${error}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start XTTS preload process: ${error.message}`));
      });
    });
  }

  /**
   * Synthesize speech using XTTS
   */
  async synthesize(
    text: string, 
    options: XTTSOptions = {}
  ): Promise<XTTSResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      voice_id = 'default',
      tenant_id,
      language = 'en',
      speaker_wav,
      temperature = 0.75,
      length_penalty = 1.0,
      repetition_penalty = 5.0,
      top_k = 50,
      top_p = 0.85,
      speed = 1.0
    } = options;

    try {
      // Generate unique filenames
      const timestamp = Date.now();
      const outputFile = `/tmp/xtts_output_${timestamp}.wav`;
      const tempInputFile = `/tmp/xtts_input_${timestamp}.wav`;

      // Handle speaker voice
      let speakerPath = speaker_wav;
      if (tenant_id && voice_id && !speakerPath) {
        speakerPath = await this.getTenantVoicePath(tenant_id, voice_id);
      }

      // Create Python script for synthesis
      const pythonScript = `
import sys
import os
import torch
import torchaudio
import numpy as np
from TTS.api import TTS
import json

def synthesize_xtts(text, speaker_wav=None, language="en", temperature=0.75, 
                   length_penalty=1.0, repetition_penalty=5.0, top_k=50, top_p=0.85, 
                   speed=1.0, output_file="${outputFile}"):
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    try:
        # Initialize TTS
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
        
        # Synthesize
        audio = tts.tts(
            text=text,
            speaker_wav=speaker_wav,
            language=language,
            temperature=temperature,
            length_penalty=length_penalty,
            repetition_penalty=repetition_penalty,
            top_k=top_k,
            top_p=top_p
        )
        
        # Convert to numpy array if needed
        if isinstance(audio, list):
            audio = np.array(audio)
        
        # Apply speed adjustment if needed
        if speed != 1.0:
            # Resample to adjust speed
            original_length = len(audio)
            new_length = int(original_length / speed)
            audio = torch.from_numpy(audio).unsqueeze(0)
            audio = torchaudio.functional.resample(
                audio, 
                orig_freq=22050, 
                new_freq=int(22050 * speed)
            ).squeeze(0).numpy()
        
        # Save audio
        torchaudio.save(output_file, torch.from_numpy(audio).unsqueeze(0), 22050)
        
        # Get audio info
        info = torchaudio.info(output_file)
        duration = info.num_frames / info.sample_rate
        
        result = {
            "success": True,
            "output_file": output_file,
            "duration": duration,
            "sample_rate": info.sample_rate,
            "channels": info.num_channels,
            "format": "wav"
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

# Main execution
synthesize_xtts(
    text="${text.replace(/"/g, '\\"')}",
    speaker_wav="${speakerPath || 'None'}",
    language="${language}",
    temperature=${temperature},
    length_penalty=${length_penalty},
    repetition_penalty=${repetition_penalty},
    top_k=${top_k},
    top_p=${top_p},
    speed=${speed}
)
`;

      const tempScript = `/tmp/xtts_synth_${timestamp}.py`;
      require('fs').writeFileSync(tempScript, pythonScript);

      // Execute synthesis
      const result = await this.executePythonScript(tempScript, {
        PYTHONPATH: '/app/xtts',
        CUDA_VISIBLE_DEVICES: process.env.CUDA_VISIBLE_DEVICES || '0'
      });

      // Parse result
      const synthesisResult = JSON.parse(result);
      
      if (!synthesisResult.success) {
        throw new Error(`XTTS synthesis failed: ${synthesisResult.error}`);
      }

      // Read generated audio file
      const audioBuffer = readFileSync(outputFile);
      
      // Cleanup temporary files
      this.cleanup([tempScript, outputFile]);

      return {
        audioBuffer,
        duration: synthesisResult.duration,
        sampleRate: synthesisResult.sample_rate,
        channels: synthesisResult.channels,
        format: synthesisResult.format
      };

    } catch (error) {
      console.error('XTTS synthesis error:', error);
      throw new Error(`XTTS synthesis failed: ${error.message}`);
    }
  }

  /**
   * Stream synthesis for real-time audio generation
   */
  async synthesizeStream(
    text: string,
    options: XTTSOptions = {},
    chunkCallback: (chunk: Buffer) => void
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // For streaming, we'll synthesize in chunks
      const words = text.split(' ');
      const chunkSize = Math.max(3, Math.ceil(words.length / 10)); // Process in chunks
      
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        
        if (chunk.trim()) {
          const result = await this.synthesize(chunk, options);
          
          // Split audio buffer into smaller chunks for streaming
          const audioChunks = this.splitAudioIntoChunks(result.audioBuffer, 1024);
          
          for (const audioChunk of audioChunks) {
            chunkCallback(audioChunk);
          }
        }
      }
    } catch (error) {
      console.error('XTTS stream synthesis error:', error);
      throw error;
    }
  }

  /**
   * Get tenant-specific voice path
   */
  private async getTenantVoicePath(tenantId: string, voiceId: string): Promise<string | null> {
    const voicePath = `/app/voices/${tenantId}/${voiceId}.wav`;
    
    if (existsSync(voicePath)) {
      return voicePath;
    }

    // Check cache
    const cacheKey = `${tenantId}:${voiceId}`;
    if (this.voicesCache.has(cacheKey)) {
      return this.voicesCache.get(cacheKey)!;
    }

    return null;
  }

  /**
   * Execute Python script and return output
   */
  private async executePythonScript(scriptPath: string, env: Record<string, string> = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('python3', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...env }
      });

      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Python script failed with code ${code}: ${error}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  /**
   * Split audio buffer into chunks for streaming
   */
  private splitAudioIntoChunks(audioBuffer: Buffer, chunkSize: number): Buffer[] {
    const chunks: Buffer[] = [];
    
    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      chunks.push(audioBuffer.slice(i, i + chunkSize));
    }
    
    return chunks;
  }

  /**
   * Cleanup temporary files
   */
  private cleanup(files: string[]): void {
    files.forEach(file => {
      try {
        if (existsSync(file)) {
          unlinkSync(file);
        }
      } catch (error) {
        console.warn(`Failed to cleanup file ${file}:`, error);
      }
    });
  }

  /**
   * Get engine health status
   */
  async getHealthStatus(): Promise<{
    initialized: boolean;
    modelLoaded: boolean;
    device: string;
    memoryUsage?: any;
  }> {
    try {
      const pythonScript = `
import torch
import psutil
import json

try:
    device = "cuda" if torch.cuda.is_available() else "cpu"
    memory_info = psutil.virtual_memory()
    
    gpu_memory = None
    if device == "cuda":
        gpu_memory = {
            "allocated": torch.cuda.memory_allocated(),
            "cached": torch.cuda.memory_reserved()
        }
    
    result = {
        "device": device,
        "cpu_memory": {
            "total": memory_info.total,
            "available": memory_info.available,
            "percent": memory_info.percent
        },
        "gpu_memory": gpu_memory
    }
    
    print(json.dumps(result))
    
except Exception as e:
    error_result = {"error": str(e)}
    print(json.dumps(error_result))
`;

      const tempScript = '/tmp/xtts_health.py';
      require('fs').writeFileSync(tempScript, pythonScript);
      
      const output = await this.executePythonScript(tempScript);
      const healthData = JSON.parse(output);
      
      this.cleanup([tempScript]);
      
      return {
        initialized: this.isInitialized,
        modelLoaded: this.isInitialized,
        device: healthData.device || 'unknown',
        memoryUsage: healthData
      };
    } catch (error) {
      return {
        initialized: this.isInitialized,
        modelLoaded: false,
        device: 'unknown',
        memoryUsage: { error: error.message }
      };
    }
  }
}

// Export singleton instance
export const xttsEngine = new XTTSEngine();

// Legacy function for backward compatibility
export async function synthXTTS(text: string, opts: XTTSOptions = {}): Promise<Buffer> {
  const result = await xttsEngine.synthesize(text, opts);
  return result.audioBuffer;
}
