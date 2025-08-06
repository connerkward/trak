import type { Timer, Calendar, CalendarEvent, AuthTokens, TimerSession } from '../../shared/types';

/**
 * Storage service interface for data persistence
 */
export interface IStorageService {
  get<T = unknown>(key: string, defaultValue?: T): T;
  set(key: string, value: unknown): void;
  delete(key: string): void;
  has(key: string): boolean;
  clear(): void;
}

/**
 * Google Calendar service interface
 */
export interface IGoogleCalendarService {
  // Authentication
  authenticate(): Promise<{ authUrl?: string; success: boolean }>;
  setAuthCode(authCode: string): Promise<AuthTokens>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
  getCurrentUserId(): string | null;
  setCurrentUser(userId: string | null): void;
  
  // Calendar operations
  getCalendars(): Promise<Calendar[]>;
  createEvent(calendarId: string, event: Omit<CalendarEvent, 'calendarId'>): Promise<CalendarEvent>;
  
  // Callbacks
  setAuthSuccessCallback(callback: () => void): void;
}

/**
 * Timer service interface
 */
export interface ITimerService {
  // Lifecycle
  initialize(): void;
  cleanup(): void;
  setCurrentUser(userId: string | null): void;
  
  // Timer management
  getAllTimers(): Timer[];
  getActiveTimers(): Record<string, string>;
  addTimer(name: string, calendarId: string): Timer;
  saveTimer(name: string, calendarId: string): Timer;
  deleteTimer(name: string): boolean;
  
  // Timer operations
  startStopTimer(name: string): Promise<{ action: 'started' | 'stopped'; startTime?: Date; duration?: number }>;
}

/**
 * Event emitter interface for OAuth flow
 */
export interface IOAuthEventEmitter {
  on(event: string, listener: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
}