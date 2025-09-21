# Callwaiting AI - Final Setup Instructions

Congratulations! You've successfully set up the frontend and API structure for Callwaiting AI. Now it's time to complete the backend database setup to make everything work together.

## Current Status

✅ Frontend implementation complete
✅ API server structure in place
✅ All necessary files created
✅ Mock implementation working for testing

## Next Steps - Database Setup

To complete the setup and connect the frontend to the real backend database, follow these steps:

### 1. Set Up Supabase Database

1. Open the [schema.sql](schema.sql) file in your project
2. Copy its entire contents
3. Go to your Supabase dashboard at https://app.supabase.com/project/bpszfikedkkwlmptscgh
4. Navigate to SQL Editor in the left sidebar
5. Paste the schema.sql contents into the editor
6. Click "Run" to execute all statements

This will create all required tables:
- merchants
- orders
- appointments
- consents
- events
- stripe_events

And custom types:
- order_status
- appt_status

### 2. Verify Database Setup

After running the SQL script:
1. Go to the "Table Editor" section in your Supabase dashboard
2. Confirm that all tables have been created
3. Check that the custom types appear in the database

### 3. Start the API Server

1. Open a new terminal
2. Navigate to the API directory:
   ```
   cd apps/api
   ```
3. Install dependencies (if not already done):
   ```
   npm install
   ```
4. Start the API server:
   ```
   npm run dev
   ```
5. Check the console logs for:
   ```
   ✅ Database connection successful
   ```

### 4. Test the Integration

1. With the API server running, open another terminal
2. Run the test script:
   ```
   node test-merchant-creation.js
   ```
3. You should see:
   ```
   ✅ Merchant creation successful!
   Merchant created successfully
   ```
   (Without the "mock implementation" message)

### 5. Start the Frontend

1. Open a new terminal in the project root
2. Start the frontend development server:
   ```
   npm run dev
   ```
3. Open your browser to `http://localhost:3000`

### 6. Test the Full Flow

1. Navigate to the onboarding page
2. Complete the merchant creation form
3. Check your Supabase dashboard to confirm the merchant was created in the database

## Troubleshooting

### If you see "⚠️ Database not available, using mock implementation":

1. Verify your Supabase credentials in `apps/api/.env`:
   ```
   SUPABASE_URL=https://bpszfikedkkwlmptscgh.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3pmaWtlZGtrd2xtcHRzY2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4NTE3MywiZXhwIjoyMDczOTYxMTczfQ.neqRk9BhKn2SsixoLm5HuWTuNdOev-INKkUJX0_Bf0w
   ```

2. Ensure all SQL statements were executed successfully in the Supabase SQL Editor

3. Restart the API server after making changes

### If you have connection issues:

1. Check your internet connection
2. Verify the Supabase project URL is correct
3. Confirm the Service Role Key hasn't expired

## Production Deployment

When you're ready to deploy to production:

1. Update the environment variables in your deployment platform (Vercel, etc.)
2. Use a production Supabase instance
3. Set up proper Row Level Security (RLS) policies
4. Configure domain settings and SSL certificates

## Need Help?

If you encounter any issues:

1. Check the detailed instructions in [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
2. Review the setup summary in [SETUP_SUMMARY.md](SETUP_SUMMARY.md)
3. Run the verification script: `node verify-setup.js`

You're now ready to complete the Callwaiting AI setup and have a fully functional application with real database integration!