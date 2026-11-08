'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  type TreeDataProvider,
  type TreeItem,
  TreeItemCollapsibleState,
} from '@orcher/workbench-plugin-api';
import type { TreeViewState, TreeViewNode, FlattenedTreeNode } from './types';
import { fuzzyMatch } from './utils/fuzzy-search';

interface UseTreeViewOptions<T> {
  provider: TreeDataProvider<T>;
  onSelect?: (element: T) => void;
  onActivate?: (element: T) => void;
  onExpand?: (element: T) => void;
  onCollapse?: (element: T) => void;
  defaultExpanded?: Set<string>;
  /** Storage key for persisting expanded state. If provided, expanded state will be saved to localStorage */
  storageKey?: string;
}

interface UseTreeViewResult<T> {
  state: TreeViewState<T>;
  toggle: (nodeId: string) => void;
  expand: (nodeId: string) => void;
  collapse: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  select: (nodeId: string | null) => void;
  activate: (nodeId: string) => void;
  focusUp: () => void;
  focusDown: () => void;
  focusFirst: () => void;
  focusLast: () => void;
  refresh: (element?: T) => void;
  getElement: (nodeId: string) => T | undefined;
  getNodeId: (element: T) => string | undefined;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  getNodePath: (nodeId: string) => TreeViewNode<T>[];
  reveal: (nodeId: string) => void;
}

/**
 * Hook for managing tree view state with lazy loading and search
 */
// Helper to load expanded IDs from localStorage
function loadExpandedIds(storageKey: string): Set<string> | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Helper to save expanded IDs to localStorage
function saveExpandedIds(storageKey: string, expandedIds: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify([...expandedIds]));
  } catch {
    // Ignore storage errors
  }
}

// Helper to load selected ID from localStorage
function loadSelectedId(storageKey: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(`${storageKey}-selected`);
  } catch {
    return null;
  }
}

// Helper to save selected ID to localStorage
function saveSelectedId(storageKey: string, selectedId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (selectedId) {
      localStorage.setItem(`${storageKey}-selected`, selectedId);
    } else {
      localStorage.removeItem(`${storageKey}-selected`);
    }
  } catch {
    // Ignore storage errors
  }
}

