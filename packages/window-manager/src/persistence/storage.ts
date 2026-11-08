import type { LayoutState } from '../models';

/**
 * Storage adapter interface for layout persistence
 */
export interface StorageAdapter {
  /** Get the stored layout */
  get(): LayoutState | null;
  /** Save the layout */
  set(layout: LayoutState): void;
  /** Clear the stored layout */
  clear(): void;
  /** Check if storage is available */
  isAvailable(): boolean;
}

/**
 * LocalStorage adapter for browser environments
 */
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly key: string = 'workbench-layout') {}

  isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  get(): LayoutState | null {
    if (!this.isAvailable()) return null;

    try {
      const data = localStorage.getItem(this.key);
      if (!data) return null;
      return JSON.parse(data) as LayoutState;
    } catch (error) {
      console.error('Failed to load layout from localStorage:', error);
      return null;
    }
  }

  set(layout: LayoutState): void {
    if (!this.isAvailable()) return;

    try {
      localStorage.setItem(this.key, JSON.stringify(layout));
    } catch (error) {
      console.error('Failed to save layout to localStorage:', error);
    }
  }

  clear(): void {
    if (!this.isAvailable()) return;
    localStorage.removeItem(this.key);
  }
}

/**
 * SessionStorage adapter for temporary persistence
 */
export class SessionStorageAdapter implements StorageAdapter {
  constructor(private readonly key: string = 'workbench-layout-session') {}

  isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  get(): LayoutState | null {
    if (!this.isAvailable()) return null;

    try {
      const data = sessionStorage.getItem(this.key);
      if (!data) return null;
      return JSON.parse(data) as LayoutState;
    } catch (error) {
      console.error('Failed to load layout from sessionStorage:', error);
      return null;
    }
  }

  set(layout: LayoutState): void {
    if (!this.isAvailable()) return;

    try {
      sessionStorage.setItem(this.key, JSON.stringify(layout));
    } catch (error) {
      console.error('Failed to save layout to sessionStorage:', error);
    }
  }

  clear(): void {
    if (!this.isAvailable()) return;
    sessionStorage.removeItem(this.key);
  }
}

/**
 * In-memory adapter for testing or SSR
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private layout: LayoutState | null = null;

  isAvailable(): boolean {
    return true;
  }

  get(): LayoutState | null {
    return this.layout;
  }

  set(layout: LayoutState): void {
    this.layout = layout;
  }

  clear(): void {
    this.layout = null;
  }
}

/**
 * Create the appropriate storage adapter for the current environment
 */
export function createStorageAdapter(key?: string): StorageAdapter {
  if (typeof window === 'undefined') {
    return new MemoryStorageAdapter();
  }

  const adapter = new LocalStorageAdapter(key);
  if (adapter.isAvailable()) {
    return adapter;
  }

  return new MemoryStorageAdapter();
}
