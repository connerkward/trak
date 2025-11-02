import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { Calendar, Timer } from '../shared/types';

export interface ElectronAPI {
  // Calendar methods
  getCalendars: () => Promise<Calendar[]>;
  startAuth: () => Promise<{ success: boolean; authUrl?: string }>;
  cancelAuth: () => Promise<{ success: boolean }>;
  setAuthCode: (authCode: string) => Promise<boolean>;
  logout: () => Promise<{ success: boolean }>;
  
  // Timer methods
  getAllTimers: () => Promise<Timer[]>;
  getActiveTimers: () => Promise<Record<string, string>>;
  addTimer: (name: string, calendarId: string) => Promise<Timer>;
  saveTimer: (name: string, calendarId: string) => Promise<Timer>;
  renameTimer: (oldName: string, newName: string, calendarId: string) => Promise<Timer>;
  deleteTimer: (name: string) => Promise<boolean>;
  startStopTimer: (name: string) => Promise<{ action: 'started' | 'stopped'; startTime?: Date; duration?: number }>;
  
  // Window methods
  openSettings: () => Promise<void>;
  hideMainWindow: () => Promise<void>;
  quitApp: () => Promise<void>;
  openDxtFile: () => Promise<void>;
  generateMCPConfig: () => Promise<{ success: boolean; path: string }>;
  getOpenAtLogin: () => Promise<boolean>;
  setOpenAtLogin: (enabled: boolean) => Promise<boolean>;
  getDockIconVisible: () => Promise<boolean>;
  setDockIconVisible: (visible: boolean) => Promise<boolean>;
  openLoginItems: () => Promise<void>;
  
  // Event listeners
  onDataChanged: (callback: (event: IpcRendererEvent) => void) => void;
  removeDataChangedListener: (callback: (event: IpcRendererEvent) => void) => void;
  notifyDataChanged: () => void;
  notifyCalendarChange: () => void;
  onOAuthSuccess: (callback: (event: IpcRendererEvent) => void) => () => void;
  onLogoutSuccess: (callback: (event: IpcRendererEvent) => void) => () => void;
}

const electronAPI: ElectronAPI = {
  // Calendar methods
  getCalendars: () => ipcRenderer.invoke('get-calendars'),
  startAuth: () => ipcRenderer.invoke('start-auth'),
  cancelAuth: () => ipcRenderer.invoke('cancel-auth'),
  setAuthCode: (authCode: string) => ipcRenderer.invoke('set-auth-code', authCode),
  logout: () => ipcRenderer.invoke('logout'),
  
  // Timer methods
  getAllTimers: () => ipcRenderer.invoke('get-all-timers'),
  getActiveTimers: () => ipcRenderer.invoke('get-active-timers'),
  addTimer: (name: string, calendarId: string) => ipcRenderer.invoke('add-timer', name, calendarId),
  saveTimer: (name: string, calendarId: string) => ipcRenderer.invoke('save-timer', name, calendarId),
  renameTimer: (oldName: string, newName: string, calendarId: string) => ipcRenderer.invoke('rename-timer', oldName, newName, calendarId),
  deleteTimer: (name: string) => ipcRenderer.invoke('delete-timer', name),
  startStopTimer: (name: string) => ipcRenderer.invoke('start-stop-timer', name),
  
  // Window methods
  openSettings: () => ipcRenderer.invoke('open-settings'),
  hideMainWindow: () => ipcRenderer.invoke('hide-main-window'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  openDxtFile: () => ipcRenderer.invoke('open-dxt-file'),
  generateMCPConfig: () => ipcRenderer.invoke('generate-mcp-config'),
  getOpenAtLogin: () => ipcRenderer.invoke('get-open-at-login'),
  setOpenAtLogin: (enabled: boolean) => ipcRenderer.invoke('set-open-at-login', enabled),
  getDockIconVisible: () => ipcRenderer.invoke('get-dock-icon-visible'),
  setDockIconVisible: (visible: boolean) => ipcRenderer.invoke('set-dock-icon-visible', visible),
  openLoginItems: () => ipcRenderer.invoke('open-login-items'),
  
  // Event listeners
  onDataChanged: (callback: (event: IpcRendererEvent) => void) => {
    ipcRenderer.on('data-changed', callback);
  },
  removeDataChangedListener: (callback: (event: IpcRendererEvent) => void) => {
    ipcRenderer.removeListener('data-changed', callback);
  },
  notifyDataChanged: () => {
    ipcRenderer.send('notify-data-changed');
  },
  notifyCalendarChange: () => {
    ipcRenderer.send('notify-calendar-change');
  },
  onOAuthSuccess: (callback: (event: IpcRendererEvent) => void) => {
    ipcRenderer.on('oauth-success', callback);
    return () => ipcRenderer.removeListener('oauth-success', callback);
  },
  onLogoutSuccess: (callback: (event: IpcRendererEvent) => void) => {
    ipcRenderer.on('logout-success', callback);
    return () => ipcRenderer.removeListener('logout-success', callback);
  }
};

contextBridge.exposeInMainWorld('api', electronAPI);

// Type declaration for the global window object
declare global {
  interface Window {
    api: ElectronAPI;
  }
}