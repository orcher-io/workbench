import type { Disposable } from '../extension-points/types';

/**
 * Simple menu item for registration - no TreeDataProvider knowledge needed
 */
export interface ExplorerMenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display label */
  label: string;
  /** Icon identifier (optional) */
  icon?: string;
  /** Path segment for URL routing (defaults to kebab-case of label) */
  pathSegment?: string;
  /** Parent menu item ID (null/undefined for top-level items) */
  parentId?: string | null;
  /** Order within parent (lower = earlier) */
  order?: number;
  /** Editor ID to open when clicked (for leaf items) */
  editorId?: string;
  /** Custom URI for the tab (optional) */
  uri?: string;
  /** Whether item has children (affects collapsible state) */
  hasChildren?: boolean;
  /** Description shown next to the label */
  description?: string;
  /** Context value for when-clause evaluation */
  contextValue?: string;
}

/**
 * Activity bar section/group
 */
export interface ExplorerMenuSection {
  /** Section identifier */
  id: string;
  /** Display title */
  title: string;
  /** Icon for activity bar */
  icon: string;
  /** Order in activity bar (lower = earlier) */
  order?: number;
}

/**
 * Registration options for a section
 */
export interface ExplorerRegistrationOptions {
  /** Storage key for persisting expanded/selected state */
  storageKey?: string;
  /** Enable search within this section */
  searchable?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Show breadcrumb navigation */
  showBreadcrumb?: boolean;
  /** Show status bar with item count */
  showStatusBar?: boolean;
  /** Show expand/collapse all buttons */
  showExpandCollapseAll?: boolean;
}

/**
 * Route state representing the current URL
 */
export interface RouteState {
  /** Current URL path (e.g., "/users/add-user") */
  path: string;
  /** Parsed path segments (e.g., ["users", "add-user"]) */
  segments: string[];
  /** Query parameters */
  query: Record<string, string>;
  /** Hash fragment */
  hash: string;
}

/**
 * Result of matching a path to registered routes
 */
export interface RouteMatch {
  /** Matched section ID */
  sectionId: string;
  /** Matched menu item ID (null if section root) */
  itemId: string | null;
  /** Full path to the matched item */
  fullPath: string;
  /** Remaining unmatched segments */
  remainingSegments: string[];
}

/**
 * Navigation options
 */
export interface NavigateOptions {
  /** Replace current history entry instead of pushing */
  replace?: boolean;
  /** Scroll to top after navigation */
  scrollTop?: boolean;
}

/**
 * Explorer API for plugins to register menu items
 */
export interface IExplorerAPI {
  /**
   * Register a new section in the activity bar
   */
  registerSection(
    section: ExplorerMenuSection,
    options?: ExplorerRegistrationOptions,
  ): Disposable;

  /**
   * Register multiple menu items within a section
   */
  registerMenuItems(sectionId: string, items: ExplorerMenuItem[]): Disposable;

  /**
   * Register a single menu item
   */
  registerMenuItem(sectionId: string, item: ExplorerMenuItem): Disposable;

  /**
   * Update a menu item dynamically
   */
  updateMenuItem(itemId: string, updates: Partial<ExplorerMenuItem>): void;

  /**
   * Remove a menu item
   */
  removeMenuItem(itemId: string): void;

  /**
   * Navigate to a path programmatically
   */
  navigateTo(path: string, options?: NavigateOptions): Promise<void>;

  /**
   * Get current navigation path
   */
  getCurrentPath(): string;

  /**
   * Subscribe to path changes
   */
  onPathChange(listener: (path: string) => void): Disposable;

  /**
   * Get all items in a section
   */
  getItems(sectionId: string): ExplorerMenuItem[];

  /**
   * Get a specific item by ID
   */
  getItem(itemId: string): ExplorerMenuItem | undefined;

  /**
   * Build URL path for an item
   */
  buildPath(itemId: string): string;
}

/**
 * Routing service interface for URL synchronization
 */
export interface IRoutingService {
  /** Get current route state */
  getState(): RouteState;

  /** Navigate to a path */
  navigate(path: string, options?: NavigateOptions): void;

  /** Replace current path (no history entry) */
  replace(path: string): void;

  /** Go back in history */
  back(): void;

  /** Go forward in history */
  forward(): void;

  /** Subscribe to route changes */
  subscribe(listener: (state: RouteState) => void): Disposable;

  /** Match a path to registered routes */
  matchPath(path: string): RouteMatch | null;

  /** Build path for a menu item */
  buildPath(sectionId: string, itemId: string): string;

  /** Convert a URI to a path (if registered) */
  uriToPath(uri: string): string | null;

  /** Convert a path to a URI */
  pathToUri(path: string): string | null;

  /** Sync state from current URL */
  syncFromUrl(): void;
}
