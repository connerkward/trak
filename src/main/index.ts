import * as electron from 'electron';
import type { Tray as TrayType, BrowserWindow as BrowserWindowType } from 'electron';
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell, nativeImage, screen } = electron;
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as archiver from 'archiver';
import * as path from 'path';
import { homedir } from 'os';
import { GoogleCalendarServiceSimple } from './services/GoogleCalendarService';
import { TimerService } from './services/timerService';
import { serviceContainer, SERVICE_TOKENS } from './utils/ServiceContainer';
import { bootstrapServices, initializeUserContext, setupOAuthEventListeners, cleanupServices } from './bootstrap';

// Load environment variables from .env file
import dotenv from 'dotenv';

// Load .env file - handle both development and production paths
// Check for electron-vite development or original build system
const isDev = process.env.NODE_ENV === 'development';
console.log('🔍 Development mode check:', { isDev, NODE_ENV: process.env.NODE_ENV, __dirname });
let envPath: string;

if (isDev) {
  // Development: electron-vite (out/main) or original (dist/desktop) -> app root
  envPath = path.join(__dirname, '..', '..', '.env');
} else {
  // Production: app.asar -> app root (when asar is disabled)
  envPath = path.join(process.resourcesPath, 'app', '.env');
}

dotenv.config({ path: envPath });

// Debug: Log if environment variables are loaded
console.log('Environment check:', {
  isDev,
  hasClientId: !!process.env.GOOGLE_CLIENT_ID,
  hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
  envPath,
  clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
  clientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0
});

let tray: (TrayType & { clickTimeout?: NodeJS.Timeout }) | null = null;
let mainWindow: BrowserWindowType | null = null;
let settingsWindow: BrowserWindowType | null = null;
let lastAuthRequestingWindowId: number | null = null;

// Services - now managed by DI container
let googleCalendarService: GoogleCalendarServiceSimple;
let timerService: TimerService;

// Storage file watcher for MCP changes
let storageWatcher: fs.FSWatcher | null = null;

// MCP HTTP polling for zero-latency updates
let mcpPollInterval: NodeJS.Timeout | null = null;
let lastKnownMcpTimestamp = 0;

