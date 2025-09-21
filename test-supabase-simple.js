// Simple test script to verify Supabase connection
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
    
    // Simple test - get the Supabase status
    const { data, error } = await supabase.rpc('version');
    
    // If RPC fails, try a simple select from information_schema
    if (error) {
      console.log('RPC failed, trying information_schema query...');
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);
      
      if (schemaError) {
        console.error('Supabase connection test failed:', schemaError);
        return false;
      }
      
      console.log('Supabase connection test successful!');
      console.log('Schema query successful, found tables');
      return true;
    }
    
    console.log('Supabase connection test successful!');
    console.log('Database version:', data);
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