@echo off
cls
echo ==========================================
echo CALLWAITING.AI - FINAL STARTUP SCRIPT
echo ==========================================
echo.

echo [1/6] Setting up environment...
set PATH=%PATH%;C:\Program Files\nodejs
echo PATH updated to include Node.js

echo.
echo [2/6] Verifying Node.js installation...
"C:\Program Files\nodejs\node.exe" --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found at C:\Program Files\nodejs
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo [3/6] Verifying npm installation...
"C:\Program Files\nodejs\npm.cmd" --version
if %errorlevel% neq 0 (
    echo ERROR: npm not found at C:\Program Files\nodejs
    pause
    exit /b 1
)

echo.
echo [4/6] Checking for conflicting processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8787') do (
    echo Killing process on port 8787 with PID %%a
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8790') do (
    echo Killing process on port 8790 with PID %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo [5/6] Ensuring .env files exist...
cd /d "c:\Users\user1\Desktop\meetcallwaitingai-TTS\apps\api"
if not exist ".env" (
    echo Creating .env file for API service
    copy .env.example .env >nul
)

cd /d "c:\Users\user1\Desktop\meetcallwaitingai-TTS\apps\tts-gateway"
if not exist ".env" (
    echo Creating .env file for TTS Gateway service
    copy .env.example .env >nul
)

echo.
echo [6/6] Starting services...
echo.
echo Starting TTS Gateway service on port 8790...
cd /d "c:\Users\user1\Desktop\meetcallwaitingai-TTS\apps\tts-gateway"
start "TTS Gateway" /MIN cmd /c ""C:\Program Files\nodejs\npm.cmd" run dev > ..\..\tts-gateway.log 2>&1"

timeout /t 5 /nobreak >nul

echo Starting API service on port 8787...
cd /d "c:\Users\user1\Desktop\meetcallwaitingai-TTS\apps\api"
start "API Service" /MIN cmd /c ""C:\Program Files\nodejs\npm.cmd" run dev > ..\..\api.log 2>&1"

echo.
echo ==========================================
echo SERVICES STARTUP INITIATED
echo ==========================================
echo API Service: http://localhost:8787
echo TTS Gateway: http://localhost:8790
echo Logs are being written to api.log and tts-gateway.log
echo.
echo Waiting 10 seconds for services to start...
timeout /t 10 /nobreak >nul

echo.
echo Testing services...
cd /d "c:\Users\user1\Desktop\meetcallwaitingai-TTS"
echo Testing API service...
curl -s http://localhost:8787/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] API service is responding
) else (
    echo [ERROR] API service is not responding
)

echo Testing TTS Gateway service...
curl -s http://localhost:8790/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] TTS Gateway service is responding
) else (
    echo [ERROR] TTS Gateway service is not responding
)

echo.
echo To stop services, use Task Manager to end node.exe processes
echo Or run the STOP-SERVICES.bat script if available
echo.
echo Press any key to exit...
pause >nul