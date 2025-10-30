import * as https from 'https';
import { SimpleStore } from './StorageService';
import type { Calendar, CalendarEvent, AuthTokens } from '../../shared/types';

export class GoogleCalendarServiceSimple {
  private store: SimpleStore;
  private currentUserId: string | null = null;
  private clientId: string;
  private clientSecret: string;
  private authSuccessCallback?: () => void;

  constructor() {
    this.store = new SimpleStore({ name: 'dingo-track' });
    // Use bundled credentials in production, env vars in development
    this.clientId = process.env.GOOGLE_CLIENT_ID || process.env.DIST_GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.DIST_GOOGLE_CLIENT_SECRET || '';
  }

  // Simple HTTP request helper
  private makeRequest(options: https.RequestOptions, data?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (res.statusCode! >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || responseData}`));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${responseData}`));
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  // Get authorization URL
  getAuthUrl(): string {
    const scopes = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
    const redirectUri = 'trak://callback';
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Exchange code for tokens
  async exchangeCodeForTokens(code: string): Promise<AuthTokens> {
    const tokenData = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: 'trak://callback'
    });

    const options: https.RequestOptions = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenData.toString())
      }
    };

    const response = await this.makeRequest(options, tokenData.toString());
    
    const tokens: AuthTokens = {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      scope: response.scope,
      token_type: response.token_type,
      expiry_date: Date.now() + (response.expires_in * 1000)
    };

    this.store.set('googleTokens', tokens);
    return tokens;
  }

  // Get stored tokens
  getStoredTokens(): AuthTokens | null {
    return this.store.get('googleTokens') as AuthTokens | null;
  }

  // Store tokens
  storeTokens(tokens: AuthTokens): void {
    this.store.set('googleTokens', tokens);
  }

  // Refresh tokens
  async refreshTokens(): Promise<AuthTokens> {
    const tokens = this.getStoredTokens();
    if (!tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const refreshData = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token'
    });

    const options: https.RequestOptions = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(refreshData.toString())
      }
    };

    const response = await this.makeRequest(options, refreshData.toString());
    
    const newTokens: AuthTokens = {
      ...tokens,
      access_token: response.access_token,
      expiry_date: Date.now() + (response.expires_in * 1000)
    };

    this.store.set('googleTokens', newTokens);
    return newTokens;
  }

  // Get valid access token
  async getValidToken(): Promise<string> {
    let tokens = this.getStoredTokens();
    if (!tokens) {
      throw new Error('No tokens available');
    }

    // Check if token is expired (with 5 minute buffer)
    if (!tokens.expiry_date || tokens.expiry_date < Date.now() + 300000) {
      tokens = await this.refreshTokens();
    }

    return tokens.access_token;
  }

  // Get unique user identifier from calendar data (no additional permissions needed)
  async getUserId(): Promise<string> {
    const calendars = await this.getCalendars();
    
    // Find the primary calendar which contains the user's identifier
    const primaryCalendar = calendars.find(cal => cal.primary);
    if (primaryCalendar) {
      // Use a hash of the primary calendar ID as the user identifier
      // This ensures uniqueness without exposing personal info
      return this.createHashFromString(primaryCalendar.id);
    }
    
    // Fallback: use hash of the first calendar ID
    if (calendars.length > 0) {
      return this.createHashFromString(calendars[0].id);
    }
    
    // Final fallback: use a timestamp-based ID (not ideal but works)
    return `user_${Date.now()}`;
  }

  // Create a simple hash from a string (for user ID generation)
  private createHashFromString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `user_${Math.abs(hash)}`;
  }

  // Get calendars
  async getCalendars(): Promise<Calendar[]> {
    const token = await this.getValidToken();
    
    const options: https.RequestOptions = {
      hostname: 'www.googleapis.com',
      path: '/calendar/v3/users/me/calendarList',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    };

    const response = await this.makeRequest(options);
    
    // Filter to only include writable calendars (owner or writer access)
    const writableCalendars = response.items.filter((item: any) => 
      item.accessRole === 'owner' || item.accessRole === 'writer'
    );
    
    return writableCalendars.map((item: any) => ({
      id: item.id,
      name: item.summary,
      primary: item.primary || false,
      accessRole: item.accessRole
    }));
  }

  // Create event
  async createEvent(calendarId: string, event: Omit<CalendarEvent, 'calendarId'>): Promise<CalendarEvent> {
    console.log('📅 Creating calendar event:', { calendarId, summary: event.summary, start: event.start, end: event.end });
    
    const token = await this.getValidToken();
    console.log('🔑 Got valid token for event creation');
    
    const eventData = {
      summary: event.summary,
      start: {
        dateTime: event.start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    const options: https.RequestOptions = {
      hostname: 'www.googleapis.com',
      path: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    console.log('🌐 Making API request to create event');
    const response = await this.makeRequest(options, JSON.stringify(eventData));
    console.log('✅ Event created successfully:', response.summary);
    
    return {
      summary: response.summary,
      start: new Date(response.start.dateTime),
      end: new Date(response.end.dateTime),
      calendarId: calendarId
    };
  }

  // Clear stored tokens
  clearTokens(): void {
    this.store.delete('googleTokens');
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens();
    return tokens !== null && tokens?.access_token !== undefined;
  }

  // Get current user ID (simplified - just return email from token)
  getCurrentUserId(): string | null {
    if (!this.currentUserId) {
      // Try to load from store
      this.currentUserId = this.store.get('currentUserId', null);
    }
    return this.currentUserId;
  }

  // Set current user
  setCurrentUser(userId: string | null): void {
    this.currentUserId = userId;
    // Persist the user ID
    if (userId) {
      this.store.set('currentUserId', userId);
    } else {
      this.store.delete('currentUserId');
    }
  }

  // Set auth success callback
  setAuthSuccessCallback(callback: () => void): void {
    this.authSuccessCallback = callback;
  }

  // Authenticate - starts OAuth flow (URL scheme callback handled by Electron)
  async authenticate(): Promise<{ authUrl: string }> {
    // Generate auth URL - callback will be handled via trak:// URL scheme
    const authUrl = this.getAuthUrl();
    
    // Return the auth URL, Electron will handle the callback via URL scheme
    return { authUrl };
  }

  // Set auth code from OAuth callback
  async setAuthCode(code: string): Promise<AuthTokens> {
    console.log('📝 setAuthCode called with code');
    const tokens = await this.exchangeCodeForTokens(code);
    
    // Get the actual user ID (hash of calendar data, no personal info)
    const userId = await this.getUserId();
    this.setCurrentUser(userId);
    console.log('📝 setAuthCode: Current user set to:', userId);
    
    // IMPORTANT: Wait a tick to ensure user ID is fully set before callback
    await new Promise(resolve => setImmediate(resolve));
    
    // Notify all windows of auth success
    if (this.authSuccessCallback) {
      console.log('📝 Calling auth success callback from setAuthCode with userId:', userId);
      this.authSuccessCallback();
    }
    
    return tokens;
  }

  // Logout
  async logout(): Promise<void> {
    this.clearTokens();
    this.setCurrentUser(null); // This will also clear from store
  }
}