// Script to set up the Supabase database with the required schema
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://bpszfikedkkwlmptscgh.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3pmaWtlZGtrd2xtcHRzY2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4NTE3MywiZXhwIjoyMDczOTYxMTczfQ.neqRk9BhKn2SsixoLm5HuWTuNdOev-INKkUJX0_Bf0w';

// Create a Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

console.log('Callwaiting AI - Supabase Database Setup');
console.log('========================================');
console.log('');
console.log('IMPORTANT: Direct SQL execution through the client is not possible.');
console.log('Please follow these steps to set up your database:');
console.log('');
console.log('1. Open the schema.sql file in this project');
console.log('2. Copy its entire contents');
console.log('3. Go to your Supabase dashboard at https://app.supabase.com/project/bpszfikedkkwlmptscgh');
console.log('4. Navigate to SQL Editor in the left sidebar');
console.log('5. Paste the schema.sql contents into the editor');
console.log('6. Click "Run" to execute all statements');
console.log('');
console.log('This will create all required tables and set up the database properly.');
console.log('');
console.log('After setting up the database:');
console.log('1. Restart your API server');
console.log('2. The API will automatically detect the database and use it instead of the mock implementation');
console.log('');
console.log('For detailed instructions, please refer to the SUPABASE_SETUP.md file.');

// Schema statements to execute
const schemaStatements = [
  `create type if not exists order_status as enum ('pending_payment','paid','failed')`,
  `create type if not exists appt_status as enum ('proposed','confirmed','cancelled')`,
  `create table if not exists merchants (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    industry text not null,
    country text not null,
    timezone text not null,
    currency text not null,
    website text,
    owner_phone text,
    billing_email text,
    sender_email text,
    appointment_provider text,
    calendly_link text,
    google_calendar_id text,
    number_assigned text,
    settings jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`,
  `create table if not exists orders (
    id uuid primary key default gen_random_uuid(),
    merchant_id uuid references merchants(id) on delete cascade,
    customer_phone text,
    items jsonb default '[]'::jsonb,
    total numeric(12,2),
    currency text,
    payment_link_id text,
    payment_link_url text,
    status order_status not null default 'pending_payment',
    paid_at timestamptz,
    recording_url text,
    transcript text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`,
  `create table if not exists appointments (
    id uuid primary key default gen_random_uuid(),
    merchant_id uuid references merchants(id) on delete cascade,
    customer_phone text,
    service text,
    starts_at timestamptz,
    ends_at timestamptz,
    location text,
    status appt_status not null default 'proposed',
    provider_ref text,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`,
  `create table if not exists consents (
    id uuid primary key default gen_random_uuid(),
    merchant_id uuid references merchants(id) on delete cascade,
    channel text check (channel in ('sms','whatsapp','email')),
    target text not null,
    source text check (source in ('ivr','web')) not null,
    ts timestamptz default now()
  )`,
  `create table if not exists events (
    id uuid primary key default gen_random_uuid(),
    type text not null,
    ref_id text,
    request_id text,
    payload jsonb,
    created_at timestamptz default now()
  )`,
  `create table if not exists stripe_events (
    event_id text primary key,
    type text not null,
    order_id uuid,
    received_at timestamptz default now()
  )`
];

console.log('Setting up database schema...');

// Execute each statement
async function setupDatabase() {
  for (let i = 0; i < schemaStatements.length; i++) {
    const statement = schemaStatements[i];
    console.log(`Executing statement ${i + 1}/${schemaStatements.length}:`, statement.substring(0, 50) + '...');
    
    try {
      // Execute the SQL statement
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // If the exec_sql function doesn't exist, try a different approach
        console.log('Warning: exec_sql function not available, skipping statement execution');
        console.log('In a production environment, you would need to execute these statements through the Supabase SQL editor');
        break;
      }
      
      console.log('Success!');
    } catch (error) {
      console.error('Error executing statement:', error.message);
    }
  }
  
  console.log('Database setup simulation complete!');
  console.log('In a real implementation, you would need to:');
  console.log('1. Go to your Supabase dashboard at https://app.supabase.com/project/bpszfikedkkwlmptscgh');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Paste and run the schema.sql file contents');
  console.log('4. The tables will then be created in your database');
}

// Run the setup
setupDatabase().catch(console.error);