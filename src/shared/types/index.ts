// Shared types between main and renderer processes

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
  accessRole?: string;
}

export interface CalendarEvent {
  summary: string;
  start: Date;
  end: Date;
  calendarId: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

// IPC Channel definitions for type safety
export interface IPCChannels {
  // Calendar methods
  'get-calendars': () => Promise<Calendar[]>;
  'start-auth': () => Promise<{ success: boolean; authUrl?: string }>;
  'set-auth-code': (authCode: string) => Promise<boolean>;
  'logout': () => Promise<{ success: boolean }>;
  
  // Timer methods
  'get-all-timers': () => Promise<Timer[]>;
  'get-active-timers': () => Promise<Record<string, string>>;
  'add-timer': (name: string, calendarId: string) => Promise<Timer>;
  'save-timer': (name: string, calendarId: string) => Promise<Timer>;
  'delete-timer': (name: string) => Promise<boolean>;
  'start-stop-timer': (name: string) => Promise<{ action: 'started' | 'stopped'; startTime?: Date; duration?: number }>;
  
  // Window methods
  'open-settings': () => Promise<void>;
  'quit-app': () => Promise<void>;
  'open-dxt-file': () => Promise<void>;
}

// Event channel definitions
export interface IPCEvents {
  'data-changed': () => void;
  'oauth-success': () => void;
  'logout-success': () => void;
  'notify-data-changed': () => void;
  'notify-calendar-change': () => void;
}