async function initializeServices() {
  try {
    // Bootstrap all services with dependency injection
    bootstrapServices();
    setupOAuthEventListeners();
    
    // Get service instances from container
    googleCalendarService = serviceContainer.get<GoogleCalendarServiceSimple>(SERVICE_TOKENS.GoogleCalendarService);
    timerService = serviceContainer.get<TimerService>(SERVICE_TOKENS.TimerService);
    
    // Set up auth success callback to notify all windows
    googleCalendarService.setAuthSuccessCallback(() => {
      console.log('🔐 Auth success callback triggered - setting timer service user and notifying all windows');
      
      // IMMEDIATELY set the timer service user to prevent race condition
      const currentUserId = googleCalendarService.getCurrentUserId();
      if (currentUserId) {
        timerService.setCurrentUser(currentUserId);
        console.log('Timer service user set to:', currentUserId);
      } else {
        console.error('No current user ID available after auth!');
      }
      
      // Notify all windows that OAuth completed successfully
      BrowserWindow.getAllWindows().forEach(window => {
        console.log('Sending oauth-success to window:', window.id);
        window.webContents.send('oauth-success');
      });

      // Restore focus to the window that initiated OAuth
      try {
        const targetId = lastAuthRequestingWindowId;
        lastAuthRequestingWindowId = null; // reset

        if (targetId) {
          const target = BrowserWindow.getAllWindows().find(w => w.id === targetId) || null;
          if (target && !target.isDestroyed()) {
            if (settingsWindow && target.id === settingsWindow.id) {
              settingsWindow.show();
              settingsWindow.focus();
            } else if (mainWindow && target.id === mainWindow.id) {
              // If the menu bar window initiated the flow, show it in place
              showMainWindow();
            } else {
              target.show();
              target.focus();
            }
            return;
          }
        }

        // Fallback: focus app and show main window
        app.focus({ steal: true } as any);
        if (mainWindow && !mainWindow.isDestroyed()) {
          showMainWindow();
        }
      } catch (e) {
        console.warn('Focus restore failed:', e);
      }
    });
    
    // Initialize user context if already authenticated
    await initializeUserContext(isDev);

    // Set up MCP file watcher (fallback) and HTTP polling (primary, zero-latency)
    setupStorageWatcher();
    setupMcpPolling();

    // Set up OAuth completion handler
    const oauthEmitter = serviceContainer.get<EventEmitter>(SERVICE_TOKENS.EventEmitter);
    oauthEmitter.on('oauth-completed', async (data: any) => {
      console.log('OAuth completed - notifying all windows', data);
      
      // Get the current user ID and set it in both services
      try {
        const userId = googleCalendarService.getCurrentUserId();
        if (userId) {
          console.log('Setting current user:', userId);
          googleCalendarService.setCurrentUser(userId);
          timerService.setCurrentUser(userId);
        }
      } catch (error) {
        console.error('Error getting user ID:', error);
      }
      
      // Notify all windows that authentication succeeded
      BrowserWindow.getAllWindows().forEach(window => {
        console.log('Sending oauth-success to window:', window.id);
        window.webContents.send('oauth-success');
      });
    });
  } catch (error) {
    console.error('Failed to initialize services:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errorMessage);
    
    // Show error dialog to user
    dialog.showErrorBox(
      'Initialization Error', 
      `Failed to start Dingo Track due to missing dependencies.\n\nError: ${errorMessage}\n\nPlease reinstall the application.`
    );
    
    // Exit the app
    app.quit();
    process.exit(1);
  }
}

// Storage file watcher setup - watches timer storage for MCP changes
function setupStorageWatcher() {
  try {
    const storageDir = app.getPath('userData');
    const timerFile = 'dingo-track-timers.json';

    console.log('🔔 Setting up storage watcher at:', storageDir);

    // Watch the entire directory for changes to the timer file
    storageWatcher = fs.watch(storageDir, (eventType, filename) => {
      if (filename === timerFile || filename === `${timerFile}.tmp`) {
        // Timer storage was modified (by MCP server or internally)
        console.log('📁 Storage file changed, refreshing all windows');

        // Debounce: wait a bit to ensure file write is complete
        setTimeout(() => {
          // Notify all windows to refresh their data
          BrowserWindow.getAllWindows().forEach(window => {
            if (!window.isDestroyed()) {
              window.webContents.send('data-changed');
            }
          });
        }, 150);
      }
    });

    console.log('✅ Storage watcher started');
  } catch (error) {
    console.error('Failed to setup storage watcher:', error);
  }
}

// MCP HTTP polling setup - polls MCP server for instant updates (standard MCP pattern)
function setupMcpPolling() {
  const MCP_HTTP_PORT = 3123;
  const POLL_INTERVAL_MS = 500; // Poll every 500ms for near-instant updates

  console.log('🌐 Setting up MCP HTTP polling on port', MCP_HTTP_PORT);

  mcpPollInterval = setInterval(async () => {
    try {
      const response = await fetch(`http://localhost:${MCP_HTTP_PORT}/last-change`);
      if (!response.ok) return; // MCP server not running, that's okay

      const data = await response.json() as { timestamp: number };

      // Check if timestamp changed (MCP made an update)
      if (data.timestamp > lastKnownMcpTimestamp) {
        const latency = Date.now() - data.timestamp;
        console.log(`⚡ MCP change detected via HTTP polling! Timestamp: ${data.timestamp}, Latency: ${latency}ms`);
        lastKnownMcpTimestamp = data.timestamp;

        // Reload activeTimers from storage (MCP might have changed them)
        timerService.reloadActiveTimers();

        // Immediately notify all windows
        const windows = BrowserWindow.getAllWindows();
        console.log(`   📢 Notifying ${windows.length} window(s) of data change`);
        windows.forEach(window => {
          if (!window.isDestroyed()) {
            console.log(`   → Sending 'data-changed' to window ${window.id}`);
            window.webContents.send('data-changed');
          }
        });
      }
    } catch (error) {
      // MCP server not running or unreachable - this is normal if MCP isn't active
      // No need to log errors, just silently skip
    }
  }, POLL_INTERVAL_MS);

  console.log('✅ MCP HTTP polling started');
}

function createTray(): void {
  const fs = require('fs');
  // Use Electron template naming on macOS
  const isMac = process.platform === 'darwin';
  const fileName = isMac ? 'tray-iconTemplate.png' : 'tray-icon.png';
  const iconPath = path.join(__dirname, '../../assets', fileName);
  console.log('Loading tray icon from:', iconPath);
  if (!fs.existsSync(iconPath)) {
    console.error('Tray icon not found:', iconPath);
    return;
  }
  // Pass the file path directly; Electron will handle template naming on macOS
  tray = new Tray(iconPath);
  tray.setToolTip('Dingo Track');

  // Create main window when tray is clicked
  tray.on('click', (event, bounds) => {
    // Prevent double-click issues by debouncing
    if (tray && tray.clickTimeout) {
      clearTimeout(tray.clickTimeout);
    }
    
    if (tray) {
      tray.clickTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isVisible()) {
          hideMainWindowWithAnimation();
        } else {
          showMainWindow(bounds);
        }
      } else {
        createMainWindow(bounds);
      }
    }, 50);
    }
  });

  // Right-click context menu with timer controls and quit option
  tray.on('right-click', () => {
    const timers = timerService.getAllTimers();
    const activeTimers = timerService.getActiveTimers();
    
    const menuItems: Electron.MenuItemConstructorOptions[] = [];
    
    // Add timer menu items
    if (timers.length > 0) {
      timers.forEach((timer) => {
        const isActive = timer.name in activeTimers;
        menuItems.push({
          label: `${isActive ? '⏸️ Stop' : '▶️ Start'} ${timer.name}`,
          click: async () => {
            try {
              await timerService.startStopTimer(timer.name);
              // Notify all windows of data change
              BrowserWindow.getAllWindows().forEach(window => {
                if (!window.isDestroyed()) {
                  window.webContents.send('data-changed');
                }
              });
            } catch (error) {
              console.error('Error starting/stopping timer:', error);
            }
          }
        });
      });
      menuItems.push({ type: 'separator' });
    }
    
    // Add settings option
    menuItems.push({
      label: '⚙️ Settings',
      click: () => {
        createSettingsWindow();
        // Hide the main window when settings opens
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
          hideMainWindowWithAnimation();
        }
      }
    });
    
    menuItems.push({ type: 'separator' });
    
    // Add quit option
    menuItems.push({
      label: 'Quit',
      click: () => {
        app.quit();
      }
    });
    
    const contextMenu = Menu.buildFromTemplate(menuItems);
    tray?.popUpContextMenu(contextMenu);
  });
}

