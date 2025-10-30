import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { SimpleStore } from './StorageService';
import type { Calendar, CalendarEvent, AuthTokens } from '../../shared/types';

export class GoogleCalendarServiceSimple {
  private store: SimpleStore;
  private currentUserId: string | null = null;
  private clientId: string;
  private clientSecret: string;
  private authSuccessCallback?: () => void;
  private redirectPort: number = 0; // Dynamic port
  private useCustomUrlScheme: boolean;

  constructor() {
    this.store = new SimpleStore({ name: 'dingo-track' });
    // Use bundled credentials in production, env vars in development
    this.clientId = process.env.GOOGLE_CLIENT_ID || process.env.DIST_GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.DIST_GOOGLE_CLIENT_SECRET || '';
    this.useCustomUrlScheme = process.env.USE_CUSTOM_URL_SCHEME === 'true';
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

  // Get authorization URL with dynamic port
  // Note: Google requires localhost redirect URIs, so we always use localhost
  // but can redirect to custom URL scheme after receiving the callback
  getAuthUrl(port: number): string {
    const scopes = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
    // Google requires localhost for OAuth redirect URIs
    const redirectUri = `http://127.0.0.1:${port}/callback`;

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
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<AuthTokens> {
    const tokenData = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
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

    const calendars: Calendar[] = writableCalendars.map((item: any) => ({
      id: item.id,
      name: item.summary,
      primary: item.primary || false,
      accessRole: item.accessRole
    }));

    // Persist latest calendars for external integrations (e.g., MCP server)
    try {
      this.store.set('calendars', calendars);
    } catch (e) {
      console.warn('Failed to persist calendars list:', e);
    }

    return calendars;
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

  // Start local loopback server for OAuth (Mac App Store compliant)
  private startLoopbackServer(): Promise<{ server: http.Server; port: number; authCodePromise: Promise<string> }> {
    return new Promise((resolve, reject) => {
      let authCodeResolve: (code: string) => void;
      let authCodeReject: (error: Error) => void;

      const authCodePromise = new Promise<string>((res, rej) => {
        authCodeResolve = res;
        authCodeReject = rej;
      });

      const server = http.createServer(async (req, res) => {
        if (!req.url) return;
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

        if (parsedUrl.pathname === '/callback') {
          const authCode = parsedUrl.searchParams.get('code');
          const error = parsedUrl.searchParams.get('error');

          if (authCode) {
            if (this.useCustomUrlScheme) {
              // Redirect to custom URL scheme, protocol handler will process it
              const customUrl = `trak://callback?code=${encodeURIComponent(authCode)}`;
              res.writeHead(302, { 'Location': customUrl });
              res.end(`
                <html>
                  <head>
                    <title>Redirecting...</title>
                    <meta http-equiv="refresh" content="0;url=${customUrl}" />
                    <script>window.location.href = "${customUrl}";</script>
                  </head>
                  <body>Redirecting to Dingo Track...</body>
                </html>
              `);
              // Don't resolve here - let protocol handler process it
              // Close server after redirect (protocol handler will process via setAuthCode)
              setTimeout(() => {
                server.close();
                console.log('OAuth loopback server closed (redirected to custom URL scheme)');
              }, 1000);
            } else {
              // Success page (on-brand styling)
              res.writeHead(200, { 'Content-Type': 'text/html' });
              // Inline logo as base64 to avoid external fetch
              let logoSrc = '';
              try {
                const logoPath = path.join(__dirname, '../../assets/app-icon.png');
                const logo = fs.readFileSync(logoPath);
                logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
              } catch {}
              res.end(`
                <html>
                  <head>
                    <title>Dingo Track • Connected</title>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                  </head>
                  <body style="margin:0;background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
                    <div style="background:rgba(255,255,255,0.06);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px 24px;max-width:420px;width:90%;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
                      ${logoSrc ? `<img alt="Dingo Track" src="${logoSrc}" style="width:48px;height:48px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.35);margin-bottom:12px;" />` : ''}
                      <div style="font-size:28px;line-height:1;margin-bottom:12px;color:#28a745;">✓</div>
                      <h1 style="margin:0 0 8px 0;font-size:20px;color:#ffffff;">Authentication Successful</h1>
                      <p style="margin:0 0 16px 0;color:#b0b0b0;font-size:14px;">You can close this window and return to Dingo Track.</p>
                      <div style="margin-top:12px;color:#8a8a8a;font-size:12px;">This window will close automatically…</div>
                    </div>
                    <script>setTimeout(() => window.close(), 1600);</script>
                  </body>
                </html>
              `);
              if (authCode) authCodeResolve(authCode);
            }
          } else if (error) {
            const errorMessage = error || 'Unknown error';
            if (this.useCustomUrlScheme) {
              // Redirect error to custom URL scheme
              const customUrl = `trak://callback?error=${encodeURIComponent(errorMessage)}`;
              res.writeHead(302, { 'Location': customUrl });
              res.end(`
                <html>
                  <head>
                    <title>Error</title>
                    <meta http-equiv="refresh" content="0;url=${customUrl}" />
                    <script>window.location.href = "${customUrl}";</script>
                  </head>
                  <body>Redirecting...</body>
                </html>
              `);
              setTimeout(() => {
                server.close();
              }, 1000);
            } else {
              // Error page (on-brand styling)
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <head>
                    <title>Dingo Track • Authentication Error</title>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                  </head>
                  <body style="margin:0;background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
                    <div style="background:rgba(255,255,255,0.06);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px 24px;max-width:480px;width:90%;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
                      <div style="font-size:28px;line-height:1;margin-bottom:12px;color:#ff453a;">✕</div>
                      <h1 style="margin:0 0 8px 0;font-size:20px;color:#ffffff;">Authentication Failed</h1>
                      <p style="margin:0 0 12px 0;color:#b0b0b0;font-size:14px;">Error: ${errorMessage}</p>
                      <div style="margin-top:8px;color:#8a8a8a;font-size:12px;">You can close this window and try again.</div>
                    </div>
                  </body>
                </html>
              `);
              authCodeReject(new Error(`OAuth error: ${errorMessage}`));
            }
          }
        }
      });

      // Listen on random available port (0 = let OS choose)
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          const port = address.port;
          console.log(`OAuth loopback server listening on http://127.0.0.1:${port}`);
          resolve({ server, port, authCodePromise });
        } else {
          reject(new Error('Failed to get server address'));
        }
      });

      server.on('error', (error) => {
        reject(error);
      });
    });
  }

  // Authenticate - starts OAuth flow with loopback server
  // Note: Google requires localhost, but we can redirect to custom URL scheme after callback
  async authenticate(): Promise<{ authUrl: string }> {
    // Always use loopback server (Google requires localhost)
    // If custom URL scheme is enabled, we'll redirect to it after receiving callback
    const { server, port, authCodePromise } = await this.startLoopbackServer();
    this.redirectPort = port;

    // Generate auth URL with the dynamic port (always localhost for Google)
    const authUrl = this.getAuthUrl(port);
    
    if (this.useCustomUrlScheme) {
      console.log('🔗 Using custom URL scheme redirect after localhost callback');
    }

    // Handle the auth code in the background
    authCodePromise.then(async (code) => {
      try {
        console.log('📝 Exchanging auth code for tokens...');
        const redirectUri = `http://127.0.0.1:${port}/callback`;
        const tokens = await this.exchangeCodeForTokens(code, redirectUri);
        this.storeTokens(tokens);

        // Get the actual user ID
        const userId = await this.getUserId();
        this.setCurrentUser(userId);
        console.log('📝 Tokens stored, current user set to:', userId);

        // Wait a tick before callback
        await new Promise(resolve => setImmediate(resolve));

        // Notify success
        if (this.authSuccessCallback) {
          console.log('📝 Calling auth success callback');
          this.authSuccessCallback();
        }
      } catch (error) {
        console.error('Error during OAuth token exchange:', error);
      } finally {
        // Close the server after a brief delay
        setTimeout(() => {
          server.close();
          console.log('OAuth loopback server closed');
        }, 3000);
      }
    }).catch((error) => {
      console.error('OAuth error:', error);
      server.close();
    });

    return { authUrl };
  }

  // Set auth code from OAuth callback (for manual flow if needed)
  async setAuthCode(code: string): Promise<AuthTokens> {
    console.log('📝 setAuthCode called with code');
    // Always use localhost redirect URI for token exchange (Google requirement)
    const redirectUri = this.redirectPort ? `http://127.0.0.1:${this.redirectPort}/callback` : 'http://127.0.0.1:0/callback';
    const tokens = await this.exchangeCodeForTokens(code, redirectUri);

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
    try { this.store.delete('calendars'); } catch {}
  }
}