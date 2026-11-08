// Scope manager
export { ScopeManager, defaultScopeManager } from './scope-manager';
export type { ScopeContext } from './scope-manager';

// Lifetime utilities
export {
  Lifetimes,
  getLifetime,
  isCached,
  isShared,
  validateScopeDependency,
} from './lifetime';
export type { LifetimeDescriptor } from './lifetime';
