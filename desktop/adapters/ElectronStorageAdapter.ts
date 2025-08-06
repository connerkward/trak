import Store from 'electron-store';
import { IStorageService } from '../../src/shared/types';

export class ElectronStorageAdapter implements IStorageService {
  private store: Store;

  constructor() {
    this.store = new Store();
  }

  get(key: string, defaultValue?: any): any {
    return this.store.get(key, defaultValue);
  }

  set(key: string, value: any): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }
} 