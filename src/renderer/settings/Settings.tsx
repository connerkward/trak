import React, { useState, useEffect } from 'react';
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

  const loadData = async () => {
    try {
      if (!window.api) {
        console.log('window.api not available yet, skipping loadData');
        return;
      }
      const [calendarsData, timersData] = await Promise.all([
        window.api.getCalendars(),
        window.api.getAllTimers()
      ]);
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
    const dataChangedUnsubscribe = window.api && window.api.onDataChanged ? window.api.onDataChanged(() => {
      console.log('📡 Data changed event received in Settings UI - refreshing');
      loadData();
    }) : null;

    return () => {
      if (oauthUnsubscribe) oauthUnsubscribe();
      if (logoutUnsubscribe) logoutUnsubscribe();
      if (dataChangedUnsubscribe) dataChangedUnsubscribe();
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

  const getCalendarName = (calendarId: string): string => {
    const calendar = calendars.find(c => c.id === calendarId);
    return calendar ? calendar.name : calendarId;
  };

  const startAuth = async () => {
    try {
      setIsAuthenticating(true);
      await window.api.startAuth();
      setShowAuthCode(true);
    } catch (error) {
      console.error('Auth error:', error);
      alert(`Authentication error: ${error.message}`);
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





  const visibleCalendars = calendars.filter(cal => !hiddenCalendars.includes(cal.id));

  return (
    <div className="settings-container">
      <div className="header">
        <h1>Dingo Track Settings</h1>
      </div>

      {!isAuthenticated && (
        <div className="section">
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
              <p className="help-text">
                🌐 Your browser should have opened. After completing authorization, 
                copy the authorization code and paste it below:
              </p>
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
                  onClick={() => {
                    setShowAuthCode(false);
                    setAuthCode('');
                    setIsAuthenticating(false);
                  }}
                  disabled={isAuthenticating}
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
          <div className="section">
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

          <div className="section">
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

          <div className="section">
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

          <div className="section">
            <h2>Timers</h2>
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


    </div>
  );
};

// Initialize the settings app
const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');
const root = createRoot(container);
root.render(<Settings />);