-- TTS Gateway Database Schema
-- Production-grade schema for multi-tenant TTS service

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TENANT CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE tenant_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    
    -- Rate limiting configuration
    rate_limit JSONB NOT NULL DEFAULT '{
        "requests_per_minute": 100,
        "requests_per_hour": 5000,
        "requests_per_day": 50000
    }',
    
    -- Voice settings
    voice_settings JSONB NOT NULL DEFAULT '{
        "default_voice_id": "en-US-generic",
        "allowed_voice_ids": ["en-US-generic", "en-US-male", "en-US-female"],
        "max_voice_uploads": 10
    }',
    
    -- Feature flags
    features JSONB NOT NULL DEFAULT '{
        "streaming": true,
        "ssml": true,
        "voice_cloning": true,
        "custom_models": false
    }',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tenant_configs
CREATE INDEX idx_tenant_configs_tenant_id ON tenant_configs(tenant_id);
CREATE INDEX idx_tenant_configs_api_key ON tenant_configs(api_key);
CREATE INDEX idx_tenant_configs_active ON tenant_configs(active);

-- ============================================================================
-- VOICE PROFILES TABLE
-- ============================================================================

CREATE TABLE voice_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    voice_id VARCHAR(255) NOT NULL,
    
    -- Voice characteristics
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    gender VARCHAR(20),
    age_range VARCHAR(50),
    accent VARCHAR(100),
    
    -- File paths
    reference_audio_path TEXT NOT NULL,
    embedding_path TEXT,
    
    -- Quality metrics
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, voice_id),
    FOREIGN KEY (tenant_id) REFERENCES tenant_configs(tenant_id) ON DELETE CASCADE
);

-- Indexes for voice_profiles
CREATE INDEX idx_voice_profiles_tenant_id ON voice_profiles(tenant_id);
CREATE INDEX idx_voice_profiles_voice_id ON voice_profiles(voice_id);
CREATE INDEX idx_voice_profiles_active ON voice_profiles(active);
CREATE INDEX idx_voice_profiles_language ON voice_profiles(language);
CREATE INDEX idx_voice_profiles_quality ON voice_profiles(quality_score);

-- ============================================================================
-- USAGE LOGS TABLE
-- ============================================================================

CREATE TABLE tts_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) NOT NULL,
    
    -- Request details
    text TEXT NOT NULL,
    voice_id VARCHAR(255),
    engine VARCHAR(50) NOT NULL DEFAULT 'xtts',
    endpoint VARCHAR(50) NOT NULL,
    
    -- Response details
    success BOOLEAN NOT NULL,
    latency_ms INTEGER,
    audio_duration FLOAT,
    audio_size INTEGER,
    error_message TEXT,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    FOREIGN KEY (tenant_id) REFERENCES tenant_configs(tenant_id) ON DELETE CASCADE
);

-- Indexes for tts_usage_logs
CREATE INDEX idx_tts_usage_logs_tenant_id ON tts_usage_logs(tenant_id);
CREATE INDEX idx_tts_usage_logs_created_at ON tts_usage_logs(created_at);
CREATE INDEX idx_tts_usage_logs_success ON tts_usage_logs(success);
CREATE INDEX idx_tts_usage_logs_engine ON tts_usage_logs(engine);
CREATE INDEX idx_tts_usage_logs_endpoint ON tts_usage_logs(endpoint);

-- Partitioning for usage logs (monthly partitions)
-- This helps with performance for large datasets
CREATE INDEX idx_tts_usage_logs_tenant_date ON tts_usage_logs(tenant_id, created_at);

-- ============================================================================
-- STREAMING SESSIONS TABLE
-- ============================================================================

CREATE TABLE streaming_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    
    -- Session details
    text TEXT NOT NULL,
    voice_id VARCHAR(255),
    options JSONB DEFAULT '{}',
    
    -- Session state
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, completed, failed, cancelled
    chunks_sent INTEGER DEFAULT 0,
    total_chunks INTEGER,
    
    -- Performance metrics
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    first_chunk_latency_ms INTEGER,
    total_duration_ms INTEGER,
    
    -- Error information
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    FOREIGN KEY (tenant_id) REFERENCES tenant_configs(tenant_id) ON DELETE CASCADE
);

