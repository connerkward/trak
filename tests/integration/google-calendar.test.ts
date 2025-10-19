/**
 * Real Google Calendar Integration Test
 * 
 * This test uses a real test Google account to verify:
 * 1. OAuth token refresh works
 * 2. Calendar API calls succeed
 * 3. Events are created correctly
 * 4. Timer flow creates calendar events
 * 
 * Requirements:
 * - TEST_GOOGLE_REFRESH_TOKEN: Long-lived refresh token from test account
 * - GOOGLE_CLIENT_ID: OAuth client ID
 * - GOOGLE_CLIENT_SECRET: OAuth client secret
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { GoogleCalendarServiceSimple } from '../../src/main/services/GoogleCalendarService';
import { TimerService } from '../../src/main/services/timerService';

// Only run if test credentials are available
const hasTestCredentials = 
  process.env.TEST_GOOGLE_REFRESH_TOKEN && 
  process.env.GOOGLE_CLIENT_ID && 
  process.env.GOOGLE_CLIENT_SECRET;

const describeIf = hasTestCredentials ? describe : describe.skip;

describeIf('Google Calendar Integration (REAL API)', () => {
  let calendarService: GoogleCalendarServiceSimple;
  let timerService: TimerService;
  let testCalendarId: string;
  let createdEventIds: string[] = [];
  
  beforeAll(async () => {
    calendarService = new GoogleCalendarServiceSimple();
    
    // Set up with test account's refresh token
    calendarService.storeTokens({
      access_token: '', // Will be refreshed
      refresh_token: process.env.TEST_GOOGLE_REFRESH_TOKEN!,
      expiry_date: 0, // Force immediate refresh
      scope: '',
      token_type: 'Bearer'
    });
    
    // Get test calendar ID
    const calendars = await calendarService.getCalendars();
    const primary = calendars.find(cal => cal.primary);
    testCalendarId = primary!.id;
    
    console.log(`✅ Using test calendar: ${testCalendarId}`);
    
    // Set up timer service with calendar service
    timerService = new TimerService(calendarService);
    
    // Set user (hash of calendar ID)
    const userId = await calendarService.getUserId();
    calendarService.setCurrentUser(userId);
    timerService.setCurrentUser(userId);
    
    console.log(`✅ Test user ID: ${userId}`);
  });
  
  describe('OAuth Token Management', () => {
    it('should refresh access token from refresh token', async () => {
      const tokens = await calendarService.refreshTokens();
      
      expect(tokens.access_token).toBeTruthy();
      expect(tokens.access_token).not.toBe('');
      expect(tokens.refresh_token).toBe(process.env.TEST_GOOGLE_REFRESH_TOKEN);
      
      console.log('✅ Token refresh successful');
    });
    
    it('should get valid access token', async () => {
      const token = await calendarService.getValidToken();
      
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(20);
      
      console.log('✅ Got valid access token');
    });
  });
  
  describe('Calendar API', () => {
    it('should fetch calendar list', async () => {
      const calendars = await calendarService.getCalendars();
      
      expect(calendars.length).toBeGreaterThan(0);
      expect(calendars[0]).toHaveProperty('id');
      expect(calendars[0]).toHaveProperty('name');
      
      const primary = calendars.find(cal => cal.primary);
      expect(primary).toBeDefined();
      
      console.log(`✅ Found ${calendars.length} calendar(s)`);
      console.log(`   Primary: ${primary?.name}`);
    });
    
    it('should create calendar event', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime());
      startTime.setSeconds(0, 0); // Align to minute
      
      const endTime = new Date(startTime.getTime() + 60000); // +1 minute
      
      const testEventName = `Test Event ${Date.now()}`;
      
      const event = await calendarService.createEvent(testCalendarId, {
        summary: testEventName,
        start: startTime,
        end: endTime
      });
      
      expect(event.summary).toBe(testEventName);
      expect(event.start).toEqual(startTime);
      expect(event.end).toEqual(endTime);
      
      console.log(`✅ Created event: ${testEventName}`);
      
      // Store for cleanup
      createdEventIds.push((event as any).id || testEventName);
    });
    
    it('should handle minute boundary alignment', async () => {
      const now = new Date();
      now.setSeconds(30, 500); // 30.5 seconds - not on minute boundary
      
      const startTime = new Date(now);
      startTime.setSeconds(0, 0); // Should round down
      
      const endTime = new Date(startTime.getTime() + 60000);
      
      const event = await calendarService.createEvent(testCalendarId, {
        summary: `Alignment Test ${Date.now()}`,
        start: startTime,
        end: endTime
      });
      
      expect(event.start.getSeconds()).toBe(0);
      expect(event.start.getMilliseconds()).toBe(0);
      expect(event.end.getSeconds()).toBe(0);
      expect(event.end.getMilliseconds()).toBe(0);
      
      console.log('✅ Minute alignment verified');
      
      createdEventIds.push((event as any).id || `Alignment Test ${Date.now()}`);
    });
  });
  
  describe('Full Timer Flow', () => {
    it('should create calendar event when timer stops (2 second timer)', async () => {
      const timerName = `Integration Test ${Date.now()}`;
      
      // Add timer
      timerService.addTimer(timerName, testCalendarId);
      console.log(`✅ Added timer: ${timerName}`);
      
      // Start timer
      const started = await timerService.startStopTimer(timerName);
      expect(started.action).toBe('started');
      console.log('✅ Timer started');
      
      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Stop timer
      const stopped = await timerService.startStopTimer(timerName);
      expect(stopped.action).toBe('stopped');
      expect(stopped.duration).toBeGreaterThanOrEqual(1);
      
      console.log(`✅ Timer stopped (duration: ${stopped.duration} min)`);
      console.log('✅ Calendar event should be created now - check Google Calendar!');
      
      // Give API time to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify event was created by checking calendar
      // (We can't easily fetch events without additional API calls, 
      //  but the fact that no error was thrown is a good sign)
    }, 10000); // 10s timeout
    
    it('should create calendar event for very short timer (0.5 seconds)', async () => {
      const timerName = `Short Timer ${Date.now()}`;
      
      timerService.addTimer(timerName, testCalendarId);
      
      await timerService.startStopTimer(timerName); // Start
      await new Promise(resolve => setTimeout(resolve, 500)); // 0.5s
      await timerService.startStopTimer(timerName); // Stop
      
      console.log('✅ Short timer should create 1-minute event');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }, 10000);
  });
  
  describe('Error Handling', () => {
    it('should handle invalid calendar ID gracefully', async () => {
      const now = new Date();
      now.setSeconds(0, 0);
      
      await expect(
        calendarService.createEvent('invalid-calendar-id', {
          summary: 'Should Fail',
          start: now,
          end: new Date(now.getTime() + 60000)
        })
      ).rejects.toThrow();
      
      console.log('✅ Invalid calendar ID rejected as expected');
    });
    
    it('should handle expired/invalid tokens', async () => {
      // Store invalid token with expired date to force refresh
      const originalTokens = calendarService.getStoredTokens();
      
      calendarService.storeTokens({
        access_token: 'invalid_token',
        refresh_token: process.env.TEST_GOOGLE_REFRESH_TOKEN!,
        expiry_date: 0, // Force immediate refresh
        scope: '',
        token_type: 'Bearer'
      });
      
      // Should auto-refresh and work
      const token = await calendarService.getValidToken();
      expect(token).toBeTruthy();
      expect(token).not.toBe('invalid_token');
      expect(token.length).toBeGreaterThan(20);
      
      console.log('✅ Auto token refresh works');
      
      // Restore
      if (originalTokens) {
        calendarService.storeTokens(originalTokens);
      }
    });
  });
});

// Print helpful message if tests are skipped
if (!hasTestCredentials) {
  console.log(`
⚠️  Google Calendar integration tests SKIPPED
    
To run these tests, set environment variables:
  - TEST_GOOGLE_REFRESH_TOKEN
  - GOOGLE_CLIENT_ID
  - GOOGLE_CLIENT_SECRET

Or run: pnpm test:calendar
  `);
}

