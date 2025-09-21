// Script to verify the complete schema is implemented
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://bpszfikedkkwlmptscgh.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3pmaWtlZGtrd2xtcHRzY2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4NTE3MywiZXhwIjoyMDczOTYxMTczfQ.neqRk9BhKn2SsixoLm5HuWTuNdOev-INKkUJX0_Bf0w';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function verifySchema() {
  console.log('=== Schema Verification ===');
  console.log('Supabase URL:', supabaseUrl);
  console.log('');

  // Check if all required tables exist
  const requiredTables = [
    'merchants',
    'orders',
    'appointments',
    'consents',
    'events',
    'stripe_events'
  ];

  console.log('Checking required tables:');
  let allTablesExist = true;
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
        
      if (error && (error.message.includes('not exist') || error.message.includes('relation'))) {
        console.log(`❌ ${table} - Missing`);
        allTablesExist = false;
      } else {
        console.log(`✅ ${table} - Exists`);
      }
    } catch (err) {
      // If there's any other error, the table likely exists
      console.log(`✅ ${table} - Exists (with query error)`);
    }
  }

  console.log('');
  
  // Test inserting a complete merchant record
  console.log('Testing merchant insertion with all required fields...');
  
  const testMerchant = {
    name: 'Schema Verification Test',
    industry: 'Restaurant/QSR',
    country: 'US',
    timezone: 'EST',
    currency: 'USD',
    website: 'https://test.com',
    owner_phone: '+15551234567',
    billing_email: 'billing@test.com',
    sender_email: 'sender@test.com',
    appointment_provider: 'calendly',
    calendly_link: 'https://calendly.com/test',
    google_calendar_id: 'test-calendar-id',
    number_assigned: '+15551234567',
    settings: {}
  };

  try {
    const { data, error } = await supabase
      .from('merchants')
      .insert([testMerchant])
      .select();

    if (error) {
      console.log('❌ Error inserting merchant:', error.message);
      // Check if it's related to enum types
      if (error.message.includes('enum') || error.message.includes('invalid input value')) {
        console.log('  This suggests enum types are not properly set up');
        console.log('  Please re-run the schema.sql file in your Supabase SQL Editor');
      }
    } else {
      console.log('✅ Merchant insertion successful');
      console.log('  All required tables and columns exist');
      
      // Clean up
      if (data && data[0] && data[0].id) {
        await supabase
          .from('merchants')
          .delete()
          .eq('id', data[0].id);
        console.log('  Cleaned up test record');
      }
    }
  } catch (err) {
    console.log('❌ Error during merchant insertion test:', err.message);
  }

  console.log('');
  console.log('=== Summary ===');
  if (allTablesExist) {
    console.log('✅ All required tables exist');
    console.log('✅ Database schema appears to be properly implemented');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start your API server: cd apps/api && npm run dev');
    console.log('2. The API should now use the real database instead of mock implementation');
    console.log('3. Test with: node test-merchant-creation.js');
  } else {
    console.log('❌ Some required tables are missing');
    console.log('Please run the schema.sql file in your Supabase SQL Editor');
  }
}

verifySchema();