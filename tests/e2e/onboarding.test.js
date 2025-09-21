// Frontend Onboarding Flow Tests
const { test, expect } = require('@playwright/test');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8787';

test.describe('Onboarding Flow Tests', () => {
  test('Complete Onboarding Flow', async ({ page }) => {
    // Navigate to onboarding page
    await page.goto(`${FRONTEND_URL}/onboarding.html`);

    // Step 1: Account Information
    await page.fill('#name', 'John Doe');
    await page.fill('#email', 'john.doe@testbusiness.com');
    await page.fill('#password', 'SecurePassword123!');
    await page.check('#accept');
    await page.click('button:has-text("Continue")');

    // Step 2: Business Profile
    await page.fill('#businessName', 'Test Business LLC');
    await page.selectOption('#industry', 'Restaurant/QSR');
    await page.selectOption('#country', 'US');
    await page.selectOption('#timezone', 'EST');
    await page.selectOption('#currency', 'USD');
    await page.click('button:has-text("Continue")');

    // Wait for merchant creation and number assignment
    await page.waitForSelector('#assigned-number-display:not(:has-text("Loading..."))', { timeout: 10000 });
    
    const assignedNumber = await page.textContent('#assigned-number-display');
    expect(assignedNumber).toMatch(/^\+1\d{10}$/);

    // Step 3: Connect Services
    await page.click('button:has-text("Connect Stripe")');
    await page.waitForTimeout(1000); // Wait for connection simulation
    
    await page.click('button:has-text("Connect Calendar")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Connect Gmail or SendGrid")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Continue")');

    // Step 4: Number Assignment (already done)
    await page.click('button:has-text("Continue")');

    // Step 5: Services Configuration
    await page.check('#orders');
    await page.check('#deposit');
    await page.click('button:has-text("Continue")');

    // Step 6: Test Flows
    await page.click('button:has-text("Test Order")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Test Booking")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Test Voicemail")');
    await page.waitForTimeout(1000);

    // Complete onboarding
    await page.click('a:has-text("Go Live")');
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard**');
  });

  test('Onboarding Form Validation', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/onboarding.html`);

    // Try to submit without required fields
    await page.click('button:has-text("Continue")');
    
    // Should show validation errors
    await expect(page.locator('#name')).toHaveAttribute('required');
    await expect(page.locator('#email')).toHaveAttribute('required');
    await expect(page.locator('#password')).toHaveAttribute('required');
  });

  test('Business Form Validation', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/onboarding.html`);

    // Complete step 1
    await page.fill('#name', 'John Doe');
    await page.fill('#email', 'john.doe@testbusiness.com');
    await page.fill('#password', 'SecurePassword123!');
    await page.check('#accept');
    await page.click('button:has-text("Continue")');

    // Try to submit business form without required fields
    await page.click('button:has-text("Continue")');
    
    // Should show validation errors
    await expect(page.locator('#businessName')).toHaveAttribute('required');
    await expect(page.locator('#industry')).toHaveAttribute('required');
    await expect(page.locator('#country')).toHaveAttribute('required');
  });

  test('API Integration During Onboarding', async ({ page, request }) => {
    await page.goto(`${FRONTEND_URL}/onboarding.html`);

    // Complete account step
    await page.fill('#name', 'API Test User');
    await page.fill('#email', 'api.test@testbusiness.com');
    await page.fill('#password', 'SecurePassword123!');
    await page.check('#accept');
    await page.click('button:has-text("Continue")');

    // Complete business step
    await page.fill('#businessName', 'API Test Business');
    await page.selectOption('#industry', 'Restaurant/QSR');
    await page.selectOption('#country', 'US');
    await page.selectOption('#timezone', 'EST');
    await page.selectOption('#currency', 'USD');
    await page.click('button:has-text("Continue")');

    // Wait for API calls to complete
    await page.waitForSelector('#assigned-number-display:not(:has-text("Loading..."))', { timeout: 10000 });

    // Verify merchant was created in backend
    const response = await request.get(`${API_BASE_URL}/api/merchants`);
    const data = await response.json();
    const testMerchant = data.merchants.find(m => m.name === 'API Test Business');
    expect(testMerchant).toBeDefined();
    expect(testMerchant.number_assigned).toBeDefined();
  });
});