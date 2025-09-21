# Callwaiting AI - Development Startup Script for Windows
Write-Host "🚀 Starting Callwaiting AI Development Environment" -ForegroundColor Blue

# Start API Server
Write-Host "Starting API Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd '$PWD\apps\api'; npm run dev" -WindowStyle Hidden

# Wait for API to start
Start-Sleep 3

# Start Frontend Server  
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; npm run dev" -WindowStyle Hidden

# Wait for both servers to initialize
Start-Sleep 5

Write-Host "✅ Development servers starting..." -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "API: http://localhost:8787" -ForegroundColor Cyan

# Test connectivity
Write-Host "Testing API connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8787/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ API Server responding" -ForegroundColor Green
} catch {
    Write-Host "❌ API Server not responding" -ForegroundColor Red
}

Write-Host "`n🎉 Ready for business user testing!" -ForegroundColor Green
Write-Host "Navigate to: http://localhost:5173" -ForegroundColor Cyan




