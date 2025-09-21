// Frontend Static File Server
// Serves business user HTML pages directly

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS for API calls
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Serve static files from project root
app.use(express.static(__dirname, {
  extensions: ['html', 'htm'],
  index: ['index.html', 'production-ready-test.html']
}));

// Serve specific business pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'production-ready-test.html'));
});

app.get('/onboarding.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'onboarding.html'));
});

app.get('/business-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'business-dashboard.html'));
});

app.get('/production-ready-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'production-ready-test.html'));
});

app.get('/business-user-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'business-user-test.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    server: 'frontend',
    timestamp: new Date().toISOString() 
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Page not found',
    availablePages: [
      '/production-ready-test.html',
      '/business-dashboard.html', 
      '/onboarding.html',
      '/business-user-test.html'
    ]
  });
});

const PORT = process.env.FRONTEND_PORT || 3000;

app.listen(PORT, () => {
  console.log('🎨 FRONTEND SERVER STARTED');
  console.log('============================');
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🏢 Business Pages Available:`);
  console.log(`   • Production Test: http://localhost:${PORT}/production-ready-test.html`);
  console.log(`   • Business Dashboard: http://localhost:${PORT}/business-dashboard.html`);
  console.log(`   • Onboarding: http://localhost:${PORT}/onboarding.html`);
  console.log(`   • User Test: http://localhost:${PORT}/business-user-test.html`);
  console.log('============================');
});

export default app;



