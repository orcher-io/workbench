'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { StateManager } from './state-manager';
import type { Selector } from './types';

/**
 * Context for the state manager
 */
const StateManagerContext = createContext<StateManager | null>(null);

/**
 * Provider for the state manager
 */
export interface StateManagerProviderProps {
  manager: StateManager;
  children: ReactNode;
}

export function StateManagerProvider({
  manager,
  children,
}: StateManagerProviderProps) {
  return (
    <StateManagerContext.Provider value={manager}>
      {children}
    </StateManagerContext.Provider>
  );
}

/**
 * Hook to access the state manager
 */
export function useStateManager(): StateManager {
  const manager = useContext(StateManagerContext);
  if (!manager) {
    throw new Error('useStateManager must be used within StateManagerProvider');
  }
  return manager;
}

/**
 * Hook to subscribe to a state slice
 */
export function useSlice<T>(
  sliceName: string,
): [T, (newState: T | ((prev: T) => T)) => void] {
  const manager = useStateManager();
  const [state, setState] = useState<T>(() => manager.getState<T>(sliceName));

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = manager.subscribe<T>(sliceName, (newState) => {
      setState(newState);
    });

    // Sync initial state
    setState(manager.getState<T>(sliceName));

    return unsubscribe;
  }, [manager, sliceName]);

  const setSliceState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      manager.setState(sliceName, newState);
    },
    [manager, sliceName],
  );

  return [state, setSliceState];
}

/**
 * Hook to select derived state from a slice
 */
export function useSelector<T, R>(
  sliceName: string,
  selector: Selector<T, R>,
): R {
  const manager = useStateManager();
  const [selectedState, setSelectedState] = useState<R>(() =>
    selector(manager.getState<T>(sliceName)),
  );

  useEffect(() => {
    const unsubscribe = manager.subscribe<T>(
      sliceName,
      (newState, previousState) => {
        const newSelected = selector(newState);
        const prevSelected = selector(previousState);

        // Only update if selected value changed
        if (newSelected !== prevSelected) {
          setSelectedState(newSelected);
        }
      },
    );

    // Sync initial state
    setSelectedState(selector(manager.getState<T>(sliceName)));

    return unsubscribe;
  }, [manager, sliceName, selector]);

  return selectedState;
}

/**
 * Hook for undo/redo functionality
 */
export function useUndo(): {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
} {
  const manager = useStateManager();
  const [canUndo, setCanUndo] = useState(manager.canUndo());
  const [canRedo, setCanRedo] = useState(manager.canRedo());

  useEffect(() => {
    const unsubscribe = manager.subscribeAll(() => {
      setCanUndo(manager.canUndo());
      setCanRedo(manager.canRedo());
    });

    return unsubscribe;
  }, [manager]);

  const undo = useCallback(() => {
    manager.undo();
  }, [manager]);

  const redo = useCallback(() => {
    manager.redo();
  }, [manager]);

  return { undo, redo, canUndo, canRedo };
}

/**
 * Hook to create and register a slice
 */
export function useCreateSlice<T>(
  name: string,
  initialState: T,
  options: { persist?: boolean } = {},
): [T, (newState: T | ((prev: T) => T)) => void] {
  const manager = useStateManager();

  // Register slice on mount
  useEffect(() => {
    if (!manager.hasSlice(name)) {
      manager.registerSlice({
        name,
        initialState,
        persist: options.persist,
      });
    }

    return () => {
      // Optionally unregister on unmount
      // manager.unregisterSlice(name);
    };
  }, [manager, name, initialState, options.persist]);

  return useSlice<T>(name);
}

/**
 * Hook to batch multiple state updates
 */
export function useBatchUpdate() {
  const manager = useStateManager();

  return useCallback(
    (updates: Array<{ slice: string; state: unknown }>) => {
      for (const update of updates) {
        manager.setState(update.slice, update.state, { silent: true });
      }
      // Note: This doesn't trigger a single update, but skips intermediate renders
    },
    [manager],
  );
}
