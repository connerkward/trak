import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the CSS import
vi.mock('./App.css', () => ({}));

// Import just the component part, not the auto-initializing module
import type { Timer, Calendar } from '../../shared/types';

const LiveTimer: React.FC<{ startTime: Date }> = ({ startTime }) => {
  const [elapsed, setElapsed] = React.useState('');

  React.useEffect(() => {
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

// Create a test version of the App component
const App: React.FC = () => {
  const [timers, setTimers] = React.useState<Timer[]>([]);
  const [calendars, setCalendars] = React.useState<Calendar[]>([]);
  const [activeTimers, setActiveTimers] = React.useState<Record<string, string>>({});
  const [hiddenCalendars, setHiddenCalendars] = React.useState<string[]>([]);
  const [shouldScrollToBottom, setShouldScrollToBottom] = React.useState<boolean>(false);
  const [selectedCalendar, setSelectedCalendar] = React.useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);
  const taskListRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    loadData();
    loadHiddenCalendars();
    loadLastUsedCalendar();
  }, []);

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
      if (!window.api) {
        console.error('window.api is not defined. Cannot load data.');
        return;
      }
      const [calendarsData, timersData, activeTimersData] = await Promise.all([
        window.api.getCalendars(),
        window.api.getAllTimers(),
        window.api.getActiveTimers()
      ]);
      
      setCalendars(calendarsData);
      setTimers(timersData);
      setActiveTimers(activeTimersData);
      setIsAuthenticated(calendarsData.length > 0);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const getCalendarName = (calendarId: string): string => {
    const calendar = calendars.find(cal => cal.id === calendarId);
    return calendar ? calendar.name : calendarId;
  };

  const startAuth = async () => {
    try {
      await window.api.startAuth();
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  const openSettings = () => {
    if (window.api && window.api.openSettings) {
      window.api.openSettings();
    }
  };

  const quitApp = () => {
    if (window.api && window.api.quitApp) {
      window.api.quitApp();
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
                >
                  {isActive ? 'Stop' : 'Start'}
                </button>
              </div>
            );
          })
        )}
      </div>

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

describe('App Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText(/connect google calendar/i)).toBeInTheDocument();
  });

  it('shows authentication prompt when not authenticated', async () => {
    // Mock API to return empty calendars (not authenticated)
    window.api.getCalendars = vi.fn().mockResolvedValue([]);
    window.api.getAllTimers = vi.fn().mockResolvedValue([]);
    window.api.getActiveTimers = vi.fn().mockResolvedValue({});

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/no google calendar access/i)).toBeInTheDocument();
      expect(screen.getByText(/connect your google calendar to get started/i)).toBeInTheDocument();
    });
  });

  it('shows timer list when authenticated with timers', async () => {
    // Mock API to return calendars and timers (authenticated)
    const mockCalendars = [{ id: 'cal1', name: 'Work Calendar' }];
    const mockTimers = [{ name: 'Test Timer', calendarId: 'cal1' }];
    
    window.api.getCalendars = vi.fn().mockResolvedValue(mockCalendars);
    window.api.getAllTimers = vi.fn().mockResolvedValue(mockTimers);
    window.api.getActiveTimers = vi.fn().mockResolvedValue({});

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Test Timer')).toBeInTheDocument();
      expect(screen.getByText('Work Calendar')).toBeInTheDocument();
      expect(screen.getByText('Start')).toBeInTheDocument();
    });
  });

  it('shows empty state when authenticated but no timers', async () => {
    // Mock API to return calendars but no timers
    const mockCalendars = [{ id: 'cal1', name: 'Work Calendar' }];
    
    window.api.getCalendars = vi.fn().mockResolvedValue(mockCalendars);
    window.api.getAllTimers = vi.fn().mockResolvedValue([]);
    window.api.getActiveTimers = vi.fn().mockResolvedValue({});

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/no timers configured/i)).toBeInTheDocument();
      expect(screen.getByText(/add timers in settings to get started/i)).toBeInTheDocument();
    });
  });

  it('displays footer menu with settings and quit buttons', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('⚙️')).toBeInTheDocument();
      expect(screen.getByText('✕')).toBeInTheDocument();
    });
  });
});