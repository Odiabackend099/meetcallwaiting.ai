-- Row Level Security (RLS) Policies for Callwaiting AI
-- This file contains all the security policies to ensure data isolation

-- Enable RLS on all tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Create a function to get the current user's merchant_id
CREATE OR REPLACE FUNCTION auth.merchant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'merchant_id',
    current_setting('request.jwt.claims', true)::json->>'sub'
  )::uuid;
$$;

-- Merchants table policies
-- Users can only access their own merchant record
CREATE POLICY "Users can view own merchant" ON merchants
  FOR SELECT USING (auth.merchant_id() = id);

CREATE POLICY "Users can update own merchant" ON merchants
  FOR UPDATE USING (auth.merchant_id() = id);

CREATE POLICY "Users can insert own merchant" ON merchants
  FOR INSERT WITH CHECK (auth.merchant_id() = id);

-- Orders table policies
-- Users can only access orders for their merchant
CREATE POLICY "Users can view own merchant orders" ON orders
  FOR SELECT USING (auth.merchant_id() = merchant_id);

CREATE POLICY "Users can create orders for own merchant" ON orders
  FOR INSERT WITH CHECK (auth.merchant_id() = merchant_id);

CREATE POLICY "Users can update own merchant orders" ON orders
  FOR UPDATE USING (auth.merchant_id() = merchant_id);

-- Appointments table policies
-- Users can only access appointments for their merchant
CREATE POLICY "Users can view own merchant appointments" ON appointments
  FOR SELECT USING (auth.merchant_id() = merchant_id);

CREATE POLICY "Users can create appointments for own merchant" ON appointments
  FOR INSERT WITH CHECK (auth.merchant_id() = merchant_id);

CREATE POLICY "Users can update own merchant appointments" ON appointments
  FOR UPDATE USING (auth.merchant_id() = merchant_id);

-- Consents table policies
-- Users can only access consents for their merchant
CREATE POLICY "Users can view own merchant consents" ON consents
  FOR SELECT USING (auth.merchant_id() = merchant_id);

CREATE POLICY "Users can create consents for own merchant" ON consents
  FOR INSERT WITH CHECK (auth.merchant_id() = merchant_id);

-- Events table policies
-- Users can only access events related to their merchant
CREATE POLICY "Users can view own merchant events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id::text = events.ref_id 
      AND o.merchant_id = auth.merchant_id()
    ) OR
    EXISTS (
      SELECT 1 FROM appointments a 
      WHERE a.id::text = events.ref_id 
      AND a.merchant_id = auth.merchant_id()
    ) OR
    EXISTS (
      SELECT 1 FROM merchants m 
      WHERE m.id::text = events.ref_id 
      AND m.id = auth.merchant_id()
    )
  );

CREATE POLICY "Users can create events for own merchant" ON events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id::text = events.ref_id 
      AND o.merchant_id = auth.merchant_id()
    ) OR
    EXISTS (
      SELECT 1 FROM appointments a 
      WHERE a.id::text = events.ref_id 
      AND a.merchant_id = auth.merchant_id()
    ) OR
    EXISTS (
      SELECT 1 FROM merchants m 
      WHERE m.id::text = events.ref_id 
      AND m.id = auth.merchant_id()
    )
  );

-- Stripe events table policies
-- Users can only access stripe events for their merchant's orders
CREATE POLICY "Users can view own merchant stripe events" ON stripe_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = stripe_events.order_id 
      AND o.merchant_id = auth.merchant_id()
    )
  );

CREATE POLICY "Users can create stripe events for own merchant" ON stripe_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = stripe_events.order_id 
      AND o.merchant_id = auth.merchant_id()
    )
  );

-- Service role policies (for backend operations)
-- These policies allow the service role to bypass RLS for system operations
CREATE POLICY "Service role can access all merchants" ON merchants
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all appointments" ON appointments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all consents" ON consents
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all events" ON events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all stripe events" ON stripe_events
  FOR ALL USING (auth.role() = 'service_role');

-- Webhook policies (for webhook endpoints)
-- These policies allow webhook operations without user authentication
CREATE POLICY "Webhook can access orders" ON orders
  FOR UPDATE USING (true);

CREATE POLICY "Webhook can access appointments" ON appointments
  FOR UPDATE USING (true);

CREATE POLICY "Webhook can create events" ON events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Webhook can create stripe events" ON stripe_events
  FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT EXECUTE ON FUNCTION auth.merchant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.merchant_id() TO service_role;
