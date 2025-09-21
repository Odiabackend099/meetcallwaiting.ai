const http = require('http');

function checkService(port, name) {
  const options = {
    hostname: 'localhost',
    port: port,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(`${name} on port ${port}: UP - Status ${res.statusCode}`);
      console.log(`Response: ${data}`);
    });
  });

  req.on('error', (error) => {
    console.log(`${name} on port ${port}: DOWN - ${error.message}`);
  });

  req.on('timeout', () => {
    console.log(`${name} on port ${port}: TIMEOUT`);
    req.destroy();
  });

  req.end();
}

console.log('Checking if services are running...');
checkService(8787, 'API Service');
checkService(8790, 'TTS Gateway');

// Give some time for responses
setTimeout(() => {
  console.log('Service check complete.');
}, 6000);