-- Indexes for streaming_sessions
CREATE INDEX idx_streaming_sessions_session_id ON streaming_sessions(session_id);
CREATE INDEX idx_streaming_sessions_tenant_id ON streaming_sessions(tenant_id);
CREATE INDEX idx_streaming_sessions_status ON streaming_sessions(status);
CREATE INDEX idx_streaming_sessions_created_at ON streaming_sessions(created_at);

-- ============================================================================
-- AUDIO CACHE TABLE
-- ============================================================================

CREATE TABLE audio_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    
    -- Cache details
    text_hash VARCHAR(64) NOT NULL,
    voice_id VARCHAR(255),
    options_hash VARCHAR(64) NOT NULL,
    
    -- Audio data
    audio_path TEXT NOT NULL,
    audio_size INTEGER NOT NULL,
    audio_duration FLOAT NOT NULL,
    audio_format VARCHAR(10) NOT NULL,
    
    -- Cache metadata
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Constraints
    FOREIGN KEY (tenant_id) REFERENCES tenant_configs(tenant_id) ON DELETE CASCADE
);

-- Indexes for audio_cache
CREATE INDEX idx_audio_cache_cache_key ON audio_cache(cache_key);
CREATE INDEX idx_audio_cache_tenant_id ON audio_cache(tenant_id);
CREATE INDEX idx_audio_cache_text_hash ON audio_cache(text_hash);
CREATE INDEX idx_audio_cache_expires_at ON audio_cache(expires_at);
CREATE INDEX idx_audio_cache_last_accessed ON audio_cache(last_accessed);

-- ============================================================================
-- SYSTEM METRICS TABLE
-- ============================================================================

CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Metric details
    metric_name VARCHAR(100) NOT NULL,
    metric_value FLOAT NOT NULL,
    metric_unit VARCHAR(20),
    
    -- Context
    context JSONB DEFAULT '{}',
    
    -- Timestamps
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for system_metrics
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_recorded_at ON system_metrics(recorded_at);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_tenant_configs_updated_at 
    BEFORE UPDATE ON tenant_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_profiles_updated_at 
    BEFORE UPDATE ON voice_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streaming_sessions_updated_at 
    BEFORE UPDATE ON streaming_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audio_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant usage statistics
CREATE OR REPLACE FUNCTION get_tenant_usage_stats(
    p_tenant_id VARCHAR(255),
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    total_audio_duration FLOAT,
    average_latency FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_requests,
        COUNT(*) FILTER (WHERE success = true)::BIGINT as successful_requests,
        COUNT(*) FILTER (WHERE success = false)::BIGINT as failed_requests,
        COALESCE(SUM(audio_duration) FILTER (WHERE success = true), 0) as total_audio_duration,
        COALESCE(AVG(latency_ms) FILTER (WHERE success = true), 0) as average_latency
    FROM tts_usage_logs
    WHERE tenant_id = p_tenant_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tenant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_cache ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for application access)
CREATE POLICY "Service role can access all data" ON tenant_configs
    FOR ALL USING (true);

CREATE POLICY "Service role can access all data" ON voice_profiles
    FOR ALL USING (true);

CREATE POLICY "Service role can access all data" ON tts_usage_logs
    FOR ALL USING (true);

CREATE POLICY "Service role can access all data" ON streaming_sessions
    FOR ALL USING (true);

CREATE POLICY "Service role can access all data" ON audio_cache
    FOR ALL USING (true);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default tenant configuration for testing
