// @ts-nocheck
import { supabase } from './supabaseClient.js';

// Function to log TTS usage events
export async function logTtsEvent(eventData: any): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert({
        type: 'tts_synthesis',
        payload: eventData,
        created_at: new Date()
      });

    if (error) {
      console.error('Error logging TTS event:', error);
      return false;
    }

    console.log('TTS event logged successfully');
    return true;
  } catch (error) {
    console.error('Error logging TTS event:', error);
    return false;
  }
}

// Function to get merchant settings for TTS configuration
export async function getMerchantTtsSettings(merchantId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('merchants')
      .select('settings, tts_engine, tts_voice')
      .eq('id', merchantId)
      .single();

    if (error) {
      console.error(`Error fetching merchant TTS settings for ${merchantId}:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching merchant TTS settings for ${merchantId}:`, error);
    return null;
  }
}