import type { ServiceIdentifier, ServiceScope } from '../container/types';
import { setInjectableMetadata } from './metadata';

/**
 * Options for the @injectable decorator
 */
export interface InjectableOptions {
  /** Custom service identifier (defaults to the class itself) */
  id?: ServiceIdentifier;
  /** Lifecycle scope (defaults to 'singleton') */
  scope?: ServiceScope;
}

/**
 * Marks a class as injectable and optionally configures its registration
 *
 * @example
 * ```typescript
 * @injectable()
 * class MyService {
 *   constructor(private logger: Logger) {}
 * }
 *
 * @injectable({ scope: 'transient' })
 * class RequestHandler {
 *   // New instance created each time
 * }
 *
 * @injectable({ id: 'custom-token', scope: 'scoped' })
 * class ScopedService {
 *   // Scoped to container scope
 * }
 * ```
 */
export function injectable(options: InjectableOptions = {}) {
  return function <T extends new (...args: any[]) => any>(target: T): T {
    setInjectableMetadata(target, {
      id: options.id,
      scope: options.scope ?? 'singleton',
    });
    return target;
  };
}

/**
 * Shorthand for @injectable({ scope: 'singleton' })
 */
export function singleton(id?: ServiceIdentifier) {
  return injectable({ id, scope: 'singleton' });
}

/**
 * Shorthand for @injectable({ scope: 'transient' })
 */
export function transient(id?: ServiceIdentifier) {
  return injectable({ id, scope: 'transient' });
}

/**
 * Shorthand for @injectable({ scope: 'scoped' })
 */
export function scoped(id?: ServiceIdentifier) {
  return injectable({ id, scope: 'scoped' });
}
