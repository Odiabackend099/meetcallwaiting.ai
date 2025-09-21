// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('Initializing Supabase client...');
console.log('Supabase URL:', supabaseUrl);

// Check if credentials are provided
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('⚠️  Supabase credentials not found in environment variables');
  console.warn('⚠️  The application will use mock implementations for database operations');
}

// Create a single supabase client for interacting with the database
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Supabase client initialized');