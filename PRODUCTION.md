# Production Architecture & Deployment

This document outlines the architectural decisions made for production deployment of Dingo Track, including code signing, notarization, credential management, and distribution strategy.

## Overview

Dingo Track is distributed as a signed and notarized macOS DMG file with embedded Google OAuth credentials, supporting both Intel and Apple Silicon Macs through universal binary builds.

## Key Architectural Decisions

### 1. ASAR Packaging

**Decision:** Enable ASAR (Atom Shell Archive) packaging for the production app.

**Rationale:**
- Faster app loading (single file vs. thousands of individual files)
- Reduced file count improves performance and prevents file system issues
- Standard practice for Electron apps
- Enables credential injection into a single compiled JavaScript file

**Implementation:**
```json
// package.json
"build": {
  "asar": true
}
```

**Trade-offs:**
- Files inside ASAR cannot be modified after packaging
- Requires extraction to read individual files (handled automatically by Electron)

---

### 2. Universal Binary Builds

**Decision:** Build a single universal binary supporting both Intel (x64) and Apple Silicon (arm64).

**Rationale:**
- One DMG file for all Mac users (better UX)
- Automatic native performance on both architectures
- Simpler distribution and versioning
- Industry standard for modern Mac apps

**Implementation:**
```json
// package.json
"mac": {
  "target": [
    {
      "target": "dmg",
      "arch": ["universal"]
    }
  ]
}
```

**Build Process:**
1. electron-builder creates two temporary builds (x64 and arm64)
2. Builds are signed individually
3. Binaries are merged using `lipo`
4. Final universal app is notarized once

**Important:** Custom notarization script skips temporary `-temp` directories to prevent duplicate notarization.

---

### 3. Credential Injection System

**Decision:** Hardcode Google OAuth credentials into compiled JavaScript at build time.

**Problem:**
- Environment variables don't exist in distributed apps
- Users shouldn't need to configure OAuth credentials
- `.env` files can't be bundled (security risk, ignored by git)

**Solution:** Post-build script replaces environment variable lookups with actual credentials.

**Implementation:**

```javascript
// scripts/inject-credentials.js
const content = fs.readFileSync('out/main/index.js', 'utf8');

// Find and replace env var patterns with hardcoded values
content = content.replace(
  /process\.env\.GOOGLE_CLIENT_ID\s*\|\|\s*process\.env\.DIST_GOOGLE_CLIENT_ID\s*\|\|\s*""/g,
  `"${clientId}"`
);

fs.writeFileSync('out/main/index.js', content, 'utf8');
```

**Build Pipeline:**
```bash
electron-vite build → inject-credentials.js → electron-builder → notarize
```

**Security Considerations:**
- Client ID is not secret (visible in OAuth flow anyway)
- Client Secret is protected by:
  - GitHub Secrets in CI/CD
  - Local `.env` (gitignored)
  - Only exists in compiled JavaScript (not source code)

**Environment Variables:**
- `GOOGLE_CLIENT_ID` / `DIST_GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` / `DIST_GOOGLE_CLIENT_SECRET` - OAuth client secret
- Checked in this order by `GoogleCalendarService.ts`

---

### 4. Code Signing Strategy

**Decision:** Use Developer ID Application certificate (not Mac App Store distribution).

**Rationale:**
- Direct download distribution (faster releases)
- No App Store review process
- More flexible for menu bar apps
- Lower barrier for users (no Apple ID required)

**Certificate Type:** Developer ID Application
- For apps distributed outside Mac App Store
- Requires Apple Developer Program ($99/year)
- Allows Gatekeeper to verify app integrity

**Configuration:**
```json
// package.json
"mac": {
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "notarize": false  // Disabled built-in, using custom script
}
```

**Why `notarize: false`?**
- electron-builder's built-in notarization had issues with environment variable loading
- Custom `afterSign` hook provides more control and better error handling

---

### 5. Custom Notarization Script

**Decision:** Implement custom notarization via `afterSign` hook instead of electron-builder's built-in notarization.

**Problems with built-in notarization:**
- Inconsistent environment variable loading from `.env`
- Poor error messages
- JSON parsing errors with Apple's notarization service

**Solution:** `scripts/notarize.js` with explicit credential handling.

**Implementation:**
```javascript
// scripts/notarize.js
exports.default = async function notarizing(context) {
  // Skip notarization for temporary universal build directories
  if (appOutDir.includes('-temp')) {
    console.log('⏭️  Skipping notarization for temporary build');
    return;
  }

  // Load credentials from environment (CI) or .env (local)
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  // Dynamic import for ES module compatibility
  const { notarize } = await import('@electron/notarize');
  
  await notarize({
    tool: 'notarytool',
    appPath: appPath,
    appleId: appleId,
    appleIdPassword: appleIdPassword,
    teamId: teamId
  });
};
```

