import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';
import * as fs from 'fs';
import { homedir } from 'os';

// Define types inline to avoid import issues when bundled
interface Timer {
  name: string;
  calendarId: string;
}

interface Calendar {
  id: string;
  name: string;
  primary: boolean;
  accessRole: string;
}

/**
 * MCP Server for Dingo Track
 * Allows Claude Desktop to interact with the Dingo Track timer application
 */

// Storage path for Dingo Track data - match Electron's app.getPath('userData')
const resolveUserDataPath = () => {
  const envPath = process.env.DINGO_TRACK_USER_DATA_PATH;
  if (envPath && envPath.trim().length > 0) {
    return envPath;
  }
  return path.join(homedir(), 'Library', 'Application Support', '@every-time', 'dingo-track');
};

const getStoragePath = () => resolveUserDataPath();

// Get the correct storage path for the main app
const getMainAppStoragePath = () => resolveUserDataPath();

// Simple storage interface with file locking to prevent race conditions
class SimpleStore {
  private storePath: string;
  private lockPath: string;
  private data: Record<string, any> = {};

  constructor(name: string) {
    const storagePath = getStoragePath();
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }
    this.storePath = path.join(storagePath, `${name}.json`);
    this.lockPath = path.join(storagePath, `${name}.lock`);
    this.load();
  }

  private acquireLock(maxRetries = 100, delayMs = 20): boolean {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Try to create lock file exclusively (fails if exists)
        fs.writeFileSync(this.lockPath, String(process.pid), { flag: 'wx' });
        return true;
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock exists, check if stale (process died)
          try {
            const lockPid = fs.readFileSync(this.lockPath, 'utf-8');
            try {
              // Check if process still exists (throws if not)
              process.kill(Number(lockPid), 0);
              // Process exists, wait and retry
            } catch {
              // Process doesn't exist, remove stale lock
              fs.unlinkSync(this.lockPath);
              continue;
            }
          } catch {
            // Couldn't read lock file, try to remove it
            try { fs.unlinkSync(this.lockPath); } catch {}
          }
          // Wait before retry
          const start = Date.now();
          while (Date.now() - start < delayMs) { /* busy wait */ }
        } else {
          throw error;
        }
      }
    }
    return false;
  }

  private releaseLock(): void {
    try {
      fs.unlinkSync(this.lockPath);
    } catch (error) {
      // Ignore errors - lock might have been removed already
    }
  }

  private load() {
    if (!this.acquireLock()) {
      console.error('Failed to acquire lock for reading');
      return;
    }

    try {
      if (fs.existsSync(this.storePath)) {
        const content = fs.readFileSync(this.storePath, 'utf-8');
        this.data = JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to load store:', error);
      this.data = {};
    } finally {
      this.releaseLock();
    }
  }

  private save() {
    if (!this.acquireLock()) {
      console.error('Failed to acquire lock for writing');
      return;
    }

    try {
      // Write to temp file first (atomic operation)
      const tempPath = `${this.storePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      // Rename is atomic on most systems
      fs.renameSync(tempPath, this.storePath);
    } catch (error) {
      console.error('Failed to save store:', error);
    } finally {
      this.releaseLock();
    }
  }

  get<T>(key: string, defaultValue?: T): T {
    // Reload before get to ensure fresh data
    this.load();
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  set(key: string, value: any): void {
    // Read-modify-write with locking (atomic operation)
    if (!this.acquireLock()) {
      console.error('Failed to acquire lock for set operation');
      return;
    }

    try {
      // Reload from disk first (get latest state)
      if (fs.existsSync(this.storePath)) {
        const content = fs.readFileSync(this.storePath, 'utf-8');
        this.data = JSON.parse(content);
      }

      // Modify
      this.data[key] = value;

      // Write atomically
      const tempPath = `${this.storePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.storePath);
    } catch (error) {
      console.error('Failed in set operation:', error);
    } finally {
      this.releaseLock();
    }
  }

  has(key: string): boolean {
    this.load();
    return this.data[key] !== undefined;
  }

  delete(key: string): void {
    // Read-modify-write with locking (atomic operation)
    if (!this.acquireLock()) {
      console.error('Failed to acquire lock for delete operation');
      return;
    }

    try {
      // Reload from disk first (get latest state)
      if (fs.existsSync(this.storePath)) {
        const content = fs.readFileSync(this.storePath, 'utf-8');
        this.data = JSON.parse(content);
      }

      // Modify
      delete this.data[key];

      // Write atomically
      const tempPath = `${this.storePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.storePath);
    } catch (error) {
      console.error('Failed in delete operation:', error);
    } finally {
      this.releaseLock();
    }
  }
}

// Initialize storage - use the same file as main app for timers
const timerStore = new SimpleStore('dingo-track-timers');
const configStore = new SimpleStore('dingo-track');

// Get current user ID from main app storage
function getCurrentUserId(): string {
  try {
    const userId = configStore.get('currentUserId', 'dev-user');
    return userId;
  } catch (error) {
    console.error('Failed to get current user ID:', error);
    return 'dev-user';
  }
}

// Note: We no longer use signal files. The main app watches the storage files directly.
// MCP server just writes to storage, and the main app's file watcher picks up changes.

// Define MCP tools
const TOOLS: Tool[] = [
  {
    name: 'list_timers',
    description: 'List all configured timers in Dingo Track',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'add_timer',
    description: 'Add a new timer to Dingo Track. Provide either calendarId or calendarName.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the timer (e.g., "Coding", "Meetings", "Exercise")',
        },
        calendarId: {
          type: 'string',
          description: 'The Google Calendar ID to associate with this timer',
        },
        calendarName: {
          type: 'string',
          description: 'Alternative to calendarId; exact calendar name as shown in Settings',
        }
      },
      required: ['name'],
    },
  },
  {
    name: 'delete_timer',
    description: 'Delete a timer from Dingo Track by name',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the timer to delete',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_active_timers',
    description: 'Get all currently active (running) timers with their start times',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_calendars',
    description: 'List all available Google Calendars connected to Dingo Track',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_timer_status',
    description: 'Get the status of a specific timer (whether it\'s running or stopped)',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the timer',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'start_stop_timer',
    description: 'Start or stop a timer by name',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the timer to start or stop',
        },
      },
      required: ['name'],
    },
  },
];

// Timer service functions
const getAllTimers = (): Timer[] => {
  const userId = getCurrentUserId();
  return timerStore.get<Timer[]>(`timers_${userId}`, []);
};

const addTimer = (name: string, calendarId: string): void => {
  const userId = getCurrentUserId();
  const timers = getAllTimers();

  // Check if timer already exists
  if (timers.some(t => t.name === name)) {
    throw new Error(`Timer "${name}" already exists`);
  }

  timers.push({ name, calendarId });
  timerStore.set(`timers_${userId}`, timers);
};

const deleteTimer = (name: string): void => {
  const userId = getCurrentUserId();
  const timers = getAllTimers();
  const filtered = timers.filter(t => t.name !== name);

  if (filtered.length === timers.length) {
    throw new Error(`Timer "${name}" not found`);
  }

  timerStore.set(`timers_${userId}`, filtered);

  // Also remove from active timers if it was running
  const activeTimers = timerStore.get<Record<string, number>>(`activeTimers_${userId}`, {});
  if (activeTimers[name]) {
    delete activeTimers[name];
    timerStore.set(`activeTimers_${userId}`, activeTimers);
  }
};

const getActiveTimers = (): Record<string, number> => {
  const userId = getCurrentUserId();
  return timerStore.get<Record<string, number>>(`activeTimers_${userId}`, {});
};

const getCalendars = (): Calendar[] => {
  // Read the latest calendars list persisted by the main Electron app
  const calendars = configStore.get<Calendar[]>('calendars', []);
  if (calendars && calendars.length > 0) return calendars;

  // Fallback: infer from timers if calendars not yet persisted
  const userId = getCurrentUserId();
  const timers = timerStore.get<Timer[]>(`timers_${userId}`, []);
  const uniqueCalendarIds = [...new Set(timers.map(t => t.calendarId))];
  return uniqueCalendarIds.map(id => ({
    id,
    name: id.includes('@group.calendar.google.com') ? 'Shared Calendar' : 'Primary Calendar',
    primary: false,
    accessRole: 'owner'
  }));
};

const startStopTimer = (name: string): { action: 'started' | 'stopped', startTime?: number } => {
  const userId = getCurrentUserId();
  const activeTimers = getActiveTimers();

  if (activeTimers[name]) {
    // Stop timer
    delete activeTimers[name];
    timerStore.set(`activeTimers_${userId}`, activeTimers);
    return { action: 'stopped' };
  } else {
    // Start timer
    const startTime = Date.now();
    activeTimers[name] = startTime;
    timerStore.set(`activeTimers_${userId}`, activeTimers);
    return { action: 'started', startTime };
  }
};

// Create MCP server
const server = new Server(
  {
    name: 'dingo-track-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name: toolName, arguments: args } = request.params;

  try {
    switch (toolName) {
      case 'list_timers': {
        const timers = getAllTimers();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(timers, null, 2),
            },
          ],
        };
      }

      case 'add_timer': {
        const { name, calendarId, calendarName } = args as { name: string; calendarId?: string; calendarName?: string };
        let targetCalendarId = calendarId;
        if (!targetCalendarId && calendarName) {
          const calendars = getCalendars();
          const match = calendars.find(c => c.name.toLowerCase() === calendarName.toLowerCase());
          if (!match) throw new Error(`Calendar named "${calendarName}" not found`);
          targetCalendarId = match.id;
        }
        if (!targetCalendarId) throw new Error('calendarId or calendarName is required');
        addTimer(name, targetCalendarId);
        notifyChange(`add_timer: "${name}"`);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully added timer "${name}" for calendar "${targetCalendarId}"`,
            },
          ],
        };
      }

      case 'delete_timer': {
        const { name } = args as { name: string };
        deleteTimer(name);
        notifyChange(`delete_timer: "${name}"`);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted timer "${name}"`,
            },
          ],
        };
      }

      case 'get_active_timers': {
        const activeTimers = getActiveTimers();
        const result = Object.entries(activeTimers).map(([name, startTime]) => ({
          name,
          startTime,
          duration: Date.now() - startTime,
          durationFormatted: formatDuration(Date.now() - startTime),
        }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_calendars': {
        const calendars = getCalendars();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(calendars, null, 2),
            },
          ],
        };
      }

      case 'get_timer_status': {
        const { name } = args as { name: string };
        const timers = getAllTimers();
        const timer = timers.find(t => t.name === name);

        if (!timer) {
          throw new Error(`Timer "${name}" not found`);
        }

        const activeTimers = getActiveTimers();
        const isRunning = !!activeTimers[name];
        const startTime = activeTimers[name];

        const status = {
          name: timer.name,
          calendarId: timer.calendarId,
          isRunning,
          startTime: startTime || null,
          duration: isRunning ? Date.now() - startTime : 0,
          durationFormatted: isRunning ? formatDuration(Date.now() - startTime) : '00:00:00',
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      case 'start_stop_timer': {
        const { name } = args as { name: string };
        const result = startStopTimer(name);
        notifyChange(`start_stop_timer: "${name}" -> ${result.action}`);
        return {
          content: [
            {
              type: 'text',
              text: `Timer "${name}" ${result.action}${result.startTime ? ` at ${new Date(result.startTime).toLocaleTimeString()}` : ''}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Helper function to format duration
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to notify of changes (logs to stderr for debugging)
function notifyChange(operation: string): void {
  const timestamp = Date.now();
  console.error(`[MCP] ${operation} at ${new Date(timestamp).toISOString()}`);
}

// Start the MCP stdio server
async function main() {
  try {
    console.error('[MCP] Starting Dingo Track MCP server...');
    console.error('[MCP] Node version:', process.version);
    console.error('[MCP] Working directory:', process.cwd());
    console.error('[MCP] User data path:', process.env.DINGO_TRACK_USER_DATA_PATH || 'not set');

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('[MCP] Dingo Track MCP server running on stdio');
    console.error('[MCP] Server ready to accept requests');
  } catch (error) {
    console.error('[MCP] Failed to start server:', error);
    throw error;
  }
}

main().catch((error) => {
  console.error('[MCP] Fatal error in main():', error);
  console.error('[MCP] Stack trace:', error instanceof Error ? error.stack : 'N/A');
  process.exit(1);
});
