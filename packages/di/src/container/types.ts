/**
 * Service identifier - can be a string token or a class constructor
 */
export type ServiceIdentifier<T = unknown> = string | symbol | Constructor<T>;

/**
 * Constructor type for class-based services
 */
export type Constructor<T = unknown> = new (...args: any[]) => T;

/**
 * Factory function for creating service instances
 */
export type Factory<T> = (container: IContainer) => T;

/**
 * Service scope determines lifecycle of instances
 */
export type ServiceScope = 'singleton' | 'transient' | 'scoped';

/**
 * Service registration options
 */
export interface ServiceRegistration<T = unknown> {
  /** The service identifier */
  id: ServiceIdentifier<T>;
  /** Factory function to create instances */
  factory: Factory<T>;
  /** Lifecycle scope */
  scope: ServiceScope;
  /** Optional dependencies that must be resolved first */
  dependencies?: ServiceIdentifier[];
}

/**
 * Container interface for dependency injection
 */
export interface IContainer {
  /**
   * Register a service with the container
   */
  register<T>(registration: ServiceRegistration<T>): void;

  /**
   * Register a singleton service
   */
  registerSingleton<T>(id: ServiceIdentifier<T>, factory: Factory<T>): void;

  /**
   * Register a transient service (new instance each time)
   */
  registerTransient<T>(id: ServiceIdentifier<T>, factory: Factory<T>): void;

  /**
   * Register a class as a singleton
   */
  registerClass<T>(constructor: Constructor<T>): void;

  /**
   * Register a constant value
   */
  registerValue<T>(id: ServiceIdentifier<T>, value: T): void;

  /**
   * Register a value on the root container, making it available to all scopes
   */
  registerSharedValue<T>(id: ServiceIdentifier<T>, value: T): void;

  /**
   * Resolve a service by its identifier
   */
  resolve<T>(id: ServiceIdentifier<T>): T;

  /**
   * Try to resolve a service, returns undefined if not found
   */
  tryResolve<T>(id: ServiceIdentifier<T>): T | undefined;

  /**
   * Check if a service is registered
   */
  has(id: ServiceIdentifier): boolean;

  /**
   * Create a child container with scoped services
   */
  createScope(): IContainer;

  /**
   * Dispose of the container and all singleton instances
   */
  dispose(): void;
}

/**
 * Disposable interface for cleanup
 */
export interface Disposable {
  dispose(): void;
}

/**
 * Check if an object is disposable
 */
export function isDisposable(obj: unknown): obj is Disposable {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'dispose' in obj &&
    typeof (obj as Disposable).dispose === 'function'
  );
}
