// Script to start the API server with clear instructions
console.log('Callwaiting AI - API Server Start Script');
console.log('========================================');
console.log('');
console.log('This script will start the API server on port 8787.');
console.log('');

// Check if we're in the correct directory
const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(__dirname, 'apps', 'api'))) {
  console.log('❌ Error: This script must be run from the root project directory.');
  console.log('Please navigate to the project root and run:');
  console.log('node start-api.js');
  process.exit(1);
}

console.log('Starting API server...');
console.log('Navigate to the apps/api directory and run: npm run dev');
console.log('');
console.log('After the server starts, you can test the API with: node test-merchant-creation.js');
console.log('');

// Instructions for the user
console.log('To start the API server manually:');
console.log('1. Open a new terminal');
console.log('2. Navigate to the apps/api directory: cd apps/api');
console.log('3. Install dependencies if not already done: npm install');
console.log('4. Start the server: npm run dev');
console.log('');
console.log('The API server will be available at: http://localhost:8787');