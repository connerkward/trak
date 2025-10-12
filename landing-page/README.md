# Dingo Track Landing Page

Marketing website for Dingo Track, built with React and Vite. Includes landing page, privacy policy, and terms of service.

## Development

```bash
# Start development server
pnpm dev:landing

# Build for production (GitHub Pages)
pnpm build:landing:prod
```

## Structure

```
landing-page/
├── src/
│   ├── LandingPage.jsx          # Main landing page
│   ├── PrivacyPolicy.jsx        # Privacy Policy page
│   ├── TermsOfService.jsx       # Terms of Service page
│   ├── main.jsx                 # Entry point for landing page
│   ├── privacy-main.jsx         # Entry point for privacy policy
│   └── terms-main.jsx           # Entry point for terms of service
├── public/                      # Static assets
│   └── downloads/              # DMG files (added by GitHub Actions)
├── index.html                   # Landing page HTML
├── privacy-policy.html          # Privacy Policy HTML
└── terms-of-service.html        # Terms of Service HTML
```

## Pages

### Landing Page
- Main marketing page with features, demo, and download button
- URL: `https://connerkward.github.io/trak/`

### Privacy Policy
- Required for Google OAuth verification
- URL: `https://connerkward.github.io/trak/privacy-policy.html`

### Terms of Service
- Legal terms and Google API compliance
- URL: `https://connerkward.github.io/trak/terms-of-service.html`

## GitHub Actions Integration

The landing page is automatically built and deployed via `.github/workflows/deploy-landing.yml` when:
- Changes are pushed to the `main` branch
- The workflow is manually triggered

**Workflow steps:**
1. Build signed & notarized DMG on macOS runner
2. Copy DMG to `landing-page/public/downloads/`
3. Build landing page with production base path (`/trak/`)
4. Deploy to GitHub Pages

## Download Links

The DMG file is available at:
- Development: `http://localhost:5174/downloads/Dingo Track-{version}-universal.dmg`
- Production: `https://connerkward.github.io/trak/downloads/Dingo Track-{version}-universal.dmg`

Download buttons automatically use the correct URL based on `process.env.NODE_ENV`.

## Build Configuration

### vite.config.js

```javascript
rollupOptions: {
  input: {
    main: resolve(__dirname, 'index.html'),
    privacy: resolve(__dirname, 'privacy-policy.html'),
    terms: resolve(__dirname, 'terms-of-service.html')
  }
}
```

Builds three separate HTML pages with shared React components. 