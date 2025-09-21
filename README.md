# Callwaiting AI

Voice AI for missed calls, bookings & paid orders.

## Description

Callwaiting AI transforms missed calls into bookings and paid orders. When your line is busy or unanswered, our Voice AI captures the call, books the slot, or takes the order—then sends payment and receipts automatically.

## Features

- Answers missed calls with AI
- Books appointments with real availability
- Takes orders & payments via Stripe Payment Links
- Consent & compliance features
- Works with Stripe, Calendly, Google Calendar, Twilio

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd callwaiting-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the Supabase database (see Database Setup section below)

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser to `http://localhost:3000`

## Database Setup

To set up the Supabase database:

1. Open the [database/schema.sql](database/schema.sql) file in this project
2. Copy its entire contents
3. Go to your Supabase dashboard at https://app.supabase.com/project/bpszfikedkkwlmptscgh
4. Navigate to SQL Editor in the left sidebar
5. Paste the schema.sql contents into the editor
6. Click "Run" to execute all statements

This will create all required tables and set up the database properly.

For detailed instructions, please refer to the [ENVIRONMENT-SETUP.md](ENVIRONMENT-SETUP.md) file.

## Project Structure

```
.
├── index.html                    # Landing page
├── onboarding.html               # Business signup flow
├── business-dashboard.html       # Main dashboard
├── how-it-works.html             # Product information
├── solutions.html                # Solutions page
├── pricing.html                  # Pricing page
├── demo.html                     # Interactive demo
├── support.html                  # Support page
├── legal/
│   ├── privacy.html              # Privacy policy
│   └── terms.html                # Terms of service
├── apps/
│   └── api/                      # Backend API
│       ├── src/
│       │   ├── routes/           # API routes
│       │   ├── middleware/       # Authentication & security
│       │   └── utils/            # Database & utilities
│       └── package.json          # Backend dependencies
├── database/
│   ├── schema.sql                # Database schema
│   └── rls-policies.sql          # Security policies
├── src/
│   ├── api.js                    # Frontend API client
│   └── config.js                 # Configuration
├── public/
│   └── audio/                    # Static assets
├── package.json                  # Project dependencies
├── vite.config.js                # Build configuration
├── vercel.json                   # Deployment configuration
├── ENVIRONMENT-SETUP.md          # Environment setup guide
├── BUSINESS-SIGNUP-TESTING-GUIDE.md # Testing guide
└── README.md                     # This file
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Vercel will automatically detect the Vite project and deploy it

### Environment Variables

For production deployment, set the following environment variables:

```bash
# API endpoints (example)
VITE_API_BASE_URL=https://your-api-domain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxx
```

**Note**: All environment variables prefixed with `VITE_` will be embedded in the client-side bundle. Never expose secrets like private API keys or tokens.

## Security Best Practices

1. **Never expose secrets in frontend code**: 
   - Use environment variables only for non-sensitive configuration
   - All sensitive operations should happen on the backend
   - Use backend APIs to handle payments, authentication, etc.

2. **API Communication**:
   - All sensitive operations are handled via backend APIs
   - Frontend only displays UI and makes requests to your own backend

3. **Data Handling**:
   - User data is processed securely
   - No sensitive information is stored in localStorage or sessionStorage

## Pages

1. **Landing Page** (`/`) - Main marketing page
2. **How It Works** (`/how-it-works`) - Product explanation
3. **Solutions** (`/solutions`) - Industry-specific solutions
4. **Pricing** (`/pricing`) - Pricing plans
5. **Demo** (`/demo`) - Interactive product demo
6. **Onboarding** (`/onboarding`) - User signup flow
7. **Dashboard** (`/dashboard`) - User dashboard
8. **Legal** (`/legal/*`) - Privacy and terms pages
9. **Support** (`/support`) - Support page

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on the repository or contact the development team.