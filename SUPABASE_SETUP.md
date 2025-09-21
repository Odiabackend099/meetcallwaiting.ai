# Supabase Database Setup Guide

This guide will help you set up the Supabase database for your Callwaiting AI application.

## Prerequisites

1. Supabase account (you already have this)
2. Supabase project URL: `https://bpszfikedkkwlmptscgh.supabase.co`
3. Supabase Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3pmaWtlZGtrd2xtcHRzY2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4NTE3MywiZXhwIjoyMDczOTYxMTczfQ.neqRk9BhKn2SsixoLm5HuWTuNdOev-INKkUJX0_Bf0w`

## Step-by-Step Setup Instructions

### 1. Access Your Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in to your account
3. Select your project with URL: `https://bpszfikedkkwlmptscgh.supabase.co`

### 2. Navigate to the SQL Editor

1. In the left sidebar, click on "SQL Editor"
2. You'll see a code editor where you can run SQL queries

### 3. Create the Database Schema

1. Copy the entire contents of the `schema.sql` file in this project
2. Paste it into the SQL Editor
3. Click "Run" to execute all statements

This will create:
- All required tables: merchants, orders, appointments, consents, events, stripe_events
- Custom enum types: order_status, appt_status
- Triggers for automatic updated_at column updates
- Row Level Security (RLS) policies
- Necessary permissions

### 4. Verify the Setup

After running the SQL script, you should see:
1. All tables created successfully in the "Table Editor" section
2. Custom types available in the database
3. Triggers set up for automatic timestamp updates

### 5. Test the API Connection

Once the database is set up:
1. Start your API server: `npm run dev` in the `apps/api` directory
2. The API should now connect to the real database instead of using the mock implementation
3. Test merchant creation through the onboarding flow

## Troubleshooting

### If you see "Database not available, using mock implementation":

This message appears when the API cannot connect to the database. Check:

1. Ensure all SQL statements were executed successfully
2. Verify your `.env` file in `apps/api` has the correct credentials:
   ```
   SUPABASE_URL=https://bpszfikedkkwlmptscgh.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3pmaWtlZGtrd2xtcHRzY2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4NTE3MywiZXhwIjoyMDczOTYxMTczfQ.neqRk9BhKn2SsixoLm5HuWTuNdOev-INKkUJX0_Bf0w
   ```

3. Restart the API server after verifying credentials

### If you get permission errors:

The schema.sql file includes basic RLS policies. You may need to adjust these based on your security requirements. The current policies allow:
- All users to create and view merchants, orders, appointments, consents, and events
- These are basic policies for development and should be restricted in production

## Next Steps

1. After setting up the database, test the merchant creation flow
2. The API should automatically detect the database and use it instead of the mock implementation
3. You can verify this by checking the console logs when starting the API server