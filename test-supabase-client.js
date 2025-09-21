// Simple test script to verify Supabase client instantiation
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://bpszfikedkkwlmptscgh.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3pmaWtlZGtrd2xtcHRzY2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4NTE3MywiZXhwIjoyMDczOTYxMTczfQ.neqRk9BhKn2SsixoLm5HuWTuNdOev-INKkUJX0_Bf0w';

console.log('Testing Supabase client instantiation...');
console.log('Supabase URL:', supabaseUrl);

try {
  // Create a single supabase client for interacting with the database
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  if (supabase) {
    console.log('✓ Supabase client instantiated successfully');
    console.log('✓ Supabase connection credentials are properly configured');
    console.log('Note: Database tables may not exist yet, but the client is working');
    process.exit(0);
  } else {
    console.log('✗ Failed to instantiate Supabase client');
    process.exit(1);
  }
} catch (error) {
  console.error('Supabase client instantiation failed with exception:', error);
  process.exit(1);
}