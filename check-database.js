// Script to check if the Supabase database tables exist
import { createClient } from '@supabase/supabase-js';

// Supabase configuration from your provided credentials
const supabaseUrl = 'https://bpszfikedkkwlmptscgh.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3pmaWtlZGtrd2xtcHRzY2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4NTE3MywiZXhwIjoyMDczOTYxMTczfQ.neqRk9BhKn2SsixoLm5HuWTuNdOev-INKkUJX0_Bf0w';

// Create a Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkDatabase() {
  console.log('Checking Supabase database connection...');
  console.log('URL:', supabaseUrl);
  console.log('');

  // Check if we can connect to the database by querying the merchants table
  try {
    console.log('1. Checking if merchants table exists...');
    const { data, error } = await supabase
      .from('merchants')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes(' merchants ') || error.message.includes('relation') || error.message.includes('table')) {
        console.log('❌ Merchants table does not exist');
        console.log('Error:', error.message);
        console.log('');
        console.log('You need to set up the database schema by:');
        console.log('1. Opening the schema.sql file');
        console.log('2. Copying its contents');
        console.log('3. Pasting it in the Supabase SQL Editor');
        console.log('4. Running the SQL statements');
      } else {
        console.log('❌ Error querying merchants table:', error.message);
      }
      return;
    }

    console.log('✅ Successfully connected to the database');
    console.log('✅ Merchants table exists');
    
    // Check other tables
    const tables = ['orders', 'appointments', 'consents', 'events', 'stripe_events'];
    
    for (const table of tables) {
      console.log(`\n2. Checking if ${table} table exists...`);
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
          
        if (error) {
          if (error.message.includes(table) || error.message.includes('relation') || error.message.includes('table')) {
            console.log(`❌ ${table} table does not exist`);
          } else {
            console.log(`❌ Error querying ${table} table:`, error.message);
          }
        } else {
          console.log(`✅ ${table} table exists`);
        }
      } catch (err) {
        console.log(`❌ Error checking ${table} table:`, err.message);
      }
    }
    
    console.log('\n3. Checking custom types...');
    try {
      // Try to query the custom types by using them in a query
      const { data, error } = await supabase
        .rpc('execute_sql', { 
          sql: `SELECT enumlabel FROM pg_enum WHERE enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'order_status'
          ) LIMIT 1;` 
        });
        
      if (error) {
        console.log('❌ Custom types may not exist:', error.message);
      } else {
        console.log('✅ Custom types exist');
      }
    } catch (err) {
      console.log('❌ Error checking custom types:', err.message);
    }
    
    console.log('\n✅ Database check completed');
    
  } catch (error) {
    console.log('❌ Failed to connect to the database:', error.message);
    console.log('');
    console.log('Please check your Supabase credentials and network connection.');
  }
}

checkDatabase();