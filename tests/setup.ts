/**
 * Test setup for integration tests
 * Mocks Electron APIs that aren't available in test environment
 */

import { vi } from 'vitest';
import path from 'path';
import os from 'os';

// Mock Electron app module
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      // Use temp directory for tests
      const testDataPath = path.join(os.tmpdir(), 'dingo-track-test');
      return testDataPath;
    }
  },
  dialog: {
    showErrorBox: vi.fn()
  }
}));

