import type {
  LayoutState,
  SplitNode,
  TabGroupNode,
  SplitOptions,
  DropPosition,
} from '../models';
import {
  findNode,
  findParent,
  getAllTabGroups,
  findTabGroup,
  cloneLayout,
} from './tree-utils';
import { cleanupLayout } from './cleanup';
import { generateId } from './id-generator';

/**
 * Result of a split operation
 */
export interface SplitOperationResult {
  /** Updated layout */
  layout: LayoutState;
  /** Whether the operation was successful */
  success: boolean;
  /** Created pane ID */
  paneId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Split a pane into two
 */
export function splitPane(
  layout: LayoutState,
  paneId: string,
  direction: 'horizontal' | 'vertical',
  options: SplitOptions = {},
): SplitOperationResult {
  const newLayout = cloneLayout(layout);
  const pane = findNode(newLayout.root, paneId) as TabGroupNode | undefined;

  if (!pane || pane.type !== 'tabGroup') {
    return { layout, success: false, error: `Pane not found: ${paneId}` };
  }

  const newPaneId = generateId();

  // Create new empty pane
  const newPane: TabGroupNode = {
    type: 'tabGroup',
    id: newPaneId,
    tabs: [],
    activeTabId: null,
  };

  // Move tab if specified
  if (options.moveTabId) {
    const tabIndex = pane.tabs.findIndex((t) => t.id === options.moveTabId);
    if (tabIndex !== -1) {
      const [tab] = pane.tabs.splice(tabIndex, 1);
      newPane.tabs.push(tab);
      newPane.activeTabId = tab.id;

      if (pane.activeTabId === options.moveTabId) {
        pane.activeTabId = pane.tabs[0]?.id ?? null;
      }
    }
  }

  // Create split node
  const ratio = options.ratio ?? 0.5;
  const insertBefore = options.insertBefore ?? false;
  const splitNode: SplitNode = {
    type: 'split',
    id: generateId(),
    direction,
    children: insertBefore ? [newPane, pane] : [pane, newPane],
    sizes: insertBefore
      ? [(1 - ratio) * 100, ratio * 100]
      : [ratio * 100, (1 - ratio) * 100],
  };

  // Replace pane with split in parent
  const parent = findParent(newLayout.root, paneId);
  if (parent) {
    const index = parent.children.findIndex((c) => c.id === paneId);
    parent.children[index] = splitNode;
  } else {
    // Pane is root
    newLayout.root = splitNode;
  }

  newLayout.activePaneId = newPaneId;

  return { layout: newLayout, success: true, paneId: newPaneId };
}

/**
 * Merge a pane with its sibling (remove split)
 */
export function mergePane(
  layout: LayoutState,
  paneId: string,
): SplitOperationResult {
  const newLayout = cloneLayout(layout);
  const parent = findParent(newLayout.root, paneId);

  if (!parent) {
    return { layout, success: false, error: 'Cannot merge root pane' };
  }

  const paneIndex = parent.children.findIndex((c) => c.id === paneId);
  if (paneIndex === -1) {
    return {
      layout,
      success: false,
      error: `Pane not found in parent: ${paneId}`,
    };
  }

  // Get sibling (the other child)
  const siblingIndex = paneIndex === 0 ? 1 : 0;
  const sibling = parent.children[siblingIndex];

  // Replace parent split with sibling in grandparent
  const grandparent = findParent(newLayout.root, parent.id);
  if (grandparent) {
    const parentIndex = grandparent.children.findIndex(
      (c) => c.id === parent.id,
    );
    grandparent.children[parentIndex] = sibling;
  } else {
    // Parent is root
    newLayout.root = sibling;
  }

  // Update active pane if necessary
  if (newLayout.activePaneId === paneId) {
    const groups = getAllTabGroups(sibling);
    if (groups.length > 0) {
      newLayout.activePaneId = groups[0].id;
    }
  }

  return { layout: newLayout, success: true };
}

/**
 * Resize a split's children
 */
export function resizeSplit(
  layout: LayoutState,
  splitId: string,
  sizes: number[],
): SplitOperationResult {
  const newLayout = cloneLayout(layout);
  const split = findNode(newLayout.root, splitId) as SplitNode | undefined;

  if (!split || split.type !== 'split') {
    return { layout, success: false, error: `Split not found: ${splitId}` };
  }

  if (sizes.length !== split.children.length) {
    return {
      layout,
      success: false,
      error: `Size count (${sizes.length}) doesn't match children count (${split.children.length})`,
    };
  }

  // Normalize sizes to sum to 100
  const total = sizes.reduce((a, b) => a + b, 0);
  split.sizes = sizes.map((s) => (s / total) * 100);

  return { layout: newLayout, success: true };
}

/**
 * Handle a drop operation (drag and drop)
 */
export function handleDrop(
  layout: LayoutState,
  tabId: string,
  targetPaneId: string,
  position: DropPosition,
): SplitOperationResult {
  if (position === 'center') {
    // Move tab to target pane (handled by moveTab in tab-operations)
    // This is a convenience wrapper
    const newLayout = cloneLayout(layout);
    const sourceGroup = findTabGroup(newLayout.root, tabId);
    const targetGroup = findNode(newLayout.root, targetPaneId) as
      | TabGroupNode
      | undefined;

    if (!sourceGroup || !targetGroup || targetGroup.type !== 'tabGroup') {
      return { layout, success: false, error: 'Invalid drop target' };
    }

    const tabIndex = sourceGroup.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) {
      return { layout, success: false, error: 'Tab not found' };
    }

    const [tab] = sourceGroup.tabs.splice(tabIndex, 1);

    if (sourceGroup.activeTabId === tabId) {
      sourceGroup.activeTabId = sourceGroup.tabs[0]?.id ?? null;
    }

    targetGroup.tabs.push(tab);
    targetGroup.activeTabId = tabId;
    newLayout.activePaneId = targetGroup.id;

    const cleanedLayout = cleanupLayout(newLayout);
    return { layout: cleanedLayout, success: true };
  }

