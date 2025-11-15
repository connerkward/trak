import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { Timer, Calendar } from '../../shared/types';
import './Settings.css';

interface FormData {
  name: string;
  calendarId: string;
}

const Settings: React.FC = () => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [hiddenCalendars, setHiddenCalendars] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>({ name: '', calendarId: '' });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [dockIconVisible, setDockIconVisible] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'google' | 'add' | 'calendars' | 'timers' | 'claude' | 'general' | 'quit'>('google');
  const googleRef = useRef<HTMLDivElement | null>(null);
  const addRef = useRef<HTMLDivElement | null>(null);
  const calendarsRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<HTMLDivElement | null>(null);
  const claudeRef = useRef<HTMLDivElement | null>(null);
  const generalRef = useRef<HTMLDivElement | null>(null);
  const quitRef = useRef<HTMLDivElement | null>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const loadData = async () => {
    try {
      if (!window.api) {
        console.log('window.api not available yet, skipping loadData');
        return;
      }
      console.log('[Settings] Loading data...');
      const [calendarsData, timersData] = await Promise.all([
        window.api.getCalendars(),
        window.api.getAllTimers()
      ]);
      console.log('[Settings] Loaded timers:', timersData.length, timersData);
      setCalendars(calendarsData);
      setTimers(timersData);
      setIsAuthenticated(calendarsData.length > 0);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  // Load mock API only in development (when served via HTTP)
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.protocol === 'http:' && !window.api) {
      console.log('Loading mock API for settings...');
              import('../shared/mock-api.js').then(() => {
          console.log('Mock API loaded, window.api:', window.api);
          // Trigger a re-render after mock API loads
          setTimeout(() => loadData(), 100);
        });
    } else {
      console.log('Mock API conditions not met:', {
        protocol: window.location?.protocol,
        hasApi: !!window.api
      });
    }
  }, []);

  useEffect(() => {
    loadData();
    const savedHidden = JSON.parse(localStorage.getItem('hiddenCalendars') || '[]');
    setHiddenCalendars(savedHidden);

    // Load open on startup
    // Load dock icon state (macOS)
    if (window.api && window.api.getDockIconVisible) {
      window.api.getDockIconVisible()
        .then(async (val) => {
          // Default to ON; if currently off, try enabling once on first load
          if (val === false && window.api.setDockIconVisible) {
            try {
              const newVal = await window.api.setDockIconVisible(true);
              setDockIconVisible(newVal);
              return;
            } catch {}
          }
          setDockIconVisible(val ?? true);
        })
        .catch(() => setDockIconVisible(true));
    }

    // Listen for OAuth success events
    const oauthUnsubscribe = window.api && window.api.onOAuthSuccess ? window.api.onOAuthSuccess(() => {
      console.log('OAuth success received in Settings UI');
      setIsAuthenticated(true);
      setShowAuthCode(false);
      setAuthCode('');
      setIsAuthenticating(false);
      loadData();
      
      // Show success message
      alert('✅ Successfully connected to Google Calendar!');
    }) : null;

    // Listen for logout success events
    const logoutUnsubscribe = window.api && window.api.onLogoutSuccess ? window.api.onLogoutSuccess(() => {
      console.log('Logout success received in Settings UI');
      setIsAuthenticated(false);
      setCalendars([]);
      setTimers([]);
      setFormData({ name: '', calendarId: '' });
      setHiddenCalendars([]);
    }) : null;

    // Listen for data changes from other windows
    const dataChangedCallback = () => {
      console.log('📡 Data changed event received in Settings UI - refreshing');
      loadData();
    };

    if (window.api && window.api.onDataChanged) {
      window.api.onDataChanged(dataChangedCallback);
    }

    return () => {
      if (oauthUnsubscribe) oauthUnsubscribe();
      if (logoutUnsubscribe) logoutUnsubscribe();
      if (window.api && window.api.removeDataChangedListener) {
        window.api.removeDataChangedListener(dataChangedCallback);
      }
    };
  }, []);



  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    

    if (!formData.name.trim() || !formData.calendarId) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await window.api.addTimer(formData.name.trim(), formData.calendarId);
      
      // Refresh data from backend (same as main window)
      await loadData();

      // Reset form
      setFormData({ name: '', calendarId: '' });
    } catch (error) {
      console.error('Failed to add timer:', error);
      alert('Failed to add timer');
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the timer "${name}"?`)) {
      return;
    }

    try {
      await window.api.deleteTimer(name);
      setTimers(prev => prev.filter(t => t.name !== name));
      
      // Notify main window of data change
      window.api.notifyDataChanged();
    } catch (error) {
      console.error('Failed to delete timer:', error);
      alert('Failed to delete timer');
    }
  };

  const toggleCalendarVisibility = (calendarId: string) => {
    const newHidden = hiddenCalendars.includes(calendarId)
      ? hiddenCalendars.filter(id => id !== calendarId)
      : [...hiddenCalendars, calendarId];
    
    setHiddenCalendars(newHidden);
    localStorage.setItem('hiddenCalendars', JSON.stringify(newHidden));
    
    if (window.api && window.api.notifyCalendarChange) {
      window.api.notifyCalendarChange();
    }
  };

  const [authCode, setAuthCode] = useState<string>('');
  const [showAuthCode, setShowAuthCode] = useState<boolean>(false);
  const [manualAuthUrl, setManualAuthUrl] = useState<string>('');

  const getCalendarName = (calendarId: string): string => {
    const calendar = calendars.find(c => c.id === calendarId);
    return calendar ? calendar.name : calendarId;
  };

  const startAuth = async () => {
    setIsAuthenticating(true);
    setAuthCode('');
    setManualAuthUrl('');
    setShowAuthCode(false);

    try {
      const result = await window.api.startAuth();
      
      // Check if we got a manual URL (fallback case)
      if (result.manualUrl) {
        setManualAuthUrl(result.manualUrl);
        alert(result.message || 'Please copy the URL below and open it in your browser.');
      }
      
      if (result.success) {
        setShowAuthCode(true);
      } else if (result.cancelled) {
        setShowAuthCode(false);
        setAuthCode('');
        setManualAuthUrl('');
        alert(result.error || 'Authentication cancelled.');
      } else {
        alert(result.error || 'Failed to start authentication. Please try again.');
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert(`Authentication error: ${error instanceof Error ? error.message : String(error)}`);
      setShowAuthCode(false);
      setAuthCode('');
      setManualAuthUrl('');
    } finally {
      setIsAuthenticating(false);
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
        loadData();
        alert('✅ Successfully connected to Google Calendar!');
      } else {
        alert('❌ Invalid authorization code. Please try again.');
      }
    } catch (error) {
      console.error('Auth code error:', error);
      alert(`Authorization error: ${error.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    try {
      const confirmed = confirm('Are you sure you want to logout? This will clear all stored credentials and you\'ll need to re-authenticate.');
      if (!confirmed) return;

      await window.api.logout();
      
      // Clear local state
      setIsAuthenticated(false);
      setCalendars([]);
      setTimers([]);
      setFormData({ name: '', calendarId: '' });
      
      alert('✅ Successfully logged out. You can now re-authenticate if needed.');
    } catch (error) {
      console.error('Logout error:', error);
      alert(`Logout error: ${error.message}`);
    }
  };


  const handleToggleDockIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const visible = e.target.checked;
    setDockIconVisible(visible);
    try {
      if (window.api && window.api.setDockIconVisible) {
        const result = await window.api.setDockIconVisible(visible);
        setDockIconVisible(result);
      }
    } catch (error) {
      console.error('Failed to update dock icon visibility:', error);
    }
  };





  const visibleCalendars = calendars.filter(cal => !hiddenCalendars.includes(cal.id));

  return (
    <div className="settings-container">
      <div className="header">
        <h1>Dingo Track Settings</h1>
      </div>
      {null}

      {!isAuthenticated && (
        <div ref={googleRef} className="section" id="google">
          <h2>Authentication</h2>
          <p className="help-text">
            Connect your Google Calendar to start tracking time.
          </p>
          
          {!showAuthCode ? (
            <button 
              className="btn btn-primary" 
              onClick={startAuth}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? 'Opening browser...' : '🔐 Connect Google Calendar'}
            </button>
          ) : (
            <div className="auth-code-section">
              {manualAuthUrl ? (
                <>
                  <p className="help-text">
                    ⚠️ Could not automatically open browser. Please copy this URL and open it manually:
                  </p>
                  <div className="form-group">
                    <label htmlFor="manualUrl">Authorization URL</label>
                    <input
                      type="text"
                      id="manualUrl"
                      value={manualAuthUrl}
                      readOnly
                      style={{ fontFamily: 'monospace', fontSize: '12px' }}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => {
                        navigator.clipboard.writeText(manualAuthUrl);
                        alert('URL copied to clipboard!');
                      }}
                      style={{ marginTop: '8px' }}
                    >
                      📋 Copy URL
                    </button>
                  </div>
                </>
              ) : (
                <p className="help-text">
                  🌐 Your browser should have opened. After completing authorization, 
                  copy the authorization code and paste it below:
                </p>
              )}
              <div className="form-group">
                <label htmlFor="authCode">Authorization Code</label>
                <input
                  type="text"
                  id="authCode"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Paste authorization code here..."
                  disabled={isAuthenticating}
                />
              </div>
              <div className="auth-buttons">
                <button 
                  className="btn btn-primary" 
                  onClick={submitAuthCode}
                  disabled={isAuthenticating || !authCode.trim()}
                >
                  {isAuthenticating ? 'Connecting...' : '✅ Connect'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={async () => {
                    // Cancel the OAuth flow
                    if (window.api?.cancelAuth) {
                      await window.api.cancelAuth();
                    }
                    // Reset all auth state
                    setShowAuthCode(false);
                    setAuthCode('');
                    setManualAuthUrl('');
                    setIsAuthenticating(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isAuthenticated && (
        <>
          <div ref={googleRef} className="section" id="google">
            <h2>Google Calendar</h2>
            <p className="help-text">
              ✅ Connected to Google Calendar ({calendars.length} calendars available)
            </p>
            <button 
              className="btn btn-secondary" 
              onClick={logout}
            >
              🚪 Logout from Google Calendar
            </button>
          </div>
          <div ref={addRef} className="section" id="add">
            <h2>Add New Timer</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Task Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g., Coding, Meetings, Exercise"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="calendarId">Calendar</label>
                <select
                  id="calendarId"
                  name="calendarId"
                  value={formData.calendarId}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select a calendar...</option>
                  {calendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.name} {calendar.primary ? '(Primary)' : ''} 
                      ({calendar.accessRole === 'owner' ? 'Owner' : 'Writer'})
                    </option>
                  ))}
                </select>
                <div className="help-text">Select which calendar to create events in</div>
              </div>
              <button type="submit" className="btn btn-primary">
                Add Timer
              </button>
            </form>
          </div>

          <div ref={calendarsRef} className="section" id="calendars">
            <h2>Calendars</h2>
            <div className="calendar-list">
              {calendars.length === 0 ? (
                <div className="empty-state">Loading calendars...</div>
              ) : (
                calendars.map((calendar) => (
                  <div key={calendar.id} className="calendar-item">
                    <div className="calendar-info">
                      <div className="calendar-name">{calendar.name}</div>
                      <div className="calendar-details">
                        {calendar.accessRole === 'owner' ? 'Owner' : 'Writer'}
                        {calendar.primary && ' • Primary'}
                      </div>
                    </div>
                    <div className="calendar-actions">
                      <div
                        className={`toggle-switch ${!hiddenCalendars.includes(calendar.id) ? 'active' : ''}`}
                        onClick={() => toggleCalendarVisibility(calendar.id)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div ref={timersRef} className="section" id="timers">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ margin: 0 }}>Timers</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => { console.log('[Settings] Manual refresh clicked'); loadData(); }}>🔄 Refresh</button>
            </div>
            <div className="timer-list">
              {timers.length === 0 ? (
                <div className="empty-state">
                  No timers configured<br />
                  <small>Add your first timer above</small>
                </div>
              ) : (
                timers.map((timer) => (
                  <div key={timer.name} className="timer-item">
                    <div className="timer-info">
                      <div className="timer-name">{timer.name}</div>
                      <div className="timer-calendar">
                        Calendar: {getCalendarName(timer.calendarId)}
                      </div>
                    </div>
                    <div className="timer-actions">
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(timer.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div ref={claudeRef} className="section mcp-section" id="claude">
        <h2>Claude Desktop Integration</h2>
        <p className="help-text">
          Connect Dingo Track to Claude Desktop using the Model Context Protocol (MCP).
          This allows Claude to view and manage your timers directly.
        </p>
        <button
          className="btn btn-claude"
          onClick={async () => {
            try {
              const res = await window.api.generateMCPConfig();
              if (!res?.success) {
                return;
              }
              const targetPath = res.path ?? 'the selected location';
              alert(`✅ Claude Desktop bundle saved to ${targetPath}. If Claude did not open automatically, you can install it manually from that location.`);
            } catch (error) {
              console.error('Failed to generate MCP config:', error);
              const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
              alert(`❌ Failed to generate MCP configuration.\n\n${message}`);
            }
          }}
        >
          🔗 Connect to Claude Desktop
        </button>
      </div>

      <div ref={generalRef} className="section" id="general">
        <h2>General</h2>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">Open on startup</div>
            <div className="setting-description">Launch automatically when you log in</div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              try {
                if (window.api && window.api.setOpenAtLogin) {
                  await window.api.setOpenAtLogin(true);
                  // Also open System Settings to show it was added
                  if (window.api.openLoginItems) {
                    window.api.openLoginItems();
                  }
                }
              } catch (error) {
                console.error('Failed to add to startup:', error);
                alert('Failed to add to startup items');
              }
            }}
          >
            Add to Startup
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
        <div className="setting-row">
          <div className="setting-label">Show Dock icon (macOS)</div>
          <div className={`toggle-switch ${dockIconVisible ? 'active' : ''}`} onClick={(e) => handleToggleDockIcon({ target: { checked: !dockIconVisible } } as any)} />
        </div>
      </div>

      <div ref={quitRef} className="section" id="quit">
        <h2>Quit</h2>
        <button className="btn btn-danger" onClick={() => window.api?.quitApp?.()}>
          Quit Dingo Track
        </button>
      </div>

    </div>
  );
};

// Initialize the settings app
const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');
const root = createRoot(container);
root.render(<Settings />);