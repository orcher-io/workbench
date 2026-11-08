'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LayoutState,
  LayoutNode,
  SplitNode,
  TabGroupNode,
  TabState,
  TabInit,
  TabOpenOptions,
  SplitOptions,
  DropPosition,
  FloatingWindow,
} from '../models';

// Generate unique IDs
let idCounter = 0;
const generateId = () => `${Date.now()}-${++idCounter}`;

/**
 * Window manager store state
 */
interface WindowManagerState {
  layout: LayoutState;
  floatingWindows: FloatingWindow[];
  nextZIndex: number;
  maximizedPaneId: string | null;
  preMaximizeLayout: LayoutState | null;

  // Tab operations
  openTab: (tab: TabInit, options?: TabOpenOptions) => string;
  closeTab: (tabId: string) => boolean;
  closeAllTabs: (groupId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  moveTab: (tabId: string, targetGroupId: string, index?: number) => void;
  updateTab: (tabId: string, updates: Partial<TabState>) => void;
  pinTab: (tabId: string, pinned: boolean) => void;
  reorderTab: (tabId: string, newIndex: number) => void;

  // Split operations
  split: (
    paneId: string,
    direction: 'horizontal' | 'vertical',
    options?: SplitOptions,
  ) => string;
  merge: (paneId: string) => void;
  resizeSplit: (splitId: string, sizes: number[]) => void;

  // Pane operations
  activatePane: (paneId: string) => void;
  getActivePane: () => TabGroupNode | undefined;

  // Drag and drop
  handleDrop: (
    tabId: string,
    targetPaneId: string,
    position: DropPosition,
  ) => void;

  // Floating window operations
  openFloatingWindow: (
    tabId: string,
    position?: { x: number; y: number },
  ) => void;
  closeFloatingWindow: (windowId: string) => void;
  dockFloatingWindow: (windowId: string) => void;
  moveFloatingWindow: (
    windowId: string,
    position: { x: number; y: number },
  ) => void;
  resizeFloatingWindow: (
    windowId: string,
    size: { width: number; height: number },
  ) => void;
  focusFloatingWindow: (windowId: string) => void;

  // Pane maximize operations
  maximizePane: (paneId: string) => void;
  restorePane: () => void;
  toggleMaximizePane: (paneId: string) => void;
  isMaximized: (paneId: string) => boolean;

  // Layout operations
  setLayout: (layout: LayoutState) => void;
  resetLayout: () => void;
}

/**
 * Create initial empty layout
 */
function createInitialLayout(): LayoutState {
  const initialPaneId = generateId();
  return {
    id: generateId(),
    version: 1,
    root: {
      type: 'tabGroup',
      id: initialPaneId,
      tabs: [],
      activeTabId: null,
    },
    activePaneId: initialPaneId,
  };
}

/**
 * Find a node in the layout tree
 */
function findNode(root: LayoutNode, nodeId: string): LayoutNode | undefined {
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
function findTabGroup(
  root: LayoutNode,
  tabId: string,
): TabGroupNode | undefined {
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
 * Find parent of a node
 */
function findParent(root: LayoutNode, nodeId: string): SplitNode | undefined {
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
 * Get all tab groups in layout
 */
function getAllTabGroups(root: LayoutNode): TabGroupNode[] {
  if (root.type === 'tabGroup') {
    return [root];
  }

  return root.children.flatMap(getAllTabGroups);
}

/**
 * Clean up empty tab groups in splits
 * Returns the cleaned node, or null if node should be removed
 */
function cleanupEmptyPanes(node: LayoutNode): LayoutNode | null {
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
      // Keep non-empty children
      if (cleaned.type === 'tabGroup' && cleaned.tabs.length === 0) {
        // Skip empty tab groups in splits (will be removed)
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
 * Window manager store
 */
export const useWindowManager = create<WindowManagerState>()(
  persist(
    (set, get) => ({
      layout: createInitialLayout(),
      floatingWindows: [],
      nextZIndex: 1,
      maximizedPaneId: null,
      preMaximizeLayout: null,

      openTab: (tabData, options = {}) => {
        const tabId = generateId();
        const tab: TabState = {
          ...tabData,
          id: tabId,
          pinned: options.pin ?? tabData.pinned ?? false,
          preview: options.preview ?? tabData.preview ?? false,
          dirty: tabData.dirty ?? false,
        };

        set((state) => {
          const layout = { ...state.layout };

          // Check if a tab with same URI already exists in any tab group
          if (tabData.uri) {
            const allGroups = getAllTabGroups(layout.root);
            for (const group of allGroups) {
              const existingTab = group.tabs.find((t) => t.uri === tabData.uri);
              if (existingTab) {
                // Tab already exists - just activate it
                if (options.activate !== false) {
                  group.activeTabId = existingTab.id;
                  layout.activePaneId = group.id;
                  // Convert preview to permanent on activation
                  if (existingTab.preview) {
                    existingTab.preview = false;
                  }
                }
                return { layout };
              }
            }
          }

          const targetPaneId = options.paneId ?? layout.activePaneId;
          const pane = findNode(layout.root, targetPaneId) as
            | TabGroupNode
            | undefined;

          if (!pane || pane.type !== 'tabGroup') {
            console.error('Target pane not found:', targetPaneId);
            return state;
          }

          // Check for existing tab with same URI in target pane (for replace option)
          if (options.replace) {
            const existingIndex = pane.tabs.findIndex((t) => t.uri === tab.uri);
            if (existingIndex !== -1) {
              pane.tabs[existingIndex] = tab;
              if (options.activate !== false) {
                pane.activeTabId = tabId;
                layout.activePaneId = pane.id;
              }
              return { layout };
            }
          }

          // Add tab at specified index or end
          const insertIndex = options.index ?? pane.tabs.length;
          pane.tabs.splice(insertIndex, 0, tab);

          if (options.activate !== false) {
            pane.activeTabId = tabId;
            layout.activePaneId = pane.id;
          }

          return { layout };
        });

        return tabId;
      },

      closeTab: (tabId) => {
        let closed = false;

        set((state) => {
          let layout = { ...state.layout };
          const group = findTabGroup(layout.root, tabId);

          if (!group) return state;

          const tabIndex = group.tabs.findIndex((t) => t.id === tabId);
          if (tabIndex === -1) return state;

          // Check if tab is dirty
          const tab = group.tabs[tabIndex];
          if (tab.dirty) {
            // In real implementation, would prompt user
            console.warn('Tab has unsaved changes:', tabId);
          }

          group.tabs.splice(tabIndex, 1);
          closed = true;

          // Update active tab if necessary
          if (group.activeTabId === tabId) {
            if (group.tabs.length > 0) {
              const newIndex = Math.min(tabIndex, group.tabs.length - 1);
              group.activeTabId = group.tabs[newIndex].id;
            } else {
              group.activeTabId = null;
            }
          }

          // Clean up empty panes in splits
          const cleanedRoot = cleanupEmptyPanes(layout.root);
          if (cleanedRoot) {
            layout.root = cleanedRoot;

            // Update activePaneId if the active pane was removed
            const allGroups = getAllTabGroups(layout.root);
            const activePaneExists = allGroups.some(
              (g) => g.id === layout.activePaneId,
            );
            if (!activePaneExists && allGroups.length > 0) {
              // Find a pane with tabs, or default to first pane
              const paneWithTabs = allGroups.find((g) => g.tabs.length > 0);
              layout.activePaneId = paneWithTabs?.id ?? allGroups[0].id;
            }
          }

          return { layout };
        });

        return closed;
      },

      closeAllTabs: (groupId) => {
        set((state) => {
          let layout = { ...state.layout };
          const group = findNode(layout.root, groupId) as
            | TabGroupNode
            | undefined;

          if (!group || group.type !== 'tabGroup') return state;

          group.tabs = [];
          group.activeTabId = null;

          // Clean up empty panes in splits
          const cleanedRoot = cleanupEmptyPanes(layout.root);
          if (cleanedRoot) {
            layout.root = cleanedRoot;

            const allGroups = getAllTabGroups(layout.root);
            const activePaneExists = allGroups.some(
              (g) => g.id === layout.activePaneId,
            );
            if (!activePaneExists && allGroups.length > 0) {
              const paneWithTabs = allGroups.find((g) => g.tabs.length > 0);
              layout.activePaneId = paneWithTabs?.id ?? allGroups[0].id;
            }
          }

          return { layout };
        });
      },

      closeOtherTabs: (tabId) => {
        set((state) => {
          const layout = { ...state.layout };
          const group = findTabGroup(layout.root, tabId);

          if (!group) return state;

          const tab = group.tabs.find((t) => t.id === tabId);
          if (!tab) return state;

          group.tabs = [tab];
          group.activeTabId = tabId;

          return { layout };
        });
      },

      activateTab: (tabId) => {
        set((state) => {
          const layout = { ...state.layout };
          const group = findTabGroup(layout.root, tabId);

          if (!group) return state;

          group.activeTabId = tabId;
          layout.activePaneId = group.id;

          // Convert preview to permanent on activation
          const tab = group.tabs.find((t) => t.id === tabId);
          if (tab?.preview) {
            tab.preview = false;
          }

          return { layout };
        });
      },

      moveTab: (tabId, targetGroupId, index) => {
        set((state) => {
          let layout = { ...state.layout };
          const sourceGroup = findTabGroup(layout.root, tabId);
          const targetGroup = findNode(layout.root, targetGroupId) as
            | TabGroupNode
            | undefined;

          if (!sourceGroup || !targetGroup || targetGroup.type !== 'tabGroup') {
            return state;
          }

          const tabIndex = sourceGroup.tabs.findIndex((t) => t.id === tabId);
          if (tabIndex === -1) return state;

          const [tab] = sourceGroup.tabs.splice(tabIndex, 1);

          // Update source group active tab
          if (sourceGroup.activeTabId === tabId) {
            sourceGroup.activeTabId = sourceGroup.tabs[0]?.id ?? null;
          }

          // Add to target group
          const insertIndex = index ?? targetGroup.tabs.length;
          targetGroup.tabs.splice(insertIndex, 0, tab);
          targetGroup.activeTabId = tabId;
          layout.activePaneId = targetGroup.id;

          // Clean up empty panes in splits
          const cleanedRoot = cleanupEmptyPanes(layout.root);
          if (cleanedRoot) {
            layout.root = cleanedRoot;
          }

          return { layout };
        });
      },

      updateTab: (tabId, updates) => {
        set((state) => {
          const layout = { ...state.layout };
          const group = findTabGroup(layout.root, tabId);

          if (!group) return state;

          const tab = group.tabs.find((t) => t.id === tabId);
          if (!tab) return state;

          Object.assign(tab, updates);

          return { layout };
        });
      },

      pinTab: (tabId, pinned) => {
        get().updateTab(tabId, { pinned, preview: false });
      },

      reorderTab: (tabId, newIndex) => {
        set((state) => {
          const layout = { ...state.layout };
          const group = findTabGroup(layout.root, tabId);

          if (!group) return state;

          const currentIndex = group.tabs.findIndex((t) => t.id === tabId);
          if (currentIndex === -1 || currentIndex === newIndex) return state;

          // Remove tab from current position
          const [tab] = group.tabs.splice(currentIndex, 1);

          // Insert at new position (adjust if needed after removal)
          const adjustedIndex = newIndex > currentIndex ? newIndex : newIndex;
          group.tabs.splice(adjustedIndex, 0, tab);

          return { layout };
        });
      },

      split: (paneId, direction, options = {}) => {
        const newPaneId = generateId();

        set((state) => {
          let layout = { ...state.layout };
          const pane = findNode(layout.root, paneId) as
            | TabGroupNode
            | undefined;

          if (!pane || pane.type !== 'tabGroup') return state;

          // Create new empty pane
          const newPane: TabGroupNode = {
            type: 'tabGroup',
            id: newPaneId,
            tabs: [],
            activeTabId: null,
          };

          // Move tab if specified - find it anywhere in the layout
          if (options.moveTabId) {
            const sourceGroup = findTabGroup(layout.root, options.moveTabId);
            if (sourceGroup) {
              const tabIndex = sourceGroup.tabs.findIndex(
                (t) => t.id === options.moveTabId,
              );
              if (tabIndex !== -1) {
                const [tab] = sourceGroup.tabs.splice(tabIndex, 1);
                newPane.tabs.push(tab);
                newPane.activeTabId = tab.id;

                if (sourceGroup.activeTabId === options.moveTabId) {
                  sourceGroup.activeTabId = sourceGroup.tabs[0]?.id ?? null;
                }
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
          const parent = findParent(layout.root, paneId);
          if (parent) {
            const index = parent.children.findIndex((c) => c.id === paneId);
            parent.children[index] = splitNode;
          } else {
            // Pane is root
            layout.root = splitNode;
          }

          layout.activePaneId = newPaneId;

          // Note: We intentionally do NOT clean up empty panes here.
          // When splitting, empty panes are valid - the user explicitly created the split.
          // Cleanup only happens when closing tabs.

          return { layout };
        });

        return newPaneId;
      },

      merge: (paneId) => {
        set((state) => {
          const layout = { ...state.layout };
          const parent = findParent(layout.root, paneId);

          if (!parent) return state; // Can't merge root

          const paneIndex = parent.children.findIndex((c) => c.id === paneId);
          if (paneIndex === -1) return state;

          // Get sibling
          const siblingIndex = paneIndex === 0 ? 1 : 0;
          const sibling = parent.children[siblingIndex];

          // Replace parent with sibling in grandparent
          const grandparent = findParent(layout.root, parent.id);
          if (grandparent) {
            const parentIndex = grandparent.children.findIndex(
              (c) => c.id === parent.id,
            );
            grandparent.children[parentIndex] = sibling;
          } else {
            // Parent is root
            layout.root = sibling;
          }

          // Update active pane if necessary
          if (layout.activePaneId === paneId) {
            const groups = getAllTabGroups(sibling);
            if (groups.length > 0) {
              layout.activePaneId = groups[0].id;
            }
          }

          return { layout };
        });
      },

      resizeSplit: (splitId, sizes) => {
        set((state) => {
          const layout = { ...state.layout };
          const split = findNode(layout.root, splitId) as SplitNode | undefined;

          if (!split || split.type !== 'split') return state;

          split.sizes = sizes;

          return { layout };
        });
      },

      activatePane: (paneId) => {
        set((state) => ({
          layout: { ...state.layout, activePaneId: paneId },
        }));
      },

      getActivePane: () => {
        const { layout } = get();
        return findNode(layout.root, layout.activePaneId) as
          | TabGroupNode
          | undefined;
      },

      handleDrop: (tabId, targetPaneId, position) => {
        const { split, openFloatingWindow } = get();

        if (position === 'center') {
          // Open as floating window instead of merging
          openFloatingWindow(tabId);
        } else {
          const direction =
            position === 'left' || position === 'right'
              ? 'horizontal'
              : 'vertical';
          const insertBefore = position === 'left' || position === 'top';
          split(targetPaneId, direction, {
            moveTabId: tabId,
            ratio: 0.5,
            insertBefore,
          });
        }
      },

      openFloatingWindow: (tabId, position) => {
        set((state) => {
          let layout = { ...state.layout };
          const sourceGroup = findTabGroup(layout.root, tabId);

          if (!sourceGroup) return state;

          const tabIndex = sourceGroup.tabs.findIndex((t) => t.id === tabId);
          if (tabIndex === -1) return state;

          // Remove tab from source group
          const [tab] = sourceGroup.tabs.splice(tabIndex, 1);

          // Update source group active tab
          if (sourceGroup.activeTabId === tabId) {
            sourceGroup.activeTabId = sourceGroup.tabs[0]?.id ?? null;
          }

          // Clean up empty panes
          const cleanedRoot = cleanupEmptyPanes(layout.root);
          if (cleanedRoot) {
            layout.root = cleanedRoot;

            const allGroups = getAllTabGroups(layout.root);
            const activePaneExists = allGroups.some(
              (g) => g.id === layout.activePaneId,
            );
            if (!activePaneExists && allGroups.length > 0) {
              layout.activePaneId = allGroups[0].id;
            }
          }

          // Create floating window
          const windowId = generateId();
          const defaultPosition = position ?? {
            x: Math.max(100, (window?.innerWidth ?? 800) / 2 - 300),
            y: Math.max(100, (window?.innerHeight ?? 600) / 2 - 200),
          };

          const floatingWindow: FloatingWindow = {
            id: windowId,
            tab,
            position: defaultPosition,
            size: { width: 600, height: 400 },
            zIndex: state.nextZIndex,
          };

          return {
            layout,
            floatingWindows: [...state.floatingWindows, floatingWindow],
            nextZIndex: state.nextZIndex + 1,
          };
        });
      },

      closeFloatingWindow: (windowId) => {
        set((state) => ({
          floatingWindows: state.floatingWindows.filter(
            (w) => w.id !== windowId,
          ),
        }));
      },

      dockFloatingWindow: (windowId) => {
        set((state) => {
          const floatingWindow = state.floatingWindows.find(
            (w) => w.id === windowId,
          );
          if (!floatingWindow) return state;

          // Re-open the tab in the active pane
          const layout = { ...state.layout };
          const activePane = findNode(layout.root, layout.activePaneId) as
            | TabGroupNode
            | undefined;

          if (activePane && activePane.type === 'tabGroup') {
            activePane.tabs.push(floatingWindow.tab);
            activePane.activeTabId = floatingWindow.tab.id;
          }

          return {
            layout,
            floatingWindows: state.floatingWindows.filter(
              (w) => w.id !== windowId,
            ),
          };
        });
      },

      moveFloatingWindow: (windowId, position) => {
        set((state) => ({
          floatingWindows: state.floatingWindows.map((w) =>
            w.id === windowId ? { ...w, position } : w,
          ),
        }));
      },

      resizeFloatingWindow: (windowId, size) => {
        set((state) => ({
          floatingWindows: state.floatingWindows.map((w) =>
            w.id === windowId ? { ...w, size } : w,
          ),
        }));
      },

      focusFloatingWindow: (windowId) => {
        set((state) => ({
          floatingWindows: state.floatingWindows.map((w) =>
            w.id === windowId ? { ...w, zIndex: state.nextZIndex } : w,
          ),
          nextZIndex: state.nextZIndex + 1,
        }));
      },

      maximizePane: (paneId) => {
        const { layout, maximizedPaneId } = get();

        // Already maximized
        if (maximizedPaneId === paneId) return;

        // Find the pane
        const pane = findNode(layout.root, paneId) as TabGroupNode | undefined;
        if (!pane || pane.type !== 'tabGroup') return;

        // Save current layout and set maximized state
        set({
          preMaximizeLayout: JSON.parse(JSON.stringify(layout)),
          maximizedPaneId: paneId,
          layout: {
            ...layout,
            root: { ...pane },
            activePaneId: paneId,
          },
        });
      },

      restorePane: () => {
        const { preMaximizeLayout, maximizedPaneId } = get();

        if (!preMaximizeLayout || !maximizedPaneId) return;

        set({
          layout: preMaximizeLayout,
          preMaximizeLayout: null,
          maximizedPaneId: null,
        });
      },

      toggleMaximizePane: (paneId) => {
        const { maximizedPaneId, maximizePane, restorePane } = get();

        if (maximizedPaneId === paneId) {
          restorePane();
        } else {
          maximizePane(paneId);
        }
      },

      isMaximized: (paneId) => {
        return get().maximizedPaneId === paneId;
      },

      setLayout: (layout) => {
        set({ layout });
      },

      resetLayout: () => {
        set({
          layout: createInitialLayout(),
          maximizedPaneId: null,
          preMaximizeLayout: null,
        });
      },
    }),
    {
      name: 'workbench-layout',
      partialize: (state) => ({
        layout: state.layout,
        floatingWindows: state.floatingWindows,
        nextZIndex: state.nextZIndex,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<WindowManagerState>),
        // Ensure floatingWindows is always an array (for migration from old state)
        floatingWindows:
          (persistedState as Partial<WindowManagerState>)?.floatingWindows ??
          [],
        nextZIndex:
          (persistedState as Partial<WindowManagerState>)?.nextZIndex ?? 1,
      }),
    },
  ),
);
