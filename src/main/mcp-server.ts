#!/usr/bin/env node
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

// Import services and types
import { Timer, Calendar } from '../shared/types/index.js';

/**
 * MCP Server for Dingo Track
 * Allows Claude Desktop to interact with the Dingo Track timer application
 */

// Storage path for Dingo Track data
const getStoragePath = () => {
  const userDataPath = path.join(homedir(), '.config', 'dingo-track');
  return userDataPath;
};

// Simple storage interface (mimics electron-store)
class SimpleStore {
  private storePath: string;
  private data: Record<string, any> = {};

  constructor(name: string) {
    const storagePath = getStoragePath();
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }
    this.storePath = path.join(storagePath, `${name}.json`);
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.storePath)) {
        const content = fs.readFileSync(this.storePath, 'utf-8');
        this.data = JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to load store:', error);
      this.data = {};
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save store:', error);
    }
  }

  get<T>(key: string, defaultValue?: T): T {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  set(key: string, value: any): void {
    this.data[key] = value;
    this.save();
  }

  has(key: string): boolean {
    return this.data[key] !== undefined;
  }

  delete(key: string): void {
    delete this.data[key];
    this.save();
  }
}

// Initialize storage
const store = new SimpleStore('mcp-data');
const USER_ID = 'default-user'; // For MCP, we use a default user

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
    description: 'Add a new timer to Dingo Track. The timer will be associated with a Google Calendar.',
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
      },
      required: ['name', 'calendarId'],
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
];

// Timer service functions
const getAllTimers = (): Timer[] => {
  return store.get<Timer[]>(`timers_${USER_ID}`, []);
};

const addTimer = (name: string, calendarId: string): void => {
  const timers = getAllTimers();

  // Check if timer already exists
  if (timers.some(t => t.name === name)) {
    throw new Error(`Timer "${name}" already exists`);
  }

  timers.push({ name, calendarId });
  store.set(`timers_${USER_ID}`, timers);
};

const deleteTimer = (name: string): void => {
  const timers = getAllTimers();
  const filtered = timers.filter(t => t.name !== name);

  if (filtered.length === timers.length) {
    throw new Error(`Timer "${name}" not found`);
  }

  store.set(`timers_${USER_ID}`, filtered);

  // Also remove from active timers if it was running
  const activeTimers = store.get<Record<string, number>>(`activeTimers_${USER_ID}`, {});
  if (activeTimers[name]) {
    delete activeTimers[name];
    store.set(`activeTimers_${USER_ID}`, activeTimers);
  }
};

const getActiveTimers = (): Record<string, number> => {
  return store.get<Record<string, number>>(`activeTimers_${USER_ID}`, {});
};

const getCalendars = (): Calendar[] => {
  // Note: Calendars are stored by the OAuth token, so we need to fetch them from the main app
  // For MCP, we'll just return what's stored or an empty array
  return store.get<Calendar[]>('calendars', []);
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
        const { name, calendarId } = args as { name: string; calendarId: string };
        addTimer(name, calendarId);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully added timer "${name}" for calendar "${calendarId}"`,
            },
          ],
        };
      }

      case 'delete_timer': {
        const { name } = args as { name: string };
        deleteTimer(name);
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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Dingo Track MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
