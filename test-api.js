// Test script to verify API connectivity
const http = require('http');

console.log('Testing API connectivity...');

// Test health endpoint
const healthOptions = {
  hostname: 'localhost',
  port: 8787,
  path: '/health',
  method: 'GET'
};

const healthReq = http.request(healthOptions, res => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Health Check Status Code: ${res.statusCode}`);
    console.log(`Health Check Response: ${data}`);
  });
});

healthReq.on('error', error => {
  console.log(`Health Check Error: ${error.message}`);
});

healthReq.end();

// Test merchant creation
const merchantData = JSON.stringify({
  name: 'Test Business',
  industry: 'Restaurant/QSR',
  country: 'US',
  timezone: 'EST',
  currency: 'USD'
});

const merchantOptions = {
  hostname: 'localhost',
  port: 8787,
  path: '/merchants/create',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': merchantData.length
  }
};

const merchantReq = http.request(merchantOptions, res => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Merchant Creation Status Code: ${res.statusCode}`);
    console.log(`Merchant Creation Response: ${data}`);
  });
});

merchantReq.on('error', error => {
  console.log(`Merchant Creation Error: ${error.message}`);
});

merchantReq.write(merchantData);
merchantReq.end();