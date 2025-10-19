import { GoogleCalendarServiceSimple } from './GoogleCalendarService';
import { SimpleStore } from './StorageService';
import type { Timer, ActiveTimer, TimerSession } from '../../shared/types';

export class TimerService {
  private store: SimpleStore;
  private googleCalendarService: GoogleCalendarServiceSimple;
  private activeTimers: Map<string, ActiveTimer> = new Map();
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private currentUserId: string | null = null;

  constructor() {
    this.store = new SimpleStore({ name: 'dingo-track-timers' });
    this.googleCalendarService = new GoogleCalendarServiceSimple();
  }

  setCurrentUser(userId: string | null): void {
    this.currentUserId = userId;
    
    // Clear active timers when switching users
    this.activeTimers.clear();
    
    if (userId) {
      // Load active timers for the current user
      const savedActiveTimers = this.store.get(`activeTimers_${userId}`, {}) as Record<string, string>;
      for (const [name, startTimeString] of Object.entries(savedActiveTimers)) {
        this.activeTimers.set(name, {
          name,
          startTime: new Date(startTimeString)
        });
      }
    }
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  initialize(): void {
    // Set up auto-save for active timers
    this.autoSaveInterval = setInterval(() => {
      this.saveActiveTimersToStore();
    }, 30000); // Save every 30 seconds
  }

  cleanup(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    this.saveActiveTimersToStore();
  }

  private saveActiveTimersToStore(): void {
    if (!this.currentUserId) return; // Don't save if no user is authenticated
    
    const activeTimersData: Record<string, string> = {};
    for (const [name, timer] of this.activeTimers) {
      activeTimersData[name] = timer.startTime.toISOString();
    }
    this.store.set(`activeTimers_${this.currentUserId}`, activeTimersData);
  }

  getAllTimers(): Timer[] {
    if (!this.currentUserId) return [];
    return this.store.get(`timers_${this.currentUserId}`, []) as Timer[];
  }

  getActiveTimers(): Record<string, string> {
    const activeTimersData: Record<string, string> = {};
    for (const [name, timer] of this.activeTimers) {
      activeTimersData[name] = timer.startTime.toISOString();
    }
    return activeTimersData;
  }

  addTimer(name: string, calendarId: string): Timer {
    if (!this.currentUserId) {
      throw new Error('No user is currently authenticated');
    }

    const timers = this.getAllTimers();
    
    // Check if timer already exists
    if (timers.find(t => t.name === name)) {
      throw new Error('Timer with this name already exists');
    }

    const newTimer: Timer = { name, calendarId };
    timers.push(newTimer);
    this.store.set(`timers_${this.currentUserId}`, timers);
    
    return newTimer;
  }

  saveTimer(name: string, calendarId: string): Timer {
    if (!this.currentUserId) {
      throw new Error('No user is currently authenticated');
    }

    const timers = this.getAllTimers();
    const existingIndex = timers.findIndex(t => t.name === name);
    const timer: Timer = { name, calendarId };
    
    if (existingIndex >= 0) {
      // Update existing timer
      timers[existingIndex] = timer;
    } else {
      // Add new timer
      timers.push(timer);
    }
    
    this.store.set(`timers_${this.currentUserId}`, timers);
    return timer;
  }

  renameTimer(oldName: string, newName: string, calendarId: string): Timer {
    if (!this.currentUserId) {
      throw new Error('No user is currently authenticated');
    }

    const timers = this.getAllTimers();
    const timerIndex = timers.findIndex(t => t.name === oldName);
    
    if (timerIndex === -1) {
      throw new Error('Timer not found');
    }

    // Check if new name already exists
    if (oldName !== newName && timers.find(t => t.name === newName)) {
      throw new Error('Timer with this name already exists');
    }

    // Cannot rename active timer
    if (this.activeTimers.has(oldName)) {
      throw new Error('Cannot rename active timer. Stop it first.');
    }

    // Update timer
    timers[timerIndex] = { name: newName, calendarId };
    this.store.set(`timers_${this.currentUserId}`, timers);
    
    return timers[timerIndex];
  }

  deleteTimer(name: string): boolean {
    if (!this.currentUserId) {
      throw new Error('No user is currently authenticated');
    }

    const timers = this.getAllTimers();
    const filteredTimers = timers.filter(t => t.name !== name);
    
    if (filteredTimers.length === timers.length) {
      return false; // Timer not found
    }
    
    // Stop timer if it's active
    if (this.activeTimers.has(name)) {
      this.stopTimer(name);
    }
    
    this.store.set(`timers_${this.currentUserId}`, filteredTimers);
    return true;
  }

  async startStopTimer(name: string): Promise<{ action: 'started' | 'stopped', startTime?: Date, duration?: number }> {
    if (!this.currentUserId) {
      throw new Error('No user is currently authenticated');
    }

    const timers = this.getAllTimers();
    const timer = timers.find(t => t.name === name);
    
    if (!timer) {
      throw new Error('Timer not found');
    }

    if (this.activeTimers.has(name)) {
      // Stop timer
      const duration = await this.stopTimer(name);
      return { action: 'stopped', duration };
    } else {
      // Start timer
      const startTime = new Date();
      this.activeTimers.set(name, { name, startTime });
      this.saveActiveTimersToStore();
      return { action: 'started', startTime };
    }
  }

  private async stopTimer(name: string): Promise<number> {
    const activeTimer = this.activeTimers.get(name);
    if (!activeTimer) {
      throw new Error('Timer is not active');
    }

    let endTime = new Date();
    const durationMs = endTime.getTime() - activeTimer.startTime.getTime();
    let duration = Math.round(durationMs / 1000 / 60); // duration in minutes
    
    // Google Calendar API requires events to align with minute boundaries
    // Round start time down to the nearest minute
    const alignedStartTime = new Date(activeTimer.startTime);
    alignedStartTime.setSeconds(0, 0);
    
    // Round end time up to the next minute boundary
    const alignedEndTime = new Date(endTime);
    if (alignedEndTime.getSeconds() > 0 || alignedEndTime.getMilliseconds() > 0) {
      alignedEndTime.setMinutes(alignedEndTime.getMinutes() + 1);
    }
    alignedEndTime.setSeconds(0, 0);
    
    // Ensure minimum 1 minute duration
    const alignedDurationMs = alignedEndTime.getTime() - alignedStartTime.getTime();
    if (alignedDurationMs < 60000) {
      alignedEndTime.setTime(alignedStartTime.getTime() + 60000);
      console.log('⏱️  Timer duration was less than 1 minute, extending to 1 minute for Google Calendar API');
    }
    
    // Use aligned times for calendar event
    endTime = alignedEndTime;
    const startTime = alignedStartTime;
    duration = Math.max(1, duration);
    
    // Remove from active timers
    this.activeTimers.delete(name);
    this.saveActiveTimersToStore();

    // Find the timer configuration
    const timers = this.getAllTimers();
    const timer = timers.find(t => t.name === name);
    
    // Create calendar event if timer exists (even for short durations since we extend to 1 min)
    if (timer && durationMs > 0) {
      // Create calendar event
      try {
        await this.googleCalendarService.createEvent(timer.calendarId, {
          summary: timer.name,
          start: startTime,
          end: endTime
        });
        
        // Save session history
        this.saveTimerSession({
          name: timer.name,
          calendarId: timer.calendarId,
          startTime: startTime,
          endTime,
          duration
        });
      } catch (error) {
        console.error('Error creating calendar event:', error);
        // Still save the session even if calendar creation fails
        this.saveTimerSession({
          name: timer.name,
          calendarId: timer.calendarId,
          startTime: startTime,
          endTime,
          duration
        });
      }
    }

    return duration;
  }

  private saveTimerSession(session: TimerSession): void {
    if (!this.currentUserId) return; // Don't save if no user is authenticated
    
    const sessions = this.store.get(`timerSessions_${this.currentUserId}`, []) as TimerSession[];
    sessions.push({
      ...session,
      startTime: new Date(session.startTime),
      endTime: session.endTime ? new Date(session.endTime) : undefined
    });
    
    // Keep only last 100 sessions
    if (sessions.length > 100) {
      sessions.splice(0, sessions.length - 100);
    }
    
    this.store.set(`timerSessions_${this.currentUserId}`, sessions);
  }

  getTimerSessions(): TimerSession[] {
    if (!this.currentUserId) return [];
    return this.store.get(`timerSessions_${this.currentUserId}`, []) as TimerSession[];
  }

  isTimerActive(name: string): boolean {
    return this.activeTimers.has(name);
  }

  getTimerStartTime(name: string): Date | null {
    const activeTimer = this.activeTimers.get(name);
    return activeTimer ? activeTimer.startTime : null;
  }
}