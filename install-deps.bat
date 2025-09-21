@echo off
echo Installing dependencies for API service...
cd apps\api
"C:\Program Files\nodejs\npm.cmd" install
if %errorlevel% neq 0 (
    echo Error installing API dependencies
    exit /b %errorlevel%
)
echo API dependencies installed successfully!

echo Installing dependencies for TTS Gateway service...
cd ..\tts-gateway
"C:\Program Files\nodejs\npm.cmd" install
if %errorlevel% neq 0 (
    echo Error installing TTS Gateway dependencies
    exit /b %errorlevel%
)
echo TTS Gateway dependencies installed successfully!

echo All dependencies installed!