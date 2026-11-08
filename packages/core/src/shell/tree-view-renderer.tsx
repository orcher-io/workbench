'use client';

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { Box, Text } from '@radix-ui/themes';
import { RichTreeView } from '@orcher/workbench-ui';
import { useWindowManager } from '@orcher/workbench-window-manager';
import type { NavigationBreadcrumb, TreeItem } from '@orcher/workbench-plugin-api';
import { useTreeViewService } from '../hooks/use-tree-view-service';
import { useNavigationService } from '../hooks/use-navigation-service';

interface TreeViewRendererProps {
  viewId: string;
  /** Whether search is visible (controlled by sidebar header) */
  isSearchVisible?: boolean;
  /** Callback when search visibility changes */
  onSearchVisibilityChange?: (visible: boolean) => void;
}

/**
 * Renders a TreeDataProvider-based view using RichTreeView
 */
export function TreeViewRenderer({
  viewId,
  isSearchVisible,
  onSearchVisibilityChange,
}: TreeViewRendererProps) {
  const { getTreeDataProvider, getTreeView, getRichOptions } =
    useTreeViewService();
  const { setBreadcrumbs } = useNavigationService();
  const { openTab, layout } = useWindowManager();
  const lastActivatedFromTree = useRef<string | null>(null);

  const provider = getTreeDataProvider(viewId);
  const treeView = getTreeView(viewId);
  const richOptions = getRichOptions(viewId);

  // Get the active tab's URI
  const activeTabUri = useMemo(() => {
    const findActiveTab = (node: typeof layout.root): string | null => {
      if (node.type === 'tabGroup') {
        const tab = node.tabs.find((t) => t.id === node.activeTabId);
        return tab?.uri || null;
      }
      for (const child of node.children) {
        const found = findActiveTab(child);
        if (found) return found;
      }
      return null;
    };
    return findActiveTab(layout.root);
  }, [layout]);

  // Reveal the corresponding tree item when active tab changes
  useEffect(() => {
    if (!activeTabUri || !treeView || !provider) return;

    // Skip if this tab was just activated from the tree itself
    if (lastActivatedFromTree.current === activeTabUri) {
      lastActivatedFromTree.current = null;
      return;
    }

    // Find the element with matching resourceUri - searches recursively through all children
    const findElementByUri = async (uri: string): Promise<unknown | null> => {
      const searchInElements = async (
        elements: unknown[],
      ): Promise<unknown | null> => {
        for (const element of elements) {
          const treeItemOrPromise = provider.getTreeItem(element);
          const treeItem =
            treeItemOrPromise instanceof Promise
              ? await treeItemOrPromise
              : treeItemOrPromise;

          if (treeItem.resourceUri === uri) {
            return element;
          }

          // Search in children (load them even if collapsed)
          const childrenOrPromise = provider.getChildren(element);
          const children =
            childrenOrPromise instanceof Promise
              ? await childrenOrPromise
              : childrenOrPromise;

          if (Array.isArray(children) && children.length > 0) {
            const found = await searchInElements(children);
            if (found) return found;
          }
        }
        return null;
      };

      const rootsOrPromise = provider.getRoot();
      const roots =
        rootsOrPromise instanceof Promise
          ? await rootsOrPromise
          : rootsOrPromise;
      return searchInElements(roots);
    };

    // Retry mechanism to handle page refresh timing
    // More attempts with longer delays to allow tree to fully load expanded nodes
    let cancelled = false;
    let currentTimeout: ReturnType<typeof setTimeout> | null = null;
    const delays = [50, 150, 300, 500, 800, 1200];
    let attempt = 0;

    const tryReveal = () => {
      if (cancelled) return;

      findElementByUri(activeTabUri).then((element) => {
        if (cancelled) return;

        if (element) {
          treeView.reveal(element, {
            select: true,
            focus: false,
            expand: true,
          });
        } else if (attempt < delays.length - 1) {
          // Retry with increasing delay
          attempt++;
          currentTimeout = setTimeout(tryReveal, delays[attempt]);
        }
      });
    };

    currentTimeout = setTimeout(tryReveal, delays[0]);

    return () => {
      cancelled = true;
      if (currentTimeout) clearTimeout(currentTimeout);
    };
  }, [activeTabUri, treeView, provider]);

  // Handle navigation updates
  const handleNavigate = useCallback(
    (breadcrumbs: NavigationBreadcrumb[]) => {
      setBreadcrumbs(breadcrumbs);
    },
    [setBreadcrumbs],
  );

  // Handle item activation - open tab for files
  const handleActivate = useCallback(
    (element: unknown) => {
      if (!provider) return;

      const treeItemOrPromise = provider.getTreeItem(element);

      const openTabForItem = (item: TreeItem) => {
        // Only open tabs for non-collapsible items (files/leaf nodes)
        if (item.collapsibleState === 0) {
          const uri = item.resourceUri || `item://${item.id}`;
          // Track that this activation came from the tree to avoid re-revealing
          lastActivatedFromTree.current = uri;
          openTab({
            uri,
            title: item.label,
            editorId: 'text.editor',
            dirty: false,
            pinned: false,
            preview: true,
          });
        }
      };

      if (treeItemOrPromise instanceof Promise) {
        treeItemOrPromise.then(openTabForItem);
      } else {
        openTabForItem(treeItemOrPromise);
      }
    },
    [provider, openTab],
  );

  // Merge rich options with navigation handler and search state
  // Note: storageKey should be provided by the plugin if it wants persistence
  const mergedOptions = useMemo(
    () => ({
      ...richOptions,
      onNavigate: handleNavigate,
      isSearchVisible,
      onSearchVisibilityChange,
    }),
    [richOptions, handleNavigate, isSearchVisible, onSearchVisibilityChange],
  );

  if (!provider) {
    return (
      <Box p="4">
        <Text size="2" color="gray">
          No tree data provider for view: {viewId}
        </Text>
      </Box>
    );
  }

  return (
    <RichTreeView
      provider={provider}
      treeView={treeView}
      options={mergedOptions}
      onActivate={handleActivate}
    />
  );
}
