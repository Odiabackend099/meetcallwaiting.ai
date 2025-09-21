@echo off
REM Callwaiting AI - Simple Windows Startup (Batch Version)
REM For Business Users - Double-click to start

echo.
echo ================================================
echo    CALLWAITING AI - BUSINESS USER STARTUP
echo ================================================
echo.

REM Check if we're in the right directory
if not exist "apps\api\src\simple-server.js" (
    echo ERROR: Please run this from the project root directory
    echo Expected file: apps\api\src\simple-server.js
    pause
    exit /b 1
)

REM Stop existing Node processes
echo Stopping existing processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

REM Start API Server
echo Starting API Server...
start /B "API Server" node apps\api\src\simple-server.js

REM Wait for API to start
echo Waiting for API server to start...
timeout /t 5 >nul

REM Test API connectivity
echo Testing API connectivity...
curl -s http://localhost:8787/health >nul
if %errorlevel% equ 0 (
    echo ✅ API Server is running!
) else (
    echo ⚠️ API Server may still be starting...
)

REM Start Frontend Server
echo Starting Frontend Server...
start /B "Frontend Server" npm run dev

REM Wait for frontend
echo Waiting for frontend to start...
timeout /t 8 >nul

echo.
echo ================================================
echo    CALLWAITING AI IS STARTING UP!
echo ================================================
echo.
echo 🌐 Try these URLs in your browser:
echo • http://localhost:3000 (most likely)
echo • http://localhost:3001 (backup)
echo • http://localhost:3002 (backup)
echo.
echo 🔧 API Server: http://localhost:8787
echo 📊 Health Check: http://localhost:8787/health
echo.
echo 🏢 BUSINESS USER PAGES:
echo • Onboarding: /onboarding.html
echo • Dashboard: /business-dashboard.html  
echo • Test Suite: /production-ready-test.html
echo.
echo Press any key to open your browser...
pause >nul
start http://localhost:3000




