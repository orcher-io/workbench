import type { Disposable } from '@orcher/workbench-plugin-api';

/**
 * History adapter interface - abstracts browser history vs Next.js router
 */
export interface IHistoryAdapter {
  /** Push a new path to history */
  push(path: string): void;
  /** Replace current path (no new history entry) */
  replace(path: string): void;
  /** Go back in history */
  back(): void;
  /** Go forward in history */
  forward(): void;
  /** Get current path */
  getCurrentPath(): string;
  /** Subscribe to path changes */
  subscribe(listener: (path: string) => void): Disposable;
}

/**
 * Browser History API implementation
 */
export class BrowserHistoryAdapter implements IHistoryAdapter {
  private listeners = new Set<(path: string) => void>();
  private popStateHandler: ((event: PopStateEvent) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.popStateHandler = () => {
        this.notify(this.getCurrentPath());
      };
      window.addEventListener('popstate', this.popStateHandler);
    }
  }

  push(path: string): void {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      this.notify(path);
    }
  }

  replace(path: string): void {
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', path);
      this.notify(path);
    }
  }

  back(): void {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }

  forward(): void {
    if (typeof window !== 'undefined') {
      window.history.forward();
    }
  }

  getCurrentPath(): string {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  }

  subscribe(listener: (path: string) => void): Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private notify(path: string): void {
    for (const listener of this.listeners) {
      listener(path);
    }
  }

  dispose(): void {
    if (typeof window !== 'undefined' && this.popStateHandler) {
      window.removeEventListener('popstate', this.popStateHandler);
    }
    this.listeners.clear();
  }
}

/**
 * Next.js App Router adapter
 * Uses the Next.js useRouter hook internally
 */
export class NextHistoryAdapter implements IHistoryAdapter {
  private listeners = new Set<(path: string) => void>();
  private currentPath = '/';

  constructor(
    private router: {
      push: (path: string) => void;
      replace: (path: string) => void;
      back: () => void;
      forward: () => void;
    },
    initialPath?: string,
  ) {
    this.currentPath = initialPath || '/';
  }

  push(path: string): void {
    this.currentPath = path;
    this.router.push(path);
    this.notify(path);
  }

  replace(path: string): void {
    this.currentPath = path;
    this.router.replace(path);
    this.notify(path);
  }

  back(): void {
    this.router.back();
  }

  forward(): void {
    this.router.forward();
  }

  getCurrentPath(): string {
    return this.currentPath;
  }

  /** Update current path from external source (e.g., route change) */
  setCurrentPath(path: string): void {
    if (this.currentPath !== path) {
      this.currentPath = path;
      this.notify(path);
    }
  }

  subscribe(listener: (path: string) => void): Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private notify(path: string): void {
    for (const listener of this.listeners) {
      listener(path);
    }
  }
}

/**
 * No-op history adapter for SSR or testing
 */
export class NoopHistoryAdapter implements IHistoryAdapter {
  private currentPath: string;

  constructor(initialPath = '/') {
    this.currentPath = initialPath;
  }

  push(path: string): void {
    this.currentPath = path;
  }

  replace(path: string): void {
    this.currentPath = path;
  }

  back(): void {
    // no-op
  }

  forward(): void {
    // no-op
  }

  getCurrentPath(): string {
    return this.currentPath;
  }

  subscribe(_listener: (path: string) => void): Disposable {
    return { dispose: () => {} };
  }
}
