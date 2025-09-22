# 📧 SendGrid Email Service Setup

## Step 1: Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for a free account (100 emails/day free)
3. Verify your email address
4. Complete account setup

## Step 2: Create API Key

1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Choose **Restricted Access**
4. Grant permissions:
   - **Mail Send**: Full Access
   - **Mail Settings**: Read Access
   - **Suppressions**: Read Access
5. Name your key: `Callwaiting AI Production`
6. Copy the API key (you won't see it again!)

## Step 3: Verify Sender Identity

### Option 1: Single Sender Verification (Quick)
1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in the form:
   - **From Name**: `Callwaiting AI`
   - **From Email**: `noreply@callwaitingai.com`
   - **Reply To**: `support@callwaitingai.com`
   - **Company Address**: Your business address
   - **City**: Your city
   - **Country**: Your country
4. Check your email and click the verification link

### Option 2: Domain Authentication (Recommended)
1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Enter your domain: `callwaitingai.com`
4. Choose your DNS host
5. Add the required DNS records:
   - **CNAME Record 1**: `s1._domainkey.callwaitingai.com`
   - **CNAME Record 2**: `s2._domainkey.callwaitingai.com`
   - **TXT Record**: `v=spf1 include:sendgrid.net ~all`
6. Verify domain authentication

## Step 4: Create Email Templates

### Template 1: Email Confirmation

**Template ID**: `email-confirmation`

**Subject**: `Confirm your email address - Callwaiting AI`

**HTML Content**:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm your email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #01C6D6 0%, #0A5AA8 50%, #16E0C1 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #01C6D6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Callwaiting AI!</h1>
        </div>
        <div class="content">
            <h2>Confirm your email address</h2>
            <p>Hi {{name}}!</p>
            <p>Thank you for signing up for Callwaiting AI. To complete your registration and start capturing missed calls, please confirm your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="{{confirmation_url}}" class="button">Confirm Email Address</a>
            </div>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">{{confirmation_url}}</p>
            
            <p>This link will expire in 24 hours for security reasons.</p>
            
            <p>If you didn't create an account with Callwaiting AI, you can safely ignore this email.</p>
            
            <p>Best regards,<br>The Callwaiting AI Team</p>
        </div>
        <div class="footer">
            <p>© 2024 Callwaiting AI. All rights reserved.</p>
            <p>This email was sent to {{email}}</p>
        </div>
    </div>
</body>
</html>
```

### Template 2: Password Reset

**Template ID**: `password-reset`

**Subject**: `Reset your password - Callwaiting AI`

**HTML Content**:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset your password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #01C6D6 0%, #0A5AA8 50%, #16E0C1 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #01C6D6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <h2>Reset your password</h2>
            <p>Hi {{name}}!</p>
            <p>We received a request to reset your password for your Callwaiting AI account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="{{reset_url}}" class="button">Reset Password</a>
            </div>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">{{reset_url}}</p>
            
            <div class="warning">
                <strong>Security Notice:</strong> This link will expire in 1 hour for security reasons. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </div>
            
            <p>Best regards,<br>The Callwaiting AI Team</p>
        </div>
        <div class="footer">
            <p>© 2024 Callwaiting AI. All rights reserved.</p>
            <p>This email was sent to {{email}}</p>
        </div>
    </div>
</body>
</html>
```

## Step 5: Configure Webhook Events

1. Go to **Settings** → **Mail Settings**
2. Click **Event Webhook**
3. Configure:
   - **HTTP Post URL**: `https://your-api-domain.com/api/webhooks/sendgrid`
   - **Events to send**:
     - `delivered`
     - `bounce`
     - `dropped`
     - `spam_report`
     - `unsubscribe`
     - `group_unsubscribe`
     - `group_resubscribe`

## Step 6: Test Email Sending

### Using SendGrid API (Node.js)

```javascript
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: 'test@example.com',
  from: 'noreply@callwaitingai.com',
  templateId: 'd-email-confirmation-template-id',
  dynamicTemplateData: {
    name: 'John Doe',
    confirmation_url: 'https://your-app.com/verify-email?token=abc123'
  }
};

sgMail.send(msg)
  .then(() => {
    console.log('Email sent successfully');
  })
  .catch((error) => {
    console.error('Error sending email:', error);
  });
```

### Using cURL

```bash
curl -X POST \
  https://api.sendgrid.com/v3/mail/send \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "personalizations": [
      {
        "to": [
          {
            "email": "test@example.com"
          }
        ],
        "dynamic_template_data": {
          "name": "John Doe",
          "confirmation_url": "https://your-app.com/verify-email?token=abc123"
        }
      }
    ],
    "from": {
      "email": "noreply@callwaitingai.com",
      "name": "Callwaiting AI"
    },
    "template_id": "d-your-template-id"
  }'
```

## Step 7: Monitor Email Delivery

1. Go to **Activity** → **Email Activity**
2. Monitor:
   - **Delivered**: Successfully sent emails
   - **Bounced**: Failed deliveries
   - **Dropped**: Emails not sent (spam, invalid, etc.)
   - **Spam Reports**: Marked as spam
   - **Unsubscribes**: Users who unsubscribed

## Step 8: Configure Suppression Lists

1. Go to **Suppressions** → **Suppression Management**
2. Add email addresses to suppress:
   - Bounced emails
   - Spam reports
   - Unsubscribed users
   - Invalid emails

## Step 9: Set Up Alerts

1. Go to **Settings** → **Alerts**
2. Configure alerts for:
   - High bounce rate (>5%)
   - High spam rate (>0.5%)
   - Low delivery rate (<95%)
   - API errors

## Step 10: Production Configuration

### Environment Variables
```bash
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@callwaitingai.com
SENDGRID_FROM_NAME=Callwaiting AI
SENDGRID_TEMPLATE_CONFIRMATION=d-your-confirmation-template-id
SENDGRID_TEMPLATE_RESET=d-your-reset-template-id
```

### Rate Limits
- **Free Plan**: 100 emails/day
- **Essentials Plan**: 40,000 emails/month
- **Pro Plan**: 100,000 emails/month

### Best Practices
- Use templates for consistent branding
- Monitor delivery rates regularly
- Keep suppression lists updated
- Use proper sender authentication
- Test emails before sending to users
- Respect unsubscribe requests
- Monitor for spam complaints

## Troubleshooting

### Common Issues:
- **API Key Invalid**: Check if key is correct and has proper permissions
- **Emails Not Sending**: Verify sender authentication and domain setup
- **High Bounce Rate**: Clean your email list and verify email addresses
- **Spam Folder**: Improve email content and sender reputation
- **Template Not Found**: Verify template ID is correct

### Support:
- SendGrid Documentation: https://docs.sendgrid.com/
- SendGrid Support: https://support.sendgrid.com/
- API Status: https://status.sendgrid.com/
