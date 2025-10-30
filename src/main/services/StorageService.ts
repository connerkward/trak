import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface StorageOptions {
  name: string;
}

export class SimpleStore {
  private data: Record<string, unknown> = {};
  private filePath: string;

  constructor(options: StorageOptions) {
    // Get the app data directory
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, `${options.name}.json`);
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Failed to load store:', error);
      this.data = {};
    }
  }

  private save(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Failed to save store:', error);
    }
  }

  get<T = unknown>(key: string, defaultValue?: T): T {
    // Always reload from disk to get latest changes (e.g. from MCP server)
    this.load();
    return (this.data[key] !== undefined ? this.data[key] : defaultValue) as T;
  }

  set(key: string, value: unknown): void {
    // Reload to merge with any concurrent changes
    this.load();
    this.data[key] = value;
    this.save();
  }

  delete(key: string): void {
    delete this.data[key];
    this.save();
  }

  has(key: string): boolean {
    return key in this.data;
  }

  clear(): void {
    this.data = {};
    this.save();
  }
}