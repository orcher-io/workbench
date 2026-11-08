'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { useContainer } from '@orcher/workbench-di';
import {
  ServiceTokens,
  type ViewProvider,
  type ViewContainerContribution,
} from '@orcher/workbench-plugin-api';
import type { ViewService } from '@orcher/workbench-services';

interface ViewServiceSnapshot {
  activeContainerId: string | null;
  sidebarVisible: boolean;
  activityBarContainers: ViewContainerContribution[];
  panelContainers: ViewContainerContribution[];
}

interface ActiveViewSnapshot {
  viewId: string | null;
  provider: ViewProvider | undefined;
  containerId: string | null;
}

/**
 * Hook to access the ViewService with reactive updates
 */
export function useViewService() {
  const container = useContainer();
  const viewService = container.resolve<ViewService>(
    ServiceTokens.ViewExtensionPoint,
  );

  // Cache for the snapshot to prevent infinite loops
  const snapshotRef = useRef<ViewServiceSnapshot | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const disposable = viewService.subscribe(() => {
        // Invalidate cache on change
        snapshotRef.current = null;
        onStoreChange();
      });
      return () => disposable.dispose();
    },
    [viewService],
  );

  const getSnapshot = useCallback((): ViewServiceSnapshot => {
    // Return cached snapshot if available
    if (snapshotRef.current !== null) {
      return snapshotRef.current;
    }

    // Create and cache new snapshot
    const snapshot: ViewServiceSnapshot = {
      activeContainerId: viewService.activeContainerId,
      sidebarVisible: viewService.sidebarVisible,
      activityBarContainers: viewService.getViewContainers('activityBar'),
      panelContainers: viewService.getViewContainers('panel'),
    };

    snapshotRef.current = snapshot;
    return snapshot;
  }, [viewService]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Hydrate from localStorage after mount (client-side only)
  useEffect(() => {
    viewService.hydrate();
  }, [viewService]);

  return {
    ...state,
    viewService,
    handleActivityItemClick: useCallback(
      (containerId: string) => viewService.handleActivityItemClick(containerId),
      [viewService],
    ),
    setActiveContainer: useCallback(
      (containerId: string | null) =>
        viewService.setActiveContainer(containerId),
      [viewService],
    ),
    setSidebarVisible: useCallback(
      (visible: boolean) => viewService.setSidebarVisible(visible),
      [viewService],
    ),
    toggleSidebar: useCallback(
      () => viewService.toggleSidebar(),
      [viewService],
    ),
    getViewsForContainer: useCallback(
      (containerId: string) => viewService.getViewsForContainer(containerId),
      [viewService],
    ),
    getViewProvider: useCallback(
      (viewId: string) => viewService.getViewProvider(viewId),
      [viewService],
    ),
    getActiveViewProvider: useCallback(
      () => viewService.getActiveViewProvider(),
      [viewService],
    ),
    getContainerForView: useCallback(
      (viewId: string) => viewService.getContainerForView(viewId),
      [viewService],
    ),
  };
}

/**
 * Hook to get the active view component - reactive to provider changes
 */
export function useActiveView(): ActiveViewSnapshot {
  const container = useContainer();
  const viewService = container.resolve<ViewService>(
    ServiceTokens.ViewExtensionPoint,
  );

  // Cache for the snapshot
  const snapshotRef = useRef<ActiveViewSnapshot | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const disposable = viewService.subscribe(() => {
        // Invalidate cache on change
        snapshotRef.current = null;
        onStoreChange();
      });
      return () => disposable.dispose();
    },
    [viewService],
  );

  const getSnapshot = useCallback((): ActiveViewSnapshot => {
    // Return cached snapshot if available
    if (snapshotRef.current !== null) {
      return snapshotRef.current;
    }

    const activeContainerId = viewService.activeContainerId;

    if (!activeContainerId) {
      const snapshot: ActiveViewSnapshot = {
        viewId: null,
        provider: undefined,
        containerId: null,
      };
      snapshotRef.current = snapshot;
      return snapshot;
    }

    const views = viewService.getViewsForContainer(activeContainerId);
    const firstView = views[0];

    if (!firstView) {
      const snapshot: ActiveViewSnapshot = {
        viewId: null,
        provider: undefined,
        containerId: activeContainerId,
      };
      snapshotRef.current = snapshot;
      return snapshot;
    }

    const snapshot: ActiveViewSnapshot = {
      viewId: firstView.id,
      provider: viewService.getViewProvider(firstView.id),
      containerId: activeContainerId,
    };
    snapshotRef.current = snapshot;
    return snapshot;
  }, [viewService]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
