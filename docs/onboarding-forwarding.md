# Merchant Onboarding and Call Forwarding Setup

## Overview

This document provides step-by-step instructions for onboarding new merchants to the callwaiting.ai platform and setting up call forwarding.

## Prerequisites

1. Twilio account with sufficient balance
2. Phone number(s) purchased in Twilio
3. Access to merchant's phone system or forwarding settings
4. Administrative access to callwaiting.ai API

## Merchant Onboarding Process

### 1. Create Merchant Account

Send a POST request to create a new merchant:

```bash
curl -X POST https://api.callwaiting.ai/api/merchants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Merchant Name",
    "industry": "Industry Type",
    "country": "US",
    "timezone": "America/New_York",
    "currency": "usd",
    "website": "https://merchant.com",
    "owner_phone": "+1234567890",
    "billing_email": "billing@merchant.com",
    "sender_email": "notifications@merchant.com"
  }'
```

### 2. Allocate Phone Number

The system automatically allocates a phone number from the pool:

```bash
curl -X POST https://api.callwaiting.ai/api/number-pool/allocate \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_id": "merchant-uuid",
    "region": "US"
  }'
```

### 3. Attach Studio Flow

The system automatically attaches the Studio Flow to the allocated number.

### 4. Send Onboarding Instructions

An email is automatically sent to the merchant with setup instructions.

## Call Forwarding Configuration

### For Landline Phones

1. Contact your phone service provider
2. Request call forwarding to the assigned Twilio number
3. Test the forwarding by calling your business number

### For VoIP Systems

1. Log into your VoIP system admin panel
2. Navigate to call forwarding settings
3. Set forwarding destination to the assigned Twilio number
4. Save and test the configuration

### For Mobile Phones

1. Open your phone's dialer app
2. Dial the following code (varies by carrier):
   - AT&T: `**21*[Twilio Number]#` then press call
   - Verizon: `*72[Twilio Number]` then press call
   - T-Mobile: `##002#[Twilio Number]#` then press call
3. Confirm the forwarding is active
4. Test by calling your mobile number from another phone

## Testing the Setup

### 1. Forwarding Test

1. Call the merchant's business number
2. Verify the call is forwarded to the Twilio number
3. The Studio Flow should answer with the welcome message
4. Check the API logs for the incoming call webhook

### 2. IVR Test

1. Navigate the IVR menu options
2. Test each path (Order, Booking, Voicemail, Info)
3. Verify recordings are captured and transcribed
4. Check that appropriate actions are triggered in the API

### 3. Notification Test

1. Complete an order flow
2. Verify the payment link is generated and sent via SMS
3. Complete a test payment
4. Verify the webhook is received and processed

## Troubleshooting

### Common Issues

1. **Calls not forwarding**
   - Verify the forwarding number is correctly set
   - Check with the phone service provider for any restrictions
   - Ensure the Twilio number is properly configured

2. **Studio Flow not triggering**
   - Verify the webhook URL is correctly set in Twilio
   - Check the API service is running and accessible
   - Review Twilio debugger for any errors

3. **Payment links not sending**
   - Verify Stripe credentials are correctly configured
   - Check the merchant has a valid Stripe Connect account
   - Review API logs for any errors in payment link generation

### Contact Support

If issues persist, contact support@callwaiting.ai with:
- Merchant ID
- Twilio number assigned
- Detailed description of the issue
- Screenshots of any error messages