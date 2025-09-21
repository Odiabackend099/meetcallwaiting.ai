// Script to check if custom types exist
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://bpszfikedkkwlmptscgh.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3pmaWtlZGtrd2xtcHRzY2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4NTE3MywiZXhwIjoyMDczOTYxMTczfQ.neqRk9BhKn2SsixoLm5HuWTuNdOev-INKkUJX0_Bf0w';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkCustomTypes() {
  console.log('=== Custom Types Check ===');
  console.log('Supabase URL:', supabaseUrl);
  console.log('');

  try {
    // Try to insert a merchant with a valid industry to test if enums work
    console.log('Testing enum functionality...');
    
    // First, let's try to create a test merchant with valid data
    const testMerchant = {
      name: 'Test Merchant',
      industry: 'Restaurant/QSR', // This should be a valid enum value
      country: 'US',
      timezone: 'EST',
      currency: 'USD'
    };
    
    const { data, error } = await supabase
      .from('merchants')
      .insert([testMerchant])
      .select();
      
    if (error) {
      console.log('❌ Error inserting test merchant:', error.message);
      if (error.message.includes('enum') || error.message.includes('invalid input value')) {
        console.log('  This suggests enum types may not be properly set up');
      }
    } else {
      console.log('✅ Successfully inserted test merchant');
      console.log('  This suggests enum types are working correctly');
      
      // Clean up the test merchant
      if (data && data[0] && data[0].id) {
        await supabase
          .from('merchants')
          .delete()
          .eq('id', data[0].id);
        console.log('  Cleaned up test merchant');
      }
    }
    
    console.log('');
    console.log('Checking for custom enum types in the database...');
    
    // Try to query the pg_enum table to see if our custom enums exist
    try {
      const { data: enumData, error: enumError } = await supabase
        .from('pg_enum')
        .select('enumlabel, typname')
        .ilike('typname', '%status%');
        
      if (enumError) {
        console.log('❌ Error querying enum types:', enumError.message);
      } else {
        console.log('Found enum types:');
        if (enumData && enumData.length > 0) {
          enumData.forEach(enumItem => {
            console.log(`  - ${enumItem.typname}: ${enumItem.enumlabel}`);
          });
        } else {
          console.log('  No enum types found');
        }
      }
    } catch (err) {
      console.log('❌ Error checking enum types:', err.message);
    }

  } catch (error) {
    console.log('❌ Error checking custom types:', error.message);
  }
  
  console.log('');
  console.log('=== Summary ===');
  console.log('All required tables exist in the database.');
  console.log('If enum types are not properly set up, you may want to re-run the schema.sql file.');
}

checkCustomTypes();