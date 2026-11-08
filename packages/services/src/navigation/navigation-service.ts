import type { Disposable } from '@orcher/workbench-plugin-api';

/**
 * Breadcrumb item for navigation
 */
export interface NavigationBreadcrumb {
  id: string;
  label: string;
  path?: string;
}

/**
 * Navigation state
 */
export interface NavigationState {
  /** Current breadcrumb path */
  breadcrumbs: NavigationBreadcrumb[];
  /** Whether back navigation is available */
  canGoBack: boolean;
  /** Whether forward navigation is available */
  canGoForward: boolean;
  /** Whether up navigation is available */
  canGoUp: boolean;
  /** Whether current item is bookmarked */
  isBookmarked: boolean;
}

/**
 * Navigation history entry
 */
interface HistoryEntry {
  breadcrumbs: NavigationBreadcrumb[];
}

/**
 * Service for managing navigation state across the application
 */
export class NavigationService {
  private state: NavigationState = {
    breadcrumbs: [],
    canGoBack: false,
    canGoForward: false,
    canGoUp: false,
    isBookmarked: false,
  };

  private history: HistoryEntry[] = [];
  private historyIndex = -1;
  private maxHistorySize = 50;
  private bookmarks = new Set<string>();

  private listeners = new Set<() => void>();

  /**
   * Get the current navigation state
   */
  getState(): NavigationState {
    return { ...this.state };
  }

  /**
   * Set the current breadcrumb path
   */
  setBreadcrumbs(breadcrumbs: NavigationBreadcrumb[]): void {
    // Check if this is a new navigation (not from history)
    const currentPath = this.state.breadcrumbs.map((b) => b.id).join('/');
    const newPath = breadcrumbs.map((b) => b.id).join('/');

    if (currentPath !== newPath) {
      // Add to history
      this.historyIndex++;
      this.history = this.history.slice(0, this.historyIndex);
      this.history.push({ breadcrumbs: [...breadcrumbs] });

      // Limit history size
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
        this.historyIndex--;
      }
    }

    this.state = {
      ...this.state,
      breadcrumbs,
      canGoBack: this.historyIndex > 0,
      canGoForward: this.historyIndex < this.history.length - 1,
      canGoUp: breadcrumbs.length > 1,
      isBookmarked: this.bookmarks.has(newPath),
    };

    this.notify();
  }

  /**
   * Navigate back in history
   */
  goBack(): NavigationBreadcrumb[] | null {
    if (!this.state.canGoBack) return null;

    this.historyIndex--;
    const entry = this.history[this.historyIndex];

    this.state = {
      ...this.state,
      breadcrumbs: entry.breadcrumbs,
      canGoBack: this.historyIndex > 0,
      canGoForward: true,
      canGoUp: entry.breadcrumbs.length > 1,
      isBookmarked: this.bookmarks.has(
        entry.breadcrumbs.map((b) => b.id).join('/'),
      ),
    };

    this.notify();
    return entry.breadcrumbs;
  }

  /**
   * Navigate forward in history
   */
  goForward(): NavigationBreadcrumb[] | null {
    if (!this.state.canGoForward) return null;

    this.historyIndex++;
    const entry = this.history[this.historyIndex];

    this.state = {
      ...this.state,
      breadcrumbs: entry.breadcrumbs,
      canGoBack: true,
      canGoForward: this.historyIndex < this.history.length - 1,
      canGoUp: entry.breadcrumbs.length > 1,
      isBookmarked: this.bookmarks.has(
        entry.breadcrumbs.map((b) => b.id).join('/'),
      ),
    };

    this.notify();
    return entry.breadcrumbs;
  }

  /**
   * Navigate up one level
   */
  goUp(): NavigationBreadcrumb[] | null {
    if (!this.state.canGoUp) return null;

    const newBreadcrumbs = this.state.breadcrumbs.slice(0, -1);
    this.setBreadcrumbs(newBreadcrumbs);
    return newBreadcrumbs;
  }

  /**
   * Toggle bookmark for current path
   */
  toggleBookmark(): boolean {
    const path = this.state.breadcrumbs.map((b) => b.id).join('/');

    if (this.bookmarks.has(path)) {
      this.bookmarks.delete(path);
      this.state = { ...this.state, isBookmarked: false };
    } else {
      this.bookmarks.add(path);
      this.state = { ...this.state, isBookmarked: true };
    }

    this.notify();
    return this.state.isBookmarked;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
