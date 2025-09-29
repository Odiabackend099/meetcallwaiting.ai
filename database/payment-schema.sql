-- Payment and Subscription Tables for CallWaiting.ai
-- Run this after the main schema.sql

-- Payment references table
CREATE TABLE IF NOT EXISTS payment_references (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tx_ref TEXT UNIQUE NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('starter', 'pro', 'premium', 'onetime')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    description TEXT,
    transaction_id TEXT,
    flutterwave_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('starter', 'pro', 'premium')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
    payment_reference TEXT,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TTS usage tracking
CREATE TABLE IF NOT EXISTS tts_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    text_length INTEGER NOT NULL,
    voice_used TEXT,
    language_used TEXT,
    duration_seconds DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp/SMS message logs
CREATE TABLE IF NOT EXISTS message_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('whatsapp', 'sms', 'email')),
    message_content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    external_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call logs with AI responses
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    call_sid TEXT,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT NOT NULL CHECK (status IN ('ringing', 'in-progress', 'completed', 'busy', 'no-answer', 'failed')),
    duration_seconds INTEGER,
    ai_response_type TEXT CHECK (ai_response_type IN ('greeting', 'appointment', 'order', 'hold', 'goodbye', 'error')),
    transcript TEXT,
    recording_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_references_user_id ON payment_references(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_references_tx_ref ON payment_references(tx_ref);
CREATE INDEX IF NOT EXISTS idx_payment_references_status ON payment_references(status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);

CREATE INDEX IF NOT EXISTS idx_tts_usage_user_id ON tts_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tts_usage_merchant_id ON tts_usage(merchant_id);
CREATE INDEX IF NOT EXISTS idx_tts_usage_created_at ON tts_usage(created_at);

CREATE INDEX IF NOT EXISTS idx_message_logs_merchant_id ON message_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_status ON message_logs(status);
CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON message_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_call_logs_merchant_id ON call_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_phone_number ON call_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);

-- RLS Policies for payment_references
ALTER TABLE payment_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment references" ON payment_references
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment references" ON payment_references
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment references" ON payment_references
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for tts_usage
ALTER TABLE tts_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own TTS usage" ON tts_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own TTS usage" ON tts_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for message_logs
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view their own message logs" ON message_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM merchants 
            WHERE merchants.id = message_logs.merchant_id 
            AND merchants.owner_id = auth.uid()
        )
    );

CREATE POLICY "Merchants can insert their own message logs" ON message_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM merchants 
            WHERE merchants.id = message_logs.merchant_id 
            AND merchants.owner_id = auth.uid()
        )
    );

-- RLS Policies for call_logs
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view their own call logs" ON call_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM merchants 
            WHERE merchants.id = call_logs.merchant_id 
            AND merchants.owner_id = auth.uid()
        )
    );

CREATE POLICY "Merchants can insert their own call logs" ON call_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM merchants 
            WHERE merchants.id = call_logs.merchant_id 
            AND merchants.owner_id = auth.uid()
        )
    );