function createMainWindow(trayBounds?: Electron.Rectangle): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    showMainWindow(trayBounds);
    return;
  }

  // Load custom app icon
  const appIconPath = path.join(__dirname, '../../assets/app-icon.png');
  const appIcon = nativeImage.createFromPath(appIconPath);

  mainWindow = new BrowserWindow({
    width: 300,
    height: 360,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    vibrancy: 'sidebar',
    skipTaskbar: true,
    focusable: true,
    icon: appIcon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload', 'index.js')
    },
    show: false
  });

  // Make window appear on current Space instead of switching Spaces
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Load the main renderer HTML
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/main/');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/main/index.html'));
  }
  
  // Open DevTools in development for debugging
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Handle keyboard shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Close window with Escape key
    if (input.key === 'Escape' && input.type === 'keyDown') {
      if (mainWindow && !mainWindow.isDestroyed()) {
        hideMainWindowWithAnimation();
      }
    }
  });

  mainWindow.once('ready-to-show', () => {
    showMainWindow(trayBounds);
    
    // Open DevTools in development for debugging
    if (isDev && mainWindow) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    
    // Force data refresh when main window opens
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('data-changed');
        console.log('📡 Sent initial data-changed to main window on open');
      }
    }, 200);
  });

  // Handle losing focus/clicking outside - with delay to prevent immediate closing
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
      // Add a delay to allow for tray icon click completion
      setTimeout(() => {
        // Only hide if window is still not focused and visible
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isFocused() && 
            mainWindow.isVisible() && !mainWindow.webContents.isDevToolsOpened()) {
          hideMainWindowWithAnimation();
        }
      }, 150); // Increased delay to allow tray click to complete
    }
  });

  // Additional event for more reliable click-outside detection
  mainWindow.on('focus', () => {
    // Track when window gains focus to ensure proper state
  });

  // Global blur detection as backup
  const handleMainWindowBlur = () => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && 
        !mainWindow.isFocused() && !mainWindow.webContents.isDevToolsOpened()) {
      setTimeout(() => {
        // Double-check focus state after a brief delay
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isFocused() && 
            mainWindow.isVisible() && !mainWindow.webContents.isDevToolsOpened()) {
          hideMainWindowWithAnimation();
        }
      }, 100);
    }
  };

  // Listen for when main window loses focus specifically
  mainWindow.on('blur', handleMainWindowBlur);

  mainWindow.on('closed', () => {
    // Clean up event listener
    mainWindow?.removeListener('blur', handleMainWindowBlur);
    mainWindow = null;
  });
}



