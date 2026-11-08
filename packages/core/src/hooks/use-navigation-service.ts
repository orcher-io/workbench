'use client';

import { useCallback, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { useContainer } from '@orcher/workbench-di';
import { ServiceTokens } from '@orcher/workbench-plugin-api';
import type { NavigationService, NavigationState } from '@orcher/workbench-services';

/**
 * Hook to access the NavigationService with reactive updates
 */
export function useNavigationService() {
  const container = useContainer();
  const navigationService = container.resolve<NavigationService>(
    ServiceTokens.NavigationService,
  );

  const snapshotRef = useRef<NavigationState | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const disposable = navigationService.subscribe(() => {
        snapshotRef.current = null;
        onStoreChange();
      });
      return () => disposable.dispose();
    },
    [navigationService],
  );

  const getSnapshot = useCallback((): NavigationState => {
    if (snapshotRef.current !== null) {
      return snapshotRef.current;
    }

    const snapshot = navigationService.getState();
    snapshotRef.current = snapshot;
    return snapshot;
  }, [navigationService]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...state,
    navigationService,
    setBreadcrumbs: useCallback(
      (breadcrumbs: NavigationState['breadcrumbs']) =>
        navigationService.setBreadcrumbs(breadcrumbs),
      [navigationService],
    ),
    goBack: useCallback(() => navigationService.goBack(), [navigationService]),
    goForward: useCallback(
      () => navigationService.goForward(),
      [navigationService],
    ),
    goUp: useCallback(() => navigationService.goUp(), [navigationService]),
    toggleBookmark: useCallback(
      () => navigationService.toggleBookmark(),
      [navigationService],
    ),
  };
}
