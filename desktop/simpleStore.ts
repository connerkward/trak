import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export class SimpleStore {
  private data: Record<string, any> = {};
  private filePath: string;

  constructor(options: { name: string }) {
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

  get(key: string, defaultValue?: any): any {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  set(key: string, value: any): void {
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