import { google } from 'googleapis';
import Store from 'electron-store';
import * as http from 'http';
import * as url from 'url';

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
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

export class GoogleCalendarService {
  private oauth2Client: any = null;
  private store: Store;
  private clientId: string;
  private clientSecret: string;
  private redirectUri = 'http://localhost:8080/oauth/callback'; // Local server for OAuth
  private currentUserId: string | null = null;

  constructor() {
    this.store = new Store();
    
    // Load credentials from env vars, with fallback to bundled values for distribution
    this.clientId = process.env.GOOGLE_CLIENT_ID || 'BUNDLED_CLIENT_ID';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'BUNDLED_CLIENT_SECRET';
    
    // Check if we have valid credentials (not placeholders)
    const hasValidCredentials = this.clientId && 
                               this.clientSecret && 
                               this.clientId !== 'BUNDLED_CLIENT_ID' && 
                               this.clientSecret !== 'BUNDLED_CLIENT_SECRET' &&
                               this.clientId !== 'your-google-client-id-here' && 
                               this.clientSecret !== 'your-google-client-secret-here' &&
                               this.clientId.length > 20 && // Real client IDs are longer
                               this.clientSecret.length > 10; // Real secrets are longer
    
    console.log('GoogleCalendarService initialization:', {
      hasClientId: !!this.clientId && this.clientId !== 'BUNDLED_CLIENT_ID',
      hasClientSecret: !!this.clientSecret && this.clientSecret !== 'BUNDLED_CLIENT_SECRET',
      clientIdLength: this.clientId?.length || 0,
      clientSecretLength: this.clientSecret?.length || 0,
      hasValidCredentials,
      isDev: __dirname.includes('dist/desktop') || __dirname.includes('dist-bundle')
    });
    
    if (!hasValidCredentials) {
      console.error('❌ Google Calendar credentials not found. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file');
      console.error('   For production builds, ensure bundle-creds.js runs and credentials are bundled');
      return;
    }

    this.initializeAuth();
  }

  private initializeAuth(): void {
    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );

    // Load stored tokens if they exist
    const tokens = this.store.get('googleTokens') as AuthTokens | undefined;
    if (tokens && this.oauth2Client) {
      this.oauth2Client.setCredentials(tokens);
    }

