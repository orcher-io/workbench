import type {
  LayoutState,
  TabState,
  TabGroupNode,
  TabInit,
  TabOpenOptions,
} from '../models';
import { findNode, findTabGroup, cloneLayout } from './tree-utils';
import { cleanupLayout } from './cleanup';
import { generateId } from './id-generator';

/**
 * Result of a tab operation
 */
export interface TabOperationResult {
  /** Updated layout */
  layout: LayoutState;
  /** Whether the operation was successful */
  success: boolean;
  /** Created/affected tab ID */
  tabId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Open a new tab in the layout
 */
export function openTab(
  layout: LayoutState,
  tabData: TabInit,
  options: TabOpenOptions = {},
): TabOperationResult {
  const newLayout = cloneLayout(layout);
  const tabId = generateId();

  const tab: TabState = {
    ...tabData,
    id: tabId,
    pinned: options.pin ?? tabData.pinned ?? false,
    preview: options.preview ?? tabData.preview ?? false,
    dirty: tabData.dirty ?? false,
  };

  const targetPaneId = options.paneId ?? newLayout.activePaneId;
  const pane = findNode(newLayout.root, targetPaneId) as
    | TabGroupNode
    | undefined;

  if (!pane || pane.type !== 'tabGroup') {
    return {
      layout,
      success: false,
      error: `Target pane not found: ${targetPaneId}`,
    };
  }

  // Check for existing tab with same URI
  if (options.replace !== false) {
    const existingIndex = pane.tabs.findIndex((t) => t.uri === tab.uri);
    if (existingIndex !== -1) {
      // Update existing tab
      pane.tabs[existingIndex] = {
        ...pane.tabs[existingIndex],
        ...tab,
        id: pane.tabs[existingIndex].id,
      };
      const existingTabId = pane.tabs[existingIndex].id;

      if (options.activate !== false) {
        pane.activeTabId = existingTabId;
        newLayout.activePaneId = pane.id;
      }

      return { layout: newLayout, success: true, tabId: existingTabId };
    }
  }

  // Insert tab at specified position
  const insertIndex = options.index ?? pane.tabs.length;

  // If preview mode, replace existing preview tab
  if (tab.preview) {
    const previewIndex = pane.tabs.findIndex((t) => t.preview);
    if (previewIndex !== -1) {
      pane.tabs.splice(previewIndex, 1);
    }
  }

  pane.tabs.splice(insertIndex, 0, tab);

  if (options.activate !== false) {
    pane.activeTabId = tabId;
    newLayout.activePaneId = pane.id;
  }

  return { layout: newLayout, success: true, tabId };
}

/**
 * Close a tab
 */
export function closeTab(
  layout: LayoutState,
  tabId: string,
  options: { force?: boolean } = {},
): TabOperationResult {
  const newLayout = cloneLayout(layout);
  const group = findTabGroup(newLayout.root, tabId);

  if (!group) {
    return { layout, success: false, error: `Tab not found: ${tabId}` };
  }

  const tabIndex = group.tabs.findIndex((t) => t.id === tabId);
  if (tabIndex === -1) {
    return {
      layout,
      success: false,
      error: `Tab not found in group: ${tabId}`,
    };
  }

  const tab = group.tabs[tabIndex];

  // Check for unsaved changes
  if (tab.dirty && !options.force) {
    return {
      layout,
      success: false,
      error: `Tab has unsaved changes: ${tabId}`,
      tabId,
    };
  }

  // Remove tab
  group.tabs.splice(tabIndex, 1);

  // Update active tab
  if (group.activeTabId === tabId) {
    if (group.tabs.length > 0) {
      const newIndex = Math.min(tabIndex, group.tabs.length - 1);
      group.activeTabId = group.tabs[newIndex].id;
    } else {
      group.activeTabId = null;
    }
  }

  // Clean up empty panes
  const cleanedLayout = cleanupLayout(newLayout);

  return { layout: cleanedLayout, success: true, tabId };
}

/**
 * Close all tabs in a group
 */
export function closeAllTabs(
  layout: LayoutState,
  groupId: string,
  options: { force?: boolean } = {},
): TabOperationResult {
  const newLayout = cloneLayout(layout);
  const group = findNode(newLayout.root, groupId) as TabGroupNode | undefined;

  if (!group || group.type !== 'tabGroup') {
    return { layout, success: false, error: `Group not found: ${groupId}` };
  }

  // Check for unsaved changes
  if (!options.force) {
    const dirtyTabs = group.tabs.filter((t) => t.dirty);
    if (dirtyTabs.length > 0) {
      return {
        layout,
        success: false,
        error: `${dirtyTabs.length} tab(s) have unsaved changes`,
      };
    }
  }

  group.tabs = [];
  group.activeTabId = null;

  const cleanedLayout = cleanupLayout(newLayout);

  return { layout: cleanedLayout, success: true };
}

/**
 * Close all tabs except the specified one
 */
export function closeOtherTabs(
  layout: LayoutState,
  tabId: string,
  options: { force?: boolean } = {},
): TabOperationResult {
  const newLayout = cloneLayout(layout);
  const group = findTabGroup(newLayout.root, tabId);

  if (!group) {
    return { layout, success: false, error: `Tab not found: ${tabId}` };
  }

  const tab = group.tabs.find((t) => t.id === tabId);
  if (!tab) {
    return {
      layout,
      success: false,
      error: `Tab not found in group: ${tabId}`,
    };
  }

  // Check for unsaved changes
  if (!options.force) {
    const dirtyTabs = group.tabs.filter((t) => t.dirty && t.id !== tabId);
    if (dirtyTabs.length > 0) {
      return {
        layout,
        success: false,
        error: `${dirtyTabs.length} other tab(s) have unsaved changes`,
      };
    }
  }

  group.tabs = [tab];
  group.activeTabId = tabId;

  return { layout: newLayout, success: true, tabId };
}

/**
 * Activate (focus) a tab
 */
export function activateTab(
  layout: LayoutState,
  tabId: string,
): TabOperationResult {
  const newLayout = cloneLayout(layout);
  const group = findTabGroup(newLayout.root, tabId);

  if (!group) {
    return { layout, success: false, error: `Tab not found: ${tabId}` };
  }

  const tab = group.tabs.find((t) => t.id === tabId);
  if (!tab) {
    return {
      layout,
      success: false,
      error: `Tab not found in group: ${tabId}`,
    };
  }

  group.activeTabId = tabId;
  newLayout.activePaneId = group.id;

  // Convert preview to permanent on activation
  if (tab.preview) {
    tab.preview = false;
  }

  return { layout: newLayout, success: true, tabId };
}

/**
 * Move a tab to a different group
 */
export function moveTab(
  layout: LayoutState,
  tabId: string,
  targetGroupId: string,
  index?: number,
): TabOperationResult {
  const newLayout = cloneLayout(layout);
  const sourceGroup = findTabGroup(newLayout.root, tabId);
  const targetGroup = findNode(newLayout.root, targetGroupId) as
    | TabGroupNode
    | undefined;

  if (!sourceGroup) {
    return { layout, success: false, error: `Source tab not found: ${tabId}` };
  }

  if (!targetGroup || targetGroup.type !== 'tabGroup') {
    return {
      layout,
      success: false,
      error: `Target group not found: ${targetGroupId}`,
    };
  }

  const tabIndex = sourceGroup.tabs.findIndex((t) => t.id === tabId);
  if (tabIndex === -1) {
    return {
      layout,
      success: false,
      error: `Tab not found in source group: ${tabId}`,
    };
  }

  // Remove from source
  const [tab] = sourceGroup.tabs.splice(tabIndex, 1);

  // Update source group active tab
  if (sourceGroup.activeTabId === tabId) {
    sourceGroup.activeTabId = sourceGroup.tabs[0]?.id ?? null;
  }

  // Add to target
  const insertIndex = index ?? targetGroup.tabs.length;
  targetGroup.tabs.splice(insertIndex, 0, tab);
  targetGroup.activeTabId = tabId;
  newLayout.activePaneId = targetGroup.id;

  // Clean up empty panes
  const cleanedLayout = cleanupLayout(newLayout);

  return { layout: cleanedLayout, success: true, tabId };
}

/**
 * Update a tab's properties
 */
export function updateTab(
  layout: LayoutState,
  tabId: string,
  updates: Partial<Omit<TabState, 'id'>>,
): TabOperationResult {
  const newLayout = cloneLayout(layout);
  const group = findTabGroup(newLayout.root, tabId);

  if (!group) {
    return { layout, success: false, error: `Tab not found: ${tabId}` };
  }

  const tab = group.tabs.find((t) => t.id === tabId);
  if (!tab) {
    return {
      layout,
      success: false,
      error: `Tab not found in group: ${tabId}`,
    };
  }

  Object.assign(tab, updates);

  return { layout: newLayout, success: true, tabId };
}

/**
 * Pin or unpin a tab
 */
export function pinTab(
  layout: LayoutState,
  tabId: string,
  pinned: boolean,
): TabOperationResult {
  return updateTab(layout, tabId, { pinned, preview: false });
}

/**
 * Reorder tabs within a group
 */
export function reorderTabs(
  layout: LayoutState,
  groupId: string,
  fromIndex: number,
  toIndex: number,
): TabOperationResult {
  const newLayout = cloneLayout(layout);
  const group = findNode(newLayout.root, groupId) as TabGroupNode | undefined;

  if (!group || group.type !== 'tabGroup') {
    return { layout, success: false, error: `Group not found: ${groupId}` };
  }

  if (fromIndex < 0 || fromIndex >= group.tabs.length) {
    return { layout, success: false, error: `Invalid fromIndex: ${fromIndex}` };
  }

  if (toIndex < 0 || toIndex >= group.tabs.length) {
    return { layout, success: false, error: `Invalid toIndex: ${toIndex}` };
  }

  const [tab] = group.tabs.splice(fromIndex, 1);
  group.tabs.splice(toIndex, 0, tab);

  return { layout: newLayout, success: true, tabId: tab.id };
}
