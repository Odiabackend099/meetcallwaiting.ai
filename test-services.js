// Test script to check if services are running
import http from 'http';

// Test API service
const apiOptions = {
  hostname: 'localhost',
  port: 8787,
  path: '/health',
  method: 'GET'
};

console.log('Testing API service at http://localhost:8787/health...');

const apiReq = http.request(apiOptions, apiRes => {
  let apiData = '';
  apiRes.on('data', chunk => {
    apiData += chunk;
  });
  apiRes.on('end', () => {
    console.log('API Service Response:', apiData);
  });
});

apiReq.on('error', error => {
  console.error('API Service Error:', error.message);
});

apiReq.end();

// Test TTS Gateway service
const ttsOptions = {
  hostname: 'localhost',
  port: 8790,
  path: '/health',
  method: 'GET'
};

console.log('Testing TTS Gateway service at http://localhost:8790/health...');

const ttsReq = http.request(ttsOptions, ttsRes => {
  let ttsData = '';
  ttsRes.on('data', chunk => {
    ttsData += chunk;
  });
  ttsRes.on('end', () => {
    console.log('TTS Gateway Response:', ttsData);
  });
});

ttsReq.on('error', error => {
  console.error('TTS Gateway Error:', error.message);
});

ttsReq.end();