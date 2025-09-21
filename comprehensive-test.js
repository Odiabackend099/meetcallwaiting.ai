// Comprehensive test script for callwaiting.ai services
import http from 'http';

// Function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Test API service endpoints
async function testApiService() {
  console.log('=== Testing API Service ===');
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: 8787,
      path: '/health',
      method: 'GET'
    });
    console.log('Health check:', healthResponse.statusCode === 200 ? 'PASS' : 'FAIL', healthResponse.data);
    
    // Test IVR main menu
    console.log('\n2. Testing IVR main menu...');
    const ivrResponse = await makeRequest({
      hostname: 'localhost',
      port: 8787,
      path: '/ivr/handle',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      path: 'main_menu'
    }));
    console.log('IVR main menu:', ivrResponse.statusCode === 200 ? 'PASS' : 'FAIL', ivrResponse.data);
    
    // Test TTS Gateway endpoints
    console.log('\n=== Testing TTS Gateway ===');
    
    // Test health endpoint
    console.log('\n3. Testing TTS Gateway health...');
    const ttsHealthResponse = await makeRequest({
      hostname: 'localhost',
      port: 8790,
      path: '/health',
      method: 'GET'
    });
    console.log('TTS Gateway health:', ttsHealthResponse.statusCode === 200 ? 'PASS' : 'FAIL', ttsHealthResponse.data);
    
    // Test engines endpoint
    console.log('\n4. Testing TTS engines...');
    const enginesResponse = await makeRequest({
      hostname: 'localhost',
      port: 8790,
      path: '/v1/tts:engines',
      method: 'GET'
    });
    console.log('TTS engines:', enginesResponse.statusCode === 200 ? 'PASS' : 'FAIL', enginesResponse.data);
    
    // Test synthesis endpoint
    console.log('\n5. Testing TTS synthesis...');
    const synthResponse = await makeRequest({
      hostname: 'localhost',
      port: 8790,
      path: '/v1/tts:synthesize',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      text: 'Hello from callwaiting.ai',
      voice_id: 'en-US-generic',
      engine: 'piper'
    }));
    console.log('TTS synthesis:', synthResponse.statusCode === 200 ? 'PASS' : 'FAIL', synthResponse.data ? 'Audio generated' : 'No audio');
    
    console.log('\n=== All tests completed ===');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the tests
testApiService();