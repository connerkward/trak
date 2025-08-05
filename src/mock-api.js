// Mock API for development preview
window.api = {
  // Mock calendar data
  getCalendars: () => Promise.resolve([
    { id: 'primary', name: 'Personal Calendar', primary: true, accessRole: 'owner' },
    { id: 'work@company.com', name: 'Work Calendar', primary: false, accessRole: 'owner' },
    { id: 'team@company.com', name: 'Team Events', primary: false, accessRole: 'writer' },
    { id: 'holidays@group.com', name: 'Company Holidays', primary: false, accessRole: 'reader' }
  ]),
  
  // Mock timer data
  getAllTimers: () => Promise.resolve([
    { name: 'Website Redesign', calendarId: 'work@company.com' },
    { name: 'Client Meeting Prep', calendarId: 'work@company.com' },
    { name: 'Code Review', calendarId: 'team@company.com' },
    { name: 'Personal Project', calendarId: 'primary' },
    { name: 'Learning React', calendarId: 'primary' }
  ]),
  
  // Mock active timers (some running, some not)
  getActiveTimers: () => Promise.resolve({
    'Website Redesign': new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    'Code Review': new Date(Date.now() - 1000 * 60 * 12).toISOString() // 12 mins ago
  }),
  
  // Mock authentication (always successful)
  startAuth: () => Promise.resolve(true),
  
  // Mock timer operations
  addTimer: (name, calendarId) => {
    console.log('Mock: Added timer', { name, calendarId });
    return Promise.resolve(true);
  },
  
  saveTimer: (name, calendarId) => {
    console.log('Mock: Saved timer', { name, calendarId });
    return Promise.resolve(true);
  },
  
  deleteTimer: (name) => {
    console.log('Mock: Deleted timer', name);
    return Promise.resolve(true);
  },
  
  startStopTimer: (name) => {
    console.log('Mock: Start/stop timer', name);
    // Simulate starting or stopping
    const isActive = Math.random() > 0.5;
    return Promise.resolve({
      action: isActive ? 'started' : 'stopped',
      startTime: isActive ? new Date() : undefined,
      duration: !isActive ? Math.floor(Math.random() * 120) + 5 : undefined
    });
  },
  
  // Mock window operations
  openSettings: () => {
    console.log('Mock: Open settings');
    // In dev mode, you can open settings in a new tab
    window.open('/settings.html', '_blank', 'width=800,height=700');
  },
  
  quitApp: () => {
    console.log('Mock: Quit app');
    alert('Mock: App would quit here');
  },
  
  // Mock data change notifications
  onDataChanged: (callback) => {
    console.log('Mock: Setup data change listener');
    // Simulate data changes every 30 seconds for testing
    setInterval(() => {
      console.log('Mock: Data changed');
      callback();
    }, 30000);
  },
  
  removeDataChangedListener: (callback) => {
    console.log('Mock: Remove data change listener');
  },
  
  notifyDataChanged: () => {
    console.log('Mock: Notify data changed');
  },
  
  notifyCalendarChange: () => {
    console.log('Mock: Notify calendar change');
  }
};

// Add some mock localStorage data for settings
localStorage.setItem('hiddenCalendars', JSON.stringify(['holidays@group.com']));
localStorage.setItem('lastUsedCalendar', 'work@company.com');

console.log('Mock API loaded for development');