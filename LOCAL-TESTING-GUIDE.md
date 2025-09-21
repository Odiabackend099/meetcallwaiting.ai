# Local Testing and Deployment Guide

## Prerequisites

1. Node.js v14 or higher installed
2. npm or yarn package manager

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The development server will start on `http://localhost:3000` (or another port if 3000 is in use).

### 3. Access the Application

Open your browser and navigate to:
- Landing Page: http://localhost:3000/index.html
- Onboarding: http://localhost:3000/onboarding.html
- Demo: http://localhost:3000/demo.html
- Dashboard: http://localhost:3000/dashboard.html

## Building for Production

### 1. Build the Application

```bash
npm run build
```

This will generate optimized production files in the `dist/` directory.

### 2. Preview Production Build

```bash
npm run preview
```

The preview server will start on `http://localhost:4173`.

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repository-url>
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [Vercel](https://vercel.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Import your Git repository
5. Vercel will automatically detect the Vite project and deploy it

### 3. Environment Variables

For production deployment, set the following environment variables in your Vercel project settings:

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

## Testing the Application

### Automated Testing

Run the provided test scripts to verify all pages are accessible:

```bash
node test-all-pages.js
```

### Manual Testing

1. Navigate through all pages
2. Test all navigation links
3. Verify forms and interactive elements work correctly
4. Check responsive design on different screen sizes
5. Test all scenarios in the demo page

## Troubleshooting

### Development Server Issues

1. **Port in use**: If port 3000 is in use, Vite will automatically use another port
2. **File not found**: Ensure all HTML files are in the root directory
3. **Build errors**: Check the console for specific error messages

### Deployment Issues

1. **Environment variables not loaded**: Ensure they are prefixed with `VITE_`
2. **Routing issues**: Check the `vercel.json` configuration
3. **Asset loading**: Verify all assets are correctly referenced

## Project Structure

```
.
├── index.html          # Landing page
├── onboarding.html     # User onboarding flow
├── demo.html           # Interactive demo
├── dashboard.html      # User dashboard
├── package.json        # Project dependencies and scripts
├── vite.config.js      # Vite configuration
├── vercel.json         # Vercel deployment configuration
├── .gitignore          # Git ignore rules
├── .env.example        # Environment variables example
├── src/                # Source files
│   ├── config.js       # Configuration management
│   └── api.js          # API communication utilities
└── dist/               # Production build (generated)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Support

For support, please open an issue on the repository or contact the development team.