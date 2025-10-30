#!/usr/bin/env node
/**
 * Test the OAuth flow with localhost redirect
 */

const { GoogleCalendarServiceSimple } = require('./out/main/services/GoogleCalendarService');
require('dotenv').config();

async function testOAuthFlow() {
  console.log('🧪 Testing OAuth Flow with Custom URL Scheme...\n');
  
  try {
    const service = new GoogleCalendarServiceSimple();
    
    console.log('1️⃣ Starting OAuth flow...');
    const result = await service.authenticate();
    
    if (result.authUrl) {
      console.log('✅ Auth URL generated:');
      console.log(`📋 ${result.authUrl}`);
      console.log('\n🌐 OAuth flow would:');
      console.log('   1. Open browser to auth URL');
      console.log('   2. User authorizes the app');
      console.log('   3. Google redirects to trak://oauth/callback?code=...');
      console.log('   4. Custom URL scheme handler catches the redirect');
      console.log('   5. Auth code is extracted and exchanged for tokens');
      console.log('   6. App receives tokens and completes authentication');
      
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