# Google Calendar Integration Testing

## Setup Test Account (One-Time)

### 1. Create Test Google Account
- Email: `dingotrack-test@gmail.com` (or similar)
- Use this ONLY for automated testing

### 2. Get Refresh Token

Run this script to authenticate and get refresh token:

```bash
node scripts/get-test-refresh-token.js
```

This will:
1. Open browser for OAuth
2. Print refresh token to console
3. Save to `.env.test` file

### 3. Add to GitHub Secrets

Add these secrets to your GitHub repository:
- `TEST_GOOGLE_REFRESH_TOKEN` - From step 2
- `GOOGLE_CLIENT_ID` - Your OAuth client ID (already exists)
- `GOOGLE_CLIENT_SECRET` - Your OAuth client secret (already exists)

## Running Tests Locally

### With .env.test file:
```bash
# Load test credentials
export $(cat .env.test | xargs)

# Run calendar tests
pnpm test:calendar
```

### With manual env vars:
```bash
export TEST_GOOGLE_REFRESH_TOKEN="your_refresh_token_here"
export GOOGLE_CLIENT_ID="your_client_id"
export GOOGLE_CLIENT_SECRET="your_client_secret"

pnpm test:calendar
```

### Watch mode (for development):
```bash
pnpm test:calendar:watch
```

## What Gets Tested

✅ **OAuth Token Management**
- Refresh token → access token exchange
- Auto token refresh on expiry
- Invalid token handling

✅ **Calendar API**
- Fetch calendar list
- Create events
- Minute boundary alignment
- Error handling

✅ **Full Timer Flow**
- Start/stop timer
- Automatic calendar event creation
- Short timer handling (< 1 minute)
- Event alignment verification

## CI/CD Integration

Tests run automatically on:
- Every push to `main`
- All pull requests
- Manual workflow dispatch

See `.github/workflows/test-calendar.yml`

## Test Data Cleanup

Tests create events with names like:
- `Test Event 1729368000000`
- `Integration Test 1729368000000`
- `Short Timer 1729368000000`

These can be manually deleted from the test calendar periodically, or add cleanup logic in the test file.

## Troubleshooting

### "Tests skipped"
- Missing `TEST_GOOGLE_REFRESH_TOKEN` environment variable
- Run setup steps above

### "HTTP 401: Invalid credentials"
- Refresh token expired (rare but possible)
- Re-run `scripts/get-test-refresh-token.js`

### "HTTP 403: Calendar not found"
- Test account doesn't have calendar access
- Check account permissions

### Tests passing but no events in calendar
- Check you're looking at the correct calendar (primary)
- Events may take a few seconds to appear
- Verify calendar ID in test output