function showMainWindow(providedTrayBounds?: Electron.Rectangle): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow(providedTrayBounds);
    return;
  }

  const trayBounds = providedTrayBounds || tray?.getBounds();
  const windowBounds = mainWindow.getBounds();
  
  if (trayBounds) {
    // Get the current display
    const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
    const { workArea } = display;
    
    // Calculate ideal position (centered under tray icon)
    let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    let y = Math.round(trayBounds.y + trayBounds.height + 5);
    
    // Handle screen edge detection and adjustment
    // Right edge
    if (x + windowBounds.width > workArea.x + workArea.width) {
      x = workArea.x + workArea.width - windowBounds.width - 10;
    }
    
    // Left edge
    if (x < workArea.x) {
      x = workArea.x + 10;
    }
    
    // Bottom edge - position above tray if not enough space below
    if (y + windowBounds.height > workArea.y + workArea.height) {
      y = trayBounds.y - windowBounds.height - 5;
    }
    
    // Top edge fallback
    if (y < workArea.y) {
      y = workArea.y + 10;
    }
    
    mainWindow.setPosition(x, y);
  }
  
  // Smooth animation on show
  mainWindow.setOpacity(0);
  mainWindow.show();
  mainWindow.focus();
  
  // Fade in animation
  let opacity = 0;
  const fadeIn = setInterval(() => {
    opacity += 0.1;
    if (opacity >= 1) {
      opacity = 1;
      clearInterval(fadeIn);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setOpacity(opacity);
    }
  }, 10);
}

function hideMainWindowWithAnimation(): void {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) {
    return;
  }

  // Fade out animation
  let opacity = 1;
  const fadeOut = setInterval(() => {
    opacity -= 0.15;
    if (opacity <= 0) {
      opacity = 0;
      clearInterval(fadeOut);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
        mainWindow.setOpacity(1); // Reset for next show
      }
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setOpacity(opacity);
    }
  }, 10);
}

function createSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  // Hide the main window when opening settings
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }

  settingsWindow = new BrowserWindow({
    width: 400,
    height: 500,
    resizable: false,
    title: 'Dingo Track Settings',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload', 'index.js')
    },
    show: false
  });

  // Load the settings renderer HTML
  if (isDev) {
    settingsWindow.loadURL('http://localhost:5173/settings/');
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../renderer/settings/index.html'));
  }

  settingsWindow.once('ready-to-show', () => {
    // Give the page a moment to load auth state before showing
    setTimeout(() => {
      settingsWindow?.show();
      // Force data refresh when settings window opens
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.webContents.send('data-changed');
        console.log('📡 Sent initial data-changed to settings window on open');
      }
    }, 100);
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// Setup IPC handlers (called after app is ready and services are initialized)
function setupIPCHandlers() {
ipcMain.handle('get-calendars', async () => {
  const calendars = await googleCalendarService.getCalendars();
  
  // Sync timer service user state when calendars are available
  if (calendars.length > 0 && !timerService.getCurrentUserId()) {
    console.log('Calendars loaded, syncing timer service user state');
    timerService.setCurrentUser('default');
  }
  
  return calendars;
});

ipcMain.handle('start-auth', async (event) => {
  try {
    const result = await googleCalendarService.authenticate();
    
    if (result.authUrl) {
      // Remember which window initiated the OAuth flow
      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        lastAuthRequestingWindowId = win ? win.id : null;
      } catch {}

      // Open the auth URL in the default browser
      await shell.openExternal(result.authUrl);
      
      // The local server will handle the callback automatically
      // No need to wait, just return success
      return { success: true };
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
});

ipcMain.handle('set-auth-code', async (event, authCode: string) => {
  try {
    const tokens = await googleCalendarService.setAuthCode(authCode);
    
    // Ensure both services have the same user set after auth
    const userId = googleCalendarService.getCurrentUserId();
    if (userId) {
      console.log('Setting current user after auth:', userId);
      timerService.setCurrentUser(userId);
    } else {
      console.error('No user ID available after setAuthCode!');
    }
    
    // Notify all windows that OAuth completed successfully
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('oauth-success');
    });
    
    return true;
  } catch (error) {
    console.error('Error setting auth code:', error);
    return false;
  }
});

ipcMain.handle('logout', async () => {
  try {
    await googleCalendarService.logout();
    
    // Clear current user from both services
    googleCalendarService.setCurrentUser(null);
    timerService.setCurrentUser(null);
    
    // Notify all windows that logout completed
    BrowserWindow.getAllWindows().forEach(window => {
      console.log('Sending logout-success to window:', window.id);
      window.webContents.send('logout-success');
    });
    
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
});

ipcMain.handle('get-all-timers', async () => {
  const currentUser = timerService.getCurrentUserId();
  const timers = timerService.getAllTimers();
  console.log(`📊 get-all-timers: currentUser="${currentUser}", timers count=${timers.length}`);
  return timers;
});

ipcMain.handle('get-active-timers', async () => {
  const activeTimers = timerService.getActiveTimers();
  console.log(`📊 get-active-timers: activeTimers=`, activeTimers);
  return activeTimers;
});

ipcMain.handle('add-timer', async (event, name: string, calendarId: string) => {
  console.log(`🔧 add-timer IPC handler called: name="${name}", calendarId="${calendarId}"`);
  
  try {
    const result = timerService.addTimer(name, calendarId);
    console.log(`✅ Timer added successfully:`, result);
    
    // Notify all windows of data change
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('data-changed');
    });
    
    return result;
  } catch (error) {
    console.error(`❌ Error in add-timer handler:`, error);
    throw error;
  }
});

ipcMain.handle('save-timer', async (event, name: string, calendarId: string) => {
  try {
    const result = timerService.saveTimer(name, calendarId);
    
    // Notify all windows of data change
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('data-changed');
    });
    
    return result;
  } catch (error) {
    console.error('Error in save-timer handler:', error);
    throw error;
  }
});

ipcMain.handle('rename-timer', async (event, oldName: string, newName: string, calendarId: string) => {
  try {
    const result = timerService.renameTimer(oldName, newName, calendarId);
    
    // Notify all windows of data change
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('data-changed');
    });
    
    return result;
  } catch (error) {
    console.error('Error in rename-timer handler:', error);
    throw error;
  }
});

ipcMain.handle('delete-timer', async (event, name: string) => {
  try {
    const result = timerService.deleteTimer(name);
    
    // Notify all windows of data change
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('data-changed');
    });
    
    return result;
  } catch (error) {
    console.error('Error in delete-timer handler:', error);
    throw error;
  }
});

ipcMain.handle('start-stop-timer', async (event, name: string) => {
  return timerService.startStopTimer(name);
});

ipcMain.handle('open-settings', () => {
  console.log('open-settings IPC handler called');
  createSettingsWindow();
  // Hide the main window when settings opens
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    hideMainWindowWithAnimation();
  }
});

ipcMain.handle('hide-main-window', () => {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    hideMainWindowWithAnimation();
  }
});

ipcMain.handle('quit-app', () => {
  console.log('quit-app IPC handler called');
  app.quit();
});

// Open at login controls
ipcMain.handle('get-open-at-login', () => {
  try {
    const settings = app.getLoginItemSettings();
    return !!settings.openAtLogin;
  } catch {
    return false;
  }
});

ipcMain.handle('set-open-at-login', (event, enabled: boolean) => {
  try {
    app.setLoginItemSettings({ openAtLogin: !!enabled, openAsHidden: true });
    const settings = app.getLoginItemSettings();
    return !!settings.openAtLogin;
  } catch {
    return false;
  }
});

// Dock icon visibility (macOS only)
ipcMain.handle('get-dock-icon-visible', () => {
  if (process.platform !== 'darwin') return false;
  try {
    return app.dock.isVisible();
  } catch {
    return false;
  }
});

ipcMain.handle('set-dock-icon-visible', (event, visible: boolean) => {
  if (process.platform !== 'darwin') return false;
  try {
    if (visible) {
      // Ensure Dock icon uses the .icns asset when showing
      try {
        const icnsPath = path.join(__dirname, '../../assets/app-icon.icns');
        if (fs.existsSync(icnsPath)) {
          const iconImage = nativeImage.createFromPath(icnsPath);
          if (!iconImage.isEmpty()) {
            app.dock.setIcon(iconImage);
          }
        }
      } catch {}
      app.dock.show();
    } else {
      app.dock.hide();
    }
    return app.dock.isVisible();
  } catch {
    return false;
  }
});

