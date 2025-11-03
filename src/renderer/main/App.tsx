import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { Timer, Calendar } from '../../shared/types';
import './App.css';

// Live timer component that updates every second
const LiveTimer: React.FC<{ startTime: Date }> = ({ startTime }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const updateElapsed = () => {
      const now = new Date();
      const diff = now.getTime() - startTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setElapsed(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setElapsed(`${minutes}m ${seconds}s`);
      } else {
        setElapsed(`${seconds}s`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);

  return <div className="task-duration">{elapsed}</div>;
};

const App: React.FC = () => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [activeTimers, setActiveTimers] = useState<Record<string, string>>({});
  const [hiddenCalendars, setHiddenCalendars] = useState<string[]>([]);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState<boolean>(false);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [manualAuthUrl, setManualAuthUrl] = useState<string>('');
  const [showAuthCode, setShowAuthCode] = useState<boolean>(false);
  const [authCode, setAuthCode] = useState<string>('');
  const taskListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cache initial data load to prevent multiple redundant calls
    Promise.all([
      loadData(),
      loadHiddenCalendars(),
      loadLastUsedCalendar()
    ]).catch(console.error);
    
    // Listen for data changes from other windows
    const handleDataChanged = () => {
      console.log('📡 Data changed event received - refreshing');
      loadData();
      loadHiddenCalendars();
    };
    
    // Listen for OAuth success
    const handleOAuthSuccess = () => {
      console.log('🔐 OAuth success received in main App UI - reloading data');
      loadData();
      loadHiddenCalendars();
    };

    // Listen for logout success
    const handleLogoutSuccess = () => {
      console.log('Logout success received in main App UI');
      setIsAuthenticated(false);
      setCalendars([]);
      setTimers([]);
      setActiveTimers({});
      setSelectedCalendar('');
      setHiddenCalendars([]);
      // Clear localStorage
      localStorage.removeItem('hiddenCalendars');
      localStorage.removeItem('lastUsedCalendar');
      // Don't call loadData() after logout - it will just fail
    };

    if (window.api && window.api.onDataChanged) {
      window.api.onDataChanged(handleDataChanged);
    }
    
    if (window.api && window.api.onOAuthSuccess) {
      window.api.onOAuthSuccess(handleOAuthSuccess);
    }

    if (window.api && window.api.onLogoutSuccess) {
      window.api.onLogoutSuccess(handleLogoutSuccess);
    }
    
    // Cleanup listeners on unmount
    return () => {
      if (window.api && window.api.removeDataChangedListener) {
        window.api.removeDataChangedListener(handleDataChanged);
      }
    };
  }, []);

  useEffect(() => {
    if (shouldScrollToBottom && taskListRef.current && timers.length > 0) {
      const scrollToBottom = () => {
        const container = taskListRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      };
      scrollToBottom();
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 200);
      setShouldScrollToBottom(false);
    }
  }, [timers.length, shouldScrollToBottom]);

  const loadHiddenCalendars = () => {
    const saved = JSON.parse(localStorage.getItem('hiddenCalendars') || '[]');
    setHiddenCalendars(saved);
  };

  const loadLastUsedCalendar = () => {
    const lastUsed = localStorage.getItem('lastUsedCalendar') || '';
    setSelectedCalendar(lastUsed);
  };

  const saveLastUsedCalendar = (calendarId: string) => {
    localStorage.setItem('lastUsedCalendar', calendarId);
    setSelectedCalendar(calendarId);
  };

  const loadData = async () => {
    try {
      console.log('🔄 [loadData] Starting data reload...');
      console.log('   window.api availability:', !!window.api);
      if (!window.api) {
        console.error('   ❌ window.api is not defined. Cannot load data.');
        return;
      }
      const [calendarsData, timersData, activeTimersData] = await Promise.all([
        window.api.getCalendars(),
        window.api.getAllTimers(),
        window.api.getActiveTimers()
      ]);

      console.log('📊 [loadData] Data loaded from backend:', {
        calendars: calendarsData?.length || 0,
        timers: timersData?.length || 0,
        activeTimers: Object.keys(activeTimersData || {}).length,
        activeTimersDetails: activeTimersData
      });

      setCalendars(calendarsData);
      setTimers(timersData);
      setActiveTimers(activeTimersData);
      setIsAuthenticated(calendarsData.length > 0);

      console.log('✅ [loadData] State updated with new data');
    } catch (error) {
      console.error('❌ [loadData] Failed to load data:', error);
    }
  };

  const refreshTimers = async () => {
    try {
      const [timersData, activeTimersData] = await Promise.all([
        window.api.getAllTimers(),
        window.api.getActiveTimers()
      ]);
      setTimers(timersData);
      setActiveTimers(activeTimersData);
    } catch (error) {
      console.error('Failed to refresh timers:', error);
    }
  };

  const handleStartStop = async (timer: Timer) => {
    try {
      const result = await window.api.startStopTimer(timer.name);
      
      if (result.action === 'started') {
        setActiveTimers(prev => ({
          ...prev,
          [timer.name]: result.startTime?.toISOString() || new Date().toISOString()
        }));
      } else {
        setActiveTimers(prev => {
          const newActive = { ...prev };
          delete newActive[timer.name];
          return newActive;
        });
      }
    } catch (error) {
      console.error('Failed to start/stop timer:', error);
      alert('Failed to start/stop timer');
    }
  };

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    

    // Capture form reference early before async operations
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get('name') as string)?.trim();
    const calendarId = formData.get('calendarId') as string;

    if (!name || !calendarId) {
      alert('Please fill in all fields');
      return;
    }

    try {
      console.log('Adding timer:', name, calendarId);
      await window.api.addTimer(name, calendarId);
      console.log('Timer added successfully, saving calendar preference');
      saveLastUsedCalendar(calendarId);
      
      console.log('Refreshing data after timer add');
      try {
        await loadData();
        console.log('Data refreshed successfully');
      } catch (loadError) {
        console.error('Error during loadData:', loadError);
        // Don't throw - timer was already added successfully
      }
      
      console.log('Resetting form');
      form.reset();
      
      console.log('Setting calendar select value');
      // Reset the form but keep the selected calendar
      const calendarSelect = form.querySelector('select[name="calendarId"]') as HTMLSelectElement;
      if (calendarSelect) {
        calendarSelect.value = calendarId;
      }
      console.log('Setting scroll flag');
      setShouldScrollToBottom(true);
      console.log('Timer add completed successfully');
    } catch (error) {
      console.error('Failed to add timer:', error);
      alert('Failed to add timer');
    }
  };

  const handleCalendarChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const calendarId = e.target.value;
    saveLastUsedCalendar(calendarId);
  };

  const getCalendarName = (calendarId: string): string => {
    const calendar = calendars.find(cal => cal.id === calendarId);
    return calendar ? calendar.name : calendarId;
  };

  const openSettings = () => {
    console.log('Settings button clicked');
    if (window.api && window.api.openSettings) {
      window.api.openSettings();
    } else {
      console.error('window.api.openSettings not available');
    }
  };

  const startAuth = async () => {
    try {
      const result = await window.api.startAuth();
      
      // Check if we got a manual URL (fallback case)
      if (result.manualUrl) {
        setManualAuthUrl(result.manualUrl);
        alert(result.message || 'Please copy the URL below and open it in your browser.');
      }
      
      if (result.success) {
        setShowAuthCode(true);
      } else {
        // If auth didn't succeed, reset state
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert(`Authentication error: ${error instanceof Error ? error.message : String(error)}`);
      setIsAuthenticated(false);
      setShowAuthCode(false);
      setAuthCode('');
      setManualAuthUrl('');
    }
  };

  const submitAuthCode = async () => {
    if (!authCode.trim()) {
      alert('Please enter the authorization code');
      return;
    }

    try {
      const success = await window.api.setAuthCode(authCode.trim());
      
      if (success) {
        setIsAuthenticated(true);
        setShowAuthCode(false);
        setAuthCode('');
        setManualAuthUrl('');
        loadData();
      } else {
        alert('❌ Invalid authorization code. Please try again.');
      }
    } catch (error) {
      console.error('Auth code error:', error);
      alert(`Authorization error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const closeMenuBarWindow = () => {
    console.log('Close window button clicked');
    if (window.api && window.api.hideMainWindow) {
      window.api.hideMainWindow();
    } else {
      console.error('window.api.hideMainWindow not available');
    }
  };

  const visibleCalendars = calendars.filter(cal => !hiddenCalendars.includes(cal.id));

  return (
    <div className="app">
      <div className="task-list-container" ref={taskListRef}>
        {!isAuthenticated ? (
          <div className="empty-state">
            {!showAuthCode ? (
              <>
                <div>No Google Calendar access</div>
                <small>Connect your Google Calendar to get started</small>
                <button className="auth-button" onClick={startAuth}>
                  🔐 Connect Google Calendar
                </button>
                {manualAuthUrl && (
                  <div className="manual-url-container">
                    <div className="manual-url-label">URL copied to clipboard. Paste it in your browser:</div>
                    <input 
                      type="text" 
                      className="manual-url-input"
                      value={manualAuthUrl} 
                      readOnly 
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="auth-code-form">
                <div>Enter Authorization Code</div>
                <small>Paste the code from your browser</small>
                <input
                  type="text"
                  className="auth-code-input"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Authorization code"
                />
                <div className="auth-buttons">
                  <button className="auth-submit-button" onClick={submitAuthCode}>
                    Submit
                  </button>
                  <button 
                    className="auth-cancel-button"
                    onClick={() => {
                      setShowAuthCode(false);
                      setAuthCode('');
                      setManualAuthUrl('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
                {manualAuthUrl && (
                  <div className="manual-url-container">
                    <div className="manual-url-label">Or open this URL manually:</div>
                    <input 
                      type="text" 
                      className="manual-url-input"
                      value={manualAuthUrl} 
                      readOnly 
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : timers.length === 0 ? (
          <div className="empty-state">
            <div>No timers configured</div>
            <small>Add timers in settings to get started</small>
          </div>
        ) : (
          timers.map((timer) => {
            const isActive = activeTimers[timer.name];
            const startTime = isActive ? new Date(activeTimers[timer.name]) : null;
            
            return (
              <div key={timer.name} className="task-item">
                <div className="task-info">
                  <div className="task-name">{timer.name}</div>
                  <div className="task-calendar">{getCalendarName(timer.calendarId)}</div>
                  {isActive && startTime && (
                    <LiveTimer startTime={startTime} />
                  )}
                </div>
                <button
                  className={`task-button ${isActive ? 'stop' : ''}`}
                  onClick={() => handleStartStop(timer)}
                >
                  {isActive ? 'Stop' : 'Start'}
                </button>
              </div>
            );
          })
        )}
      </div>

      {isAuthenticated && (
        <div className="quick-input">
          <form onSubmit={handleAddTask} className="quick-input-row">
            <select 
              name="calendarId" 
              value={selectedCalendar}
              onChange={handleCalendarChange}
              required
            >
              <option value="">Select...</option>
              {visibleCalendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="name"
              placeholder="Quick add timer..."
              required
            />
          </form>
        </div>
      )}

      <div className="footer-menu">
        <div className="menu-item" onClick={openSettings}>
          <span className="menu-item-text">⚙️</span>
        </div>
        <div className="menu-item" onClick={closeMenuBarWindow}>
          <span className="menu-item-text">✕</span>
        </div>
      </div>
    </div>
  );
};

// Initialize the app
const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');
const root = createRoot(container);
root.render(<App />);