  // Split the target pane
  const direction =
    position === 'left' || position === 'right' ? 'horizontal' : 'vertical';
  const insertBefore = position === 'left' || position === 'top';

  // Split first
  const splitResult = splitPane(layout, targetPaneId, direction, {
    ratio: 0.5,
    insertBefore,
  });

  if (!splitResult.success || !splitResult.paneId) {
    return splitResult;
  }

  // Now move the tab to the new pane
  const newLayout = cloneLayout(splitResult.layout);
  const sourceGroup = findTabGroup(newLayout.root, tabId);
  const newPane = findNode(newLayout.root, splitResult.paneId) as
    | TabGroupNode
    | undefined;

  if (!sourceGroup || !newPane || newPane.type !== 'tabGroup') {
    return {
      layout: splitResult.layout,
      success: false,
      error: 'Failed to move tab after split',
    };
  }

  const tabIndex = sourceGroup.tabs.findIndex((t) => t.id === tabId);
  if (tabIndex !== -1) {
    const [tab] = sourceGroup.tabs.splice(tabIndex, 1);

    if (sourceGroup.activeTabId === tabId) {
      sourceGroup.activeTabId = sourceGroup.tabs[0]?.id ?? null;
    }

    newPane.tabs.push(tab);
    newPane.activeTabId = tabId;
    newLayout.activePaneId = newPane.id;
  }

  const cleanedLayout = cleanupLayout(newLayout);
  return { layout: cleanedLayout, success: true, paneId: splitResult.paneId };
}

/**
 * Activate (focus) a pane
 */
export function activatePane(
  layout: LayoutState,
  paneId: string,
): SplitOperationResult {
  const newLayout = cloneLayout(layout);
  const pane = findNode(newLayout.root, paneId);

  if (!pane) {
    return { layout, success: false, error: `Pane not found: ${paneId}` };
  }

  newLayout.activePaneId = paneId;

  return { layout: newLayout, success: true, paneId };
}

/**
 * Swap two panes in the layout
 */
export function swapPanes(
  layout: LayoutState,
  paneId1: string,
  paneId2: string,
): SplitOperationResult {
  const newLayout = cloneLayout(layout);

  const parent1 = findParent(newLayout.root, paneId1);
  const parent2 = findParent(newLayout.root, paneId2);

  if (!parent1 || !parent2) {
    return {
      layout,
      success: false,
      error: 'Cannot swap root panes or panes not found',
    };
  }

  const index1 = parent1.children.findIndex((c) => c.id === paneId1);
  const index2 = parent2.children.findIndex((c) => c.id === paneId2);

  if (index1 === -1 || index2 === -1) {
    return { layout, success: false, error: 'Panes not found in parents' };
  }

  // Swap
  const temp = parent1.children[index1];
  parent1.children[index1] = parent2.children[index2];
  parent2.children[index2] = temp;

  return { layout: newLayout, success: true };
}

/**
 * Maximize a pane (hide all others temporarily)
 * Returns the original layout for restoration
 */
export function maximizePane(
  layout: LayoutState,
  paneId: string,
): {
  layout: LayoutState;
  originalLayout: LayoutState;
  success: boolean;
  error?: string;
} {
  const pane = findNode(layout.root, paneId) as TabGroupNode | undefined;

  if (!pane || pane.type !== 'tabGroup') {
    return {
      layout,
      originalLayout: layout,
      success: false,
      error: `Pane not found: ${paneId}`,
    };
  }

  // Create a new layout with only this pane
  const maximizedLayout: LayoutState = {
    ...layout,
    root: { ...pane },
    activePaneId: paneId,
  };

  return {
    layout: maximizedLayout,
    originalLayout: layout,
    success: true,
  };
}
