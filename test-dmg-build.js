#!/usr/bin/env node
/**
 * Test DMG build process and credential bundling
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🧪 Testing DMG Build Process...\n');

// Test 1: Check if .env file exists and has credentials
console.log('1️⃣ Checking .env file...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasClientId = envContent.includes('GOOGLE_CLIENT_ID=') && !envContent.includes('your-google-client-id-here');
  const hasClientSecret = envContent.includes('GOOGLE_CLIENT_SECRET=') && !envContent.includes('your-google-client-secret-here');
  
  console.log(`   GOOGLE_CLIENT_ID: ${hasClientId ? '✅ Set' : '❌ Missing or placeholder'}`);
  console.log(`   GOOGLE_CLIENT_SECRET: ${hasClientSecret ? '✅ Set' : '❌ Missing or placeholder'}`);
} else {
  console.log('❌ .env file not found');
}

// Test 2: Check if bundle-creds script exists
console.log('\n2️⃣ Checking bundle-creds script...');
const bundleScriptPath = path.join(__dirname, 'scripts', 'bundle-creds.js');
if (fs.existsSync(bundleScriptPath)) {
  console.log('✅ bundle-creds.js script exists');
} else {
  console.log('❌ bundle-creds.js script not found');
}

// Test 3: Check if dist/desktop exists and has compiled files
console.log('\n3️⃣ Checking compiled files...');
const distPath = path.join(__dirname, 'dist', 'desktop');
if (fs.existsSync(distPath)) {
  console.log('✅ dist/desktop directory exists');
  
  const files = fs.readdirSync(distPath);
  const hasMainJs = files.includes('main.js');
  const hasGoogleCalendarJs = files.includes('googleCalendarService.js');
  
  console.log(`   main.js: ${hasMainJs ? '✅ Found' : '❌ Missing'}`);
  console.log(`   googleCalendarService.js: ${hasGoogleCalendarJs ? '✅ Found' : '❌ Missing'}`);
  
  if (hasGoogleCalendarJs) {
    const serviceContent = fs.readFileSync(path.join(distPath, 'googleCalendarService.js'), 'utf8');
    const hasBundledPlaceholders = serviceContent.includes('BUNDLED_CLIENT_ID') || serviceContent.includes('BUNDLED_CLIENT_SECRET');
    console.log(`   Has bundled placeholders: ${hasBundledPlaceholders ? '✅ Yes' : '❌ No'}`);
  }
} else {
  console.log('❌ dist/desktop directory not found');
}

// Test 4: Check package.json build configuration
console.log('\n4️⃣ Checking package.json build config...');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const buildConfig = packageJson.build;
  
  if (buildConfig) {
    console.log('✅ Build configuration found');
    console.log(`   asar: ${buildConfig.asar === false ? '✅ Disabled' : '❌ Enabled'}`);
    console.log(`   files include .env: ${buildConfig.files?.includes('.env') ? '✅ Yes' : '❌ No'}`);
  } else {
    console.log('❌ No build configuration found');
  }
} else {
  console.log('❌ package.json not found');
}

// Test 5: Simulate bundle-creds process
console.log('\n5️⃣ Testing credential bundling...');
const clientId = process.env.DIST_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.DIST_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

const hasValidCredentials = clientId && 
                           clientSecret && 
                           clientId !== 'your-google-client-id-here' && 
                           clientSecret !== 'your-google-client-secret-here' &&
                           clientId !== 'BUNDLED_CLIENT_ID' &&
                           clientSecret !== 'BUNDLED_CLIENT_SECRET';

if (hasValidCredentials) {
  console.log('✅ Valid credentials found for bundling');
  console.log(`   Client ID: ${clientId.substring(0, 20)}...`);
  console.log(`   Secret: ${clientSecret.substring(0, 15)}...`);
} else {
  console.log('❌ No valid credentials found for bundling');
  console.log('   Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file');
  console.log('   Or set DIST_GOOGLE_CLIENT_ID and DIST_GOOGLE_CLIENT_SECRET for production builds');
}

console.log('\n🎯 DMG Build Test Summary:');
console.log('   To build DMG: pnpm dingo-track:rebuild:electron');
console.log('   This will:');
console.log('   1. Kill running processes');
console.log('   2. Build desktop code');
console.log('   3. Build renderer');
console.log('   4. Bundle credentials');
console.log('   5. Create DMG with electron-builder');
console.log('   6. Open dist-electron folder'); 