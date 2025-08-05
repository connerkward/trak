import { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell, nativeImage, screen } from 'electron';
import * as fs from 'fs';
import { GoogleCalendarService } from './googleCalendarService';
import { TimerService } from './timerService';
import Store from 'electron-store';

// Load environment variables from .env file
import dotenv from 'dotenv';
import * as path from 'path';

// Load .env file - handle both development and production paths
const isDev = !app.isPackaged;
let envPath: string;

if (isDev) {
  // Development: dist/desktop -> app root
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

let tray: (Tray & { clickTimeout?: NodeJS.Timeout }) | null = null;
let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
const store = new Store();

// Services with error handling
let googleCalendarService: GoogleCalendarService;
let timerService: TimerService;

try {
  // Set up OAuth event emitter for communication between service and main
  const { EventEmitter } = require('events');
  const oauthEmitter = new EventEmitter();
  (global as any).oauthEmitter = oauthEmitter;
  
  googleCalendarService = new GoogleCalendarService();
  timerService = new TimerService(store, googleCalendarService);
  
  // Initialize timer service
  timerService.initialize();
  
  // If user is already authenticated, set the current user
  if (googleCalendarService.isAuthenticated()) {
    try {
      const userId = googleCalendarService.getCurrentUserId();
      if (userId) {
        console.log('User already authenticated, setting current user:', userId);
        googleCalendarService.setCurrentUser(userId);
        timerService.setCurrentUser(userId);
      }
    } catch (error) {
      console.error('Error getting user ID on startup:', error);
    }
  }
  
  // Listen for OAuth completion events
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
    `Failed to start Timer Tracker due to missing dependencies.\n\nError: ${errorMessage}\n\nPlease reinstall the application.`
  );
  
  // Exit the app
  app.quit();
  process.exit(1);
}

function createTray(): void {
  // Create tray with custom icon
  const iconPath = path.join(__dirname, '../../assets/tray-icon-16.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon);
  tray.setToolTip('Timer Tracker');

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

  // No context menu - use only click behavior
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
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // For now, use index.html until we build main.html
  mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  
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
  });

  // Handle losing focus/clicking outside
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
      hideMainWindowWithAnimation();
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
    title: 'Timer Tracker Settings',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  if (isDev) {
    settingsWindow.loadFile(path.join(__dirname, '../../dist/renderer/settings.html'));
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../../dist/renderer/settings.html'));
  }

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// IPC handlers
ipcMain.handle('get-calendars', async () => {
  return await googleCalendarService.getCalendars();
});

ipcMain.handle('start-auth', async () => {
  try {
    const result = await googleCalendarService.authenticate();
    
    if (result.authUrl) {
      // Open the auth URL in the default browser
      await shell.openExternal(result.authUrl);
      return { success: true };
    } else if (result.success) {
      return { success: true };
    } else {
      throw new Error(result.error || 'Authentication failed');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
});

ipcMain.handle('set-auth-code', async (event, authCode: string) => {
  const result = await googleCalendarService.setAuthCode(authCode);
  
  if (result) {
    // Notify all windows that OAuth completed successfully
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('oauth-success');
    });
  }
  
  return result;
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
  return timerService.getAllTimers();
});

ipcMain.handle('get-active-timers', async () => {
  return timerService.getActiveTimers();
});

ipcMain.handle('add-timer', async (event, name: string, calendarId: string) => {
  return timerService.addTimer(name, calendarId);
});

ipcMain.handle('save-timer', async (event, name: string, calendarId: string) => {
  return timerService.saveTimer(name, calendarId);
});

ipcMain.handle('delete-timer', async (event, name: string) => {
  return timerService.deleteTimer(name);
});

ipcMain.handle('start-stop-timer', async (event, name: string) => {
  return timerService.startStopTimer(name);
});

ipcMain.handle('open-settings', () => {
  createSettingsWindow();
  // Hide the main window when settings opens
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    hideMainWindowWithAnimation();
  }
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

ipcMain.handle('open-dxt-file', async () => {
  const dxtContent = `{
  "name": "timer-tracker-mcp",
  "description": "MCP server for Timer Tracker integration with Claude Desktop",
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
    title: 'Save Timer Tracker MCP Configuration',
    defaultPath: 'timer-tracker-mcp.dxt',
    filters: [
      { name: 'Desktop Extension Files', extensions: ['dxt'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, dxtContent);
    shell.openExternal(`file://${result.filePath}`);
  }
});

// Data change notifications
ipcMain.on('notify-data-changed', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('data-changed');
  }
});

ipcMain.on('notify-calendar-change', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('data-changed');
  }
});

// App lifecycle
app.whenReady().then(() => {
  try {
    // Configure as menu bar app on all platforms
    if (process.platform === 'darwin') {
      app.dock.hide();
    }
    
    // Completely remove menu on all platforms
    Menu.setApplicationMenu(null);
    
    createTray();
    
    // Initialize services
    timerService.initialize();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Show error dialog to user
    dialog.showErrorBox(
      'App Initialization Error', 
      `Timer Tracker failed to start properly.\n\nError: ${errorMessage}\n\nThe app will now close.`
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
    `Timer Tracker failed to start.\n\nError: ${error.message}\n\nPlease reinstall the application.`
  );
  
  // Exit the app
  app.quit();
  process.exit(1);
});

app.on('window-all-closed', (e: any) => {
  e.preventDefault(); // Prevent app from quitting
});

app.on('before-quit', () => {
  // Clean up
  timerService.cleanup();
  
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