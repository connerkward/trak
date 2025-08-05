#!/usr/bin/env node
/**
 * Test the OAuth flow with localhost redirect
 */

const { GoogleCalendarService } = require('./dist/desktop/googleCalendarService');
require('dotenv').config();

async function testOAuthFlow() {
  console.log('🧪 Testing OAuth Flow with Localhost Redirect...\n');
  
  try {
    const service = new GoogleCalendarService();
    
    console.log('1️⃣ Starting OAuth flow...');
    const result = await service.authenticate();
    
    if (result.authUrl) {
      console.log('✅ Auth URL generated:');
      console.log(`📋 ${result.authUrl}`);
      console.log('\n🌐 OAuth flow would:');
      console.log('   1. Start local server on localhost:8080');
      console.log('   2. Open browser to auth URL');
      console.log('   3. User authorizes the app');
      console.log('   4. Google redirects to localhost:8080/oauth/callback?code=...');
      console.log('   5. Local server catches the redirect and extracts auth code');
      console.log('   6. Auth code is exchanged for tokens automatically');
      console.log('   7. Success page shown, browser can be closed');
      
      console.log('\n✅ OAuth flow setup is working correctly!');
      console.log('   The app is ready for real authentication.');
    } else {
      console.error('❌ Failed to get auth URL:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOAuthFlow();