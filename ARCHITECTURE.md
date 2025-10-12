# Dingo Track - Modern Architecture

This document outlines the rearchitected Electron application following modern best practices.

## 🏗️ Architecture Overview

The application has been completely restructured to follow modern Electron development patterns:


### **1. File Structure**

```
src/
├── main/                      # Main process (Node.js/Electron)
│   ├── index.ts              # Main entry point  
│   ├── bootstrap.ts          # Service bootstrapping
│   ├── services/             # Business logic services
│   │   ├── interfaces.ts     # Service interfaces
│   │   ├── GoogleCalendarService.ts
│   │   ├── timerService.ts
│   │   └── StorageService.ts
│   └── utils/
│       └── ServiceContainer.ts # Dependency injection
├── preload/                   # Preload scripts
│   └── index.ts              # Type-safe IPC bridge
├── renderer/                  # Frontend (React)
│   ├── main/                 # Main window
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── index.html
│   ├── settings/             # Settings window
│   │   ├── Settings.tsx
│   │   ├── Settings.css
│   │   └── index.html
│   └── shared/               # Shared renderer code
│       ├── stores/
│       │   └── useAppStore.ts # Zustand state management
│       └── mock-api.js
├── shared/                    # Code shared between processes
│   └── types/
│       └── index.ts          # Shared type definitions
└── test/                     # Test infrastructure
    └── setup.ts              # Vitest setup
```

## 🔄 Key Improvements

### **1. TypeScript Migration**
- **Full TypeScript conversion** for all components
- **Type-safe IPC** communications with schema validation
- **Shared type definitions** between main and renderer processes
- **Proper generic types** for storage and API calls

### **2. Modern State Management**
- **Zustand store** for centralized state management
- **Automatic synchronization** between windows
- **Event-driven updates** for real-time data sync
- **Computed values** for derived state

### **3. Dependency Injection**
- **Service container** with type-safe token system
- **Interface-based services** for better testability
- **Singleton and transient** service lifecycles
- **Centralized bootstrapping** process

### **4. Service Architecture**
```typescript
// Service interfaces for clean contracts
interface ITimerService {
  getAllTimers(): Timer[];
  startStopTimer(name: string): Promise<TimerResult>;
  // ... other methods
}

// Dependency injection with type safety
serviceContainer.registerSingleton(
  SERVICE_TOKENS.TimerService,
  () => new TimerService()
);
```

### **5. Testing Infrastructure**
- **Vitest + Testing Library** for modern testing
- **Component tests** with proper mocking
- **Service unit tests** with isolated testing
- **Type-safe mocks** for window.api
- **Test coverage** reporting

## 🎯 Benefits

### **Developer Experience**
- ✅ **Type safety** across the entire application
- ✅ **Hot reload** in development with proper source maps
- ✅ **Testable architecture** with dependency injection
- ✅ **Modern tooling** (Vite, TypeScript, Vitest)

### **Code Quality**
- ✅ **Separation of concerns** with clear boundaries
- ✅ **Interface-driven design** for better contracts
- ✅ **Centralized state management** reducing complexity
- ✅ **Proper error handling** with type safety

### **Maintainability**
- ✅ **Clear file organization** following conventions
- ✅ **Modular services** that can be easily replaced
- ✅ **Comprehensive testing** for regression prevention
- ✅ **Documentation** with TypeScript interfaces

## 🔧 Development Workflow

### **Running the App**
```bash
npm run dev         # Development with hot reload
npm run build       # Production build
npm run test        # Run test suite
npm run test:ui     # Interactive test UI
```

### **Service Development**
1. Define interfaces in `src/main/services/interfaces.ts`
2. Implement services with proper error handling
3. Register services in `src/main/bootstrap.ts`
4. Write unit tests for all services

### **UI Development**
1. Use the Zustand store for state management
2. Components should be pure and testable
3. Type all props and state with shared types
4. Write component tests for critical paths

## 📊 Architecture Patterns

### **Main Process**
- **Service Container Pattern** for dependency management
- **Repository Pattern** for data persistence
- **Event-Driven Architecture** for OAuth flow
- **Factory Pattern** for service creation

### **Renderer Process**
- **Flux Pattern** with Zustand for state management
- **Component Pattern** for reusable UI elements
- **Hook Pattern** for shared logic
- **Observer Pattern** for IPC event handling

### **IPC Communication**
- **Type-safe channels** with schema validation
- **Promise-based** async communication
- **Event-driven** real-time updates
- **Error propagation** with proper typing

## 🔒 Security

- **Context isolation** enabled in all renderer processes
- **Node integration** disabled in renderer
- **Content Security Policy** through proper preload scripts
- **Secure IPC** with input validation

## 🚀 Performance

- **Tree shaking** with modern build tools
- **Code splitting** for renderer bundles
- **Lazy loading** for heavy components
- **Efficient state updates** with Zustand

