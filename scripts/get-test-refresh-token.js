/**
 * Helper script to get a refresh token for the test Google account
 * 
 * Run: node scripts/get-test-refresh-token.js
 */

require('dotenv').config();
const http = require('http');
const https = require('https');
const url = require('url');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';

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

console.log('📋 Step 1: Opening browser for authentication...');
console.log('   Use your TEST Google account (e.g., dingotrack-test@gmail.com)\n');

// Step 2: Start local server to receive callback
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/callback') {
    const authCode = parsedUrl.query.code;
    
    if (authCode) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>✅ Success!</h1>
            <p>You can close this window and return to the terminal.</p>
          </body>
        </html>
      `);
      
      server.close();
      
      console.log('✅ Authorization code received');
      console.log('📋 Step 2: Exchanging code for tokens...\n');
      
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
            
            process.exit(0);
          } catch (error) {
            console.error('❌ Error parsing token response:', error);
            console.error('Response:', responseData);
            process.exit(1);
          }
        });
      });
      
      tokenReq.on('error', (error) => {
        console.error('❌ Error exchanging code:', error);
        process.exit(1);
      });
      
      tokenReq.write(tokenData.toString());
      tokenReq.end();
    } else {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>❌ Error</h1>
            <p>${parsedUrl.query.error || 'No authorization code received'}</p>
          </body>
        </html>
      `);
      
      server.close();
      console.error('❌ Authorization failed');
      process.exit(1);
    }
  }
});

server.listen(3000, () => {
  console.log('🌐 Local server started on http://localhost:3000\n');
  
  // Open browser
  const command = process.platform === 'darwin' ? 'open' : 
                  process.platform === 'win32' ? 'start' : 'xdg-open';
  
  exec(`${command} "${authUrl.toString()}"`, (error) => {
    if (error) {
      console.log('⚠️  Could not open browser automatically');
      console.log('📋 Please open this URL manually:\n');
      console.log(authUrl.toString());
      console.log('\n');
    }
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error('❌ Port 3000 is already in use');
    console.error('   Close any app using port 3000 and try again');
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

