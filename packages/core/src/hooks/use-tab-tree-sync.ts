'use client';

import { useEffect, useRef } from 'react';
import { useWindowManager } from '@orcher/workbench-window-manager';
import { useContainer } from '@orcher/workbench-di';
import { ServiceTokens } from '@orcher/workbench-plugin-api';
import type { TreeViewService, ViewService } from '@orcher/workbench-services';

/**
 * Hook that synchronizes tab activation with tree view selection.
 * When a tab is activated, it:
 * 1. Finds which tree view contains the item with that URI
 * 2. Activates the corresponding activity bar container
 * 3. Shows the sidebar
 * 4. Reveals and selects the item in the tree (expanding parents)
 */
export function useTabTreeSync() {
  const container = useContainer();
  const { layout } = useWindowManager();
  const lastActiveTabIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Find the active tab across all panes (not just the active pane)
    const findActiveTabInAllPanes = (
      node: typeof layout.root,
    ): { id: string; uri?: string } | null => {
      if (node.type === 'tabGroup') {
        if (node.activeTabId) {
          const tab = node.tabs.find((t) => t.id === node.activeTabId);
          if (tab && node.id === layout.activePaneId) {
            return { id: tab.id, uri: tab.uri };
          }
        }
        return null;
      }
      for (const child of node.children) {
        const found = findActiveTabInAllPanes(child);
        if (found) return found;
      }
      return null;
    };

    const activeTab = findActiveTabInAllPanes(layout.root);

    // Skip if no active tab or same tab as before
    if (!activeTab || activeTab.id === lastActiveTabIdRef.current) {
      return;
    }

    lastActiveTabIdRef.current = activeTab.id;

    // Skip if tab has no URI
    if (!activeTab.uri) {
      return;
    }

    const uri = activeTab.uri;

    // Find and reveal the item asynchronously
    const revealItem = async () => {
      const treeViewService = container.resolve<TreeViewService>(
        ServiceTokens.TreeViewService,
      );
      const viewService = container.resolve<ViewService>(
        ServiceTokens.ViewExtensionPoint,
      );

      // Find which view contains this URI
      const result = await treeViewService.findItemByUri(uri);

      if (!result) {
        return;
      }

      const { viewId, element } = result;

      // Get the container for this view
      const containerId = viewService.getContainerForView(viewId);

      if (containerId) {
        // Activate the container and show sidebar
        viewService.setActiveContainer(containerId);
        viewService.setSidebarVisible(true);
      }

      // Small delay to allow the tree view to mount if switching containers
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Reveal the item in the tree view
      const treeView = treeViewService.getTreeView(viewId);
      if (treeView) {
        await treeView.reveal(element, {
          select: true,
          focus: false,
          expand: true,
        });
      }
    };

    revealItem();
  }, [layout, container]);
}
