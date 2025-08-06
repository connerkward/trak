// Shared types that can be used by both desktop and mobile apps
export interface Timer {
  name: string;
  calendarId: string;
}

export interface ActiveTimer {
  name: string;
  startTime: Date;
}

export interface TimerSession {
  name: string;
  calendarId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
}

export interface Calendar {
  id: string;
  name: string;
  primary?: boolean;
  accessRole: string;
}

export interface CalendarEvent {
  summary: string;
  start: Date;
  end: Date;
  calendarId: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

// Abstract interfaces for platform-specific implementations
export interface IStorageService {
  get(key: string, defaultValue?: any): any;
  set(key: string, value: any): void;
  delete(key: string): void;
  has(key: string): boolean;
}

export interface IGoogleCalendarService {
  isAuthenticated(): boolean;
  getCurrentUserId(): string | null;
  getAuthUrl(): string;
  authenticate(authCode?: string): Promise<{ success: boolean; authUrl?: string; error?: string }>;
  logout(): Promise<void>;
  setAuthCode(authCode: string): Promise<boolean>;
  getCalendars(): Promise<Calendar[]>;
  createEvent(event: CalendarEvent): Promise<boolean>;
  setCurrentUser(userId: string | null): void;
}

export interface ITimerService {
  setCurrentUser(userId: string | null): void;
  initialize(): void;
  cleanup(): void;
  getAllTimers(): Timer[];
  getActiveTimers(): Record<string, string>;
  addTimer(name: string, calendarId: string): boolean;
  saveTimer(name: string, calendarId: string): boolean;
  deleteTimer(name: string): boolean;
  startStopTimer(name: string): Promise<{ action: 'started' | 'stopped', startTime?: Date, duration?: number }>;
  getTimerSessions(): TimerSession[];
  isTimerActive(name: string): boolean;
  getTimerStartTime(name: string): Date | null;
} 