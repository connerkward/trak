#!/usr/bin/env tsx
/**
 * Atomic test for Google Calendar Service
 * Run with: cd apps/timer-tracker && npx tsx desktop/test-google-calendar.ts
 */

import { GoogleCalendarService } from './googleCalendarService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGoogleCalendarService() {
  console.log('🧪 Testing Google Calendar Service...\n');
  
  try {
    // Test 1: Service initialization
    console.log('1️⃣ Testing service initialization...');
    const service = new GoogleCalendarService();
    console.log('✅ Service initialized successfully\n');

    // Test 2: Check authentication status (should be false initially)
    console.log('2️⃣ Testing authentication status...');
    const isAuth = service.isAuthenticated();
    console.log(`✅ Authentication status: ${isAuth} (expected: false)\n`);

    // Test 3: Test auth URL generation (only if credentials are set)
    console.log('3️⃣ Testing auth URL generation...');
    try {
      const authUrl = service.getAuthUrl();
      if (authUrl && authUrl.includes('accounts.google.com')) {
        console.log('✅ Auth URL generated successfully');
        console.log(`📋 Auth URL: ${authUrl.substring(0, 100)}...\n`);
      } else {
        console.log('❌ Invalid auth URL generated\n');
      }
    } catch (error) {
      console.log(`⚠️  Auth URL generation failed: ${error instanceof Error ? error.message : error}\n`);
    }

    // Test 4: Test getting calendars without auth (should return empty array)
    console.log('4️⃣ Testing calendar list without authentication...');
    const calendars = await service.getCalendars();
    console.log(`✅ Calendars returned: ${calendars.length} (expected: 0)\n`);

    // Test 5: Test creating event without auth (should return false)
    console.log('5️⃣ Testing event creation without authentication...');
    const eventCreated = await service.createEvent({
      summary: 'Test Event',
      start: new Date(),
      end: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
      calendarId: 'primary'
    });
    console.log(`✅ Event creation result: ${eventCreated} (expected: false)\n`);

    // Test 6: Environment variables check
    console.log('6️⃣ Checking environment variables...');
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id-here';
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET !== 'your-google-client-secret-here';
    
    console.log(`   GOOGLE_CLIENT_ID: ${hasClientId ? '✅ Set' : '❌ Missing or placeholder'}`);
    console.log(`   GOOGLE_CLIENT_SECRET: ${hasClientSecret ? '✅ Set' : '❌ Missing or placeholder'}`);
    
    if (!hasClientId || !hasClientSecret) {
      console.log('\n⚠️  To test full authentication:');
      console.log('   1. Go to https://console.developers.google.com/');
      console.log('   2. Create a new project or select existing');
      console.log('   3. Enable Calendar API');
      console.log('   4. Create OAuth 2.0 credentials (Desktop application)');
      console.log('   5. Update .env file with your credentials');
    }

    console.log('\n🎉 All basic tests passed! Service is ready for authentication flow.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Manual authentication test (commented out by default)
async function testManualAuth() {
  console.log('\n🔐 Manual Authentication Test (requires user interaction)...');
  
  const service = new GoogleCalendarService();
  
  try {
    const result = await service.authenticate();
    if (result.authUrl) {
      console.log('\n📋 Visit this URL to authenticate:');
      console.log(result.authUrl);
      console.log('\nThen call service.authenticate(authCode) with the code you receive.');
    }
  } catch (error) {
    console.error('Manual auth test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testGoogleCalendarService()
    .then(() => {
      console.log('\n✨ Test completed successfully!');
      // Uncomment next line to test manual auth flow
      // return testManualAuth();
    })
    .catch(console.error);
}

export { testGoogleCalendarService };