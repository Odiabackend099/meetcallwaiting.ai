# 📧 Supabase Email Templates Configuration

## Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Email Templates**

## Step 2: Configure Email Templates

### Email Confirmation Template

**Subject**: `Confirm your email address`

**Body**:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm your email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
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
            <p>Hi there!</p>
            <p>Thank you for signing up for Callwaiting AI. To complete your registration and start capturing missed calls, please confirm your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Address</a>
            </div>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">{{ .ConfirmationURL }}</p>
            
            <p>This link will expire in 24 hours for security reasons.</p>
            
            <p>If you didn't create an account with Callwaiting AI, you can safely ignore this email.</p>
            
            <p>Best regards,<br>The Callwaiting AI Team</p>
        </div>
        <div class="footer">
            <p>© 2024 Callwaiting AI. All rights reserved.</p>
            <p>This email was sent to {{ .Email }}</p>
        </div>
    </div>
</body>
</html>
```

### Password Reset Template

**Subject**: `Reset your password`

**Body**:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset your password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
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
            <p>Hi there!</p>
            <p>We received a request to reset your password for your Callwaiting AI account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
            </div>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">{{ .ConfirmationURL }}</p>
            
            <div class="warning">
                <strong>Security Notice:</strong> This link will expire in 1 hour for security reasons. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </div>
            
            <p>Best regards,<br>The Callwaiting AI Team</p>
        </div>
        <div class="footer">
            <p>© 2024 Callwaiting AI. All rights reserved.</p>
            <p>This email was sent to {{ .Email }}</p>
        </div>
    </div>
</body>
</html>
```

### Magic Link Template

**Subject**: `Your login link`

**Body**:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your login link</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
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
            <h1>Your Login Link</h1>
        </div>
        <div class="content">
            <h2>Sign in to Callwaiting AI</h2>
            <p>Hi there!</p>
            <p>You requested a login link for your Callwaiting AI account. Click the button below to sign in:</p>
            
            <div style="text-align: center;">
                <a href="{{ .ConfirmationURL }}" class="button">Sign In</a>
            </div>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">{{ .ConfirmationURL }}</p>
            
            <p>This link will expire in 1 hour for security reasons.</p>
            
            <p>If you didn't request this login link, you can safely ignore this email.</p>
            
            <p>Best regards,<br>The Callwaiting AI Team</p>
        </div>
        <div class="footer">
            <p>© 2024 Callwaiting AI. All rights reserved.</p>
            <p>This email was sent to {{ .Email }}</p>
        </div>
    </div>
</body>
</html>
```

## Step 3: Configure SMTP Settings

### Option 1: Use Supabase's Built-in SMTP
1. Go to **Authentication** → **Settings**
2. Under **SMTP Settings**, configure:
   - **Host**: `smtp.sendgrid.net`
   - **Port**: `587`
   - **Username**: `apikey`
   - **Password**: Your SendGrid API key
   - **Sender email**: `noreply@callwaitingai.com`
   - **Sender name**: `Callwaiting AI`

### Option 2: Use Custom SMTP
If you have your own SMTP server, configure it with your credentials.

## Step 4: Test Email Templates

1. Go to **Authentication** → **Users**
2. Create a test user or use an existing one
3. Send a test email confirmation
4. Check if the email is received and formatted correctly

## Step 5: Configure Email Redirect URLs

In **Authentication** → **URL Configuration**:

- **Site URL**: `https://meetcallwaiting-1iyocgch4-odia-backends-projects.vercel.app`
- **Redirect URLs**: 
  - `https://meetcallwaiting-1iyocgch4-odia-backends-projects.vercel.app/verify-email`
  - `https://meetcallwaiting-1iyocgch4-odia-backends-projects.vercel.app/reset-password`
  - `https://meetcallwaiting-1iyocgch4-odia-backends-projects.vercel.app/dashboard`

## Step 6: Enable Email Confirmations

1. Go to **Authentication** → **Settings**
2. Enable **Enable email confirmations**
3. Set **Confirm email change** to `true`
4. Configure **Email confirmation template** to use your custom template

## Step 7: Test the Complete Flow

1. Register a new user through your frontend
2. Check if confirmation email is sent
3. Click the confirmation link
4. Verify user can log in
5. Test password reset flow

## Troubleshooting

### Common Issues:
- **Emails not sending**: Check SMTP configuration and API keys
- **Templates not loading**: Verify HTML syntax and Supabase template variables
- **Redirect URLs not working**: Ensure URLs are added to allowed redirects
- **Emails going to spam**: Configure SPF, DKIM, and DMARC records

### Email Deliverability:
- Use a custom domain for sending emails
- Set up proper DNS records (SPF, DKIM, DMARC)
- Monitor email delivery rates
- Use a reputable email service provider (SendGrid, Mailgun, etc.)
