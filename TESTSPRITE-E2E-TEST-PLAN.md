# 🧪 TESTSPRITE END-TO-END TEST PLAN - CALLWAITING AI

## Test Environment Configuration
- **Frontend URL:** http://localhost:3000
- **API URL:** http://localhost:8787  
- **Test Scope:** Complete business user journey
- **Test Type:** Frontend + Backend integration
- **Platform:** Windows 10, Chrome browser

---

## 🎯 TEST SCENARIOS

### 1. SYSTEM ACCESSIBILITY TESTS

#### Test 1.1: Frontend Server Accessibility
```javascript
// Test Objective: Verify frontend server is accessible
GET http://localhost:3000/production-ready-test.html
Expected: HTTP 200, valid HTML response
```

#### Test 1.2: API Server Health Check  
```javascript
// Test Objective: Verify API server is running and healthy
GET http://localhost:8787/health
Expected: {"status":"ok","timestamp":"...","message":"Callwaiting AI API is running"}
```

#### Test 1.3: Business Pages Accessibility
```javascript
// Test all business user pages
GET http://localhost:3000/onboarding.html
GET http://localhost:3000/business-dashboard.html
GET http://localhost:3000/business-user-test.html
Expected: All pages load successfully
```

### 2. BUSINESS USER ONBOARDING FLOW

#### Test 2.1: Merchant Account Creation
```javascript
// Test Objective: Create new business account
POST http://localhost:8787/api/merchants/create
Body: {
  "name": "TestSprite Pizza",
  "industry": "Restaurant/QSR",
  "country": "US", 
  "timezone": "EST",
  "currency": "USD",
  "billing_email": "test@testsprite.com"
}
Expected: HTTP 201, merchant object with ID
```

#### Test 2.2: Phone Number Assignment
```javascript
// Test Objective: Assign AI phone number to merchant
POST http://localhost:8787/api/numbers/allocate
Body: {
  "merchant_id": "{{merchant_id_from_2.1}}",
  "region": "US"
}
Expected: HTTP 201, phone number assigned
```

#### Test 2.3: Payment Provider Connection
```javascript
// Test Objective: Connect payment processing
POST http://localhost:8787/api/config/payments/connect
Body: {
  "merchant_id": "{{merchant_id}}",
  "provider": "stripe",
  "account_id": "acct_testsprite_123",
  "webhook_endpoint_secret": "whsec_test_123"
}
Expected: HTTP 200, payment provider connected
```

#### Test 2.4: Calendar Integration
```javascript
// Test Objective: Connect calendar for bookings
POST http://localhost:8787/api/config/calendar/connect
Body: {
  "merchant_id": "{{merchant_id}}",
  "provider": "google",
  "calendar_id": "primary",
  "access_token": "test_token",
  "refresh_token": "test_refresh"
}
Expected: HTTP 200, calendar connected
```

### 3. AI VOICE SYSTEM TESTS

#### Test 3.1: Voice Webhook - Main IVR
```javascript
// Test Objective: Simulate incoming call to AI system
POST http://localhost:8787/api/webhooks/twilio/voice
Body: {
  "CallSid": "CA_testsprite_voice_123",
  "From": "+15551234567",
  "To": "{{assigned_phone_number}}",
  "CallStatus": "ringing"
}
Expected: HTTP 200, TwiML response with greeting and menu
```

#### Test 3.2: Voice Webhook - Order Selection (Press 1)
```javascript
// Test Objective: Test order flow selection
POST http://localhost:8787/api/webhooks/twilio/ivr
Body: {
  "CallSid": "CA_testsprite_order_123", 
  "From": "+15551234567",
  "Digits": "1"
}
Expected: HTTP 200, TwiML for order taking
```

#### Test 3.3: Voice Webhook - Booking Selection (Press 2)
```javascript
// Test Objective: Test booking flow selection
POST http://localhost:8787/api/webhooks/twilio/ivr
Body: {
  "CallSid": "CA_testsprite_booking_123",
  "From": "+15551234567", 
  "Digits": "2"
}
Expected: HTTP 200, TwiML for appointment booking
```