## 📝 Type Safety

The entire application is now fully typed:

```typescript
// Shared types between processes
export interface Timer {
  name: string;
  calendarId: string;
}

// Type-safe IPC channels
export interface IPCChannels {
  'add-timer': (name: string, calendarId: string) => Promise<Timer>;
  'get-all-timers': () => Promise<Timer[]>;
}

// Type-safe state management
interface AppState {
  timers: Timer[];
  addTimer: (name: string, calendarId: string) => Promise<void>;
}
```

## 📚 Future Enhancements

The new architecture enables easy implementation of:
- **Plugin system** through dependency injection
- **Multiple UI themes** with centralized state
- **Real-time collaboration** with event-driven updates  
- **Offline support** with service worker patterns
- **A/B testing** with feature flags in state
- **Performance monitoring** with service instrumentation

## 🎨 UI/UX Preservation

**Critical**: All styling and behavior has been preserved exactly as requested:
- ✅ **Settings and App components** look and function identically
- ✅ **CSS files** maintained without changes
- ✅ **User interactions** work exactly the same
- ✅ **Window management** preserved (tray, positioning, etc.)
- ✅ **Google Calendar integration** functionality intact

The rearchitecture is purely internal - users will see no difference in functionality or appearance.

---

## 🚢 Production Deployment Architecture

### Build Pipeline

```
Development → Build → Injection → Packaging → Signing → Notarization → Distribution
```

**1. Development (`pnpm dev`)**
- electron-vite with hot reload
- TypeScript compilation with watch
- React Fast Refresh
- Mock API for OAuth testing

**2. Build (`electron-vite build`)**
- Compile TypeScript main process → `out/main/index.js`
- Bundle React renderer → `out/renderer/`
- Copy assets to `out/`

**3. Credential Injection (`scripts/inject-credentials.js`)**
- Read `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from environment
- Replace env var lookups in compiled JavaScript with hardcoded values
- Ensures distributed app has working OAuth without .env file

**4. Packaging (`electron-builder`)**
- Bundle app into ASAR archive
- Create universal binary (x64 + arm64)
- Sign with Developer ID certificate

**5. Notarization (`scripts/notarize.js` via `afterSign` hook)**
- Upload to Apple's notarization service
- Wait for approval (2-10 minutes)
- Staple notarization ticket

**6. Distribution**
- Output: `dist-electron/Dingo Track-{version}-universal.dmg`
- Upload to GitHub Releases
- Copy to landing page for download

### Credential Management Strategy

**Problem:** Environment variables don't exist in distributed apps.

**Solution:** Inject credentials at build time into compiled JavaScript.

```javascript
// Before injection (compiled TypeScript):
this.clientId = process.env.GOOGLE_CLIENT_ID || process.env.DIST_GOOGLE_CLIENT_ID || "";

// After injection (post-processed):
this.clientId = "123456789-abc.apps.googleusercontent.com";
```

**Security model:**
- Client ID is public (visible in OAuth flow anyway)
- Client Secret protected by:
  - GitHub Secrets in CI/CD
  - `.env` file (gitignored) locally
  - Only exists in compiled code, not source

### ASAR Packaging Rationale

**Decision:** Enable ASAR (`"asar": true` in package.json)

**Benefits:**
- 50% faster app loading (single file vs thousands)
- Reduced file I/O overhead
- Standard for production Electron apps
- Required for credential injection approach

**Trade-off:** Files inside ASAR cannot be modified after packaging (acceptable for production builds).

### Universal Binary Strategy

**Decision:** Build single DMG for both Intel and Apple Silicon

```json
"mac": {
  "target": [{ "target": "dmg", "arch": ["universal"] }]
}
```

**Process:**
1. electron-builder creates `mac-x64-temp/` (Intel build)
2. electron-builder creates `mac-arm64-temp/` (ARM build)
3. Binaries merged with `lipo` → `mac-universal/`
4. Custom notarization script skips `-temp` directories
5. Only final merged app is notarized

**Benefits:**
- One download for all Mac users
- Native performance on both architectures
- Simpler version management

**Trade-off:** ~2x DMG size (acceptable for desktop app, ~100MB total).

### Code Signing & Notarization

**Certificate:** Developer ID Application (not Mac App Store)
- Allows direct download distribution
- No App Store review process
- Required for Gatekeeper approval

**Custom notarization script rationale:**
- electron-builder's built-in notarization had environment variable loading issues
- Custom script provides:
  - Explicit credential loading from `.env` or environment
  - Skip temporary build directories
  - Better error messages
  - Works reliably in both local and CI environments

**See [PRODUCTION.md](./PRODUCTION.md) for detailed deployment architecture and [CODE_SIGNING.md](./CODE_SIGNING.md) for setup instructions.**