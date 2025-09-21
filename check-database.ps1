# PowerShell script to check if the Supabase database tables exist
Write-Host "Checking Supabase database connection..."
Write-Host "URL: https://bpszfikedkkwlmptscgh.supabase.co"
Write-Host ""

# Check if we can connect to the database by querying the merchants table
try {
    Write-Host "1. Checking if merchants table exists..."
    
    # Use node to run the check
    $result = node -e "
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            'https://bpszfikedkkwlmptscgh.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3pmaWtlZGtrd2xtcHRzY2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM4NTE3MywiZXhwIjoyMDczOTYxMTczfQ.neqRk9BhKn2SsixoLm5HuWTuNdOev-INKkUJX0_Bf0w'
        );
        supabase.from('merchants').select('id').limit(1).then(({ data, error }) => {
            if (error) {
                if (error.message.includes('merchants') || error.message.includes('relation') || error.message.includes('table')) {
                    console.log('❌ Merchants table does not exist');
                    console.log('Error:', error.message);
                } else {
                    console.log('❌ Error querying merchants table:', error.message);
                }
            } else {
                console.log('✅ Successfully connected to the database');
                console.log('✅ Merchants table exists');
            }
        }).catch(err => {
            console.log('❌ Failed to connect to the database:', err.message);
        });
    "
    
    Write-Host $result
} catch {
    Write-Host "❌ Failed to check database: $($_.Exception.Message)"
}