// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // Server configuration for development
  server: {
    port: 3000,
    open: true, // Automatically open browser on server start
    host: '0.0.0.0', // Allow external connections
    // Allow serving files from parent directory
    fs: {
      allow: ['..', '.']
    },
    // Custom middleware to serve HTML files
    middlewareMode: false,
  },
  
  // Root directory for file serving
  root: './',
  
  // Public directory for static assets
  publicDir: 'public',
  
  // Build configuration for production
  build: {
    outDir: 'dist', // Output directory
    // Minify output for production
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    // Generate source maps
    sourcemap: process.env.NODE_ENV !== 'production',
    // Include HTML files in build
    rollupOptions: {
      input: {
        main: resolve(fileURLToPath(new URL('.', import.meta.url)), 'index.html'),
        onboarding: resolve(fileURLToPath(new URL('.', import.meta.url)), 'onboarding.html'),
        'business-dashboard': resolve(fileURLToPath(new URL('.', import.meta.url)), 'business-dashboard.html'),
        'production-ready-test': resolve(fileURLToPath(new URL('.', import.meta.url)), 'production-ready-test.html'),
        'business-user-test': resolve(fileURLToPath(new URL('.', import.meta.url)), 'business-user-test.html'),
        'how-it-works': resolve(fileURLToPath(new URL('.', import.meta.url)), 'how-it-works.html'),
        solutions: resolve(fileURLToPath(new URL('.', import.meta.url)), 'solutions.html'),
        pricing: resolve(fileURLToPath(new URL('.', import.meta.url)), 'pricing.html'),
        demo: resolve(fileURLToPath(new URL('.', import.meta.url)), 'demo.html'),
        support: resolve(fileURLToPath(new URL('.', import.meta.url)), 'support.html'),
        'legal/privacy': resolve(fileURLToPath(new URL('.', import.meta.url)), 'legal/privacy.html'),
        'legal/terms': resolve(fileURLToPath(new URL('.', import.meta.url)), 'legal/terms.html')
      }
    }
  },
  
  // CSS configuration
  css: {
    devSourcemap: true,
  },
  
  // Base configuration for proper routing
  base: '/',
  
  // Define global constants
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});