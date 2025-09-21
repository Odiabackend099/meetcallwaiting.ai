@echo off
cls
echo ==========================================
echo CALLWAITING.AI - GUARANTEED STARTUP SCRIPT
echo ==========================================
echo.

echo [1/5] Setting up environment...
set PATH=%PATH%;C:\Program Files\nodejs
echo PATH updated to include Node.js

echo.
echo [2/3] Verifying Node.js installation...
"C:\Program Files\nodejs\node.exe" --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found at C:\Program Files\nodejs
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo [1/5] Verifying npm installation...
"C:\Program Files\nodejs\npm.cmd" --version
if %errorlevel% neq 0 (
    echo ERROR: npm not found at C:\Program Files\nodejs
    pause
    exit /b 1
)

echo.
echo [2/5] Checking for conflicting processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8787') do (
    echo Killing process on port 8787 with PID %%a
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8790') do (
    echo Killing process on port 8790 with PID %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo [3/5] Ensuring .env files exist...
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
echo [4/5] Starting TTS Gateway service...
cd /d "c:\Users\user1\Desktop\meetcallwaitingai-TTS\apps\tts-gateway"
start "TTS Gateway" /D "c:\Users\user1\Desktop\meetcallwaitingai-TTS\apps\tts-gateway" "C:\Program Files\nodejs\npm.cmd" run dev

echo.
echo [5/5] Starting API service...
cd /d "c:\Users\user1\Desktop\meetcallwaitingai-TTS\apps\api"
start "API Service" /D "c:\Users\user1\Desktop\meetcallwaitingai-TTS\apps\api" "C:\Program Files\nodejs\npm.cmd" run dev

echo.
echo ==========================================
echo SERVICES STARTUP COMPLETE
echo ==========================================
echo API Service: http://localhost:8787
echo TTS Gateway: http://localhost:8790
echo.
echo Press any key to exit...
pause >nul