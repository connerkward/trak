import * as https from 'https';
import * as http from 'http';
import * as url from 'url';
import { SimpleStore } from './simpleStore';

export interface Calendar {
  id: string;
  name: string;
  primary?: boolean;
  accessRole: string;
}

export interface CalendarEvent {
  summary: string;
  start: Date;
  end: Date;
  calendarId: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export class GoogleCalendarServiceSimple {
  private store: SimpleStore;
  private currentUserId: string | null = null;
  private clientId: string;
  private clientSecret: string;
  private authSuccessCallback?: () => void;

  constructor() {
    this.store = new SimpleStore({ name: 'dingo-track' });
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
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
    const redirectUri = 'http://localhost:3000/callback';
    
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
      redirect_uri: 'http://localhost:3000/callback'
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
    if (tokens.expiry_date < Date.now() + 300000) {
      tokens = await this.refreshTokens();
    }

    return tokens.access_token;
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
    const token = await this.getValidToken();
    
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

    const response = await this.makeRequest(options, JSON.stringify(eventData));
    
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
    return this.currentUserId;
  }

  // Set current user
  setCurrentUser(userId: string | null): void {
    this.currentUserId = userId;
  }

  // Set auth success callback
  setAuthSuccessCallback(callback: () => void): void {
    this.authSuccessCallback = callback;
  }

  // Start local server to handle OAuth callback
  private startLocalServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url!, true);
        
        if (parsedUrl.pathname === '/callback') {
          const authCode = parsedUrl.query.code as string;
          
          if (authCode) {
            // Success page
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <head><title>Dingo Track - Authentication Success</title></head>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                  <h1>✅ Authentication Successful!</h1>
                  <p>You can now close this window and return to Dingo Track.</p>
                  <script>setTimeout(() => window.close(), 2000);</script>
                </body>
              </html>
            `);
            
            server.close();
            
            try {
              // Exchange the auth code for tokens
              const tokens = await this.exchangeCodeForTokens(authCode);
              this.storeTokens(tokens);
              this.currentUserId = 'default';
              
              // Notify all windows of auth success
              if (this.authSuccessCallback) {
                this.authSuccessCallback();
              }
              
              resolve('success');
            } catch (error) {
              reject(error);
            }
          } else if (parsedUrl.query.error) {
            // Error page
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <head><title>Dingo Track - Authentication Error</title></head>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                  <h1>❌ Authentication Failed</h1>
                  <p>Error: ${parsedUrl.query.error}</p>
                  <p>You can close this window and try again.</p>
                </body>
              </html>
            `);
            
            server.close();
            reject(new Error(`OAuth error: ${parsedUrl.query.error}`));
          }
        }
      });
      
      server.listen(3000, () => {
        console.log('OAuth callback server listening on http://localhost:3000');
      });
      
      server.on('error', (error) => {
        reject(error);
      });
    });
  }

  // Authenticate - starts OAuth flow with automatic redirect handling
  async authenticate(): Promise<{ authUrl: string }> {
    // Start the local callback server
    const serverPromise = this.startLocalServer();
    
    // Generate auth URL
    const authUrl = this.getAuthUrl();
    
    // Return the auth URL, server will handle the callback
    return { authUrl };
  }

  // Set auth code from OAuth callback
  async setAuthCode(code: string): Promise<AuthTokens> {
    const tokens = await this.exchangeCodeForTokens(code);
    // Set user ID from token info if available
    this.currentUserId = 'default'; // Simplified for now
    return tokens;
  }

  // Logout
  async logout(): Promise<void> {
    this.clearTokens();
    this.currentUserId = null;
  }
}