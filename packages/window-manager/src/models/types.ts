/**
 * Layout node types
 */
export type LayoutNode = SplitNode | TabGroupNode;

/**
 * Complete layout state
 */
export interface LayoutState {
  /** Unique layout identifier */
  id: string;
  /** Layout version for migrations */
  version: number;
  /** Root node of the layout tree */
  root: LayoutNode;
  /** Currently active pane ID */
  activePaneId: string;
}

/**
 * Split container node
 */
export interface SplitNode {
  type: 'split';
  /** Unique node ID */
  id: string;
  /** Split direction */
  direction: 'horizontal' | 'vertical';
  /** Child nodes */
  children: LayoutNode[];
  /** Size percentages (should sum to 100) */
  sizes: number[];
}

/**
 * Tab group node (contains tabs)
 */
export interface TabGroupNode {
  type: 'tabGroup';
  /** Unique node ID */
  id: string;
  /** Tabs in this group */
  tabs: TabState[];
  /** Currently active tab ID */
  activeTabId: string | null;
}

/**
 * Individual tab state
 */
export interface TabState {
  /** Unique tab ID */
  id: string;
  /** URI identifying the content */
  uri: string;
  /** Display title */
  title: string;
  /** Subtitle (e.g., file path) */
  subtitle?: string;
  /** Icon identifier */
  icon?: string;
  /** Activity bar group ID — maps this tab to an activity bar item for active state sync.
   *  Falls back to `icon` if not set. */
  groupId?: string;
  /** Editor type ID */
  editorId: string;
  /** Resource type */
  resourceType?: string;
  /** Resource ID */
  resourceId?: string;
  /** Whether tab is pinned */
  pinned: boolean;
  /** Whether tab is in preview mode */
  preview: boolean;
  /** Whether tab has unsaved changes */
  dirty: boolean;
  /** Editor-specific state */
  state?: Record<string, unknown>;
}

/**
 * Options for opening a tab
 */
/**
 * What a caller supplies to open a tab. The id is generated; `pinned` and
 * `preview` fall back to TabOpenOptions and then false, and a new tab is clean
 * unless `dirty` says otherwise.
 */
export type TabInit = Omit<TabState, 'id' | 'pinned' | 'preview' | 'dirty'> &
  Partial<Pick<TabState, 'pinned' | 'preview' | 'dirty'>>;

export interface TabOpenOptions {
  /** Activate the tab after opening */
  activate?: boolean;
  /** Open in preview mode */
  preview?: boolean;
  /** Pin the tab */
  pin?: boolean;
  /** Target pane ID */
  paneId?: string;
  /** Position in tab bar */
  index?: number;
  /** Replace existing tab with same URI */
  replace?: boolean;
}

/**
 * Options for splitting a pane
 */
export interface SplitOptions {
  /** Size ratio for the new pane (0-1) */
  ratio?: number;
  /** Tab to move to new pane */
  moveTabId?: string;
  /** Insert new pane before the original (for left/top splits) */
  insertBefore?: boolean;
}

/**
 * Drop position for drag and drop
 */
export type DropPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';

/**
 * Drag data for tab dragging
 */
export interface TabDragData {
  type: 'tab';
  tabId: string;
  sourceGroupId: string;
}

/**
 * Floating window state
 */
export interface FloatingWindow {
  /** Unique window ID */
  id: string;
  /** Tab displayed in this window */
  tab: TabState;
  /** Window position */
  position: { x: number; y: number };
  /** Window size */
  size: { width: number; height: number };
  /** Whether the window is minimized */
  minimized?: boolean;
  /** Z-index for stacking order */
  zIndex: number;
}