### 4. PAYMENT PROCESSING TESTS

#### Test 4.1: Stripe Webhook Processing
```javascript
// Test Objective: Process Stripe payment completion
POST http://localhost:8787/api/webhooks/stripe
Headers: {
  "stripe-signature": "test_signature"
}
Body: {
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_testsprite_123",
      "amount_total": 2499,
      "metadata": {
        "merchant_id": "{{merchant_id}}",
        "order_id": "order_testsprite_123"
      }
    }
  }
}
Expected: HTTP 200, order status updated
```

#### Test 4.2: PayPal Webhook Processing
```javascript
// Test Objective: Process PayPal payment completion
POST http://localhost:8787/api/webhooks/paypal
Headers: {
  "paypal-transmission-id": "test_transmission_123"
}
Body: {
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource": {
    "amount": {"value": "24.99", "currency_code": "USD"},
    "custom_id": "{{merchant_id}}_order_testsprite_456"
  }
}
Expected: HTTP 200, payment processed
```

### 5. NOTIFICATION SYSTEM TESTS

#### Test 5.1: SMS Notification
```javascript
// Test Objective: Send SMS notification to customer
POST http://localhost:8787/api/notifications/sms
Body: {
  "to": "+15551234567",
  "body": "Your order for $24.99 is ready! Pay here: https://checkout.stripe.com/pay/cs_test",
  "merchant_id": "{{merchant_id}}"
}
Expected: HTTP 200, SMS sent successfully
```

#### Test 5.2: Email Notification
```javascript
// Test Objective: Send email notification
POST http://localhost:8787/api/notifications/email
Body: {
  "to": "customer@example.com",
  "subject": "Order Confirmation - TestSprite Pizza",
  "html": "<h1>Thank you for your order!</h1>",
  "merchant_id": "{{merchant_id}}"
}
Expected: HTTP 200, email sent successfully
```

### 6. DASHBOARD FUNCTIONALITY TESTS

#### Test 6.1: Merchant Data Retrieval
```javascript
// Test Objective: Retrieve merchant information for dashboard
GET http://localhost:8787/api/merchants/{{merchant_id}}
Expected: HTTP 200, complete merchant object
```

#### Test 6.2: All Merchants List
```javascript
// Test Objective: Retrieve all merchants (for admin dashboard)
GET http://localhost:8787/api/merchants
Expected: HTTP 200, array of merchants
```

### 7. ERROR HANDLING & EDGE CASES

#### Test 7.1: Invalid Merchant Creation
```javascript
// Test Objective: Validate error handling for invalid data
POST http://localhost:8787/api/merchants/create
Body: {
  "name": "",
  "industry": "",
  "country": ""
}
Expected: HTTP 400, validation error message
```

#### Test 7.2: Duplicate Phone Number Assignment
```javascript
// Test Objective: Test duplicate number assignment handling
POST http://localhost:8787/api/numbers/allocate
Body: {
  "merchant_id": "{{merchant_id}}",
  "region": "US"
}
Expected: HTTP 200, existing number returned
```

#### Test 7.3: Missing Merchant ID
```javascript
// Test Objective: Test API behavior with missing merchant ID
POST http://localhost:8787/api/config/payments/connect
Body: {
  "provider": "stripe",
  "account_id": "acct_test_123"
}
Expected: HTTP 400, merchant_id required error
```

---

## 🚀 PERFORMANCE & LOAD TESTS

### Test 8.1: Concurrent User Simulation
```javascript
// Test Objective: Simulate multiple business users onboarding simultaneously
// Scenario: 10 concurrent merchant registrations
for (i = 1; i <= 10; i++) {
  POST /api/merchants/create (concurrent)
}
Expected: All succeed within 5 seconds
```

