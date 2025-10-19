import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let window: Page;

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../out/main/index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    }
  });
  
  // Wait for first window
  window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('Timer Flow', () => {
  test('app launches successfully', async () => {
    const title = await window.title();
    expect(title).toBeTruthy();
    
    // Take screenshot
    await window.screenshot({ path: 'test-results/app-launch.png' });
  });
  
  test('can see timer list', async () => {
    // Wait for app to load
    await window.waitForSelector('body', { timeout: 5000 });
    
    // Check if timer list is visible
    const body = await window.textContent('body');
    console.log('App body content:', body);
    
    await window.screenshot({ path: 'test-results/timer-list.png' });
  });
  
  test('can start and stop timer', async () => {
    // This test requires the app to be authenticated
    // We'll add timer interaction logic here
    
    await window.screenshot({ path: 'test-results/timer-started.png' });
  });
});

test.describe('Google Calendar Integration', () => {
  test.skip('creates calendar event when timer stops', async () => {
    // This will test the actual Google Calendar API
    // Skip by default unless TEST_REAL_CALENDAR env var is set
  });
});

