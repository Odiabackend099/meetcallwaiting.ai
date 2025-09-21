// Test script to verify preview server is working
const http = require('http');

console.log('Testing preview server accessibility...');

const options = {
  hostname: 'localhost',
  port: 4173,
  path: '/',
  method: 'GET'
};

const req = http.request(options, res => {
  console.log(`Status Code: ${res.statusCode}`);
  if (res.statusCode === 200) {
    console.log('✅ Preview server is accessible');
    console.log('You can now open http://localhost:4173 in your browser to view the built website');
  } else {
    console.log(`❌ Preview server returned status ${res.statusCode}`);
  }
});

req.on('error', error => {
  console.log(`❌ Preview server is not accessible: ${error.message}`);
  console.log('Please make sure the preview server is running with "npm run preview"');
});

req.end();