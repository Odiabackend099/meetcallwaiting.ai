// Script to list all tables in the Supabase database
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://bpszfikedkkwlmptscgh.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3pmaWtlZGtrd2xtcHRzY2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4NTE3MywiZXhwIjoyMDczOTYxMTczfQ.neqRk9BhKn2SsixoLm5HuWTuNdOev-INKkUJX0_Bf0w';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function listTables() {
  console.log('=== Database Tables List ===');
  console.log('Supabase URL:', supabaseUrl);
  console.log('');

  try {
    // List all tables in the public schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      console.log('❌ Error listing tables:', error.message);
      return;
    }

    console.log('Tables in the database:');
    if (data && data.length > 0) {
      data.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    } else {
      console.log('  No tables found');
    }

    console.log('');
    
    // List custom types
    console.log('Custom types in the database:');
    try {
      const { data: typesData, error: typesError } = await supabase
        .from('pg_type')
        .select('typname')
        .neq('typtype', 'b') // Exclude built-in types
        .order('typname');

      if (typesError) {
        console.log('❌ Error listing custom types:', typesError.message);
      } else if (typesData && typesData.length > 0) {
        const customTypes = typesData.filter(type => 
          !type.typname.startsWith('_') && 
          !type.typname.startsWith('pg_') &&
          type.typname !== 'bool' &&
          type.typname !== 'bytea' &&
          type.typname !== 'char' &&
          type.typname !== 'date' &&
          type.typname !== 'float4' &&
          type.typname !== 'float8' &&
          type.typname !== 'int2' &&
          type.typname !== 'int4' &&
          type.typname !== 'int8' &&
          type.typname !== 'json' &&
          type.typname !== 'jsonb' &&
          type.typname !== 'numeric' &&
          type.typname !== 'oid' &&
          type.typname !== 'text' &&
          type.typname !== 'time' &&
          type.typname !== 'timestamp' &&
          type.typname !== 'timestamptz' &&
          type.typname !== 'varchar' &&
          type.typname !== 'uuid'
        );
        
        if (customTypes.length > 0) {
          customTypes.forEach(type => {
            console.log(`  - ${type.typname}`);
          });
        } else {
          console.log('  No custom types found');
        }
      }
    } catch (err) {
      console.log('❌ Error checking custom types:', err.message);
    }

  } catch (error) {
    console.log('❌ Error listing tables:', error.message);
  }
}

listTables();