import type {
  Disposable,
  RouteState,
  RouteMatch,
  NavigateOptions,
  IRoutingService,
  ExplorerMenuItem,
} from '@orcher/workbench-plugin-api';
import type { IHistoryAdapter } from './history-adapter';

type RouteListener = (state: RouteState) => void;

/**
 * Routing service that handles bidirectional URL <-> application state sync
 */
export class RoutingService implements IRoutingService {
  private state: RouteState;
  private listeners = new Set<RouteListener>();

  // Registry references - will be set by the unified explorer plugin
  private itemRegistry: Map<string, ExplorerMenuItem> = new Map();
  private sectionItems: Map<string, Set<string>> = new Map();
  private pathToItemId: Map<string, string> = new Map();
  private itemIdToPath: Map<string, string> = new Map();
  private uriToPathMap: Map<string, string> = new Map();

  constructor(private historyAdapter: IHistoryAdapter) {
    // Initialize state from current URL
    this.state = this.parseUrl(historyAdapter.getCurrentPath());

    // Listen for external URL changes (back/forward)
    historyAdapter.subscribe((path) => {
      const newState = this.parseUrl(path);
      if (this.state.path !== newState.path) {
        this.state = newState;
        this.notify();
      }
    });
  }

  /**
   * Set the item registry (called by ExplorerRegistry)
   */
  setItemRegistry(
    items: Map<string, ExplorerMenuItem>,
    sectionItems: Map<string, Set<string>>,
  ): void {
    this.itemRegistry = items;
    this.sectionItems = sectionItems;
    this.rebuildPathIndex();
  }

  /**
   * Rebuild the path index from current items
   */
  rebuildPathIndex(): void {
    this.pathToItemId.clear();
    this.itemIdToPath.clear();
    this.uriToPathMap.clear();

    for (const [sectionId, itemIds] of this.sectionItems) {
      for (const itemId of itemIds) {
        const item = this.itemRegistry.get(itemId);
        if (item) {
          const path = this.buildPathForItem(sectionId, item);
          this.pathToItemId.set(path, itemId);
          this.itemIdToPath.set(itemId, path);

          // Map URI to path for reverse lookup
          if (item.uri) {
            this.uriToPathMap.set(item.uri, path);
          }
        }
      }
    }
  }

  /**
   * Build path for a specific item by traversing parents
   */
  private buildPathForItem(sectionId: string, item: ExplorerMenuItem): string {
    const segments: string[] = [];
    let current: ExplorerMenuItem | undefined = item;

    while (current) {
      const segment = current.pathSegment || this.toKebabCase(current.label);
      segments.unshift(segment);

      if (current.parentId) {
        current = this.itemRegistry.get(current.parentId);
      } else {
        break;
      }
    }

    // Prepend section ID as first segment
    segments.unshift(sectionId);

    return '/' + segments.join('/');
  }

  /**
   * Convert string to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Parse URL into RouteState
   */
  private parseUrl(url: string): RouteState {
    const [pathWithHash, hash = ''] = url.split('#');
    const [path, queryString = ''] = pathWithHash.split('?');

    const segments = path.split('/').filter(Boolean);
    const query: Record<string, string> = {};

    if (queryString) {
      const params = new URLSearchParams(queryString);
      params.forEach((value, key) => {
        query[key] = value;
      });
    }

    return {
      path: path || '/',
      segments,
      query,
      hash,
    };
  }

  /**
   * Get current route state
   */
  getState(): RouteState {
    return { ...this.state };
  }

  /**
   * Navigate to a path
   */
  navigate(path: string, options?: NavigateOptions): void {
    if (options?.replace) {
      this.replace(path);
    } else {
      this.state = this.parseUrl(path);
      this.historyAdapter.push(path);
      this.notify();
    }
  }

  /**
   * Replace current path without creating history entry
   */
  replace(path: string): void {
    this.state = this.parseUrl(path);
    this.historyAdapter.replace(path);
    this.notify();
  }

  /**
   * Go back in history
   */
  back(): void {
    this.historyAdapter.back();
  }

  /**
   * Go forward in history
   */
  forward(): void {
    this.historyAdapter.forward();
  }

  /**
   * Subscribe to route changes
   */
  subscribe(listener: RouteListener): Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  /**
   * Match a path to registered routes
   */
  matchPath(path: string): RouteMatch | null {
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      return null;
    }

    const sectionId = segments[0];

    // Check if section exists
    if (!this.sectionItems.has(sectionId)) {
      return null;
    }

    // If only section, return section match
    if (segments.length === 1) {
      return {
        sectionId,
        itemId: null,
        fullPath: '/' + sectionId,
        remainingSegments: [],
      };
    }

    // Try to find exact match
    const itemId = this.pathToItemId.get(path);
    if (itemId) {
      return {
        sectionId,
        itemId,
        fullPath: path,
        remainingSegments: [],
      };
    }

    // Try partial matches (find longest matching path)
    let bestMatch: RouteMatch | null = null;
    let bestMatchLength = 0;

    for (const [registeredPath, registeredItemId] of this.pathToItemId) {
      if (path.startsWith(registeredPath) && registeredPath.length > bestMatchLength) {
        const remaining = path.slice(registeredPath.length).split('/').filter(Boolean);
        bestMatch = {
          sectionId,
          itemId: registeredItemId,
          fullPath: registeredPath,
          remainingSegments: remaining,
        };
        bestMatchLength = registeredPath.length;
      }
    }

    return bestMatch || {
      sectionId,
      itemId: null,
      fullPath: '/' + sectionId,
      remainingSegments: segments.slice(1),
    };
  }

  /**
   * Build path for a section and item
   */
  buildPath(sectionId: string, itemId: string): string {
    const item = this.itemRegistry.get(itemId);
    if (!item) {
      return '/' + sectionId;
    }
    return this.buildPathForItem(sectionId, item);
  }

  /**
   * Convert a URI to a path (if registered)
   */
  uriToPath(uri: string): string | null {
    // Direct URI match
    if (this.uriToPathMap.has(uri)) {
      return this.uriToPathMap.get(uri) || null;
    }

    // Try to find by item ID in URI (item://itemId pattern)
    const itemMatch = uri.match(/^item:\/\/(.+)$/);
    if (itemMatch) {
      const itemId = itemMatch[1];
      return this.itemIdToPath.get(itemId) || null;
    }

    return null;
  }

  /**
   * Convert a path to a URI
   */
  pathToUri(path: string): string | null {
    const itemId = this.pathToItemId.get(path);
    if (!itemId) {
      return null;
    }

    const item = this.itemRegistry.get(itemId);
    return item?.uri || `item://${itemId}`;
  }

  /**
   * Sync state from current URL
   */
  syncFromUrl(): void {
    const currentPath = this.historyAdapter.getCurrentPath();
    const newState = this.parseUrl(currentPath);

    if (this.state.path !== newState.path) {
      this.state = newState;
      this.notify();
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    const stateCopy = { ...this.state };
    for (const listener of this.listeners) {
      listener(stateCopy);
    }
  }
}
