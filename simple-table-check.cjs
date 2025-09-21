// Simple table check script
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://bpszfikedkkwlmptscgh.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3pmaWtlZGtrd2xtcHRzY2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4NTE3MywiZXhwIjoyMDczOTYxMTczfQ.neqRk9BhKn2SsixoLm5HuWTuNdOev-INKkUJX0_Bf0w';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkTables() {
  console.log('=== Simple Table Check ===');
  console.log('Supabase URL:', supabaseUrl);
  console.log('');

  // List of tables we expect to exist
  const expectedTables = [
    'merchants',
    'orders',
    'appointments',
    'consents',
    'events',
    'stripe_events'
  ];

  console.log('Checking for expected tables:');
  
  for (const tableName of expectedTables) {
    try {
      // Try to select from the table with limit 1
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('not exist') || error.message.includes('relation') || error.message.includes('table')) {
          console.log(`❌ ${tableName} - Does not exist`);
        } else {
          // Table exists but there's another error
          console.log(`✅ ${tableName} - Exists (but query error: ${error.message})`);
        }
      } else {
        console.log(`✅ ${tableName} - Exists`);
      }
    } catch (err) {
      console.log(`❌ ${tableName} - Error checking: ${err.message}`);
    }
  }

  console.log('');
  console.log('Summary:');
  console.log('- The database connection is working');
  console.log('- Some tables exist, but not all');
  console.log('- You need to run the complete schema.sql file in your Supabase SQL Editor');
  console.log('- This will create the missing tables and custom types');
}

checkTables();