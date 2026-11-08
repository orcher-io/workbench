import type { ReactNode } from 'react';
import type { Disposable, Event } from '../extension-points/types';

/**
 * Collapsible state for tree items
 */
export enum TreeItemCollapsibleState {
  /** Item cannot be expanded (leaf node) */
  None = 0,
  /** Item is collapsed */
  Collapsed = 1,
  /** Item is expanded */
  Expanded = 2,
}

/**
 * Represents an item in a tree view
 */
export interface TreeItem {
  /** Unique identifier for this item */
  id: string;
  /** Display label */
  label: string;
  /** Optional description shown after the label */
  description?: string;
  /** Icon identifier or ReactNode */
  icon?: string | ReactNode;
  /** Tooltip text */
  tooltip?: string;
  /** Whether this item can have children */
  collapsibleState: TreeItemCollapsibleState;
  /** Context value for context menu filtering */
  contextValue?: string;
  /** Command to execute on click */
  command?: {
    id: string;
    arguments?: unknown[];
  };
  /** Resource URI associated with this item */
  resourceUri?: string;
}

/**
 * Data provider for tree views - similar to VSCode's TreeDataProvider
 */
export interface TreeDataProvider<T> {
  /**
   * Get the root elements of the tree
   */
  getRoot(): Promise<T[]> | T[];

  /**
   * Get children of an element
   * @param element The parent element
   */
  getChildren(element: T): Promise<T[]> | T[];

  /**
   * Get the tree item representation for an element
   * @param element The element to get the tree item for
   */
  getTreeItem(element: T): TreeItem | Promise<TreeItem>;

  /**
   * Optional: Get the parent of an element (needed for reveal)
   */
  getParent?(element: T): T | undefined | Promise<T | undefined>;

  /**
   * Optional: Event that fires when tree data changes
   * Pass element to refresh subtree, undefined to refresh all
   */
  onDidChangeTreeData?: Event<T | undefined>;
}

/**
 * Action button for tree view header
 */
export interface TreeViewAction {
  /** Unique identifier for this action */
  id: string;
  /** Icon to display (ReactNode or icon name) */
  icon: ReactNode;
  /** Tooltip/title for the action */
  title: string;
  /** Click handler */
  onClick: () => void;
}

/**
 * Options for tree view behavior
 */
export interface TreeViewOptions<T> {
  /** The data provider */
  dataProvider: TreeDataProvider<T>;
  /** Whether to show collapse all button */
  showCollapseAll?: boolean;
  /** Whether multi-select is enabled */
  canSelectMany?: boolean;
  /** Rich tree view display options */
  richOptions?: RichTreeViewOptions<T>;
}

/**
 * Navigation breadcrumb item
 */
export interface NavigationBreadcrumb {
  id: string;
  label: string;
  path?: string;
}

/**
 * Rich tree view options for enhanced display features
 */
export interface RichTreeViewOptions<T> {
  /** Title displayed in the header */
  title?: string;
  /** Whether to show the header (default: false, as sidebar has its own header) */
  showHeader?: boolean;
  /** Whether to show search input (default: false) */
  showSearch?: boolean;
  /** Controlled search visibility state (for external control via sidebar header) */
  isSearchVisible?: boolean;
  /** Callback when search visibility changes */
  onSearchVisibilityChange?: (visible: boolean) => void;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Whether to show breadcrumb navigation (default: false) */
  showBreadcrumb?: boolean;
  /** Whether to show status bar at the bottom */
  showStatusBar?: boolean;
  /** Whether to show expand/collapse all buttons */
  showExpandCollapseAll?: boolean;
  /** Custom actions for the header */
  actions?: TreeViewAction[];
  /** Custom icon renderer for items */
  renderIcon?: (element: T, expanded: boolean) => ReactNode;
  /** Get item type for default icon rendering */
  getItemType?: (element: T) => 'file' | 'folder';
  /** Get item name for icon color by extension */
  getItemName?: (element: T) => string;
  /** Custom content when tree is empty */
  emptyContent?: ReactNode;
  /** Custom content while loading */
  loadingContent?: ReactNode;
  /** Callback when navigation path changes (for external breadcrumb) */
  onNavigate?: (breadcrumbs: NavigationBreadcrumb[]) => void;
  /**
   * Storage key for persisting tree view state to localStorage.
   *
   * When provided, the following state is persisted across page refreshes:
   * - Expanded/collapsed state of tree nodes
   * - Currently selected item
   *
   * @example
   * ```typescript
   * // Enable persistence for your plugin's tree view
   * const richOptions: RichTreeViewOptions<MyItem> = {
   *   storageKey: 'my-plugin-tree-view',
   *   // ... other options
   * };
   * ```
   *
   * @remarks
   * - Use a unique key per plugin to avoid conflicts (e.g., 'explorer-tree-view', 'bookmarks-tree-view')
   * - If not provided, tree state resets on page refresh
   * - State is stored in localStorage under keys: `{storageKey}` (expanded) and `{storageKey}-selected` (selection)
   */
  storageKey?: string;
}