INSERT INTO tenant_configs (tenant_id, api_key, rate_limit, voice_settings, features)
VALUES (
    'test-tenant',
    'tts_test_1234567890abcdef1234567890abcdef',
    '{
        "requests_per_minute": 200,
        "requests_per_hour": 10000,
        "requests_per_day": 100000
    }',
    '{
        "default_voice_id": "en-US-generic",
        "allowed_voice_ids": ["en-US-generic", "en-US-male", "en-US-female", "custom-voice"],
        "max_voice_uploads": 20
    }',
    '{
        "streaming": true,
        "ssml": true,
        "voice_cloning": true,
        "custom_models": true
    }'
) ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Tenant usage summary view
CREATE VIEW tenant_usage_summary AS
SELECT 
    tc.tenant_id,
    tc.created_at as tenant_created,
    COUNT(DISTINCT vp.id) as custom_voices_count,
    COUNT(tul.id) as total_requests,
    COUNT(tul.id) FILTER (WHERE tul.success = true) as successful_requests,
    COUNT(tul.id) FILTER (WHERE tul.success = false) as failed_requests,
    COALESCE(SUM(tul.audio_duration) FILTER (WHERE tul.success = true), 0) as total_audio_duration,
    COALESCE(AVG(tul.latency_ms) FILTER (WHERE tul.success = true), 0) as avg_latency_ms,
    MAX(tul.created_at) as last_request_at
FROM tenant_configs tc
LEFT JOIN voice_profiles vp ON tc.tenant_id = vp.tenant_id AND vp.active = true
LEFT JOIN tts_usage_logs tul ON tc.tenant_id = tul.tenant_id
WHERE tc.active = true
GROUP BY tc.tenant_id, tc.created_at;

-- System health view
CREATE VIEW system_health_summary AS
SELECT 
    DATE_TRUNC('hour', recorded_at) as hour,
    metric_name,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    COUNT(*) as sample_count
FROM system_metrics
WHERE recorded_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', recorded_at), metric_name
ORDER BY hour DESC, metric_name;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE tenant_configs IS 'Configuration and settings for each tenant';
COMMENT ON TABLE voice_profiles IS 'Custom voice profiles uploaded by tenants';
COMMENT ON TABLE tts_usage_logs IS 'Log of all TTS requests for analytics and billing';
COMMENT ON TABLE streaming_sessions IS 'Active streaming sessions for real-time audio';
COMMENT ON TABLE audio_cache IS 'Cached audio files for performance optimization';
COMMENT ON TABLE system_metrics IS 'System performance and health metrics';

COMMENT ON COLUMN tenant_configs.rate_limit IS 'Rate limiting configuration in JSON format';
COMMENT ON COLUMN tenant_configs.voice_settings IS 'Voice-related settings and permissions';
COMMENT ON COLUMN tenant_configs.features IS 'Feature flags for tenant capabilities';
COMMENT ON COLUMN voice_profiles.quality_score IS 'Audio quality score from 0-100';
COMMENT ON COLUMN tts_usage_logs.latency_ms IS 'Request latency in milliseconds';
COMMENT ON COLUMN streaming_sessions.status IS 'Session status: active, completed, failed, cancelled';

-- ============================================================================
-- MAINTENANCE PROCEDURES
-- ============================================================================

-- Procedure to clean up old data
CREATE OR REPLACE FUNCTION maintenance_cleanup()
RETURNS TABLE (
    table_name TEXT,
    deleted_rows INTEGER
) AS $$
DECLARE
    usage_logs_deleted INTEGER;
    cache_deleted INTEGER;
    sessions_deleted INTEGER;
    metrics_deleted INTEGER;
BEGIN
    -- Clean up old usage logs (keep 90 days)
    DELETE FROM tts_usage_logs WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS usage_logs_deleted = ROW_COUNT;
    
    -- Clean up expired cache
    SELECT cleanup_expired_cache() INTO cache_deleted;
    
    -- Clean up old streaming sessions (keep 7 days)
    DELETE FROM streaming_sessions WHERE created_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS sessions_deleted = ROW_COUNT;
    
    -- Clean up old metrics (keep 30 days)
    DELETE FROM system_metrics WHERE recorded_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS metrics_deleted = ROW_COUNT;
    
    RETURN QUERY VALUES 
        ('tts_usage_logs', usage_logs_deleted),
        ('audio_cache', cache_deleted),
        ('streaming_sessions', sessions_deleted),
        ('system_metrics', metrics_deleted);
END;
$$ LANGUAGE plpgsql;
