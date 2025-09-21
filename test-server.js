// Test script to verify server is working
const http = require('http');

console.log('Testing server accessibility...');

const options = {
  hostname: 'localhost',
  port: 3001, // Updated to match the actual port
  path: '/index.html',
  method: 'GET'
};

const req = http.request(options, res => {
  console.log(`Status Code: ${res.statusCode}`);
  if (res.statusCode === 200) {
    console.log('✅ Server is accessible');
    console.log('You can now open http://localhost:3001 in your browser to view the website');
  } else {
    console.log(`❌ Server returned status ${res.statusCode}`);
  }
});

req.on('error', error => {
  console.log(`❌ Server is not accessible: ${error.message}`);
  console.log('Please make sure the development server is running with "npm run dev"');
});

req.end();