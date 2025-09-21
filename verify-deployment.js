#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Verifies that the Vercel configuration is correct and all files are properly set up
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying Vercel Deployment Configuration...\n');

// Check if vercel.json exists and is valid
function verifyVercelConfig() {
  console.log('📋 Checking vercel.json...');
  
  try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    
    // Check for conflicting properties
    const hasRoutes = vercelConfig.routes !== undefined;
    const hasRewrites = vercelConfig.rewrites !== undefined;
    const hasRedirects = vercelConfig.redirects !== undefined;
    const hasHeaders = vercelConfig.headers !== undefined;
    const hasCleanUrls = vercelConfig.cleanUrls !== undefined;
    const hasTrailingSlash = vercelConfig.trailingSlash !== undefined;
    
    if (hasRoutes && (hasRewrites || hasRedirects || hasHeaders || hasCleanUrls || hasTrailingSlash)) {
      console.error('❌ CONFLICT: routes cannot be used with rewrites, redirects, headers, cleanUrls, or trailingSlash');
      return false;
    }
    
    if (hasRewrites && hasRedirects) {
      console.log('✅ Using modern rewrites and redirects configuration');
    }
    
    // Check required properties
    const requiredProps = ['version', 'buildCommand', 'outputDirectory', 'installCommand', 'framework'];
    for (const prop of requiredProps) {
      if (!vercelConfig[prop]) {
        console.error(`❌ Missing required property: ${prop}`);
        return false;
      }
    }
    
    console.log('✅ vercel.json configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Error reading vercel.json:', error.message);
    return false;
  }
}

// Check if all HTML files exist
function verifyHtmlFiles() {
  console.log('\n📄 Checking HTML files...');
  
  const htmlFiles = [
    'index.html',
    'onboarding.html',
    'business-dashboard.html',
    'business-user-test.html',
    'production-ready-test.html',
    'how-it-works.html',
    'solutions.html',
    'pricing.html',
    'demo.html',
    'support.html',
    'legal/privacy.html',
    'legal/terms.html'
  ];
  
  let allExist = true;
  
  for (const file of htmlFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.error(`❌ ${file} missing`);
      allExist = false;
    }
  }
  
  return allExist;
}

// Check if vite.config.js is properly configured
function verifyViteConfig() {
  console.log('\n⚙️ Checking vite.config.js...');
  
  try {
    const viteConfigContent = fs.readFileSync('vite.config.js', 'utf8');
    
    // Check for required configurations
    const checks = [
      { name: 'Output directory set to dist', pattern: /outDir:\s*['"]dist['"]/ },
      { name: 'HTML files in rollupOptions.input', pattern: /rollupOptions:\s*{[\s\S]*input:/ },
      { name: 'Production minification', pattern: /minify:\s*process\.env\.NODE_ENV/ }
    ];
    
    let allChecksPass = true;
    
    for (const check of checks) {
      if (check.pattern.test(viteConfigContent)) {
        console.log(`✅ ${check.name}`);
      } else {
        console.error(`❌ ${check.name}`);
        allChecksPass = false;
      }
    }
    
    return allChecksPass;
  } catch (error) {
    console.error('❌ Error reading vite.config.js:', error.message);
    return false;
  }
}

// Check package.json scripts
function verifyPackageJson() {
  console.log('\n📦 Checking package.json...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredScripts = ['build', 'dev', 'start'];
    let allScriptsExist = true;
    
    for (const script of requiredScripts) {
      if (packageJson.scripts && packageJson.scripts[script]) {
        console.log(`✅ Script '${script}' exists`);
      } else {
        console.error(`❌ Script '${script}' missing`);
        allScriptsExist = false;
      }
    }
    
    // Check for Vercel-specific scripts
    if (packageJson.scripts && packageJson.scripts['vercel-build']) {
      console.log('✅ Vercel build script exists');
    } else {
      console.log('⚠️ Vercel build script not found (using default build)');
    }
    
    return allScriptsExist;
  } catch (error) {
    console.error('❌ Error reading package.json:', error.message);
    return false;
  }
}

// Test build process
async function testBuild() {
  console.log('\n🔨 Testing build process...');
  
  try {
    const { execSync } = await import('child_process');
    
    // Clean previous build
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true });
      console.log('🧹 Cleaned previous build');
    }
    
    // Run build
    console.log('🏗️ Running build...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Check if dist directory was created
    if (fs.existsSync('dist')) {
      console.log('✅ Build completed successfully');
      
      // Check for key files in dist
      const distFiles = fs.readdirSync('dist');
      console.log(`📁 Build output contains ${distFiles.length} files`);
      
      return true;
    } else {
      console.error('❌ Build failed - dist directory not created');
      return false;
    }
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    return false;
  }
}

// Main verification function
async function main() {
  console.log('🚀 Callwaiting AI - Deployment Verification\n');
  
  const checks = [
    { name: 'Vercel Configuration', fn: verifyVercelConfig },
    { name: 'HTML Files', fn: verifyHtmlFiles },
    { name: 'Vite Configuration', fn: verifyViteConfig },
    { name: 'Package.json', fn: verifyPackageJson },
    { name: 'Build Process', fn: testBuild }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    const result = await check.fn();
    if (!result) {
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 ALL CHECKS PASSED!');
    console.log('✅ Your project is ready for Vercel deployment');
    console.log('\n📋 Next steps:');
    console.log('1. Push to GitHub repository');
    console.log('2. Connect repository to Vercel');
    console.log('3. Set environment variables in Vercel dashboard');
    console.log('4. Deploy!');
  } else {
    console.log('❌ SOME CHECKS FAILED');
    console.log('🔧 Please fix the issues above before deploying');
    process.exit(1);
  }
}

// Run verification
main().catch(console.error);
