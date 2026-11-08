'use client';

import { useCallback, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { useContainer } from '@orcher/workbench-di';
import { ServiceTokens } from '@orcher/workbench-plugin-api';
import type { TreeViewService } from '@orcher/workbench-services';

interface TreeViewServiceSnapshot {
  registeredViewIds: string[];
}

/**
 * Hook to access the TreeViewService with reactive updates
 */
export function useTreeViewService() {
  const container = useContainer();
  const service = container.resolve<TreeViewService>(
    ServiceTokens.TreeViewService,
  );

  // Cache for the snapshot
  const snapshotRef = useRef<TreeViewServiceSnapshot | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const disposable = service.subscribe(() => {
        // Invalidate cache on change
        snapshotRef.current = null;
        onStoreChange();
      });
      return () => disposable.dispose();
    },
    [service],
  );

  const getSnapshot = useCallback((): TreeViewServiceSnapshot => {
    // Return cached snapshot if available
    if (snapshotRef.current !== null) {
      return snapshotRef.current;
    }

    // Create and cache new snapshot
    const snapshot: TreeViewServiceSnapshot = {
      registeredViewIds: service.getRegisteredViewIds(),
    };

    snapshotRef.current = snapshot;
    return snapshot;
  }, [service]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...state,
    service,
    getTreeDataProvider: useCallback(
      <T>(viewId: string) => service.getTreeDataProvider<T>(viewId),
      [service],
    ),
    getTreeView: useCallback(
      <T>(viewId: string) => service.getTreeView<T>(viewId),
      [service],
    ),
    getTreeViewOptions: useCallback(
      <T>(viewId: string) => service.getTreeViewOptions<T>(viewId),
      [service],
    ),
    getRichOptions: useCallback(
      <T>(viewId: string) => service.getRichOptions<T>(viewId),
      [service],
    ),
    hasTreeDataProvider: useCallback(
      (viewId: string) => service.hasTreeDataProvider(viewId),
      [service],
    ),
    findItemByUri: useCallback(
      (uri: string) => service.findItemByUri(uri),
      [service],
    ),
  };
}
