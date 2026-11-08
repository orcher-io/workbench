import type {
  LayoutNode,
  SplitNode,
  TabGroupNode,
  LayoutState,
} from '../models';

/**
 * Find a node in the layout tree by ID
 */
export function findNode(root: LayoutNode, nodeId: string): LayoutNode | undefined {
  if (root.id === nodeId) return root;

  if (root.type === 'split') {
    for (const child of root.children) {
      const found = findNode(child, nodeId);
      if (found) return found;
    }
  }

  return undefined;
}

/**
 * Find a tab group containing a specific tab
 */
export function findTabGroup(root: LayoutNode, tabId: string): TabGroupNode | undefined {
  if (root.type === 'tabGroup') {
    if (root.tabs.some((t) => t.id === tabId)) {
      return root;
    }
    return undefined;
  }

  for (const child of root.children) {
    const found = findTabGroup(child, tabId);
    if (found) return found;
  }

  return undefined;
}

/**
 * Find the parent split node of a given node
 */
export function findParent(root: LayoutNode, nodeId: string): SplitNode | undefined {
  if (root.type === 'split') {
    for (const child of root.children) {
      if (child.id === nodeId) return root;
      const found = findParent(child, nodeId);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Get all tab groups in the layout tree
 */
export function getAllTabGroups(root: LayoutNode): TabGroupNode[] {
  if (root.type === 'tabGroup') {
    return [root];
  }

  return root.children.flatMap(getAllTabGroups);
}

/**
 * Get all tabs in the layout tree
 */
export function getAllTabs(root: LayoutNode): { tab: TabGroupNode['tabs'][0]; groupId: string }[] {
  const groups = getAllTabGroups(root);
  return groups.flatMap((group) =>
    group.tabs.map((tab) => ({ tab, groupId: group.id }))
  );
}

/**
 * Find a tab by its ID
 */
export function findTab(root: LayoutNode, tabId: string): TabGroupNode['tabs'][0] | undefined {
  const group = findTabGroup(root, tabId);
  return group?.tabs.find((t) => t.id === tabId);
}

/**
 * Find a tab by URI
 */
export function findTabByUri(root: LayoutNode, uri: string): { tab: TabGroupNode['tabs'][0]; group: TabGroupNode } | undefined {
  const groups = getAllTabGroups(root);
  for (const group of groups) {
    const tab = group.tabs.find((t) => t.uri === uri);
    if (tab) {
      return { tab, group };
    }
  }
  return undefined;
}

/**
 * Count total tabs in the layout
 */
export function countTabs(root: LayoutNode): number {
  const groups = getAllTabGroups(root);
  return groups.reduce((sum, group) => sum + group.tabs.length, 0);
}

/**
 * Check if a pane is empty (no tabs)
 */
export function isPaneEmpty(root: LayoutNode, paneId: string): boolean {
  const node = findNode(root, paneId);
  if (!node || node.type !== 'tabGroup') return true;
  return node.tabs.length === 0;
}

/**
 * Get the depth of the layout tree
 */
export function getTreeDepth(node: LayoutNode): number {
  if (node.type === 'tabGroup') {
    return 1;
  }
  return 1 + Math.max(...node.children.map(getTreeDepth));
}

/**
 * Create a deep clone of a layout node
 */
export function cloneNode<T extends LayoutNode>(node: T): T {
  if (node.type === 'tabGroup') {
    return {
      ...node,
      tabs: node.tabs.map((tab) => ({ ...tab, state: { ...tab.state } })),
    } as T;
  }

  return {
    ...node,
    children: node.children.map(cloneNode),
    sizes: [...node.sizes],
  } as T;
}

/**
 * Create a deep clone of the layout state
 */
export function cloneLayout(layout: LayoutState): LayoutState {
  return {
    ...layout,
    root: cloneNode(layout.root),
  };
}
