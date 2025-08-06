import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SimpleStore } from './StorageService';

// Mock filesystem operations
vi.mock('fs');
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/'))
}));
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/app/data')
  }
}));

const mockFs = fs as any;

describe('SimpleStore', () => {
  let store: SimpleStore;
  const mockFilePath = '/mock/app/data/test-store.json';

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('{}');
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.mkdirSync.mockImplementation(() => {});
    
    store = new SimpleStore({ name: 'test-store' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('creates store with correct file path', () => {
      const mockPath = path as any;
      expect(mockPath.join).toHaveBeenCalledWith('/mock/app/data', 'test-store.json');
    });

    it('loads existing data from file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"key": "value"}');
      
      const newStore = new SimpleStore({ name: 'existing-store' });
      
      expect(newStore.get('key')).toBe('value');
    });

    it('handles missing file gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const newStore = new SimpleStore({ name: 'missing-store' });
      
      expect(newStore.get('nonexistent')).toBeUndefined();
    });

    it('handles corrupted JSON file gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const newStore = new SimpleStore({ name: 'corrupted-store' });
      
      expect(newStore.get('key')).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('get', () => {
    it('returns stored value', () => {
      store.set('key', 'value');
      expect(store.get('key')).toBe('value');
    });

    it('returns default value when key does not exist', () => {
      expect(store.get('nonexistent', 'default')).toBe('default');
    });

    it('returns undefined when key does not exist and no default', () => {
      expect(store.get('nonexistent')).toBeUndefined();
    });

    it('supports generic type parameter', () => {
      store.set('number', 42);
      const value = store.get<number>('number');
      expect(value).toBe(42);
    });
  });

  describe('set', () => {
    it('stores value and saves to file', () => {
      store.set('key', 'value');
      
      expect(store.get('key')).toBe('value');
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('creates directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      store.set('key', 'value');
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        '/mock/app/data',
        { recursive: true }
      );
    });

    it('handles write errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });
      
      store.set('key', 'value');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('delete', () => {
    it('removes key and saves to file', () => {
      store.set('key', 'value');
      store.delete('key');
      
      expect(store.get('key')).toBeUndefined();
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2); // once for set, once for delete
    });
  });

  describe('has', () => {
    it('returns true for existing key', () => {
      store.set('key', 'value');
      expect(store.has('key')).toBe(true);
    });

    it('returns false for non-existing key', () => {
      expect(store.has('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all data and saves to file', () => {
      store.set('key1', 'value1');
      store.set('key2', 'value2');
      store.clear();
      
      expect(store.get('key1')).toBeUndefined();
      expect(store.get('key2')).toBeUndefined();
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(3); // set, set, clear
    });
  });
});