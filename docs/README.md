# Timer Tracker Landing Page

A modern, responsive landing page for the Timer Tracker Mac application. This landing page showcases the app's features with an interactive demo and provides download functionality.

## Features

- **Interactive Demo**: Clickable mock version of the actual app interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional design with smooth animations
- **Download Section**: Prominent DMG download with progress simulation
- **Feature Showcase**: Highlights key app capabilities

## Development

### Prerequisites

- Node.js 16+ 
- pnpm (recommended package manager)

### Running the Landing Page

From the timer-tracker directory:

```bash
# Development server
pnpm run dev:landing

# Build for production
pnpm run build:landing
```

The landing page will be available at:
- Development: http://localhost:5174
- Production: Built to `dist/landing-page/`

### Project Structure

```
landing-page/
├── index.html              # Main HTML file
├── vite.config.js          # Vite configuration
├── src/
│   ├── main.jsx           # React entry point
│   ├── LandingPage.jsx    # Main landing page component
│   ├── LandingPage.css    # Landing page styles
│   ├── MockDemo.jsx       # Interactive app demo
│   ├── Header.jsx         # Navigation header
│   ├── Features.jsx       # Features showcase
│   ├── DownloadSection.jsx # Download functionality
│   └── Footer.jsx         # Page footer
└── README.md              # This file
```

## Components

### MockDemo
The interactive demo component that replicates the actual app interface. Users can:
- Start/stop timers
- Add new tasks
- Switch between calendars
- Interact with the menu

### DownloadSection
Handles the DMG download functionality with:
- Progress simulation
- System requirements display
- Installation instructions

## Styling

The landing page uses:
- **Base styles**: Inherits from the main app's `App.css`
- **Custom styles**: Landing page specific styles in `LandingPage.css`
- **Responsive design**: Mobile-first approach with breakpoints
- **Modern CSS**: CSS Grid, Flexbox, and CSS custom properties

## Integration

The landing page is designed to:
- Use the same assets as the main app
- Maintain visual consistency
- Share component logic where appropriate
- Provide a seamless user experience

## Deployment

The landing page can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

Build the project and upload the contents of `dist/landing-page/` to your hosting provider. 