export function useTreeView<T>({
  provider,
  onSelect,
  onActivate,
  onExpand,
  onCollapse,
  defaultExpanded,
  storageKey,
}: UseTreeViewOptions<T>): UseTreeViewResult<T> {
  // Start with default state - hydrate from localStorage after mount to avoid SSR mismatch
  const [state, setState] = useState<TreeViewState<T>>({
    nodes: new Map(),
    rootIds: [],
    expandedIds: defaultExpanded ?? new Set<string>(),
    selectedId: null,
    focusedId: null,
    flattenedNodes: [],
    isLoading: true,
    error: undefined,
    searchQuery: '',
    isSearching: false,
  });

  // Track if we've hydrated from localStorage
  const hasHydratedRef = useRef(false);

  // Map from TreeItem.id to element
  const elementMapRef = useRef(new Map<string, T>());

  // Track which nodes are currently loading
  const loadingRef = useRef(new Set<string>());

  // Hydrate from localStorage after mount (client-side only)
  useEffect(() => {
    if (hasHydratedRef.current || !storageKey) return;
    hasHydratedRef.current = true;

    const storedExpanded = loadExpandedIds(storageKey);
    const storedSelected = loadSelectedId(storageKey);

    if (storedExpanded || storedSelected) {
      setState((s) => ({
        ...s,
        expandedIds: storedExpanded ?? s.expandedIds,
        selectedId: storedSelected ?? s.selectedId,
        focusedId: storedSelected ?? s.focusedId,
      }));
    }
  }, [storageKey]);

  // Persist expanded state to localStorage when it changes (skip during hydration)
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (storageKey && state.expandedIds.size > 0) {
      saveExpandedIds(storageKey, state.expandedIds);
    }
  }, [storageKey, state.expandedIds]);

  // Persist selected ID to localStorage when it changes (skip during hydration)
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (storageKey) {
      saveSelectedId(storageKey, state.selectedId);
    }
  }, [storageKey, state.selectedId]);

  // Flatten nodes for virtual rendering
  const flattenNodes = useCallback(
    (currentState: TreeViewState<T>): FlattenedTreeNode<T>[] => {
      const { nodes, rootIds, expandedIds, searchQuery } = currentState;
      const isSearching = searchQuery.length > 0;

      if (isSearching) {
        const results: FlattenedTreeNode<T>[] = [];
        for (const node of nodes.values()) {
          const match = fuzzyMatch(searchQuery, node.treeItem.label);
          if (match && match.score > 0) {
            results.push({
              ...node,
              indentLevel: 0,
              visible: true,
              hasChildren:
                node.treeItem.collapsibleState !==
                TreeItemCollapsibleState.None,
              expanded: false,
              matchScore: match.score,
              matchIndices: match.indices,
            });
          }
        }
        results.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
        return results;
      }

      const result: FlattenedTreeNode<T>[] = [];

      function traverse(nodeId: string, depth: number): void {
        const node = nodes.get(nodeId);
        if (!node) return;

        const isExpanded = expandedIds.has(nodeId);
        const hasChildren =
          node.treeItem.collapsibleState !== TreeItemCollapsibleState.None;

        result.push({
          ...node,
          indentLevel: depth,
          visible: true,
          hasChildren,
          expanded: isExpanded,
        });

        if (isExpanded && node.childIds) {
          for (const childId of node.childIds) {
            traverse(childId, depth + 1);
          }
        }
      }

      for (const rootId of rootIds) {
        traverse(rootId, 0);
      }

      return result;
    },
    [],
  );

  // Load root nodes
  const loadRoot = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: undefined }));
    try {
      const rootElements = await Promise.resolve(provider.getRoot());
      const nodes = new Map<string, TreeViewNode<T>>();
      const rootIds: string[] = [];

      for (const element of rootElements) {
        const treeItem = await Promise.resolve(provider.getTreeItem(element));
        const id = treeItem.id;

        elementMapRef.current.set(id, element);

        nodes.set(id, {
          id,
          element,
          treeItem,
          parentId: null,
          depth: 0,
          childrenLoaded: false,
          isLoading: false,
        });
        rootIds.push(id);
      }

      setState((s) => {
        const newState = { ...s, nodes, rootIds, isLoading: false };
        newState.flattenedNodes = flattenNodes(newState);

        return newState;
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [provider, flattenNodes]);

  // Load children for a node
  const loadChildren = useCallback(
    async (nodeId: string) => {
      // Prevent duplicate loads
      if (loadingRef.current.has(nodeId)) return;
      loadingRef.current.add(nodeId);

      // Mark node as loading
      setState((s) => {
        const node = s.nodes.get(nodeId);
        if (!node || node.childrenLoaded) {
          loadingRef.current.delete(nodeId);
          return s;
        }

        const updatedNodes = new Map(s.nodes);
        updatedNodes.set(nodeId, { ...node, isLoading: true });
        return { ...s, nodes: updatedNodes };
      });

      try {
        // Get current node element from our ref
        const element = elementMapRef.current.get(nodeId);
        if (!element) {
          loadingRef.current.delete(nodeId);
          return;
        }

        const children = await Promise.resolve(provider.getChildren(element));
        const childData: Array<{ element: T; treeItem: TreeItem; id: string }> =
          [];

        for (const childElement of children) {
          const treeItem = await Promise.resolve(
            provider.getTreeItem(childElement),
          );
          elementMapRef.current.set(treeItem.id, childElement);
          childData.push({ element: childElement, treeItem, id: treeItem.id });
        }

        setState((s) => {
          const parentNode = s.nodes.get(nodeId);
          if (!parentNode) return s;

          const updatedNodes = new Map(s.nodes);
          const childIds: string[] = [];

          for (const {
            element: childElement,
            treeItem,
            id: childId,
          } of childData) {
            childIds.push(childId);
            updatedNodes.set(childId, {
              id: childId,
              element: childElement,
              treeItem,
              parentId: nodeId,
              depth: parentNode.depth + 1,
              childrenLoaded: false,
              isLoading: false,
            });
          }

          updatedNodes.set(nodeId, {
            ...parentNode,
            childIds,
            childrenLoaded: true,
            isLoading: false,
          });

          const newState = { ...s, nodes: updatedNodes };
          newState.flattenedNodes = flattenNodes(newState);
          return newState;
        });
      } catch (err) {
        setState((s) => {
          const node = s.nodes.get(nodeId);
          if (!node) return s;

          const updatedNodes = new Map(s.nodes);
          updatedNodes.set(nodeId, {
            ...node,
            isLoading: false,
            error: err instanceof Error ? err.message : String(err),
          });
          return { ...s, nodes: updatedNodes };
        });
      } finally {
        loadingRef.current.delete(nodeId);
      }
    },
    [provider, flattenNodes],
  );

  // Load children for persisted expanded nodes (runs continuously until all expanded nodes are loaded)
  useEffect(() => {
    if (
      state.isLoading ||
      state.rootIds.length === 0 ||
      state.expandedIds.size === 0
    ) {
      return;
    }

    // Find expanded nodes that exist but haven't had their children loaded yet
    const nodesToLoad: string[] = [];
    for (const nodeId of state.expandedIds) {
      const node = state.nodes.get(nodeId);
      if (
        node &&
        !node.childrenLoaded &&
        !node.isLoading &&
        !loadingRef.current.has(nodeId)
      ) {
        nodesToLoad.push(nodeId);
      }
    }

    // Load children for nodes that need it
    for (const nodeId of nodesToLoad) {
      loadChildren(nodeId);
    }
  }, [
    state.isLoading,
    state.rootIds.length,
    state.expandedIds,
    state.nodes,
    loadChildren,
  ]);

  // Reveal persisted selected ID once the node is loaded
  const hasRevealedPersistedSelection = useRef(false);
  useEffect(() => {
    // Only run once, and only if we have a persisted selection
    if (
      hasRevealedPersistedSelection.current ||
      !state.selectedId ||
      state.isLoading ||
      state.rootIds.length === 0
    ) {
      return;
    }

    // Check if the selected node now exists in the tree
    if (state.nodes.has(state.selectedId)) {
      hasRevealedPersistedSelection.current = true;
      // The node exists, trigger a re-flatten to ensure it's visible
      setState((s) => {
        const newState = { ...s };
        newState.flattenedNodes = flattenNodes(newState);
        return newState;
      });
    }
  }, [
    state.isLoading,
    state.rootIds.length,
    state.nodes,
    state.selectedId,
    flattenNodes,
  ]);

  // Toggle expansion
  const toggle = useCallback(
    (nodeId: string) => {
      setState((s) => {
        const node = s.nodes.get(nodeId);
        if (!node) return s;

        const newExpanded = new Set(s.expandedIds);
        const isExpanding = !newExpanded.has(nodeId);

        if (isExpanding) {
          newExpanded.add(nodeId);
          // Load children if needed
          if (!node.childrenLoaded && !node.isLoading) {
            // Use setTimeout to avoid state update during render
            setTimeout(() => loadChildren(nodeId), 0);
          }
          onExpand?.(node.element);
        } else {
          newExpanded.delete(nodeId);
          onCollapse?.(node.element);
        }

        const newState = { ...s, expandedIds: newExpanded };
        newState.flattenedNodes = flattenNodes(newState);
        return newState;
      });
    },
    [loadChildren, flattenNodes, onExpand, onCollapse],
  );

  // Expand a node
  const expand = useCallback(
    (nodeId: string) => {
      setState((s) => {
        if (s.expandedIds.has(nodeId)) return s;

        const node = s.nodes.get(nodeId);
        if (!node) return s;

        const newExpanded = new Set(s.expandedIds);
        newExpanded.add(nodeId);

        if (!node.childrenLoaded && !node.isLoading) {
          setTimeout(() => loadChildren(nodeId), 0);
        }
        onExpand?.(node.element);

        const newState = { ...s, expandedIds: newExpanded };
        newState.flattenedNodes = flattenNodes(newState);
        return newState;
      });
    },
    [loadChildren, flattenNodes, onExpand],
  );

  // Collapse a node
  const collapse = useCallback(
    (nodeId: string) => {
      setState((s) => {
        if (!s.expandedIds.has(nodeId)) return s;

        const node = s.nodes.get(nodeId);
        if (!node) return s;

        const newExpanded = new Set(s.expandedIds);
        newExpanded.delete(nodeId);
        onCollapse?.(node.element);

        const newState = { ...s, expandedIds: newExpanded };
        newState.flattenedNodes = flattenNodes(newState);
        return newState;
      });
    },
    [flattenNodes, onCollapse],
  );

  // Expand all nodes
  const expandAll = useCallback(() => {
    setState((s) => {
      const newExpanded = new Set<string>();
      for (const [id, node] of s.nodes) {
        if (node.treeItem.collapsibleState !== TreeItemCollapsibleState.None) {
          newExpanded.add(id);
          if (!node.childrenLoaded && !node.isLoading) {
            setTimeout(() => loadChildren(id), 0);
          }
        }
      }
      const newState = { ...s, expandedIds: newExpanded };
      newState.flattenedNodes = flattenNodes(newState);
      return newState;
    });
  }, [loadChildren, flattenNodes]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setState((s) => {
      const newState = { ...s, expandedIds: new Set<string>() };
      newState.flattenedNodes = flattenNodes(newState);
      return newState;
    });
  }, [flattenNodes]);

  // Select a node
  const select = useCallback(
    (nodeId: string | null) => {
      setState((s) => ({ ...s, selectedId: nodeId, focusedId: nodeId }));
      if (nodeId) {
        const element = elementMapRef.current.get(nodeId);
        if (element !== undefined) {
          onSelect?.(element);
        }
      }
    },
    [onSelect],
  );

  // Activate a node (double-click or Enter)
  const activate = useCallback(
    (nodeId: string) => {
      const element = elementMapRef.current.get(nodeId);
      if (element !== undefined) {
        onActivate?.(element);
      }
    },
    [onActivate],
  );

  // Focus navigation
  const focusUp = useCallback(() => {
    setState((s) => {
      if (s.flattenedNodes.length === 0) return s;
      const idx = s.flattenedNodes.findIndex((n) => n.id === s.focusedId);
      const newIdx = idx <= 0 ? s.flattenedNodes.length - 1 : idx - 1;
      return { ...s, focusedId: s.flattenedNodes[newIdx]?.id ?? null };
    });
  }, []);

  const focusDown = useCallback(() => {
    setState((s) => {
      if (s.flattenedNodes.length === 0) return s;
      const idx = s.flattenedNodes.findIndex((n) => n.id === s.focusedId);
      const newIdx = idx >= s.flattenedNodes.length - 1 ? 0 : idx + 1;
      return { ...s, focusedId: s.flattenedNodes[newIdx]?.id ?? null };
    });
  }, []);

  const focusFirst = useCallback(() => {
    setState((s) => {
      if (s.flattenedNodes.length === 0) return s;
      return { ...s, focusedId: s.flattenedNodes[0]?.id ?? null };
    });
  }, []);

  const focusLast = useCallback(() => {
    setState((s) => {
      if (s.flattenedNodes.length === 0) return s;
      return {
        ...s,
        focusedId: s.flattenedNodes[s.flattenedNodes.length - 1]?.id ?? null,
      };
    });
  }, []);

  // Search
  const setSearchQuery = useCallback(
    (query: string) => {
      setState((s) => {
        const newState = {
          ...s,
          searchQuery: query,
          isSearching: query.length > 0,
        };
        newState.flattenedNodes = flattenNodes(newState);
        return newState;
      });
    },
    [flattenNodes],
  );

  const clearSearch = useCallback(() => {
    setState((s) => {
      const newState = { ...s, searchQuery: '', isSearching: false };
      newState.flattenedNodes = flattenNodes(newState);
      return newState;
    });
  }, [flattenNodes]);

  // Get path from root to node
  const getNodePath = useCallback(
    (nodeId: string): TreeViewNode<T>[] => {
      const path: TreeViewNode<T>[] = [];
      let currentId: string | null = nodeId;

      while (currentId) {
        const node = state.nodes.get(currentId);
        if (node) {
          path.unshift(node);
          currentId = node.parentId;
        } else {
          break;
        }
      }

      return path;
    },
    [state.nodes],
  );

  // Reveal a node (expand ancestors and scroll to it)
  // Track pending reveal - if node not found, we'll retry when nodes change
  const pendingRevealRef = useRef<string | null>(null);

  const reveal = useCallback(
    (nodeId: string) => {
      setState((s) => {
        const node = s.nodes.get(nodeId);

        // If node not found, store it as pending and return current state
        // The effect below will retry when nodes change
        if (!node) {
          pendingRevealRef.current = nodeId;
          return s;
        }

        // Clear pending since we found the node
        pendingRevealRef.current = null;

        const path: TreeViewNode<T>[] = [];
        let currentId: string | null = nodeId;
        while (currentId) {
          const pathNode = s.nodes.get(currentId);
          if (pathNode) {
            path.unshift(pathNode);
            currentId = pathNode.parentId;
          } else {
            break;
          }
        }

        const newExpanded = new Set(s.expandedIds);

        // Expand all ancestors (except the node itself)
        for (let i = 0; i < path.length - 1; i++) {
          const ancestor = path[i];
          newExpanded.add(ancestor.id);
          if (!ancestor.childrenLoaded && !ancestor.isLoading) {
            setTimeout(() => loadChildren(ancestor.id), 0);
          }
        }

        const newState = {
          ...s,
          expandedIds: newExpanded,
          selectedId: nodeId,
          focusedId: nodeId,
        };
        newState.flattenedNodes = flattenNodes(newState);
        return newState;
      });
    },
    [loadChildren, flattenNodes],
  );

  // Retry pending reveal when nodes change
  useEffect(() => {
    if (pendingRevealRef.current && state.nodes.size > 0) {
      const nodeId = pendingRevealRef.current;
      if (state.nodes.has(nodeId)) {
        reveal(nodeId);
      }
    }
  }, [state.nodes, reveal]);

  // Refresh
  const refresh = useCallback(
    (element?: T) => {
      if (element === undefined) {
        elementMapRef.current.clear();
        loadingRef.current.clear();
        loadRoot();
      } else {
        // Find the node ID for this element
        let nodeId: string | undefined;
        for (const [id, el] of elementMapRef.current) {
          if (el === element) {
            nodeId = id;
            break;
          }
        }
        if (nodeId) {
          setState((s) => {
            const node = s.nodes.get(nodeId!);
            if (!node) return s;

            const updatedNodes = new Map(s.nodes);
            updatedNodes.set(nodeId!, {
              ...node,
              childrenLoaded: false,
              childIds: undefined,
            });
            return { ...s, nodes: updatedNodes };
          });
          loadChildren(nodeId);
        }
      }
    },
    [loadRoot, loadChildren],
  );

  // Get element by node ID
  const getElement = useCallback((nodeId: string): T | undefined => {
    return elementMapRef.current.get(nodeId);
  }, []);

  // Get node ID by element
  const getNodeId = useCallback((element: T): string | undefined => {
    for (const [id, el] of elementMapRef.current) {
      if (el === element) {
        return id;
      }
    }
    return undefined;
  }, []);

  // Initial load
  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  return {
    state,
    toggle,
    expand,
    collapse,
    expandAll,
    collapseAll,
    select,
    activate,
    focusUp,
    focusDown,
    focusFirst,
    focusLast,
    refresh,
    getElement,
    getNodeId,
    setSearchQuery,
    clearSearch,
    getNodePath,
    reveal,
  };
}
