@echo off
echo Callwaiting AI - API Server Start Script
echo ========================================
echo.
echo This script will start the API server on port 8787.
echo.

REM Check if we're in the correct directory
if not exist "apps\api" (
    echo ❌ Error: This script must be run from the root project directory.
    echo Please navigate to the project root and run this script.
    echo.
    pause
    exit /b 1
)

echo Starting API server...
echo Navigate to the apps/api directory and run: npm run dev
echo.

echo To start the API server manually:
echo 1. Open a new terminal
echo 2. Navigate to the apps/api directory: cd apps/api
echo 3. Install dependencies if not already done: npm install
echo 4. Start the server: npm run dev
echo.
echo The API server will be available at: http://localhost:8787
echo.
pause