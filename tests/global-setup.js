// Global setup for Playwright tests
import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  // Wait for services to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Check API health
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8787';
  let apiReady = false;
  let attempts = 0;
  const maxAttempts = 30;
  
  console.log('⏳ Waiting for API to be ready...');
  while (!apiReady && attempts < maxAttempts) {
    try {
      const response = await page.goto(`${apiBaseUrl}/health`);
      if (response.status() === 200) {
        apiReady = true;
        console.log('✅ API is ready');
      }
    } catch (error) {
      attempts++;
      console.log(`⏳ Waiting for API... (attempt ${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (!apiReady) {
    throw new Error('❌ API failed to start within timeout period');
  }
  
  // Check frontend health
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  let frontendReady = false;
  attempts = 0;
  
  console.log('⏳ Waiting for frontend to be ready...');
  while (!frontendReady && attempts < maxAttempts) {
    try {
      const response = await page.goto(frontendUrl);
      if (response.status() === 200) {
        frontendReady = true;
        console.log('✅ Frontend is ready');
      }
    } catch (error) {
      attempts++;
      console.log(`⏳ Waiting for frontend... (attempt ${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (!frontendReady) {
    throw new Error('❌ Frontend failed to start within timeout period');
  }
  
  await browser.close();
  console.log('✅ Global setup completed successfully');
}

export default globalSetup;




