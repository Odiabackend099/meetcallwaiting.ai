# Callwaiting AI - Reliable Windows Startup Script
# For Business Users - One-Click Start

param(
    [switch]$CleanStart = $false
)

Write-Host "🚀 CALLWAITING AI - STARTUP SCRIPT" -ForegroundColor Blue
Write-Host "=================================" -ForegroundColor Blue

# Function to safely stop existing processes
function Stop-ExistingProcesses {
    Write-Host "🛑 Stopping existing Node.js processes..." -ForegroundColor Yellow
    try {
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep 2
        Write-Host "✅ Existing processes stopped" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ No existing processes to stop" -ForegroundColor Yellow
    }
}

# Function to check if port is available
function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return -not $connection
    } catch {
        return $true
    }
}

# Function to wait for service to be ready
function Wait-ForService {
    param([string]$Url, [string]$ServiceName, [int]$TimeoutSeconds = 30)
    
    Write-Host "⏳ Waiting for $ServiceName to start..." -ForegroundColor Yellow
    $attempts = 0
    $maxAttempts = $TimeoutSeconds
    
    while ($attempts -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $ServiceName is ready!" -ForegroundColor Green
                return $true
            }
        } catch {
            # Service not ready yet
        }
        
        Start-Sleep 1
        $attempts++
        Write-Host "." -NoNewline -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "❌ $ServiceName failed to start within $TimeoutSeconds seconds" -ForegroundColor Red
    return $false
}

# Main startup sequence
try {
    # Step 1: Clean start if requested
    if ($CleanStart) {
        Stop-ExistingProcesses
    }
    
    # Step 2: Check current directory
    $currentDir = Get-Location
    Write-Host "📂 Working directory: $currentDir" -ForegroundColor Cyan
    
    # Step 3: Verify API directory exists
    if (-not (Test-Path "apps\api\src\simple-server.js")) {
        Write-Host "❌ API server file not found: apps\api\src\simple-server.js" -ForegroundColor Red
        Write-Host "Please run this script from the project root directory" -ForegroundColor Red
        exit 1
    }
    
    # Step 4: Install dependencies if needed
    Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        npm install | Out-Null
    }
    
    if (-not (Test-Path "apps\api\node_modules")) {
        Write-Host "Installing API dependencies..." -ForegroundColor Yellow
        Push-Location "apps\api"
        npm install | Out-Null
        Pop-Location
    }
    
    # Step 5: Check port availability
    if (-not (Test-Port 8787)) {
        Write-Host "❌ Port 8787 is already in use" -ForegroundColor Red
        Write-Host "Run with -CleanStart to stop existing processes" -ForegroundColor Yellow
        exit 1
    }
    
    if (-not (Test-Port 3000)) {
        Write-Host "⚠️ Port 3000 is in use, will try alternative port" -ForegroundColor Yellow
    }
    
    # Step 6: Start API Server
    Write-Host "🔧 Starting API Server (port 8787)..." -ForegroundColor Green
    $apiProcess = Start-Process -FilePath "node" -ArgumentList "apps\api\src\simple-server.js" -PassThru -WindowStyle Hidden
    
    # Wait for API to be ready
    if (-not (Wait-ForService "http://localhost:8787/health" "API Server" 15)) {
        Write-Host "❌ Failed to start API server" -ForegroundColor Red
        $apiProcess | Stop-Process -Force -ErrorAction SilentlyContinue
        exit 1
    }
    
    # Step 7: Start Frontend Server
    Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Green
    $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden
    
    # Wait a moment for frontend to start
    Start-Sleep 5
    
    # Step 8: Test connectivity and determine frontend URL
    $frontendUrl = $null
    $portsToTry = @(3000, 3001, 3002, 3003, 3004, 3005)
    
    foreach ($port in $portsToTry) {
        try {
            $testUrl = "http://localhost:$port"
            $response = Invoke-WebRequest -Uri $testUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $frontendUrl = $testUrl
                break
            }
        } catch {
            # Try next port
        }
    }
    
    # Step 9: Display results
    Write-Host ""
    Write-Host "🎉 CALLWAITING AI STARTUP COMPLETE!" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
    
    if ($frontendUrl) {
        Write-Host "🌐 Frontend URL: $frontendUrl" -ForegroundColor Cyan
        Write-Host "🔧 API URL: http://localhost:8787" -ForegroundColor Cyan
        Write-Host "📊 Health Check: http://localhost:8787/health" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "🏢 BUSINESS USER LINKS:" -ForegroundColor Blue
        Write-Host "• Onboarding: $frontendUrl/onboarding.html" -ForegroundColor White
        Write-Host "• Dashboard: $frontendUrl/business-dashboard.html" -ForegroundColor White
        Write-Host "• Test Suite: $frontendUrl/production-ready-test.html" -ForegroundColor White
        Write-Host ""
        Write-Host "✅ Ready for business user testing!" -ForegroundColor Green
        
        # Optional: Open browser
        $openBrowser = Read-Host "Would you like to open the browser? (y/n)"
        if ($openBrowser -eq 'y' -or $openBrowser -eq 'Y') {
            Start-Process $frontendUrl
        }
        
    } else {
        Write-Host "⚠️ Frontend server may still be starting..." -ForegroundColor Yellow
        Write-Host "Check these URLs manually:" -ForegroundColor Yellow
        foreach ($port in $portsToTry) {
            Write-Host "• http://localhost:$port" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "📝 Process IDs for monitoring:" -ForegroundColor Gray
    Write-Host "• API Server PID: $($apiProcess.Id)" -ForegroundColor Gray
    Write-Host "• Frontend Server PID: $($frontendProcess.Id)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🛑 To stop all services, run: Get-Process node | Stop-Process -Force" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Startup failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Try running with -CleanStart parameter" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎯 Next Steps for Business Users:" -ForegroundColor Blue
Write-Host "1. Visit the onboarding page to create your business account" -ForegroundColor White
Write-Host "2. Complete the setup wizard to get your AI phone number" -ForegroundColor White
Write-Host "3. Test the AI by calling your assigned number" -ForegroundColor White
Write-Host "4. Access the dashboard to monitor your business" -ForegroundColor White
Write-Host "5. Use the test suite to verify all functionality" -ForegroundColor White




