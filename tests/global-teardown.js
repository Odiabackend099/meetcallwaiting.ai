// Global teardown for Playwright tests

async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  // Clean up test data if needed
  // In a real implementation, you might want to:
  // - Clean up test merchants from database
  // - Cancel any test Stripe/PayPal accounts
  // - Remove test Twilio numbers
  // - Clean up test calendar events
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;