### Test 8.2: High Volume Call Processing
```javascript
// Test Objective: Process multiple voice webhook calls
// Scenario: 50 concurrent voice webhook calls
for (i = 1; i <= 50; i++) {
  POST /api/webhooks/twilio/voice (concurrent)
}
Expected: All return TwiML within 2 seconds
```

---

## 🔒 SECURITY TESTS

### Test 9.1: CORS Policy Validation
```javascript
// Test Objective: Verify CORS headers are properly set
OPTIONS http://localhost:8787/api/merchants/create
Origin: https://evil-site.com
Expected: Proper CORS headers, origin restrictions
```

### Test 9.2: Rate Limiting
```javascript
// Test Objective: Verify rate limiting is functional
// Send 101 requests within 15 minutes
Expected: Request 101 returns HTTP 429 (Too Many Requests)
```

### Test 9.3: Input Sanitization
```javascript
// Test Objective: Test SQL injection and XSS protection
POST http://localhost:8787/api/merchants/create
Body: {
  "name": "<script>alert('xss')</script>",
  "industry": "'; DROP TABLE merchants; --"
}
Expected: Input sanitized, no code execution
```

---

## 🎭 USER EXPERIENCE TESTS

### Test 10.1: Frontend Page Load Performance
```javascript
// Test Objective: Measure page load times
Metrics to capture:
- Time to First Byte (TTFB) < 200ms
- First Contentful Paint (FCP) < 1s
- Largest Contentful Paint (LCP) < 2.5s
- Cumulative Layout Shift (CLS) < 0.1
```

### Test 10.2: Mobile Responsiveness
```javascript
// Test Objective: Verify mobile compatibility
Test viewports:
- 360x640 (Mobile portrait)
- 768x1024 (Tablet portrait)  
- 1920x1080 (Desktop)
Expected: All elements properly sized and functional
```

### Test 10.3: Cross-Browser Compatibility
```javascript
// Test Objective: Verify compatibility across browsers
Test browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
Expected: Consistent functionality across all browsers
```

---

## 📊 SUCCESS CRITERIA

### API Server Tests (12 tests):
- **Health Check:** ✅ Must pass
- **Merchant Operations:** ✅ All CRUD operations functional
- **Voice Webhooks:** ✅ All TwiML responses valid
- **Payment Webhooks:** ✅ All payment events processed
- **Notifications:** ✅ SMS and email delivery working

### Frontend Tests (6 tests):
- **Page Accessibility:** ✅ All business pages load
- **Performance:** ✅ All metrics within acceptable ranges
- **Responsiveness:** ✅ Mobile and desktop compatibility
- **Cross-browser:** ✅ Consistent across major browsers

### Integration Tests (8 tests):
- **End-to-End Flow:** ✅ Complete business user journey
- **Error Handling:** ✅ Graceful error responses
- **Security:** ✅ Rate limiting and input validation
- **Performance:** ✅ Concurrent load handling

### Total: 26 Tests
**Pass Threshold:** 90% (23/26 tests must pass)
**Critical Tests:** All API health and merchant creation tests must pass

---

## 🛠️ TEST EXECUTION PLAN

### Phase 1: Environment Validation (5 minutes)
1. Verify both servers are running
2. Check port accessibility
3. Validate basic connectivity

### Phase 2: Core API Tests (15 minutes)
1. Execute all merchant and configuration API tests
2. Test voice webhook endpoints
3. Validate payment webhook processing

### Phase 3: Frontend Integration (10 minutes)
1. Test all business user pages
2. Verify dashboard functionality
3. Check form submissions and API calls

### Phase 4: Performance & Security (10 minutes)
1. Execute load tests
2. Validate security measures
3. Check error handling

### Phase 5: End-to-End Validation (10 minutes)
1. Complete business user journey simulation
2. Verify all integrations working
3. Document any failures or issues

**Total Estimated Time:** 50 minutes
**Automation Level:** 80% (API tests), 60% (Frontend tests)
**Manual Review Required:** Security tests, UX validation


