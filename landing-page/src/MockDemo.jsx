import React, { useState, useEffect } from 'react';
import '../../src/renderer/main/App.css';

const LiveTimer = ({ startTime }) => {
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

const MockDemo = () => {
  const [timers, setTimers] = useState([
    { name: 'Design Review', calendarId: 'work', isActive: false },
    { name: 'Team Meeting', calendarId: 'work', isActive: false },
    { name: 'Code Review', calendarId: 'development', isActive: false },
    { name: 'Lunch Break', calendarId: 'personal', isActive: false }
  ]);
  const [calendars] = useState([
    { id: 'work', name: 'Work' },
    { id: 'development', name: 'Development' },
    { id: 'personal', name: 'Personal' }
  ]);
  const [selectedCalendar, setSelectedCalendar] = useState('work');
  const [isAuthenticated] = useState(true);

  const handleStartStop = (timer) => {
    setTimers(prev => prev.map(t => 
      t.name === timer.name 
        ? { ...t, isActive: !t.isActive, startTime: !t.isActive ? new Date() : null }
        : { ...t, isActive: false, startTime: null }
    ));
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const calendarId = formData.get('calendarId');
    
    if (name && calendarId) {
      const newTimer = {
        name,
        calendarId,
        isActive: false
      };
      setTimers(prev => [...prev, newTimer]);
      e.target.reset();
      setSelectedCalendar('work');
    }
  };

  const handleCalendarChange = (e) => {
    setSelectedCalendar(e.target.value);
  };

  const getCalendarName = (calendarId) => {
    const calendar = calendars.find(c => c.id === calendarId);
    return calendar ? calendar.name : calendarId;
  };

  return (
    <div className="mock-demo">
      <div className="demo-header">
        <h3>Live Demo</h3>
        <p>Try the interface below</p>
      </div>
      
      <div className="app demo-app">
        <div className="task-list-container">
          {timers.length === 0 ? (
            <div className="empty-state">
              <div>No timers configured</div>
              <small>Add timers below to get started</small>
            </div>
          ) : (
            timers.map((timer) => {
              const isActive = timer.isActive;
              const startTime = timer.startTime;
              
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

        <div className="quick-input">
          <form onSubmit={handleAddTask} className="quick-input-row">
            <select 
              name="calendarId" 
              value={selectedCalendar}
              onChange={handleCalendarChange}
              required
            >
              <option value="">Select...</option>
              {calendars.map((calendar) => (
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

        <div className="footer-menu">
          <div className="menu-item">
            <span className="menu-item-text">⚙️</span>
          </div>
          <div className="menu-item">
            <span className="menu-item-text">✕</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockDemo; 