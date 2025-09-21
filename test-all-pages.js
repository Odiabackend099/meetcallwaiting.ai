// Test script to verify all pages are accessible
const http = require('http');

// Test URLs
const urls = [
  '/index.html',
  '/onboarding.html',
  '/demo.html',
  '/dashboard.html'
];

let completedTests = 0;
const totalTests = urls.length;

console.log('Testing all pages...');

// Test each URL
urls.forEach(url => {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: url,
    method: 'GET'
  };

  const req = http.request(options, res => {
    completedTests++;
    console.log(`Testing ${url}: Status Code: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log(`✅ ${url} is accessible`);
    } else {
      console.log(`❌ ${url} returned status ${res.statusCode}`);
    }
    
    // Check if all tests are completed
    if (completedTests === totalTests) {
      console.log('\n🎉 All tests completed!');
      console.log('You can now open http://localhost:3001 in your browser to view the website');
      console.log('Navigation:');
      console.log('  - Landing Page: http://localhost:3001/index.html');
      console.log('  - Onboarding: http://localhost:3001/onboarding.html');
      console.log('  - Demo: http://localhost:3001/demo.html');
      console.log('  - Dashboard: http://localhost:3001/dashboard.html');
    }
  });

  req.on('error', error => {
    completedTests++;
    console.log(`❌ ${url} is not accessible: ${error.message}`);
    
    // Check if all tests are completed
    if (completedTests === totalTests) {
      console.log('\n🎉 All tests completed!');
      console.log('You can now open http://localhost:3001 in your browser to view the website');
      console.log('Navigation:');
      console.log('  - Landing Page: http://localhost:3001/index.html');
      console.log('  - Onboarding: http://localhost:3001/onboarding.html');
      console.log('  - Demo: http://localhost:3001/demo.html');
      console.log('  - Dashboard: http://localhost:3001/dashboard.html');
    }
  });

  req.end();
});