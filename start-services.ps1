# PowerShell script to start both services
Write-Host "Starting callwaiting.ai services..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: npm is not available" -ForegroundColor Red
    exit 1
}

Write-Host "Starting API service..." -ForegroundColor Yellow
Set-Location apps\api
Start-Process -NoNewWindow -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory (Get-Location)

Write-Host "Starting TTS Gateway service..." -ForegroundColor Yellow
Set-Location ..\tts-gateway
Start-Process -NoNewWindow -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory (Get-Location)

Write-Host "Services started successfully!" -ForegroundColor Green
Write-Host "API Service running on http://localhost:8787" -ForegroundColor Cyan
Write-Host "TTS Gateway running on http://localhost:8790" -ForegroundColor Cyan
Write-Host "Use Ctrl+C to stop the services" -ForegroundColor Yellow
