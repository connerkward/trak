# Timer Tracker Landing Page

This is the landing page for the Timer Tracker Mac app, built with React and Vite.

## Development

```bash
# Start development server
pnpm dev:landing

# Build for production
pnpm build:landing

# Build for GitHub Pages (with correct base path)
pnpm build:landing:gh-pages
```

## Structure

- `src/` - React components and styles
- `public/` - Static assets (DMG files will be placed here by GitHub Actions)
- `index.html` - Entry point

## GitHub Actions Integration

The landing page is automatically built and deployed via GitHub Actions when:
- Changes are pushed to the `main` branch
- The workflow is manually triggered

The workflow:
1. Builds the desktop app DMG on macOS
2. Builds the landing page on Ubuntu
3. Copies the DMG to the landing page for download
4. Deploys to GitHub Pages

## Download Links

The DMG file will be available at:
- Development: `/downloads/Timer Tracker-1.0.0.dmg`
- Production: `/trak/downloads/Timer Tracker-1.0.0.dmg`

All download buttons on the landing page will automatically use the correct URL based on the environment. 