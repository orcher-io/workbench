import type { ServiceIdentifier } from '../container/types';
import { addInjectionMetadata } from './metadata';

/**
 * Marks a constructor parameter or property for injection
 *
 * @example
 * ```typescript
 * @injectable()
 * class MyService {
 *   constructor(
 *     @inject('logger') private logger: Logger,
 *     @inject(ConfigService) private config: ConfigService
 *   ) {}
 * }
 *
 * // Property injection
 * @injectable()
 * class AnotherService {
 *   @inject('logger')
 *   private logger!: Logger;
 * }
 * ```
 */
export function inject(id: ServiceIdentifier) {
  return function (
    target: object,
    propertyKeyOrContext: string | symbol | ClassFieldDecoratorContext | undefined,
    parameterIndex?: number
  ): void {
    // Handle different decorator positions
    if (typeof parameterIndex === 'number') {
      // Constructor parameter injection
      addInjectionMetadata(target, {
        id,
        parameterIndex,
        optional: false,
      });
    } else if (propertyKeyOrContext !== undefined) {
      // Property injection (legacy decorator or stage 3)
      const propertyKey = typeof propertyKeyOrContext === 'object'
        ? (propertyKeyOrContext as ClassFieldDecoratorContext).name
        : propertyKeyOrContext;

      addInjectionMetadata(target.constructor, {
        id,
        propertyKey: propertyKey as string | symbol,
        optional: false,
      });
    }
  };
}

/**
 * Marks a dependency as optional - will be undefined if not registered
 *
 * @example
 * ```typescript
 * @injectable()
 * class MyService {
 *   constructor(
 *     @inject('logger') @optional() private logger?: Logger
 *   ) {}
 * }
 * ```
 */
export function optional() {
  return function (
    target: object,
    propertyKeyOrContext: string | symbol | ClassFieldDecoratorContext | undefined,
    parameterIndex?: number
  ): void {
    if (typeof parameterIndex === 'number') {
      // Find existing injection metadata and mark as optional
      addInjectionMetadata(target, {
        id: Symbol('optional-placeholder'),
        parameterIndex,
        optional: true,
      });
    } else if (propertyKeyOrContext !== undefined) {
      const propertyKey = typeof propertyKeyOrContext === 'object'
        ? (propertyKeyOrContext as ClassFieldDecoratorContext).name
        : propertyKeyOrContext;

      addInjectionMetadata(target.constructor, {
        id: Symbol('optional-placeholder'),
        propertyKey: propertyKey as string | symbol,
        optional: true,
      });
    }
  };
}

/**
 * Inject multiple services as an array
 *
 * @example
 * ```typescript
 * @injectable()
 * class PluginManager {
 *   constructor(
 *     @injectAll('plugin') private plugins: Plugin[]
 *   ) {}
 * }
 * ```
 */
export function injectAll(id: ServiceIdentifier) {
  return function (
    target: object,
    _propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ): void {
    if (typeof parameterIndex === 'number') {
      addInjectionMetadata(target, {
        id,
        parameterIndex,
        optional: false,
      });
    }
  };
}
