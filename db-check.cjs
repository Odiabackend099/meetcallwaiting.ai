// Comprehensive database check script (CommonJS version)
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://bpszfikedkkwlmptscgh.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3pmaWtlZGtrd2xtcHRzY2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4NTE3MywiZXhwIjoyMDczOTYxMTczfQ.neqRk9BhKn2SsixoLm5HuWTuNdOev-INKkUJX0_Bf0w';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkAllTables() {
  console.log('=== Comprehensive Database Check ===');
  console.log('Supabase URL:', supabaseUrl);
  console.log('');

  // Test database connection first
  try {
    const { data, error } = await supabase
      .from('merchants')
      .select('id')
      .limit(1);

    if (error) {
      console.log('❌ Database connection failed:', error.message);
      return;
    }

    console.log('✅ Database connection successful');
    console.log('');

    // Check all required tables
    const tables = [
      { name: 'merchants', required: true },
      { name: 'orders', required: true },
      { name: 'appointments', required: true },
      { name: 'consents', required: true },
      { name: 'events', required: true },
      { name: 'stripe_events', required: true }
    ];

    console.log('Checking tables:');
    let allTablesExist = true;

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table.name)
          .select('id')
          .limit(1);

        if (error) {
          if (error.message.includes(table.name) || error.message.includes('relation') || error.message.includes('table')) {
            console.log(`❌ ${table.name} table does not exist`);
            if (table.required) {
              allTablesExist = false;
            }
          } else {
            console.log(`⚠️  ${table.name} table exists but has query error:`, error.message);
          }
        } else {
          console.log(`✅ ${table.name} table exists`);
        }
      } catch (err) {
        console.log(`❌ Error checking ${table.name} table:`, err.message);
        if (table.required) {
          allTablesExist = false;
        }
      }
    }

    console.log('');
    
    // Check custom types
    console.log('Checking custom types:');
    try {
      // Check if order_status enum exists
      const { data: orderStatusData, error: orderStatusError } = await supabase
        .rpc('execute_sql', { 
          sql: `SELECT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'order_status'
          );` 
        });

      if (orderStatusError) {
        console.log('❌ order_status type check failed:', orderStatusError.message);
      } else if (orderStatusData && orderStatusData.length > 0 && orderStatusData[0].exists) {
        console.log('✅ order_status type exists');
      } else {
        console.log('❌ order_status type does not exist');
      }
    } catch (err) {
      console.log('❌ Error checking order_status type:', err.message);
    }

    try {
      // Check if appt_status enum exists
      const { data: apptStatusData, error: apptStatusError } = await supabase
        .rpc('execute_sql', { 
          sql: `SELECT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'appt_status'
          );` 
        });

      if (apptStatusError) {
        console.log('❌ appt_status type check failed:', apptStatusError.message);
      } else if (apptStatusData && apptStatusData.length > 0 && apptStatusData[0].exists) {
        console.log('✅ appt_status type exists');
      } else {
        console.log('❌ appt_status type does not exist');
      }
    } catch (err) {
      console.log('❌ Error checking appt_status type:', err.message);
    }

    console.log('');
    
    if (allTablesExist) {
      console.log('🎉 All required tables exist! Database setup is complete.');
      console.log('');
      console.log('Next steps:');
      console.log('1. Start your API server: cd apps/api && npm run dev');
      console.log('2. The API should now use the real database instead of mock implementation');
      console.log('3. Test with: node test-merchant-creation.js');
    } else {
      console.log('⚠️  Some required tables are missing.');
      console.log('Please run the schema.sql file in your Supabase SQL Editor.');
    }

  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }
}

checkAllTables();