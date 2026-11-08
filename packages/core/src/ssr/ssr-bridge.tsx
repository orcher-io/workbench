'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { PluginDefinition } from '@orcher/workbench-plugin-api';

/**
 * SSR state that gets serialized to the client
 */
export interface SSRState {
  /** Plugin definitions for all registered plugins */
  definitions: PluginDefinition[];
  /** Pre-fetched data keyed by plugin ID and data key */
  prefetchedData: Record<string, Record<string, unknown>>;
  /** Server timestamp for cache validation */
  serverTimestamp: number;
  /** Layout state to restore */
  layoutState?: unknown;
}

/**
 * Hydration status for tracking progressive hydration
 */
export type HydrationStatus = 'pending' | 'hydrating' | 'complete' | 'error';

interface HydrationState {
  status: HydrationStatus;
  hydratedPlugins: Set<string>;
  errors: Map<string, Error>;
}

interface SSRContextValue {
  ssrState: SSRState | null;
  hydrationState: HydrationState;
  isServer: boolean;
  markPluginHydrated: (pluginId: string) => void;
  markPluginError: (pluginId: string, error: Error) => void;
  getPrefetchedData: <T>(pluginId: string, key: string) => T | undefined;
}

const SSRContext = createContext<SSRContextValue | null>(null);

/**
 * Script ID for SSR state injection
 */
const SSR_STATE_SCRIPT_ID = '__WORKBENCH_SSR_STATE__';

/**
 * Get SSR state from the window if available (client-side)
 */
function getClientSSRState(): SSRState | null {
  if (typeof window === 'undefined') return null;

  const script = document.getElementById(SSR_STATE_SCRIPT_ID);
  if (!script) return null;

  try {
    return JSON.parse(script.textContent || '');
  } catch {
    console.error('Failed to parse SSR state');
    return null;
  }
}

export interface SSRBridgeProviderProps {
  /** SSR state passed from server (for SSR) */
  ssrState?: SSRState;
  /** Children to render */
  children: ReactNode;
}

/**
 * SSR Bridge Provider - handles hydration state and SSR data
 */
export function SSRBridgeProvider({
  ssrState: serverSSRState,
  children,
}: SSRBridgeProviderProps) {
  const isServer = typeof window === 'undefined';

  const [ssrState] = useState<SSRState | null>(() => {
    // On server, use provided state
    if (isServer) return serverSSRState || null;
    // On client, try to get from window
    return serverSSRState || getClientSSRState();
  });

  const [hydrationState, setHydrationState] = useState<HydrationState>({
    status: 'pending',
    hydratedPlugins: new Set(),
    errors: new Map(),
  });

  // Start hydration on mount
  useEffect(() => {
    if (hydrationState.status === 'pending') {
      setHydrationState((prev) => ({ ...prev, status: 'hydrating' }));
    }
  }, []);

  // Check if all plugins are hydrated
  useEffect(() => {
    if (!ssrState || hydrationState.status !== 'hydrating') return;

    const allHydrated = ssrState.definitions.every(
      (d) =>
        hydrationState.hydratedPlugins.has(d.id) ||
        hydrationState.errors.has(d.id),
    );

    if (allHydrated) {
      setHydrationState((prev) => ({ ...prev, status: 'complete' }));
    }
  }, [ssrState, hydrationState.hydratedPlugins, hydrationState.errors]);

  const markPluginHydrated = (pluginId: string) => {
    setHydrationState((prev) => ({
      ...prev,
      hydratedPlugins: new Set([...prev.hydratedPlugins, pluginId]),
    }));
  };

  const markPluginError = (pluginId: string, error: Error) => {
    setHydrationState((prev) => ({
      ...prev,
      errors: new Map([...prev.errors, [pluginId, error]]),
    }));
  };

  const getPrefetchedData = <T,>(
    pluginId: string,
    key: string,
  ): T | undefined => {
    return ssrState?.prefetchedData[pluginId]?.[key] as T | undefined;
  };

  const contextValue: SSRContextValue = {
    ssrState,
    hydrationState,
    isServer,
    markPluginHydrated,
    markPluginError,
    getPrefetchedData,
  };

  return (
    <SSRContext.Provider value={contextValue}>{children}</SSRContext.Provider>
  );
}

/**
 * Hook to access SSR context
 */
export function useSSR(): SSRContextValue {
  const context = useContext(SSRContext);
  if (!context) {
    throw new Error('useSSR must be used within SSRBridgeProvider');
  }
  return context;
}

/**
 * Hook to check if currently on server
 */
export function useIsServer(): boolean {
  const context = useContext(SSRContext);
  return context?.isServer ?? typeof window === 'undefined';
}

/**
 * Hook to access prefetched data
 */
export function usePrefetchedData<T>(
  pluginId: string,
  key: string,
): T | undefined {
  const { getPrefetchedData } = useSSR();
  return getPrefetchedData<T>(pluginId, key);
}

/**
 * Hook to track hydration completion for a plugin
 */
export function useHydrationComplete(pluginId: string): void {
  const { markPluginHydrated, hydrationState } = useSSR();

  useEffect(() => {
    if (!hydrationState.hydratedPlugins.has(pluginId)) {
      markPluginHydrated(pluginId);
    }
  }, [pluginId, markPluginHydrated]);
}

/**
 * Component to inject SSR state script
 */
export function SSRStateScript({ state }: { state: SSRState }) {
  const serialized = JSON.stringify(state);

  return (
    <script
      id={SSR_STATE_SCRIPT_ID}
      type="application/json"
      dangerouslySetInnerHTML={{ __html: serialized }}
    />
  );
}

/**
 * Create SSR state on the server
 */
export function createSSRState(
  definitions: PluginDefinition[],
  prefetchedData: Record<string, Record<string, unknown>> = {},
  layoutState?: unknown,
): SSRState {
  return {
    definitions,
    prefetchedData,
    serverTimestamp: Date.now(),
    layoutState,
  };
}
