import type { ServiceScope } from '../container/types';

/**
 * Lifetime descriptor for a service
 */
export interface LifetimeDescriptor {
  /** The scope type */
  scope: ServiceScope;
  /** Human-readable description */
  description: string;
  /** Whether instances should be cached */
  cached: boolean;
  /** Whether the instance is shared across resolutions */
  shared: boolean;
}

/**
 * Lifetime definitions for each scope type
 */
export const Lifetimes: Record<ServiceScope, LifetimeDescriptor> = {
  singleton: {
    scope: 'singleton',
    description: 'Single instance shared across the entire application',
    cached: true,
    shared: true,
  },
  transient: {
    scope: 'transient',
    description: 'New instance created for each resolution',
    cached: false,
    shared: false,
  },
  scoped: {
    scope: 'scoped',
    description: 'Single instance within a scope, new instance per scope',
    cached: true,
    shared: true,
  },
};

/**
 * Get the lifetime descriptor for a scope
 */
export function getLifetime(scope: ServiceScope): LifetimeDescriptor {
  return Lifetimes[scope];
}

/**
 * Check if a scope produces cached instances
 */
export function isCached(scope: ServiceScope): boolean {
  return Lifetimes[scope].cached;
}

/**
 * Check if a scope produces shared instances
 */
export function isShared(scope: ServiceScope): boolean {
  return Lifetimes[scope].shared;
}

/**
 * Validate scope compatibility (e.g., singleton depending on scoped)
 */
export function validateScopeDependency(
  dependentScope: ServiceScope,
  dependencyScope: ServiceScope
): { valid: boolean; warning?: string } {
  // Singleton depending on scoped is problematic
  if (dependentScope === 'singleton' && dependencyScope === 'scoped') {
    return {
      valid: false,
      warning: 'Singleton service cannot depend on scoped service. The scoped instance would be captured and reused incorrectly.',
    };
  }

  // Singleton depending on transient is usually fine but worth noting
  if (dependentScope === 'singleton' && dependencyScope === 'transient') {
    return {
      valid: true,
      warning: 'Singleton service depends on transient service. The transient instance will be captured once.',
    };
  }

  return { valid: true };
}
