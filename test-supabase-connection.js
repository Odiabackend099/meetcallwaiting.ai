// Test script to verify Supabase connection
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://bpszfikedkkwlmptscgh.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3pmaWtlZGtrd2xtcHRzY2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4NTE3MywiZXhwIjoyMDczOTYxMTczfQ.neqRk9BhKn2SsixoLm5HuWTuNdOev-INKkUJX0_Bf0w';

console.log('Testing Supabase connection...');
console.log('Supabase URL:', supabaseUrl);

// Create a single supabase client for interacting with the database
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testConnection() {
  try {
    console.log('Attempting to connect to Supabase...');
    
    // Test query to check if we can connect to the database
    const { data, error } = await supabase
      .from('merchants')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }

    console.log('Supabase connection test successful!');
    console.log('Data received:', data);
    return true;
  } catch (error) {
    console.error('Supabase connection test failed with exception:', error);
    return false;
  }
}

// Run the test
testConnection().then(success => {
  if (success) {
    console.log('✓ Supabase connection is working');
  } else {
    console.log('✗ Supabase connection failed');
  }
  process.exit(success ? 0 : 1);
});