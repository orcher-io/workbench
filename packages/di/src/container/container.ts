import {
  type IContainer,
  type ServiceIdentifier,
  type ServiceRegistration,
  type Factory,
  type Constructor,
  isDisposable,
} from './types';

/**
 * Lightweight dependency injection container
 */
export class Container implements IContainer {
  private registrations = new Map<ServiceIdentifier, ServiceRegistration>();
  private singletons = new Map<ServiceIdentifier, unknown>();
  private scopedInstances = new Map<ServiceIdentifier, unknown>();
  private resolving = new Set<ServiceIdentifier>();
  private parent: Container | null = null;

  constructor(parent?: Container) {
    this.parent = parent ?? null;
  }

  register<T>(registration: ServiceRegistration<T>): void {
    this.registrations.set(registration.id, registration);
  }

  registerSingleton<T>(id: ServiceIdentifier<T>, factory: Factory<T>): void {
    this.register({ id, factory, scope: 'singleton' });
  }

  registerTransient<T>(id: ServiceIdentifier<T>, factory: Factory<T>): void {
    this.register({ id, factory, scope: 'transient' });
  }

  registerClass<T>(constructor: Constructor<T>): void {
    this.registerSingleton(constructor, () => new constructor());
  }

  registerValue<T>(id: ServiceIdentifier<T>, value: T): void {
    this.registerSingleton(id, () => value);
    // Immediately cache the value
    this.singletons.set(id, value);
  }

  /**
   * Register a value on the root container, making it available to all scopes
   */
  registerSharedValue<T>(id: ServiceIdentifier<T>, value: T): void {
    const root = this.getRoot();
    root.registerSingleton(id, () => value);
    root.singletons.set(id, value);
  }

  /**
   * Get the root container
   */
  private getRoot(): Container {
    let current: Container = this;
    while (current.parent) {
      current = current.parent;
    }
    return current;
  }

  resolve<T>(id: ServiceIdentifier<T>): T {
    const result = this.tryResolve<T>(id);
    if (result === undefined) {
      const idName = typeof id === 'function' ? id.name : String(id);
      throw new Error(`Service not found: ${idName}`);
    }
    return result;
  }

  tryResolve<T>(id: ServiceIdentifier<T>): T | undefined {
    // Check for circular dependency
    if (this.resolving.has(id)) {
      const idName = typeof id === 'function' ? id.name : String(id);
      throw new Error(`Circular dependency detected: ${idName}`);
    }

    // Check singleton cache first
    if (this.singletons.has(id)) {
      return this.singletons.get(id) as T;
    }

    // Check scoped cache
    if (this.scopedInstances.has(id)) {
      return this.scopedInstances.get(id) as T;
    }

    // Get registration (check parent if not found locally)
    let registration = this.registrations.get(id);
    if (!registration && this.parent) {
      return this.parent.tryResolve(id);
    }

    if (!registration) {
      return undefined;
    }

    // Mark as resolving to detect circular dependencies
    this.resolving.add(id);

    try {
      const instance = registration.factory(this) as T;

      // Cache based on scope
      switch (registration.scope) {
        case 'singleton':
          // Singletons go to root container
          if (this.parent) {
            this.parent.singletons.set(id, instance);
          } else {
            this.singletons.set(id, instance);
          }
          break;
        case 'scoped':
          this.scopedInstances.set(id, instance);
          break;
        // transient: no caching
      }

      return instance;
    } finally {
      this.resolving.delete(id);
    }
  }

  has(id: ServiceIdentifier): boolean {
    return this.registrations.has(id) || (this.parent?.has(id) ?? false);
  }

  createScope(): IContainer {
    return new Container(this);
  }

  dispose(): void {
    // Dispose singletons
    for (const instance of this.singletons.values()) {
      if (isDisposable(instance)) {
        instance.dispose();
      }
    }
    this.singletons.clear();

    // Dispose scoped instances
    for (const instance of this.scopedInstances.values()) {
      if (isDisposable(instance)) {
        instance.dispose();
      }
    }
    this.scopedInstances.clear();

    this.registrations.clear();
  }
}

/**
 * Create a new container instance
 */
export function createContainer(): IContainer {
  return new Container();
}
