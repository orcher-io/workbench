import type { LayoutState, LayoutNode } from '../models';
import { getAllTabGroups, cloneLayout } from './tree-utils';

/**
 * Clean up empty tab groups in splits
 * Returns the cleaned node, or null if node should be removed
 */
export function cleanupEmptyPanes(node: LayoutNode): LayoutNode | null {
  if (node.type === 'tabGroup') {
    // Keep tab groups (even if empty, they might be the only one)
    return node;
  }

  // For splits, recursively clean children
  const cleanedChildren: LayoutNode[] = [];
  const cleanedSizes: number[] = [];

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const cleaned = cleanupEmptyPanes(child);

    if (cleaned) {
      // Skip empty tab groups in splits (will be removed)
      if (cleaned.type === 'tabGroup' && cleaned.tabs.length === 0) {
        continue;
      }
      cleanedChildren.push(cleaned);
      cleanedSizes.push(node.sizes[i]);
    }
  }

  // If no children left, return null (parent will handle)
  if (cleanedChildren.length === 0) {
    return null;
  }

  // If only one child left, return that child (unwrap the split)
  if (cleanedChildren.length === 1) {
    return cleanedChildren[0];
  }

  // Normalize sizes to add up to 100
  const totalSize = cleanedSizes.reduce((a, b) => a + b, 0);
  const normalizedSizes = cleanedSizes.map((s) => (s / totalSize) * 100);

  return {
    ...node,
    children: cleanedChildren,
    sizes: normalizedSizes,
  };
}

/**
 * Clean up the layout (remove empty panes, update active pane)
 */
export function cleanupLayout(layout: LayoutState): LayoutState {
  const newLayout = cloneLayout(layout);

  const cleanedRoot = cleanupEmptyPanes(newLayout.root);

  if (!cleanedRoot) {
    // All panes were removed, create a fresh empty layout
    return createEmptyLayout();
  }

  newLayout.root = cleanedRoot;

  // Update activePaneId if the active pane was removed
  const allGroups = getAllTabGroups(newLayout.root);
  const activePaneExists = allGroups.some(
    (g) => g.id === newLayout.activePaneId,
  );

  if (!activePaneExists && allGroups.length > 0) {
    // Find a pane with tabs, or default to first pane
    const paneWithTabs = allGroups.find((g) => g.tabs.length > 0);
    newLayout.activePaneId = paneWithTabs?.id ?? allGroups[0].id;
  }

  return newLayout;
}

/**
 * Create an empty layout
 */
export function createEmptyLayout(): LayoutState {
  const paneId = `${Date.now()}-empty`;
  return {
    id: `${Date.now()}-layout`,
    version: 1,
    root: {
      type: 'tabGroup',
      id: paneId,
      tabs: [],
      activeTabId: null,
    },
    activePaneId: paneId,
  };
}

/**
 * Flatten nested splits of the same direction
 * e.g., horizontal(horizontal(A, B), C) -> horizontal(A, B, C)
 */
export function flattenSplits(node: LayoutNode): LayoutNode {
  if (node.type === 'tabGroup') {
    return node;
  }

  // First, recursively flatten children
  const flattenedChildren: LayoutNode[] = [];
  const flattenedSizes: number[] = [];

  for (let i = 0; i < node.children.length; i++) {
    const child = flattenSplits(node.children[i]);

    // If child is a split with same direction, flatten it
    if (child.type === 'split' && child.direction === node.direction) {
      // Distribute the parent's size among the child's children
      const parentSize = node.sizes[i];
      for (let j = 0; j < child.children.length; j++) {
        flattenedChildren.push(child.children[j]);
        flattenedSizes.push((child.sizes[j] / 100) * parentSize);
      }
    } else {
      flattenedChildren.push(child);
      flattenedSizes.push(node.sizes[i]);
    }
  }

  return {
    ...node,
    children: flattenedChildren,
    sizes: flattenedSizes,
  };
}

/**
 * Validate layout integrity
 */
export function validateLayout(layout: LayoutState): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check version
  if (layout.version !== 1) {
    errors.push(`Unknown layout version: ${layout.version}`);
  }

  // Check active pane exists
  const allGroups = getAllTabGroups(layout.root);
  if (!allGroups.some((g) => g.id === layout.activePaneId)) {
    errors.push(`Active pane not found: ${layout.activePaneId}`);
  }

  // Validate nodes recursively
  function validateNode(node: LayoutNode): void {
    if (node.type === 'split') {
      if (node.children.length < 2) {
        errors.push(`Split node ${node.id} has less than 2 children`);
      }
      if (node.sizes.length !== node.children.length) {
        errors.push(`Split node ${node.id} sizes don't match children count`);
      }
      const totalSize = node.sizes.reduce((a, b) => a + b, 0);
      if (Math.abs(totalSize - 100) > 0.01) {
        errors.push(
          `Split node ${node.id} sizes don't sum to 100 (got ${totalSize})`,
        );
      }
      node.children.forEach(validateNode);
    } else {
      // TabGroup validation
      if (
        node.activeTabId &&
        !node.tabs.some((t) => t.id === node.activeTabId)
      ) {
        errors.push(
          `Tab group ${node.id} has invalid activeTabId: ${node.activeTabId}`,
        );
      }

      // Check for duplicate tab IDs
      const tabIds = new Set<string>();
      for (const tab of node.tabs) {
        if (tabIds.has(tab.id)) {
          errors.push(`Duplicate tab ID: ${tab.id}`);
        }
        tabIds.add(tab.id);
      }
    }
  }

  validateNode(layout.root);

  return { valid: errors.length === 0, errors };
}