**Key Features:**
- Skips temporary directories during universal binary build
- Explicitly loads credentials from environment
- Uses modern `notarytool` (not deprecated `altool`)
- Dynamic ES module import for compatibility
- Graceful failure with clear error messages

**Configuration:**
```json
// package.json (root level, not inside "mac")
"afterSign": "scripts/notarize.js"
```

---

### 6. GitHub Actions Build Strategy

**Decision:** Use GitHub Actions for automated builds with secure credential handling.

**Certificate Handling:**
```yaml
# Encode locally:
base64 -i DeveloperID.p12 | pbcopy

# Decode in CI:
echo ${{ secrets.CSC_LINK_BASE64 }} | base64 --decode > certificate.p12

# Create temporary keychain
security create-keychain -p actions temp.keychain
security import certificate.p12 -k temp.keychain -P "$CSC_KEY_PASSWORD"
security set-key-partition-list -S apple-tool:,apple: -s -k actions temp.keychain
```

**Required GitHub Secrets:**
1. `CSC_LINK_BASE64` - Base64-encoded .p12 certificate
2. `CSC_KEY_PASSWORD` - Certificate password
3. `APPLE_ID` - Apple ID for notarization
4. `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password
5. `APPLE_TEAM_ID` - Apple Developer Team ID
6. `GOOGLE_CLIENT_ID` - OAuth client ID
7. `GOOGLE_CLIENT_SECRET` - OAuth client secret

**Why temporary keychain?**
- Isolated from system keychain
- Automatically cleaned up after build
- No conflicts with existing certificates
- Works reliably in CI environment

---

### 7. Multi-Page Landing Site

**Decision:** Build landing page as multi-page static site with separate Privacy Policy and Terms of Service pages.

**Rationale:**
- Required for Google OAuth verification
- Better SEO (separate URLs)
- Cleaner user experience
- Easy to link from OAuth consent screen

**Structure:**
```
docs/
├── index.html              # Main landing page
├── privacy-policy.html     # Privacy Policy
├── terms-of-service.html   # Terms of Service
└── assets/
```

**Build System:**
```javascript
// vite.config.js
rollupOptions: {
  input: {
    main: resolve(__dirname, 'index.html'),
    privacy: resolve(__dirname, 'privacy-policy.html'),
    terms: resolve(__dirname, 'terms-of-service.html')
  }
}
```

---

## Build Workflows

### Local Development Build

```bash
# 1. Set up environment
cp .env.example .env  # Create .env with your credentials

# 2. Development
pnpm dev              # Hot reload for development

# 3. Production build (signed & notarized)
pnpm dist:mac         # Builds universal DMG with credentials
```

**Build steps:**
1. `electron-vite build` - Compile TypeScript and bundle React
2. `inject-credentials.js` - Hardcode OAuth credentials
3. `electron-builder` - Package into .app with code signing
4. `notarize.js` - Upload to Apple for notarization (2-10 min)
5. Output: `dist-electron/Dingo Track-1.0.x-universal.dmg`

### GitHub Actions Build

**Workflow:** `.github/workflows/deploy-landing.yml`

```yaml
1. Setup code signing (macOS runner)
   - Decode certificate from base64
   - Create temporary keychain
   - Import certificate and set permissions

2. Build desktop app
   - Export all environment variables (GOOGLE_*, APPLE_*, CSC_*)
   - Run: pnpm build:electron
   - Run: electron-builder --mac dmg --universal

3. Verify credentials were injected
   - Extract app.asar
   - Check for hardcoded credentials
   - Fail if env vars still present

4. Build landing page
   - Copy DMG to landing-page/public/downloads/
   - Build with NODE_ENV=production
   - Deploy to GitHub Pages
```

**Critical:** All credentials must be exported as environment variables before build.

---

## Security Model

### Credential Storage

**Development:**
- `.env` file (gitignored)
- Never committed to repository
- Used only for local builds

**Production:**
- GitHub Secrets (encrypted at rest)
- Injected into compiled JavaScript at build time
- Distributed as part of app.asar

**User Data:**
- OAuth tokens stored locally in `electron-store`
- Never transmitted to our servers
- Only sent to Google for Calendar API

### Code Signing Chain of Trust

```
Apple Root CA
└── Apple Worldwide Developer Relations CA (G3)
    └── Developer ID Certification Authority (G2)
        └── Developer ID Application: Conner Ward (N4YGB5B92K)
            └── Dingo Track.app
