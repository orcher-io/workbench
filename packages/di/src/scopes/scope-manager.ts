import type { ServiceIdentifier } from '../container/types';

/**
 * Scope context for managing scoped instances
 */
export interface ScopeContext {
  /** Unique identifier for this scope */
  id: string;
  /** Parent scope context (if nested) */
  parent?: ScopeContext;
  /** Instances created within this scope */
  instances: Map<ServiceIdentifier, unknown>;
  /** Whether this scope has been disposed */
  disposed: boolean;
}

/**
 * Manages service scopes and their lifecycle
 */
export class ScopeManager {
  private scopes = new Map<string, ScopeContext>();
  private currentScope: ScopeContext | null = null;
  private scopeCounter = 0;

  /**
   * Create a new scope context
   */
  createScope(parentId?: string): ScopeContext {
    const id = `scope-${++this.scopeCounter}`;
    const parent = parentId
      ? this.scopes.get(parentId)
      : (this.currentScope ?? undefined);

    const scope: ScopeContext = {
      id,
      parent,
      instances: new Map(),
      disposed: false,
    };

    this.scopes.set(id, scope);
    return scope;
  }

  /**
   * Enter a scope context (makes it the current scope)
   */
  enterScope(scopeId: string): void {
    const scope = this.scopes.get(scopeId);
    if (!scope) {
      throw new Error(`Scope not found: ${scopeId}`);
    }
    if (scope.disposed) {
      throw new Error(`Cannot enter disposed scope: ${scopeId}`);
    }
    this.currentScope = scope;
  }

  /**
   * Exit the current scope (returns to parent scope)
   */
  exitScope(): void {
    if (this.currentScope) {
      this.currentScope = this.currentScope.parent ?? null;
    }
  }

  /**
   * Get the current active scope
   */
  getCurrentScope(): ScopeContext | null {
    return this.currentScope;
  }

  /**
   * Get a scope by ID
   */
  getScope(scopeId: string): ScopeContext | undefined {
    return this.scopes.get(scopeId);
  }

  /**
   * Get or create an instance within a scope
   */
  getOrCreateInstance<T>(
    scope: ScopeContext,
    id: ServiceIdentifier<T>,
    factory: () => T,
  ): T {
    if (scope.disposed) {
      throw new Error(`Cannot get instance from disposed scope: ${scope.id}`);
    }

    // Check current scope
    if (scope.instances.has(id)) {
      return scope.instances.get(id) as T;
    }

    // Check parent scopes (scoped instances are inherited)
    let parentScope = scope.parent;
    while (parentScope) {
      if (parentScope.instances.has(id)) {
        return parentScope.instances.get(id) as T;
      }
      parentScope = parentScope.parent;
    }

    // Create new instance in current scope
    const instance = factory();
    scope.instances.set(id, instance);
    return instance;
  }

  /**
   * Dispose a scope and all its instances
   */
  disposeScope(scopeId: string): void {
    const scope = this.scopes.get(scopeId);
    if (!scope) return;

    // Dispose all instances in this scope
    for (const instance of scope.instances.values()) {
      if (instance && typeof instance === 'object' && 'dispose' in instance) {
        (instance as { dispose: () => void }).dispose();
      }
    }

    scope.instances.clear();
    scope.disposed = true;

    // If this is the current scope, exit it
    if (this.currentScope === scope) {
      this.exitScope();
    }

    this.scopes.delete(scopeId);
  }

  /**
   * Dispose all scopes
   */
  disposeAll(): void {
    for (const scopeId of this.scopes.keys()) {
      this.disposeScope(scopeId);
    }
    this.currentScope = null;
  }

  /**
   * Run a function within a scope context
   */
  runInScope<T>(scopeId: string, fn: () => T): T {
    const previousScope = this.currentScope;
    this.enterScope(scopeId);
    try {
      return fn();
    } finally {
      this.currentScope = previousScope;
    }
  }

  /**
   * Create a scope, run a function, then dispose the scope
   */
  async withScope<T>(fn: (scope: ScopeContext) => T | Promise<T>): Promise<T> {
    const scope = this.createScope();
    this.enterScope(scope.id);
    try {
      return await fn(scope);
    } finally {
      this.exitScope();
      this.disposeScope(scope.id);
    }
  }
}

/**
 * Default scope manager instance
 */
export const defaultScopeManager = new ScopeManager();
