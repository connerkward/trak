import '@testing-library/jest-dom';

// Mock window.api for testing
const mockApi = {
  getCalendars: vi.fn().mockResolvedValue([]),
  getAllTimers: vi.fn().mockResolvedValue([]),
  getActiveTimers: vi.fn().mockResolvedValue({}),
  startAuth: vi.fn().mockResolvedValue({ success: true }),
  logout: vi.fn().mockResolvedValue({ success: true }),
  addTimer: vi.fn().mockResolvedValue({ name: 'test', calendarId: 'test' }),
  deleteTimer: vi.fn().mockResolvedValue(true),
  startStopTimer: vi.fn().mockResolvedValue({ action: 'started', startTime: new Date() }),
  openSettings: vi.fn().mockResolvedValue(undefined),
  quitApp: vi.fn().mockResolvedValue(undefined),
  onDataChanged: vi.fn(),
  onOAuthSuccess: vi.fn(),
  onLogoutSuccess: vi.fn(),
  removeDataChangedListener: vi.fn(),
  notifyDataChanged: vi.fn(),
  notifyCalendarChange: vi.fn(),
};

// Set up global window.api mock
Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockImplementation((key: string) => {
    if (key === 'hiddenCalendars') return '[]';
    if (key === 'lastUsedCalendar') return '';
    return null;
  });
});