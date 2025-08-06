import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Timer, Calendar } from '../../../shared/types';

interface AppState {
  // Data
  timers: Timer[];
  calendars: Calendar[];
  activeTimers: Record<string, string>;
  isAuthenticated: boolean;
  hiddenCalendars: string[];
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setTimers: (timers: Timer[]) => void;
  setCalendars: (calendars: Calendar[]) => void;
  setActiveTimers: (activeTimers: Record<string, string>) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setHiddenCalendars: (hiddenCalendars: string[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed
  visibleCalendars: () => Calendar[];
  getCalendarName: (calendarId: string) => string;
  
  // Async Actions
  loadData: () => Promise<void>;
  addTimer: (name: string, calendarId: string) => Promise<void>;
  deleteTimer: (name: string) => Promise<void>;
  startStopTimer: (timerName: string) => Promise<void>;
  authenticateUser: () => Promise<void>;
  logout: () => Promise<void>;
  toggleCalendarVisibility: (calendarId: string) => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    timers: [],
    calendars: [],
    activeTimers: {},
    isAuthenticated: false,
    hiddenCalendars: [],
    isLoading: false,
    error: null,
    
    // Basic setters
    setTimers: (timers) => set({ timers }),
    setCalendars: (calendars) => set({ calendars }),
    setActiveTimers: (activeTimers) => set({ activeTimers }),
    setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
    setHiddenCalendars: (hiddenCalendars) => set({ hiddenCalendars }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    
    // Computed values
    visibleCalendars: () => {
      const { calendars, hiddenCalendars } = get();
      return calendars.filter(cal => !hiddenCalendars.includes(cal.id));
    },
    
    getCalendarName: (calendarId: string) => {
      const { calendars } = get();
      const calendar = calendars.find(cal => cal.id === calendarId);
      return calendar ? calendar.name : calendarId;
    },
    
    // Async actions
    loadData: async () => {
      if (!window.api) {
        console.error('window.api is not available');
        return;
      }
      
      set({ isLoading: true, error: null });
      
      try {
        const [calendarsData, timersData, activeTimersData] = await Promise.all([
          window.api.getCalendars(),
          window.api.getAllTimers(),
          window.api.getActiveTimers()
        ]);
        
        set({
          calendars: calendarsData,
          timers: timersData,
          activeTimers: activeTimersData,
          isAuthenticated: calendarsData.length > 0,
          isLoading: false
        });
        
        // Load hidden calendars from localStorage
        const savedHidden = JSON.parse(localStorage.getItem('hiddenCalendars') || '[]');
        set({ hiddenCalendars: savedHidden });
        
      } catch (error) {
        console.error('Failed to load data:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to load data',
          isLoading: false 
        });
      }
    },
    
    addTimer: async (name: string, calendarId: string) => {
      if (!window.api) throw new Error('API not available');
      
      set({ isLoading: true, error: null });
      
      try {
        const newTimer = await window.api.addTimer(name, calendarId);
        set(state => ({
          timers: [...state.timers, newTimer],
          isLoading: false
        }));
        
        // Save last used calendar
        localStorage.setItem('lastUsedCalendar', calendarId);
        
      } catch (error) {
        console.error('Failed to add timer:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to add timer',
          isLoading: false 
        });
        throw error;
      }
    },
    
    deleteTimer: async (name: string) => {
      if (!window.api) throw new Error('API not available');
      
      set({ isLoading: true, error: null });
      
      try {
        await window.api.deleteTimer(name);
        set(state => ({
          timers: state.timers.filter(t => t.name !== name),
          isLoading: false
        }));
        
        // Notify main window
        window.api.notifyDataChanged();
        
      } catch (error) {
        console.error('Failed to delete timer:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to delete timer',
          isLoading: false 
        });
        throw error;
      }
    },
    
    startStopTimer: async (timerName: string) => {
      if (!window.api) throw new Error('API not available');
      
      try {
        const result = await window.api.startStopTimer(timerName);
        
        if (result.action === 'started') {
          set(state => ({
            activeTimers: {
              ...state.activeTimers,
              [timerName]: result.startTime?.toISOString() || new Date().toISOString()
            }
          }));
        } else {
          set(state => {
            const newActive = { ...state.activeTimers };
            delete newActive[timerName];
            return { activeTimers: newActive };
          });
        }
      } catch (error) {
        console.error('Failed to start/stop timer:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to start/stop timer' });
        throw error;
      }
    },
    
    authenticateUser: async () => {
      if (!window.api) throw new Error('API not available');
      
      set({ isLoading: true, error: null });
      
      try {
        await window.api.startAuth();
        // Authentication success will be handled by event listeners
      } catch (error) {
        console.error('Authentication failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Authentication failed',
          isLoading: false 
        });
        throw error;
      }
    },
    
    logout: async () => {
      if (!window.api) throw new Error('API not available');
      
      set({ isLoading: true, error: null });
      
      try {
        await window.api.logout();
        set({
          isAuthenticated: false,
          calendars: [],
          timers: [],
          activeTimers: {},
          isLoading: false
        });
      } catch (error) {
        console.error('Logout failed:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Logout failed',
          isLoading: false 
        });
        throw error;
      }
    },
    
    toggleCalendarVisibility: (calendarId: string) => {
      const { hiddenCalendars } = get();
      const newHidden = hiddenCalendars.includes(calendarId)
        ? hiddenCalendars.filter(id => id !== calendarId)
        : [...hiddenCalendars, calendarId];
      
      set({ hiddenCalendars: newHidden });
      localStorage.setItem('hiddenCalendars', JSON.stringify(newHidden));
      
      if (window.api && window.api.notifyCalendarChange) {
        window.api.notifyCalendarChange();
      }
    }
  }))
);

// Subscribe to authentication events
if (typeof window !== 'undefined' && window.api) {
  // OAuth success
  window.api.onOAuthSuccess(() => {
    console.log('OAuth success received, refreshing store data');
    useAppStore.getState().loadData();
  });
  
  // Logout success
  window.api.onLogoutSuccess(() => {
    console.log('Logout success received, clearing store data');
    useAppStore.getState().logout();
  });
  
  // Data changes from other windows
  window.api.onDataChanged(() => {
    console.log('Data changed, refreshing store data');
    useAppStore.getState().loadData();
  });
}