/**
 * Event fired when tree view selection changes
 */
export interface TreeViewSelectionChangeEvent<T> {
  readonly selection: readonly T[];
}

/**
 * Event fired when tree view visibility changes
 */
export interface TreeViewVisibilityChangeEvent {
  readonly visible: boolean;
}

/**
 * Event fired when a tree element is expanded or collapsed
 */
export interface TreeViewExpansionEvent<T> {
  readonly element: T;
}

/**
 * Tree view instance for programmatic control
 */
export interface TreeView<T> extends Disposable {
  /** Currently selected elements */
  readonly selection: readonly T[];
  /** Whether the tree view is visible */
  readonly visible: boolean;
  /** Event fired when selection changes */
  onDidChangeSelection: Event<TreeViewSelectionChangeEvent<T>>;
  /** Event fired when visibility changes */
  onDidChangeVisibility: Event<TreeViewVisibilityChangeEvent>;
  /** Event fired when an element is expanded */
  onDidExpandElement: Event<TreeViewExpansionEvent<T>>;
  /** Event fired when an element is collapsed */
  onDidCollapseElement: Event<TreeViewExpansionEvent<T>>;
  /**
   * Reveal an element in the tree
   * @param element The element to reveal
   * @param options Reveal options
   */
  reveal(
    element: T,
    options?: { select?: boolean; focus?: boolean; expand?: boolean | number },
  ): Promise<void>;
  /**
   * Refresh the tree (or a specific element subtree)
   * @param element Optional element to refresh. If undefined, refreshes all.
   */
  refresh(element?: T): void;
}

/**
 * Service interface for managing tree data providers
 */
export interface ITreeViewService {
  /**
   * Register a tree data provider for a view
   * @param viewId The view ID to register for
   * @param provider The data provider
   * @param options Optional tree view options
   * @param pluginId The plugin ID registering this provider
   * @returns A TreeView instance for programmatic control
   */
  registerTreeDataProvider<T>(
    viewId: string,
    provider: TreeDataProvider<T>,
    options?: Partial<Omit<TreeViewOptions<T>, 'dataProvider'>>,
    pluginId?: string,
  ): TreeView<T>;

  /**
   * Get a tree data provider by view ID
   */
  getTreeDataProvider<T>(viewId: string): TreeDataProvider<T> | undefined;

  /**
   * Get a tree view instance by view ID
   */
  getTreeView<T>(viewId: string): TreeView<T> | undefined;

  /**
   * Get tree view options by view ID
   */
  getTreeViewOptions<T>(viewId: string): TreeViewOptions<T> | undefined;

  /**
   * Get rich tree view options by view ID
   */
  getRichOptions<T>(viewId: string): RichTreeViewOptions<T> | undefined;

  /**
   * Check if a view has a tree data provider
   */
  hasTreeDataProvider(viewId: string): boolean;

  /**
   * Unregister a tree data provider
   */
  unregister(viewId: string): void;

  /**
   * Subscribe to provider registration changes
   */
  subscribe(listener: () => void): Disposable;
}
