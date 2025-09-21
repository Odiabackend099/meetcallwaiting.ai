// Test script to verify local setup
const http = require('http');

// Test URLs
const urls = [
  '/',
  '/onboarding.html',
  '/demo.html',
  '/dashboard.html'
];

console.log('Testing local setup...');

// Test each URL
urls.forEach(url => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: url,
    method: 'GET'
  };

  const req = http.request(options, res => {
    console.log(`Testing ${url}: Status Code: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log(`✅ ${url} is accessible`);
    } else {
      console.log(`❌ ${url} returned status ${res.statusCode}`);
    }
  });

  req.on('error', error => {
    console.log(`❌ ${url} is not accessible: ${error.message}`);
  });

  req.end();
});