// Test script to verify merchant creation API
const http = require('http');

console.log('Callwaiting AI - Merchant Creation Test');
console.log('========================================');
console.log('');
console.log('This script tests the merchant creation API endpoint.');
console.log('Make sure the API server is running on port 8787 before running this test.');
console.log('');

// Test merchant data
const merchantData = {
  name: 'Test Business',
  industry: 'Restaurant/QSR',
  country: 'US',
  timezone: 'EST',
  currency: 'USD',
  website: 'https://testbusiness.com',
  owner_phone: '+15551234567',
  billing_email: 'billing@testbusiness.com'
};

const postData = JSON.stringify(merchantData);

const options = {
  hostname: 'localhost',
  port: 8787,
  path: '/merchants/create',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Sending test merchant data...');
console.log('Test Data:', merchantData);
console.log('');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response: ${data}`);
    
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 201) {
        console.log('✅ Merchant creation successful!');
        console.log('Merchant ID:', response.merchant.id);
        console.log('Message:', response.message);
        console.log('');
        console.log('If you see "(mock implementation)" in the message, the API is using in-memory storage.');
        console.log('If you see "Merchant created successfully" without mock, the API is connected to the database.');
      } else {
        console.log('❌ Merchant creation failed');
        if (response.error) {
          console.log('Error:', response.error);
        }
      }
    } catch (parseError) {
      console.log('Error parsing response:', parseError.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Error connecting to API server:', error.message);
  console.log('');
  console.log('Please make sure the API server is running:');
  console.log('1. Open a new terminal');
  console.log('2. Navigate to the apps/api directory');
  console.log('3. Run: npm run dev');
});

req.write(postData);
req.end();