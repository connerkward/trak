/**
 * Helper script to get a refresh token for the test Google account
 * 
 * Run: node scripts/get-test-refresh-token.js
 */

require('dotenv').config();
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'trak://oauth/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
  process.exit(1);
}

console.log('🔐 Google OAuth Refresh Token Generator');
console.log('=====================================\n');

// Step 1: Generate auth URL
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('access_type', 'offline'); // Important for refresh token
authUrl.searchParams.set('prompt', 'consent'); // Force to get refresh token

console.log('📋 Step 1: Open this URL in your browser:');
console.log(`   ${authUrl.toString()}\n`);
console.log('   After authorization, you\'ll be redirected to a custom URL scheme.');
console.log('   The URL will look like: trak://oauth/callback?code=...');
console.log('   Copy the "code" parameter from the URL and paste it below.\n');
console.log('   Use your TEST Google account (e.g., dingotrack-test@gmail.com)\n');

// Step 2: Wait for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('📋 Step 2: Paste the authorization code here: ', async (authCode) => {
  if (!authCode) {
    console.error('❌ No authorization code provided');
    rl.close();
    process.exit(1);
  }
  
  console.log('✅ Authorization code received');
  console.log('📋 Step 3: Exchanging code for tokens...\n');
  
  try {
    // Step 3: Exchange code for tokens
    const tokenData = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: authCode,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI
    });
    
    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenData.toString())
      }
    };
    
    const tokenReq = https.request(options, (tokenRes) => {
      let responseData = '';
      tokenRes.on('data', (chunk) => responseData += chunk);
      tokenRes.on('end', () => {
        try {
          const tokens = JSON.parse(responseData);
          
          if (tokens.error) {
            console.error('❌ Error:', tokens.error_description || tokens.error);
            rl.close();
            process.exit(1);
          }
          
          console.log('✅ Tokens received!\n');
          console.log('========================================');
          console.log('📋 REFRESH TOKEN (copy this):');
          console.log('========================================');
          console.log(tokens.refresh_token);
          console.log('========================================\n');
          
          // Save to .env.test
          const envTestPath = path.join(__dirname, '..', '.env.test');
          const envContent = `TEST_GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"
GOOGLE_CLIENT_ID="${CLIENT_ID}"
GOOGLE_CLIENT_SECRET="${CLIENT_SECRET}"
`;
          
          fs.writeFileSync(envTestPath, envContent);
          console.log('✅ Saved to .env.test\n');
          
          console.log('📋 Next steps:');
          console.log('1. Add TEST_GOOGLE_REFRESH_TOKEN to GitHub Secrets');
          console.log('2. Run: export $(cat .env.test | xargs) && pnpm test:calendar');
          console.log('\n✨ Done!\n');
          
          rl.close();
          process.exit(0);
        } catch (error) {
          console.error('❌ Error parsing token response:', error);
          console.error('Response:', responseData);
          rl.close();
          process.exit(1);
        }
      });
    });
    
    tokenReq.on('error', (error) => {
      console.error('❌ Error exchanging code:', error);
      rl.close();
      process.exit(1);
    });
    
    tokenReq.write(tokenData.toString());
    tokenReq.end();
  } catch (error) {
    console.error('❌ Error during token exchange:', error);
    rl.close();
    process.exit(1);
  }
});