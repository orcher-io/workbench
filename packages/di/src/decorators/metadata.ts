import type { ServiceIdentifier, ServiceScope } from '../container/types';

/**
 * Metadata keys for storing decorator information
 */
export const METADATA_KEYS = {
  INJECTABLE: Symbol('di:injectable'),
  INJECT: Symbol('di:inject'),
  OPTIONAL: Symbol('di:optional'),
  SCOPE: Symbol('di:scope'),
  DEPENDENCIES: Symbol('di:dependencies'),
} as const;

/**
 * Injectable metadata stored on a class
 */
export interface InjectableMetadata {
  /** Service identifier (defaults to the class itself) */
  id?: ServiceIdentifier;
  /** Lifecycle scope */
  scope: ServiceScope;
}

/**
 * Injection metadata for a parameter or property
 */
export interface InjectionMetadata {
  /** Service identifier to inject */
  id: ServiceIdentifier;
  /** Parameter index (for constructor injection) */
  parameterIndex?: number;
  /** Property key (for property injection) */
  propertyKey?: string | symbol;
  /** Whether the injection is optional */
  optional: boolean;
}

/**
 * Global metadata storage using WeakMap for garbage collection
 */
const injectableMetadata = new WeakMap<object, InjectableMetadata>();
const injectionMetadata = new WeakMap<object, InjectionMetadata[]>();

/**
 * Get injectable metadata for a class
 */
export function getInjectableMetadata(target: object): InjectableMetadata | undefined {
  return injectableMetadata.get(target);
}

/**
 * Set injectable metadata for a class
 */
export function setInjectableMetadata(target: object, metadata: InjectableMetadata): void {
  injectableMetadata.set(target, metadata);
}

/**
 * Get all injection metadata for a class
 */
export function getInjectionMetadata(target: object): InjectionMetadata[] {
  return injectionMetadata.get(target) ?? [];
}

/**
 * Add injection metadata to a class
 */
export function addInjectionMetadata(target: object, metadata: InjectionMetadata): void {
  const existing = injectionMetadata.get(target) ?? [];
  existing.push(metadata);
  injectionMetadata.set(target, existing);
}

/**
 * Check if a class is marked as injectable
 */
export function isInjectable(target: object): boolean {
  return injectableMetadata.has(target);
}