    // Listen for token updates
    if (this.oauth2Client) {
      this.oauth2Client.on('tokens', (tokens: any) => {
        this.store.set('googleTokens', tokens);
      });
    }
  }

  public isAuthenticated(): boolean {
    if (!this.oauth2Client) return false;
    
    const credentials = this.oauth2Client.credentials;
    return !!(credentials.access_token && 
             (!credentials.expiry_date || credentials.expiry_date > Date.now()));
  }

  public getCurrentUserId(): string | null {
    if (!this.oauth2Client || !this.isAuthenticated()) return null;
    
    // Use a hash of the access token as user ID (no email required)
    const credentials = this.oauth2Client.credentials;
    if (credentials.access_token) {
      // Simple hash function for the access token
      let hash = 0;
      for (let i = 0; i < credentials.access_token.length; i++) {
        const char = credentials.access_token.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return `user_${Math.abs(hash)}`;
    }
    
    return null;
  }

  public getAuthUrl(): string {
    if (!this.oauth2Client) {
      throw new Error('OAuth client not initialized. Please check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in your .env file.');
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async authenticate(authCode?: string): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    if (!this.oauth2Client) {
      const errorMsg = 'OAuth client not initialized. Please check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in your .env file.';
      console.error('❌', errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      if (authCode) {
        // Exchange code for tokens
        const { tokens } = await this.oauth2Client.getToken(authCode);
        this.oauth2Client.setCredentials(tokens);
        this.store.set('googleTokens', tokens);
        return { success: true };
      } else {
        // Start OAuth flow with local server
        return await this.startOAuthFlow();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Start OAuth flow with local server to catch redirect
   */
  private async startOAuthFlow(): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    return new Promise((resolve) => {
      const server = http.createServer((req, res) => {
        if (req.url?.startsWith('/oauth/callback')) {
          const query = url.parse(req.url, true).query;
          
          // Send response to browser
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head>
                <title>Authentication Successful</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 50px; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  }
                  .container {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 40px;
                    border-radius: 15px;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                  }
                  .success { 
                    color: #4ade80; 
                    font-size: 28px; 
                    font-weight: bold;
                    margin-bottom: 20px;
                  }
                  .message {
                    font-size: 16px;
                    line-height: 1.6;
                    opacity: 0.9;
                  }
                  .icon {
                    font-size: 48px;
                    margin-bottom: 20px;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="success">Authentication Successful!</div>
                  <div class="message">
                    <p>Your Google Calendar has been successfully connected to Dingo Track.</p>
                    <p>You can now close this window and return to the app.</p>
                  </div>
                </div>
                <script>
                  // Keep the page open for 5 seconds to ensure user sees the message
                  setTimeout(() => {
                    window.close();
                  }, 5000);
                </script>
              </body>
            </html>
          `);
          
          // Close server
          server.close();
          
          if (query.error) {
            resolve({ success: false, error: `OAuth error: ${query.error}` });
          } else if (query.code) {
            // Exchange code for tokens
            this.authenticate(query.code as string)
              .then(result => {
                if (result.success) {
                  // Use EventEmitter to communicate with main process
                  const { EventEmitter } = require('events');
                  const emitter = new EventEmitter();
                  
                  // Set global reference for main process to listen
                  if ((global as any).oauthEmitter) {
                    (global as any).oauthEmitter.emit('oauth-completed', { success: true });
                  }
                  
                  console.log('✅ OAuth completed - emitted oauth-completed event');
                }
                resolve(result);
              })
              .catch(error => resolve({ success: false, error: error.message }));
          } else {
            resolve({ success: false, error: 'No authorization code received' });
          }
        }
      });

      // Start server on port 8080
      server.listen(8080, 'localhost', () => {
        const authUrl = this.getAuthUrl();
        resolve({ success: false, authUrl });
      });

      // Handle server errors
      server.on('error', (error) => {
        resolve({ success: false, error: `Server error: ${error.message}` });
      });
    });
  }

  async logout(): Promise<void> {
    if (this.oauth2Client) {
      try {
        await this.oauth2Client.revokeCredentials();
      } catch (error) {
        console.warn('Error revoking credentials:', error);
      }
      this.oauth2Client.setCredentials({});
    }
    this.store.delete('googleTokens');
    
    // Clear current user and their cached calendars
    this.currentUserId = null;
  }

  setCurrentUser(userId: string | null): void {
    this.currentUserId = userId;
  }

  private getUserKey(prefix: string): string {
    if (!this.currentUserId) {
      throw new Error('No user is currently authenticated');
    }
    return `${prefix}_${this.currentUserId}`;
  }

  /**
   * Legacy method for compatibility with existing UI
   * @deprecated Use authenticate(authCode) instead
   */
  async setAuthCode(authCode: string): Promise<boolean> {
    const result = await this.authenticate(authCode);
    return result.success;
  }

  async getCalendars(): Promise<Calendar[]> {
    if (!this.isAuthenticated() || !this.oauth2Client) return [];
    if (!this.currentUserId) return [];

    try {
      // Check if we have cached calendars for this user
      const cachedCalendars = this.store.get(`calendars_${this.currentUserId}`) as Calendar[] | undefined;
      if (cachedCalendars && cachedCalendars.length > 0) {
        console.log(`Using cached calendars for user: ${this.currentUserId}`);
        return cachedCalendars;
      }

      // Fetch calendars from Google API
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const response = await calendar.calendarList.list();
      
      const calendars = (response.data.items || [])
        .filter(cal => cal.accessRole === 'owner' || cal.accessRole === 'writer')
        .map(cal => ({
          id: cal.id!,
          name: cal.summary!,
          primary: cal.primary || false,
          accessRole: cal.accessRole!
        }));

      // Cache calendars for this user
      this.store.set(`calendars_${this.currentUserId}`, calendars);
      console.log(`Cached ${calendars.length} calendars for user: ${this.currentUserId}`);
      
      return calendars;
    } catch (error) {
      console.error('Error fetching calendars:', error);
      return [];
    }
  }

  async refreshCalendars(): Promise<Calendar[]> {
    if (!this.isAuthenticated() || !this.oauth2Client || !this.currentUserId) return [];

    try {
      // Clear cached calendars
      this.store.delete(`calendars_${this.currentUserId}`);
      
      // Fetch fresh calendars
      return await this.getCalendars();
    } catch (error) {
      console.error('Error refreshing calendars:', error);
      return [];
    }
  }

  async createEvent(event: CalendarEvent): Promise<boolean> {
    if (!this.isAuthenticated() || !this.oauth2Client) return false;

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      await calendar.events.insert({
        calendarId: event.calendarId,
        requestBody: {
          summary: event.summary,
          start: {
            dateTime: event.start.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: event.end.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }
      });

      return true;
    } catch {
      return false;
    }
  }

}