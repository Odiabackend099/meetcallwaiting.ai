/**
 * Supabase Configuration
 * Database client initialization with Nigerian network optimizations
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file');
    process.exit(1);
}

// Create Supabase client with Nigerian network optimizations
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false, // Server-side doesn't need session persistence
        autoRefreshToken: false
    },
    global: {
        headers: {
            'X-Client-Info': 'callwaiting-api/1.0.0'
        }
    },
    db: {
        schema: 'public'
    },
    realtime: {
        params: {
            eventsPerSecond: 2 // Limit realtime events for Nigerian networks
        }
    }
});

// Test database connection
async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
            
        if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is ok for testing
            throw error;
        }
        
        console.log('✅ Supabase connection established');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection failed:', error.message);
        return false;
    }
}

// Nigerian network retry wrapper
async function retryWithBackoff(operation, maxRetries = 3) {
    const delays = [250, 500, 1000]; // Progressive delays for Nigerian networks
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries - 1) {
                throw error; // Last attempt failed
            }
            
            // Check if error is retryable
            if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || 
                error.message?.includes('timeout') || error.message?.includes('network')) {
                
                const delay = delays[attempt] || 1000;
                console.warn(`⚠️ Database operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            throw error; // Non-retryable error
        }
    }
}

// Enhanced Supabase client with retry logic
const enhancedSupabase = {
    ...supabase,
    
    // Wrap common operations with retry logic
    from: (table) => {
        const originalFrom = supabase.from(table);
        
        return {
            ...originalFrom,
            
            select: (columns = '*') => {
                const query = originalFrom.select(columns);
                return {
                    ...query,
                    single: () => retryWithBackoff(() => query.single()),
                    maybeSingle: () => retryWithBackoff(() => query.maybeSingle()),
                    then: (resolve, reject) => retryWithBackoff(() => query).then(resolve, reject)
                };
            },
            
            insert: (data) => {
                const query = originalFrom.insert(data);
                return {
                    ...query,
                    select: (columns = '*') => retryWithBackoff(() => query.select(columns)),
                    then: (resolve, reject) => retryWithBackoff(() => query).then(resolve, reject)
                };
            },
            
            update: (data) => {
                const query = originalFrom.update(data);
                return {
                    ...query,
                    select: (columns = '*') => retryWithBackoff(() => query.select(columns)),
                    then: (resolve, reject) => retryWithBackoff(() => query).then(resolve, reject)
                };
            },
            
            delete: () => {
                const query = originalFrom.delete();
                return {
                    ...query,
                    select: (columns = '*') => retryWithBackoff(() => query.select(columns)),
                    then: (resolve, reject) => retryWithBackoff(() => query).then(resolve, reject)
                };
            }
        };
    }
};

module.exports = {
    supabase: enhancedSupabase,
    testConnection,
    retryWithBackoff
};
