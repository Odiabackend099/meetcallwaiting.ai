// Script to verify that all necessary setup files are in place
const fs = require('fs');
const path = require('path');

console.log('Callwaiting AI - Setup Verification');
console.log('===================================');
console.log('');

const requiredFiles = [
  'schema.sql',
  'SUPABASE_SETUP.md',
  'SETUP_SUMMARY.md',
  'README.md',
  'apps/api/.env',
  'apps/api/src/utils/supabaseClient.ts',
  'apps/api/src/routes/merchants.ts'
];

const optionalFiles = [
  'start-api.js',
  'start-api.bat',
  'test-merchant-creation.js'
];

let allRequiredFilesPresent = true;

console.log('Checking required files:');
console.log('');

requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allRequiredFilesPresent = false;
  }
});

console.log('');
console.log('Checking optional files:');
console.log('');

optionalFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`⚠️  ${file} - Not found (optional)`);
  }
});

console.log('');
if (allRequiredFilesPresent) {
  console.log('✅ All required files are present!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Set up the Supabase database using the instructions in SUPABASE_SETUP.md');
  console.log('2. Start the API server: cd apps/api && npm run dev');
  console.log('3. Start the frontend: npm run dev');
  console.log('4. Test the setup: node test-merchant-creation.js');
} else {
  console.log('❌ Some required files are missing!');
  console.log('Please check the project structure and ensure all required files are present.');
}