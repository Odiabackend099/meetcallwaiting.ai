// @ts-nocheck
import { supabase } from './supabaseClient.js';

async function testSupabaseConnection() {
  try {
    // Test query to check if we can connect to the database
    const { data, error } = await supabase
      .from('merchants')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }

    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test failed with exception:', error);
    return false;
  }
}

// Run the test
testSupabaseConnection().then(success => {
  if (success) {
    console.log('✓ Supabase connection is working');
  } else {
    console.log('✗ Supabase connection failed');
  }
});

export { testSupabaseConnection };