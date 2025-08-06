const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Calendar methods
  getCalendars: () => ipcRenderer.invoke('get-calendars'),
  startAuth: () => ipcRenderer.invoke('start-auth'),
  setAuthCode: (authCode) => ipcRenderer.invoke('set-auth-code', authCode),
  logout: () => ipcRenderer.invoke('logout'),
  
  // Timer methods
  getAllTimers: () => ipcRenderer.invoke('get-all-timers'),
  getActiveTimers: () => ipcRenderer.invoke('get-active-timers'),
  addTimer: (name, calendarId) => ipcRenderer.invoke('add-timer', name, calendarId),
  saveTimer: (name, calendarId) => ipcRenderer.invoke('save-timer', name, calendarId),
  deleteTimer: (name) => ipcRenderer.invoke('delete-timer', name),
  startStopTimer: (name) => ipcRenderer.invoke('start-stop-timer', name),
  
  // Window methods
  openSettings: () => ipcRenderer.invoke('open-settings'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // Claude Desktop integration
  openDxtFile: () => ipcRenderer.invoke('open-dxt-file'),
  
  // Data change notifications
  onDataChanged: (callback) => {
    ipcRenderer.on('data-changed', callback);
  },
  removeDataChangedListener: (callback) => {
    ipcRenderer.removeListener('data-changed', callback);
  },
  notifyDataChanged: () => {
    ipcRenderer.send('notify-data-changed');
  },
  notifyCalendarChange: () => {
    ipcRenderer.send('notify-calendar-change');
  },

  // OAuth event listeners
  onOAuthSuccess: (callback) => {
    ipcRenderer.on('oauth-success', callback);
    return () => ipcRenderer.removeListener('oauth-success', callback);
  },

  // Logout event listener
  onLogoutSuccess: (callback) => {
    ipcRenderer.on('logout-success', callback);
    return () => ipcRenderer.removeListener('logout-success', callback);
  }
});