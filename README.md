# Dingo Track

<div align="center">
  <a href="https://connerkward.github.io/trak/" target="_blank">
    <img src="landing-page/landing-page.png" alt="Dingo Track Landing Page" width="800" />
  </a>
  <p><em>Dingo Track - Mac menu bar time tracking with Google Calendar integration</em></p>
</div>

A Mac menu bar app for time tracking with Google Calendar integration.

## Features

- **Menu Bar Integration**: Lives in your Mac menu bar for quick access
- **Google Calendar Sync**: Automatically creates calendar events when timers are stopped
- **Persistent Timers**: Timers continue running even if the app is closed or computer is shut down
- **Multiple Timers**: Create and manage multiple named timers
- **Calendar Selection**: Choose which Google Calendar to create events in
- **Settings Management**: Configure timers and calendar visibility
- **Claude Desktop Integration**: Connect with Claude Desktop for natural language timer control

## Usage

### Main Interface

- Click the Dingo Track icon in the menu bar to open the main window
- View all configured timers with start/stop buttons
- Use the quick add form to create new timers
- Access settings and quit the app from the footer

### Settings Window

- Add new timers with custom names and calendar assignments
- Toggle calendar visibility in the main dropdown
- Edit or delete existing timers
- Connect with Claude Desktop

### Claude Desktop Integration

1. Click "Create Claude Desktop Config" in settings
2. Save the generated `.dxt` file
3. Install it in Claude Desktop to enable natural language timer control

## File Structure

```
src/
├── main/                      # Main process (Node.js/Electron)
│   ├── index.ts              # App entry point and window management
│   ├── bootstrap.ts          # Service bootstrapping
│   ├── services/             # Business logic services
│   │   ├── GoogleCalendarService.ts
│   │   ├── timerService.ts
│   │   └── StorageService.ts
│   └── utils/
│       └── ServiceContainer.ts
├── preload/                   # Preload scripts
│   └── index.ts              # Type-safe IPC bridge
├── renderer/                  # Frontend (React)
│   ├── main/                 # Main window
│   │   ├── App.tsx
│   │   └── index.html
│   ├── settings/             # Settings window
│   │   ├── Settings.tsx
│   │   └── index.html
│   └── shared/               # Shared renderer code
│       └── stores/
│           └── useAppStore.ts
├── shared/                    # Code shared between processes
│   └── types/
│       └── index.ts          # Shared TypeScript types
├── assets/                    # Icons and resources
├── scripts/                   # Build scripts
│   ├── inject-credentials.js # OAuth credential injection
│   └── notarize.js           # Custom notarization script
└── landing-page/             # Marketing website
    └── src/                  # React components for landing page
```

## Development

The app uses:
- **Electron** for the desktop wrapper and menu bar integration
- **React** for the user interface
- **TypeScript** for type safety in the main process
- **Google APIs** for calendar integration
- **electron-store** for persistent data storage

### Key Components

- **TimerService**: Manages timer state, persistence, and calendar event creation
- **GoogleCalendarService**: Handles OAuth and Google Calendar API calls
- **Main Process**: Manages windows, tray icon, and IPC communication
- **React Components**: Provide the user interface for timer management

See [PRODUCTION.md](./PRODUCTION.md) for detailed architecture and deployment decisions.

## License

This project is part of the every-time monorepo.