ipcMain.handle('open-dxt-file', async () => {
  const dxtContent = `{
      "name": "dingo-track-mcp",
        "description": "MCP server for Dingo Track integration with Claude Desktop",
  "version": "1.0.0",
  "type": "stdio",
  "command": "node",
  "args": ["${path.join(__dirname, 'mcp-server.js')}"],
  "capabilities": {
    "tools": true,
    "prompts": true
  }
}`;

  const result = await dialog.showSaveDialog({
          title: 'Save Dingo Track MCP Configuration',
          defaultPath: 'dingo-track-mcp.dxt',
    filters: [
      { name: 'Desktop Extension Files', extensions: ['dxt'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, dxtContent);
    shell.openExternal(`file://${result.filePath}`);
  }
});

// Generate MCPB bundle for Claude Desktop
ipcMain.handle('generate-mcp-config', async () => {
  try {
    const AdmZip = require('adm-zip');

    // Determine the correct path to the MCP server based on environment
    const mcpServerPath = isDev
      ? path.join(__dirname, '..', '..', 'out', 'main', 'mcp-server.js')
      : path.join(process.resourcesPath, 'app.asar', 'out', 'main', 'mcp-server.js');

    // Create MCPB manifest according to spec
    const manifest = {
      manifest_version: "0.2",
      name: "dingo-track",
      version: "1.0.0",
      display_name: "Dingo Track",
      description: "Time tracking with Google Calendar integration. Control your timers and track time directly from Claude.",
      author: {
        name: "Every Time",
        url: "https://github.com/yourusername/trak"
      },
      server: {
        type: "node",
        entry_point: "mcp-server.js",
        mcp_config: {
          command: "node",
          args: ["${__dirname}/mcp-server.js"],
          env: {}
        }
      },
      tools: [
        { name: "list_timers", description: "List all configured timers" },
        { name: "add_timer", description: "Add a new timer with calendar association" },
        { name: "delete_timer", description: "Delete a timer by name" },
        { name: "get_active_timers", description: "Get currently running timers" },
        { name: "list_calendars", description: "List Google Calendars" },
        { name: "get_timer_status", description: "Get timer status and duration" },
        { name: "start_stop_timer", description: "Start or stop a timer by name" }
      ],
      compatibility: {
        runtime: {
          node: ">=16.0.0"
        }
      }
    };

    // Create zip file
    const zip = new AdmZip();

    // Add manifest.json to root
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'));

    // Add the MCP server to the root of the bundle
    const serverCode = fs.readFileSync(mcpServerPath);
    zip.addFile('mcp-server.js', serverCode);

    // Get the downloads folder
    const downloadsPath = app.getPath('downloads');
    const mcpbPath = path.join(downloadsPath, 'dingo-track.mcpb');

    // Write the MCPB file
    zip.writeZip(mcpbPath);

    // Open MCPB for install; if fails, reveal in folder
    const openResult = await shell.openPath(mcpbPath);
    if (openResult) shell.showItemInFolder(mcpbPath);

    return { success: true, path: mcpbPath };
  } catch (error) {
    console.error('Failed to generate MCPB:', error);
    throw error;
  }
});

// Data change notifications
ipcMain.on('notify-data-changed', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('data-changed');
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('data-changed');
  }
});

ipcMain.on('notify-calendar-change', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('data-changed');
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('data-changed');
  }
});
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    // Initialize services first (must be after app is ready)
    await initializeServices();

    // Setup IPC handlers after services are ready
    setupIPCHandlers();

    // Configure as menu bar app on all platforms
    if (process.platform === 'darwin') {
      // Set macOS Dock icon and show Dock by default
      try {
        const icnsPath = path.join(__dirname, '../../assets/app-icon.icns');
        if (fs.existsSync(icnsPath)) {
          const iconImage = nativeImage.createFromPath(icnsPath);
          if (!iconImage.isEmpty()) {
            app.dock.setIcon(iconImage);
          }
        }
        app.dock.show();
      } catch (e) {
        console.warn('Failed to set/show Dock icon:', e);
      }
    }

    // Completely remove menu on all platforms
    Menu.setApplicationMenu(null);

    createTray();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Show error dialog to user
    dialog.showErrorBox(
      'App Initialization Error',
      `Dingo Track failed to start properly.\n\nError: ${errorMessage}\n\nThe app will now close.`
    );

    // Exit the app
    app.quit();
    process.exit(1);
  }
}).catch((error) => {
  console.error('App failed to become ready:', error);
  
  // Show error dialog to user  
  dialog.showErrorBox(
    'Startup Error', 
    `Dingo Track failed to start.\n\nError: ${error.message}\n\nPlease reinstall the application.`
  );
  
  // Exit the app
  app.quit();
  process.exit(1);
});

app.on('window-all-closed', () => {
  // Prevent app from quitting - we're a menu bar app
});

app.on('before-quit', () => {
  // Clean up services
  cleanupServices();

  // Clean up storage watcher
  if (storageWatcher) {
    storageWatcher.close();
    storageWatcher = null;
  }

  // Clean up MCP polling
  if (mcpPollInterval) {
    clearInterval(mcpPollInterval);
    mcpPollInterval = null;
  }

  // Clean up tray
  if (tray && !tray.isDestroyed()) {
    if (tray.clickTimeout) {
      clearTimeout(tray.clickTimeout);
    }
    tray.destroy();
    tray = null;
  }
});

// Security
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
});