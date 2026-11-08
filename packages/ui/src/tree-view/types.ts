import type {
  TreeItem,
  RichTreeViewOptions as PluginRichTreeViewOptions,
  TreeViewAction as PluginTreeViewAction,
} from '@orcher/workbench-plugin-api';

// Re-export plugin-api types for convenience
export type { PluginRichTreeViewOptions as RichTreeViewOptions };
export type { PluginTreeViewAction as TreeViewAction };

/**
 * Internal node representation for virtualized rendering
 */
export interface TreeViewNode<T = unknown> {
  /** Unique ID */
  id: string;
  /** The original data element */
  element: T;
  /** Tree item representation */
  treeItem: TreeItem;
  /** Parent node ID */
  parentId: string | null;
  /** Child node IDs (if loaded) */
  childIds?: string[];
  /** Depth level in tree */
  depth: number;
  /** Whether children are loaded */
  childrenLoaded: boolean;
  /** Whether currently loading children */
  isLoading: boolean;
  /** Error message if loading failed */
  error?: string;
}

/**
 * Flattened node for virtual list rendering
 */
export interface FlattenedTreeNode<T = unknown> extends TreeViewNode<T> {
  /** Visual indent level */
  indentLevel: number;
  /** Whether node is visible */
  visible: boolean;
  /** Whether node has children */
  hasChildren: boolean;
  /** Whether node is expanded */
  expanded: boolean;
  /** Fuzzy search match score */
  matchScore?: number;
  /** Matched character indices for highlighting */
  matchIndices?: number[];
}

/**
 * Tree view state
 */
export interface TreeViewState<T = unknown> {
  /** All nodes by ID */
  nodes: Map<string, TreeViewNode<T>>;
  /** Root node IDs */
  rootIds: string[];
  /** Expanded node IDs */
  expandedIds: Set<string>;
  /** Selected node ID */
  selectedId: string | null;
  /** Focused node ID (keyboard nav) */
  focusedId: string | null;
  /** Flattened visible nodes */
  flattenedNodes: FlattenedTreeNode<T>[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error?: string;
  /** Current search query */
  searchQuery: string;
  /** Whether search is active */
  isSearching: boolean;
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  id: string;
  name: string;
  isLast: boolean;
}