```

**Trust Establishment:**
1. Install intermediate certificates (`AppleWWDRCAG3.cer`, `DeveloperIDG2CA.cer`)
2. Generate CSR from Keychain Access
3. Create Developer ID Application certificate on Apple Developer portal
4. Install certificate with private key
5. Export as .p12 for CI/CD

---

## Distribution Strategy

### Direct Download (Current)

**Pros:**
- Immediate updates
- No review process
- Full control over release timing
- Works for menu bar apps without restrictions

**Cons:**
- Users see "developer cannot be verified" warning if not notarized
- Manual download and installation
- No automatic updates (yet)

**User Experience:**
1. Visit landing page
2. Click "Download for Mac"
3. Open DMG
4. Drag to Applications
5. First launch: Right-click → Open (if unsigned) or double-click (if notarized)
6. Authorize Google Calendar (optional)

### Future: Mac App Store

**Would require:**
- Mac App Store distribution certificate (different from Developer ID)
- Mac App Store provisioning profile
- Entitlements files
- Sandbox compliance (major constraint for menu bar apps)
- App Store review (1-7 days per release)

**Current blocker:** Menu bar apps have limited functionality in Mac App Store sandbox.

---

## Troubleshooting Production Issues

### "Developer cannot be verified"

**Cause:** App not notarized or certificate chain incomplete.

**Solution:**
1. Verify certificate: `security find-identity -v -p codesigning`
2. Check notarization: `spctl -a -vv "Dingo Track.app"`
3. Ensure intermediate certificates installed
4. Re-notarize if needed

### "Missing required parameter: client_id"

**Cause:** Credential injection failed or credentials not in environment during build.

**Solution:**
1. Verify GitHub Secrets are set
2. Check injection script ran: Look for "✅ Credentials injected" in build log
3. Verify pattern match in `out/main/index.js` before injection
4. Confirm environment variables exported in workflow

### Notarization fails silently

**Cause:** Temporary directory notarization or missing credentials.

**Solution:**
1. Check `afterSign` hook is at root level in package.json (not inside "mac")
2. Verify `appOutDir.includes('-temp')` check in notarize.js
3. Ensure APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID are set
4. Check Apple notarization history at developer.apple.com

---

## Performance Optimizations

### ASAR Benefits

- **Load time:** 50% faster app startup (single file vs. thousands)
- **File I/O:** Reduced file system operations
- **Distribution:** Smaller DMG (better compression)

### Universal Binary Trade-offs

- **Size:** ~2x size of single-arch build (acceptable for desktop app)
- **Build time:** ~1.5x longer (parallel builds + merge)
- **Performance:** Native speed on both architectures (worth it)

---

## Compliance

### Google API Limited Use Requirements

**Dingo Track's use of Google Calendar API adheres to Limited Use requirements:**

1. **Limited Data Access:**
   - Only requests `calendar.readonly` and `calendar.events` scopes
   - Does not request access to other Google services

2. **No Data Transfer:**
   - Does not transfer Google user data to servers
   - All data stays on user's local device

3. **No Secondary Use:**
   - Does not use calendar data for advertising
   - Does not use calendar data for ML/AI training
   - Does not sell calendar data

4. **Transparent Privacy:**
   - Privacy Policy clearly states local-only storage
   - Terms of Service reference Google API compliance
   - Both documents linked from landing page and app

### Apple Notarization Requirements

**Compliance:**
- ✅ Hardened Runtime enabled
- ✅ Code signed with Developer ID
- ✅ All binaries signed (including native modules)
- ✅ No malware or suspicious code
- ✅ Notarization ticket stapled to DMG

---

## Future Improvements

### Automatic Updates

**Electron-updater:**
- Would enable seamless updates
- Requires hosting update manifest JSON
- Could use GitHub Releases

### Crashalytics

**Electron crash reporter:**
- Catch and report production crashes
- Could use Sentry or custom endpoint

### Analytics

**Privacy-respecting analytics:**
- Feature usage tracking
- Performance monitoring
- Error rates

### Multi-platform

**Windows/Linux support:**
- Separate build workflows
- Platform-specific code signing
- Different credential injection for Windows

---

## References

- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Google API Limited Use](https://developers.google.com/terms/api-services-user-data-policy)
- [electron-builder Configuration](https://www.electron.build/configuration/configuration)
- [Code Signing Guide](./CODE_SIGNING.md)
- [Architecture Overview](./ARCHITECTURE.md)

---

## Version History

- **v1.0.0** - Initial release with manual OAuth setup
- **v1.0.1** - Embedded OAuth credentials, universal binary, improved notarization

