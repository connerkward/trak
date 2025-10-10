# Code Signing and Notarization Setup

This document explains how to set up code signing and notarization for macOS distribution.

## Prerequisites

1. **Apple Developer Account** - [$99/year at developer.apple.com](https://developer.apple.com)
2. **Xcode** - Install from Mac App Store (includes code signing tools)

## Steps

### 1. Create Developer ID Certificate

1. Go to [developer.apple.com/account/resources/certificates](https://developer.apple.com/account/resources/certificates)
2. Click "+" to create new certificate
3. Select "Developer ID Application" (for distribution outside Mac App Store)
4. Follow prompts to create Certificate Signing Request (CSR) using Keychain Access
5. Download the certificate (.cer file)
6. Double-click to install in Keychain

### 2. Export Certificate as .p12

1. Open Keychain Access
2. Find "Developer ID Application: Your Name"
3. Right-click → "Export"
4. Save as .p12 file with password
5. Store securely (DO NOT commit to git)

### 3. Create App-Specific Password

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in with your Apple ID
3. In "Security" section → "App-Specific Passwords"
4. Click "Generate Password"
5. Label it "Dingo Track Notarization"
6. Save the generated password (format: xxxx-xxxx-xxxx-xxxx)

### 4. Get Team ID

1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Your Team ID is shown in the top right (10 characters, e.g., AB12CD34EF)

### 5. Configure Environment Variables

Create `.env` file in project root (copy from `.env.example`):

```bash
# Apple Code Signing
CSC_LINK=/path/to/DeveloperID.p12
CSC_KEY_PASSWORD=your-certificate-password
APPLE_ID=your@apple.id
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=AB12CD34EF
```

**Security Note:** Never commit `.env` to git. It's already in `.gitignore`.

### 6. Build Signed & Notarized DMG

```bash
npm run dist:mac
```

electron-builder will automatically:
1. Sign the app with your Developer ID
2. Create the DMG
3. Upload to Apple for notarization
4. Staple the notarization ticket to the DMG

This process takes 2-10 minutes for notarization.

## CI/CD Setup

For GitHub Actions or other CI:

1. Convert .p12 to base64:
   ```bash
   base64 -i DeveloperID.p12 | pbcopy
   ```

2. Add to GitHub Secrets:
   - `CSC_LINK_BASE64` - base64 encoded .p12
   - `CSC_KEY_PASSWORD`
   - `APPLE_ID`
   - `APPLE_APP_SPECIFIC_PASSWORD`
   - `APPLE_TEAM_ID`

3. In workflow, decode certificate:
   ```yaml
   - name: Decode certificate
     run: |
       echo ${{ secrets.CSC_LINK_BASE64 }} | base64 --decode > certificate.p12
       echo "CSC_LINK=$PWD/certificate.p12" >> $GITHUB_ENV
   ```

## Verification

After building, verify the signature:

```bash
codesign -dv --verbose=4 "dist-electron/mac/Dingo Track.app"
spctl -a -vv "dist-electron/mac/Dingo Track.app"
```

Should show:
- "Developer ID Application: Your Name (TEAM_ID)"
- "accepted"

## Troubleshooting

### "Developer cannot be verified" error
- Certificate not properly installed
- App not signed (check CSC_LINK and CSC_KEY_PASSWORD)
- App not notarized (check APPLE_ID and credentials)

### Notarization fails
- Check [notarization history](https://developer.apple.com/account/resources/notarizations)
- Review error logs
- Common issues: missing entitlements, unsigned libraries

### "No identity found" error
```bash
# List available identities
security find-identity -v -p codesigning
```

Should show your "Developer ID Application" certificate.

## Cost Summary

- Apple Developer Program: $99/year
- Code signing: Included
- Notarization: Included
- Distribution: Free (direct download or Mac App Store)

