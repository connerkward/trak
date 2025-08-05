#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load .env file
require('dotenv').config();

const distPath = path.join(__dirname, '../dist/desktop/googleCalendarService.js');

if (!fs.existsSync(distPath)) {
  console.log('⚠️  No compiled JS found - skipping credential bundling');
  process.exit(0);
}

// Get credentials from env - prefer DIST_ prefixed versions for production builds
const clientId = process.env.DIST_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.DIST_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

// Check if we have placeholder values (not real credentials)
const hasValidCredentials = clientId && 
                           clientSecret && 
                           clientId !== 'your-google-client-id-here' && 
                           clientSecret !== 'your-google-client-secret-here' &&
                           clientId !== 'BUNDLED_CLIENT_ID' &&
                           clientSecret !== 'BUNDLED_CLIENT_SECRET';

if (!hasValidCredentials) {
  console.log('⚠️  No valid credentials found - app will require env vars at runtime');
  console.log('   Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file');
  console.log('   Or set DIST_GOOGLE_CLIENT_ID and DIST_GOOGLE_CLIENT_SECRET for production builds');
  process.exit(0);
}

// Read the compiled JavaScript file
let content = fs.readFileSync(distPath, 'utf8');

// Replace the placeholder strings with actual credentials
const originalContent = content;
content = content.replace(/BUNDLED_CLIENT_ID/g, clientId);
content = content.replace(/BUNDLED_CLIENT_SECRET/g, clientSecret);

// Also replace the validation logic to not check against the actual credentials
content = content.replace(
  new RegExp(`this\\.clientId !== '${clientId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
  'this.clientId !== "BUNDLED_CLIENT_ID"'
);
content = content.replace(
  new RegExp(`this\\.clientSecret !== '${clientSecret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
  'this.clientSecret !== "BUNDLED_CLIENT_SECRET"'
);

// Verify that replacements were made
if (content === originalContent) {
  console.log('⚠️  No placeholder tokens found in compiled file - bundling may not be needed');
  process.exit(0);
}

// Write the updated content back
fs.writeFileSync(distPath, content);

console.log('✅ Credentials bundled into distribution');
console.log(`   Client ID: ${clientId.substring(0, 20)}...`);
console.log(`   Secret: ${clientSecret.substring(0, 15)}...`);
console.log(`   File: ${distPath}`);