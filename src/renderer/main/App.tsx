import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { Timer, Calendar } from '../../shared/types';
import './App.css';

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
  const [swipedTimer, setSwipedTimer] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const taskListRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef<number>(0);
  const swipeStartY = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);

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

    // Reset swipe state when window loses focus
    const handleWindowBlur = () => {
      setSwipedTimer(null);
      setSwipeOffset(0);
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

    window.addEventListener('blur', handleWindowBlur);
    
    // Cleanup listeners on unmount
    return () => {
      if (window.api && window.api.removeDataChangedListener) {
        window.api.removeDataChangedListener(handleDataChanged);
      }
      window.removeEventListener('blur', handleWindowBlur);
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
      console.log('window.api availability:', !!window.api);
      console.log('window.api methods:', window.api ? Object.keys(window.api) : 'N/A');
      if (!window.api) {
        console.error('window.api is not defined. Cannot load data.');
        return;
      }
      const [calendarsData, timersData, activeTimersData] = await Promise.all([
        window.api.getCalendars(),
        window.api.getAllTimers(),
        window.api.getActiveTimers()
      ]);
      
      console.log('📊 Load data results:', {
        calendars: calendarsData?.length || 0,
        timers: timersData?.length || 0,
        activeTimers: Object.keys(activeTimersData || {}).length,
        calendarsData,
        timersData,
        activeTimersData
      });
      
      setCalendars(calendarsData);
      setTimers(timersData);
      setActiveTimers(activeTimersData);
      setIsAuthenticated(calendarsData.length > 0);
    } catch (error) {
      console.error('Failed to load data:', error);
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

  const handleDelete = async (timerName: string) => {
    try {
      await window.api.deleteTimer(timerName);
      await loadData();
      setSwipedTimer(null);
      setSwipeOffset(0);
    } catch (error) {
      console.error('Failed to delete timer:', error);
      alert('Failed to delete timer');
    }
  };

  const handleSwipeStart = (e: React.MouseEvent | React.TouchEvent, timerName: string) => {
    // Don't allow swiping active timers
    if (activeTimers[timerName]) return;

    // If clicking on a different item, reset the swiped state
    if (swipedTimer && swipedTimer !== timerName) {
      setSwipedTimer(null);
      setSwipeOffset(0);
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    swipeStartX.current = clientX;
    swipeStartY.current = clientY;
    isSwiping.current = false;
    // Don't set swipedTimer yet - wait for actual movement
  };

  const handleSwipeMove = (e: React.MouseEvent | React.TouchEvent, timerName: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = swipeStartX.current - clientX;
    const deltaY = Math.abs(swipeStartY.current - clientY);

    // Only start swiping if horizontal movement is dominant
    if (!isSwiping.current && Math.abs(deltaX) > 10 && deltaY < 30) {
      isSwiping.current = true;
      setSwipedTimer(timerName); // Set the swiped timer only when actually swiping
    }

    if (isSwiping.current && swipedTimer === timerName && deltaX > 0) {
      // Limit swipe to 80px (delete button width)
      setSwipeOffset(Math.min(deltaX, 80));
    }
  };

  const handleSwipeEnd = () => {
    if (swipeOffset > 40) {
      // Keep swiped open, but auto-close after 3 seconds
      setSwipeOffset(80);
      setTimeout(() => {
        setSwipedTimer(null);
        setSwipeOffset(0);
      }, 3000);
    } else {
      // Reset immediately
      setSwipedTimer(null);
      setSwipeOffset(0);
    }
    isSwiping.current = false;
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
      await window.api.startAuth();
      // UI will automatically update when OAuth success event is received
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  const quitApp = () => {
    console.log('Quit button clicked');
    if (window.api && window.api.quitApp) {
      window.api.quitApp();
    } else {
      console.error('window.api.quitApp not available');
    }
  };

  const visibleCalendars = calendars.filter(cal => !hiddenCalendars.includes(cal.id));

  return (
    <div className="app">
      <div className="task-list-container" ref={taskListRef}>
        {!isAuthenticated ? (
          <div className="empty-state">
            <div>No Google Calendar access</div>
            <small>Connect your Google Calendar to get started</small>
            <button className="auth-button" onClick={startAuth}>
              🔐 Connect Google Calendar
            </button>
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
            const isSwiped = swipedTimer === timer.name;
            const offset = isSwiped ? swipeOffset : 0;
            
            return (
              <div 
                key={timer.name} 
                className={`task-item-wrapper ${isSwiped ? 'swiped' : ''}`}
                onMouseDown={(e) => handleSwipeStart(e, timer.name)}
                onTouchStart={(e) => handleSwipeStart(e, timer.name)}
                onMouseMove={(e) => handleSwipeMove(e, timer.name)}
                onTouchMove={(e) => handleSwipeMove(e, timer.name)}
                onMouseUp={handleSwipeEnd}
                onTouchEnd={handleSwipeEnd}
                onMouseLeave={handleSwipeEnd}
              >
                <div 
                  className="task-item"
                  style={{ transform: `translateX(-${offset}px)` }}
                >
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
                <button
                  className="delete-button"
                  onClick={() => handleDelete(timer.name)}
                  style={{ opacity: offset / 80 }}
                >
                  Delete
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
        <div className="menu-item" onClick={quitApp}>
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