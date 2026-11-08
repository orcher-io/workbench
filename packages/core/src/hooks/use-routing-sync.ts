'use client';

import { useEffect, useRef } from 'react';
import { useWindowManager } from '@orcher/workbench-window-manager';
import { useContainer } from '@orcher/workbench-di';
import {
  ServiceTokens,
  type IRoutingService,
  type NavigationBreadcrumb,
} from '@orcher/workbench-plugin-api';
import type {
  ExplorerRegistry,
  ViewService,
  NavigationService,
} from '@orcher/workbench-services';

/**
 * Hook that synchronizes routing state with application state.
 * Handles bidirectional sync:
 * - URL changes -> App state (activity bar, sidebar, tabs, breadcrumbs)
 * - Tab activation -> URL updates
 */
export function useRoutingSync() {
  const container = useContainer();
  const { openTab, layout } = useWindowManager();
  const lastPathRef = useRef<string | null>(null);
  const lastTabUriRef = useRef<string | null>(null);

  useEffect(() => {
    // Get services
    let routingService: IRoutingService | null = null;
    let explorerRegistry: ExplorerRegistry | null = null;
    let viewService: ViewService | null = null;
    let navigationService: NavigationService | null = null;

    try {
      routingService = container.resolve<IRoutingService>(
        ServiceTokens.RoutingService,
      );
      explorerRegistry = container.resolve<ExplorerRegistry>(
        ServiceTokens.ExplorerRegistry,
      );
      viewService = container.resolve<ViewService>(
        ServiceTokens.ViewExtensionPoint,
      );
      navigationService = container.resolve<NavigationService>(
        ServiceTokens.NavigationService,
      );
    } catch {
      // Services not yet registered, skip
      return;
    }

    if (
      !routingService ||
      !explorerRegistry ||
      !viewService ||
      !navigationService
    ) {
      return;
    }

    // Handle URL changes -> App state
    const handleRouteChange = (state: { path: string; segments: string[] }) => {
      // Skip if same path
      if (state.path === lastPathRef.current) {
        return;
      }
      lastPathRef.current = state.path;

      const match = routingService!.matchPath(state.path);

      if (match) {
        // 1. Activate the section in activity bar
        viewService!.setActiveContainer(match.sectionId);
        viewService!.setSidebarVisible(true);

        // 2. Update breadcrumbs from path
        const breadcrumbs = buildBreadcrumbsFromPath(
          state.path,
          explorerRegistry!,
        );
        navigationService!.setBreadcrumbs(breadcrumbs);

        // 3. Open tab if it's a leaf item
        if (match.itemId) {
          const item = explorerRegistry!.getItem(match.itemId);
          if (item && !item.hasChildren) {
            const uri = item.uri || state.path;

            // Avoid re-triggering URL update
            lastTabUriRef.current = uri;

            openTab({
              uri,
              title: item.label,
              editorId: item.editorId || 'default.editor',
              dirty: false,
              pinned: false,
              preview: true,
            });
          }
        }
      } else if (state.segments.length >= 2) {
        // Fallback: reconstruct tab URI from path (e.g. "/settings/preferences" -> "settings://preferences")
        const scheme = state.segments[0];
        const rest = state.segments.slice(1).join('/');
        const uri = `${scheme}://${rest}`;
        const editorId = `${scheme}.editor`;
        const title = formatLabel(state.segments[state.segments.length - 1]);

        lastTabUriRef.current = uri;

        openTab({
          uri,
          title,
          editorId,
          dirty: false,
          pinned: false,
          preview: false,
        });
      }
    };

    // Subscribe to route changes
    const disposable = routingService.subscribe(handleRouteChange);

    // Handle initial route
    const initialState = routingService.getState();
    if (initialState.path !== '/') {
      handleRouteChange(initialState);
    }

    return () => {
      disposable.dispose();
    };
  }, [container, openTab]);

  // Handle tab activation -> URL updates
  useEffect(() => {
    let routingService: IRoutingService | null = null;

    try {
      routingService = container.resolve<IRoutingService>(
        ServiceTokens.RoutingService,
      );
    } catch {
      return;
    }

    if (!routingService) {
      return;
    }

    // Find the active tab
    const findActiveTab = (
      node: typeof layout.root,
    ): { uri?: string } | null => {
      if (node.type === 'tabGroup') {
        if (node.id === layout.activePaneId && node.activeTabId) {
          const tab = node.tabs.find((t) => t.id === node.activeTabId);
          return tab ? { uri: tab.uri } : null;
        }
        return null;
      }
      for (const child of node.children) {
        const found = findActiveTab(child);
        if (found) return found;
      }
      return null;
    };

    const activeTab = findActiveTab(layout.root);

    if (activeTab?.uri && activeTab.uri !== lastTabUriRef.current) {
      lastTabUriRef.current = activeTab.uri;

      // Convert URI to path — try registered mapping first, fall back to URI-derived path
      let path = routingService.uriToPath(activeTab.uri);

      if (!path) {
        // Derive path from URI scheme (e.g. "settings://preferences" -> "/settings/preferences")
        const match = activeTab.uri.match(/^([^:]+):\/\/(.+)$/);
        if (match) {
          path = '/' + match[1] + '/' + match[2];
        }
      }

      if (path && path !== routingService.getState().path) {
        // Use replace to avoid creating history entries for tab switches
        routingService.replace(path);
        lastPathRef.current = path;
      }
    }
  }, [layout, container]);
}

/**
 * Build breadcrumbs from a URL path
 */
function buildBreadcrumbsFromPath(
  path: string,
  registry: ExplorerRegistry,
): NavigationBreadcrumb[] {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs: NavigationBreadcrumb[] = [];

  if (segments.length === 0) {
    return breadcrumbs;
  }

  // First segment is the section
  const sectionId = segments[0];
  const section = registry.getSection(sectionId);

  if (section) {
    breadcrumbs.push({
      id: sectionId,
      label: section.title,
      path: '/' + sectionId,
    });
  }

  // Build breadcrumbs for each path segment
  let currentPath = '/' + sectionId;

  for (let i = 1; i < segments.length; i++) {
    currentPath += '/' + segments[i];
    const item = registry.findItemByPath(currentPath);

    if (item) {
      breadcrumbs.push({
        id: item.id,
        label: item.label,
        path: currentPath,
      });
    } else {
      // Unknown segment, use the segment as label
      breadcrumbs.push({
        id: segments[i],
        label: formatLabel(segments[i]),
        path: currentPath,
      });
    }
  }

  return breadcrumbs;
}

/**
 * Format a kebab-case segment as a readable label
 */
function formatLabel(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
