import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { type IContainer, type ServiceIdentifier, createContainer } from './container';

/**
 * React context for the DI container
 */
const ContainerContext = createContext<IContainer | null>(null);

/**
 * Props for ContainerProvider
 */
export interface ContainerProviderProps {
  /** Optional pre-configured container */
  container?: IContainer;
  /** Child components */
  children: ReactNode;
}

/**
 * Provider component that makes the container available to child components
 */
export function ContainerProvider({ container, children }: ContainerProviderProps) {
  const containerInstance = useMemo(() => container ?? createContainer(), [container]);

  return (
    <ContainerContext.Provider value={containerInstance}>
      {children}
    </ContainerContext.Provider>
  );
}

/**
 * Hook to access the container directly
 */
export function useContainer(): IContainer {
  const container = useContext(ContainerContext);
  if (!container) {
    throw new Error('useContainer must be used within a ContainerProvider');
  }
  return container;
}

/**
 * Hook to resolve a service from the container
 */
export function useService<T>(id: ServiceIdentifier<T>): T {
  const container = useContainer();
  return useMemo(() => container.resolve(id), [container, id]);
}

/**
 * Hook to optionally resolve a service (returns undefined if not found)
 */
export function useOptionalService<T>(id: ServiceIdentifier<T>): T | undefined {
  const container = useContainer();
  return useMemo(() => container.tryResolve(id), [container, id]);
}
