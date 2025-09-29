// services/voiceManager.ts
// Voice profile management system for multi-tenant voice cloning

import { createClient } from '@supabase/supabase-js';
import { createWriteStream, readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';

export interface VoiceProfile {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  voice_id: string;
  language: string;
  gender?: 'male' | 'female' | 'neutral';
  age_range?: string;
  accent?: string;
  reference_audio_path: string;
  embedding_path?: string;
  quality_score?: number;
  created_at: string;
  updated_at: string;
  active: boolean;
  metadata?: Record<string, any>;
}

export interface VoiceUploadResult {
  success: boolean;
  voice_id?: string;
  quality_score?: number;
  error?: string;
  warnings?: string[];
}

export interface VoiceValidationResult {
  valid: boolean;
  quality_score: number;
  duration: number;
  sample_rate: number;
  channels: number;
  warnings: string[];
  errors: string[];
}

export class VoiceManager {
  private supabase;
  private voicesDir: string;
  private embeddingsDir: string;
  private tempDir: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Set up directories
    this.voicesDir = process.env.VOICES_DIR || '/app/voices';
    this.embeddingsDir = process.env.EMBEDDINGS_DIR || '/app/embeddings';
    this.tempDir = process.env.TEMP_DIR || '/tmp/voice_uploads';

    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [this.voicesDir, this.embeddingsDir, this.tempDir];
    
    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Upload and process voice reference audio
   */
  async uploadVoice(
    tenantId: string,
    voiceData: {
      name: string;
      description?: string;
      language: string;
      gender?: 'male' | 'female' | 'neutral';
      age_range?: string;
      accent?: string;
      audioBuffer: Buffer;
      filename: string;
    }
  ): Promise<VoiceUploadResult> {
    try {
      // Validate tenant can upload more voices
      const canUpload = await this.canTenantUploadVoice(tenantId);
      if (!canUpload) {
        return {
          success: false,
          error: 'Voice upload limit exceeded'
        };
      }

      // Validate audio file
      const validation = await this.validateAudioFile(voiceData.audioBuffer, voiceData.filename);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid audio file: ${validation.errors.join(', ')}`
        };
      }

      // Generate unique voice ID
      const voiceId = this.generateVoiceId(tenantId, voiceData.name);

      // Save audio file
      const audioPath = await this.saveVoiceAudio(tenantId, voiceId, voiceData.audioBuffer);

      // Generate voice embedding
      const embeddingPath = await this.generateVoiceEmbedding(audioPath, voiceId);

      // Create voice profile in database
      const voiceProfile: VoiceProfile = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        name: voiceData.name,
        description: voiceData.description,
        voice_id: voiceId,
        language: voiceData.language,
        gender: voiceData.gender,
        age_range: voiceData.age_range,
        accent: voiceData.accent,
        reference_audio_path: audioPath,
        embedding_path: embeddingPath,
        quality_score: validation.quality_score,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: true,
        metadata: {
          original_filename: voiceData.filename,
          file_size: voiceData.audioBuffer.length,
          duration: validation.duration,
          sample_rate: validation.sample_rate,
          channels: validation.channels
        }
      };

      const { error } = await this.supabase
        .from('voice_profiles')
        .insert(voiceProfile);

      if (error) {
        // Cleanup files on database error
        this.cleanupVoiceFiles(audioPath, embeddingPath);
        throw new Error(`Failed to save voice profile: ${error.message}`);
      }

      return {
        success: true,
        voice_id: voiceId,
        quality_score: validation.quality_score,
        warnings: validation.warnings
      };

    } catch (error) {
      console.error('Voice upload error:', error);
      return {
        success: false,
        error: error.message || 'Voice upload failed'
      };
    }
  }

  /**
   * Get voice profiles for a tenant
   */
  async getTenantVoices(tenantId: string): Promise<VoiceProfile[]> {
    try {
      const { data, error } = await this.supabase
        .from('voice_profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get voice profiles: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting tenant voices:', error);
      throw error;
    }
  }

  /**
   * Get specific voice profile
   */
  async getVoiceProfile(tenantId: string, voiceId: string): Promise<VoiceProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('voice_profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('voice_id', voiceId)
        .eq('active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting voice profile:', error);
      return null;
    }
  }

  /**
   * Update voice profile
   */
  async updateVoiceProfile(
    tenantId: string,
    voiceId: string,
    updates: Partial<VoiceProfile>
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('voice_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)
        .eq('voice_id', voiceId);

      if (error) {
        throw new Error(`Failed to update voice profile: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating voice profile:', error);
      throw error;
    }
  }

  /**
   * Delete voice profile
   */
  async deleteVoiceProfile(tenantId: string, voiceId: string): Promise<void> {
    try {
      // Get voice profile to get file paths
      const profile = await this.getVoiceProfile(tenantId, voiceId);
      if (!profile) {
        throw new Error('Voice profile not found');
      }

      // Mark as inactive in database
      const { error } = await this.supabase
        .from('voice_profiles')
        .update({ active: false })
        .eq('tenant_id', tenantId)
        .eq('voice_id', voiceId);

      if (error) {
        throw new Error(`Failed to delete voice profile: ${error.message}`);
      }

      // Cleanup files
      this.cleanupVoiceFiles(profile.reference_audio_path, profile.embedding_path);
    } catch (error) {
      console.error('Error deleting voice profile:', error);
      throw error;
    }
  }

  /**
   * Check if tenant can upload more voices
   */
  private async canTenantUploadVoice(tenantId: string): Promise<boolean> {
    try {
      const { data: config, error: configError } = await this.supabase
        .from('tenant_configs')
        .select('voice_settings')
        .eq('tenant_id', tenantId)
        .single();

      if (configError || !config) {
        return false;
      }

      const { data: voices, error: voicesError } = await this.supabase
        .from('voice_profiles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('active', true);

      if (voicesError) {
        return false;
      }

      const maxUploads = config.voice_settings.max_voice_uploads || 10;
      return voices.length < maxUploads;
    } catch (error) {
      console.error('Error checking voice upload limit:', error);
      return false;
    }
  }

  /**
   * Validate audio file
   */
  private async validateAudioFile(audioBuffer: Buffer, filename: string): Promise<VoiceValidationResult> {
    const tempFile = join(this.tempDir, `validation_${Date.now()}_${filename}`);
    
    try {
      // Save temporary file
      require('fs').writeFileSync(tempFile, audioBuffer);

      // Use ffprobe to analyze audio
      const analysis = await this.analyzeAudio(tempFile);
      
      const warnings: string[] = [];
      const errors: string[] = [];
      let qualityScore = 100;

      // Check duration (should be 3-10 seconds for voice cloning)
      if (analysis.duration < 3) {
        errors.push('Audio too short (minimum 3 seconds required)');
      } else if (analysis.duration > 30) {
        warnings.push('Audio longer than 30 seconds, using first 30 seconds');
        qualityScore -= 10;
      }

      // Check sample rate (prefer 22050Hz or 44100Hz)
      if (analysis.sample_rate < 16000) {
        errors.push('Sample rate too low (minimum 16kHz required)');
      } else if (analysis.sample_rate > 48000) {
        warnings.push('High sample rate may not improve quality');
        qualityScore -= 5;
      }

      // Check channels (prefer mono)
      if (analysis.channels > 1) {
        warnings.push('Mono audio preferred for voice cloning');
        qualityScore -= 5;
      }

      // Check audio quality (basic checks)
      if (analysis.rms_level < -40) {
        warnings.push('Audio may be too quiet');
        qualityScore -= 10;
      } else if (analysis.rms_level > -6) {
        warnings.push('Audio may be too loud');
        qualityScore -= 10;
      }

      // Check for silence
      if (analysis.silence_percentage > 30) {
        warnings.push('High percentage of silence detected');
        qualityScore -= 15;
      }

      const valid = errors.length === 0;

      return {
        valid,
        quality_score: Math.max(0, qualityScore),
        duration: analysis.duration,
        sample_rate: analysis.sample_rate,
        channels: analysis.channels,
        warnings,
        errors
      };

    } catch (error) {
      console.error('Audio validation error:', error);
      return {
        valid: false,
        quality_score: 0,
        duration: 0,
        sample_rate: 0,
        channels: 0,
        warnings: [],
        errors: ['Failed to analyze audio file']
      };
    } finally {
      // Cleanup temp file
      try {
        if (existsSync(tempFile)) {
          unlinkSync(tempFile);
        }
      } catch (error) {
        console.warn('Failed to cleanup temp file:', error);
      }
    }
  }

  /**
   * Analyze audio file using ffprobe
   */
  private async analyzeAudio(filePath: string): Promise<{
    duration: number;
    sample_rate: number;
    channels: number;
    rms_level: number;
    silence_percentage: number;
  }> {
    return new Promise((resolve, reject) => {
      const process = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ]);

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
          try {
            const data = JSON.parse(output);
            const audioStream = data.streams.find((s: any) => s.codec_type === 'audio');
            
            if (!audioStream) {
              reject(new Error('No audio stream found'));
              return;
            }

            const duration = parseFloat(data.format.duration) || 0;
            const sample_rate = parseInt(audioStream.sample_rate) || 0;
            const channels = parseInt(audioStream.channels) || 0;

            // Basic quality metrics (would need more sophisticated analysis in production)
            const rms_level = -20; // Placeholder
            const silence_percentage = 5; // Placeholder

            resolve({
              duration,
              sample_rate,
              channels,
              rms_level,
              silence_percentage
            });
          } catch (parseError) {
            reject(new Error('Failed to parse ffprobe output'));
          }
        } else {
          reject(new Error(`ffprobe failed: ${error}`));
        }
      });
    });
  }

  /**
   * Save voice audio file
   */
  private async saveVoiceAudio(tenantId: string, voiceId: string, audioBuffer: Buffer): Promise<string> {
    const tenantDir = join(this.voicesDir, tenantId);
    
    if (!existsSync(tenantDir)) {
      mkdirSync(tenantDir, { recursive: true });
    }

    const audioPath = join(tenantDir, `${voiceId}.wav`);
    require('fs').writeFileSync(audioPath, audioBuffer);

    return audioPath;
  }

  /**
   * Generate voice embedding using XTTS
   */
  private async generateVoiceEmbedding(audioPath: string, voiceId: string): Promise<string> {
    const embeddingDir = join(this.embeddingsDir, dirname(audioPath).split('/').pop() || '');
    
    if (!existsSync(embeddingDir)) {
      mkdirSync(embeddingDir, { recursive: true });
    }

    const embeddingPath = join(embeddingDir, `${voiceId}.npy`);

    // Generate embedding using XTTS
    const pythonScript = `
import numpy as np
import torch
import torchaudio
from TTS.api import TTS

def generate_voice_embedding(audio_path, output_path):
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
        
        # Load and preprocess audio
        audio, sample_rate = torchaudio.load(audio_path)
        
        # Convert to mono if stereo
        if audio.shape[0] > 1:
            audio = torch.mean(audio, dim=0, keepdim=True)
        
        # Resample to 22050 Hz if needed
        if sample_rate != 22050:
            audio = torchaudio.functional.resample(audio, sample_rate, 22050)
        
        # Generate embedding
        embedding = tts.synthesizer.tts_model.speaker_manager.compute_embedding_from_clip(audio.squeeze().numpy())
        
        # Save embedding
        np.save(output_path, embedding)
        
        print(f"Embedding saved to {output_path}")
        
    except Exception as e:
        print(f"Error generating embedding: {e}")
        raise

generate_voice_embedding("${audioPath}", "${embeddingPath}")
`;

    const tempScript = join(this.tempDir, `embedding_${Date.now()}.py`);
    require('fs').writeFileSync(tempScript, pythonScript);

    try {
      await new Promise((resolve, reject) => {
        const process = spawn('python3', [tempScript]);
        
        process.on('close', (code) => {
          if (code === 0) {
            resolve(undefined);
          } else {
            reject(new Error(`Embedding generation failed with code ${code}`));
          }
        });

        process.on('error', (error) => {
          reject(error);
        });
      });

      return embeddingPath;
    } finally {
      if (existsSync(tempScript)) {
        unlinkSync(tempScript);
      }
    }
  }

  /**
   * Generate unique voice ID
   */
  private generateVoiceId(tenantId: string, name: string): string {
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const timestamp = Date.now().toString(36);
    return `${tenantId}_${sanitizedName}_${timestamp}`;
  }

  /**
   * Cleanup voice files
   */
  private cleanupVoiceFiles(audioPath?: string, embeddingPath?: string): void {
    try {
      if (audioPath && existsSync(audioPath)) {
        unlinkSync(audioPath);
      }
      if (embeddingPath && existsSync(embeddingPath)) {
        unlinkSync(embeddingPath);
      }
    } catch (error) {
      console.warn('Failed to cleanup voice files:', error);
    }
  }
}

// Export singleton instance
export const voiceManager = new VoiceManager();
