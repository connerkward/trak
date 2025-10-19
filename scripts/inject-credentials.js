#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔧 Injecting Google OAuth credentials into build...');

// Get credentials from environment
const clientId = process.env.DIST_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
const clientSecret = process.env.DIST_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';

if (!clientId || !clientSecret ||
    clientId === 'your-google-client-id-here' || 
    clientSecret === 'your-google-client-secret-here') {
  console.log('⚠️  No valid Google OAuth credentials found in environment');
  console.log('   App will load credentials from runtime environment instead');
  process.exit(0);
}

// Find the compiled GoogleCalendarService file
const mainJsPath = path.join(__dirname, '../out/main/index.js');

if (!fs.existsSync(mainJsPath)) {
  console.log('⚠️  Build output not found at:', mainJsPath);
  process.exit(0);
}

// Read the file
let content = fs.readFileSync(mainJsPath, 'utf8');

// Replace the environment variable lookups with hardcoded credentials
// Look for: process.env.GOOGLE_CLIENT_ID || process.env.DIST_GOOGLE_CLIENT_ID || ""
const clientIdPattern = /process\.env\.GOOGLE_CLIENT_ID\s*\|\|\s*process\.env\.DIST_GOOGLE_CLIENT_ID\s*\|\|\s*""/g;
const clientSecretPattern = /process\.env\.GOOGLE_CLIENT_SECRET\s*\|\|\s*process\.env\.DIST_GOOGLE_CLIENT_SECRET\s*\|\|\s*""/g;

const originalContent = content;
content = content.replace(clientIdPattern, `"${clientId}"`);
content = content.replace(clientSecretPattern, `"${clientSecret}"`);

// Check if any replacements were actually made
if (content === originalContent) {
  console.log('⚠️  Pattern not found - credentials were not injected');
  console.log('   Looking for: process.env.GOOGLE_CLIENT_ID || process.env.DIST_GOOGLE_CLIENT_ID || ""');
  process.exit(0);
}

// Write back
fs.writeFileSync(mainJsPath, content, 'utf8');

console.log('✅ Credentials injected successfully');
console.log(`   Client ID: ${clientId.substring(0, 30)}...`);
console.log(`   File: ${mainJsPath}`);

