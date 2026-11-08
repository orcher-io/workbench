import type {
  TypeContribution,
  TypeProvider,
  ITypeExtensionPoint,
  Disposable,
} from '@orcher/workbench-plugin-api';
import { createEvent } from '../events';

interface RegisteredType<T = unknown> {
  contribution: TypeContribution;
  provider?: TypeProvider<T>;
  pluginId: string;
}

/**
 * Type service - manages data type registration and providers
 */
export class TypeService implements ITypeExtensionPoint {
  private types = new Map<string, RegisteredType>();

  private readonly onDidRegisterType = createEvent<TypeContribution>();
  readonly onTypeRegistered = this.onDidRegisterType.event;

  /**
   * Register a type contribution from manifest
   */
  registerContribution(contribution: TypeContribution, pluginId: string): void {
    if (this.types.has(contribution.id)) {
      console.warn(`Type already registered: ${contribution.id}`);
      return;
    }

    this.types.set(contribution.id, {
      contribution,
      pluginId,
    });

    this.onDidRegisterType.fire(contribution);
  }

  /**
   * Register a type provider
   */
  registerProvider<T>(
    typeId: string,
    provider: TypeProvider<T>,
    pluginId: string
  ): Disposable {
    let type = this.types.get(typeId);

    if (!type) {
      // Create implicit registration
      type = {
        contribution: { id: typeId, name: typeId },
        pluginId,
      };
      this.types.set(typeId, type);
    }

    type.provider = provider as TypeProvider<unknown>;

    return {
      dispose: () => {
        const t = this.types.get(typeId);
        if (t) {
          t.provider = undefined;
        }
      },
    };
  }

  /**
   * Get all registered types
   */
  getTypes(): Array<{ id: string; name: string; icon?: string }> {
    return Array.from(this.types.values()).map((t) => ({
      id: t.contribution.id,
      name: t.contribution.name,
      icon: t.contribution.icon,
    }));
  }

  /**
   * Get a type contribution by ID
   */
  getType(typeId: string): TypeContribution | undefined {
    return this.types.get(typeId)?.contribution;
  }

  /**
   * Get a type provider
   */
  getTypeProvider<T>(typeId: string): TypeProvider<T> | undefined {
    return this.types.get(typeId)?.provider as TypeProvider<T> | undefined;
  }

  /**
   * Query items of a type
   */
  async query<T>(typeId: string, filter?: Record<string, unknown>): Promise<T[]> {
    const provider = this.getTypeProvider<T>(typeId);
    if (!provider) {
      throw new Error(`No provider registered for type: ${typeId}`);
    }
    return provider.query(filter);
  }

  /**
   * Get a single item by ID
   */
  async get<T>(typeId: string, id: string): Promise<T | undefined> {
    const provider = this.getTypeProvider<T>(typeId);
    if (!provider) {
      throw new Error(`No provider registered for type: ${typeId}`);
    }
    return provider.get(id);
  }

  /**
   * Save an item
   */
  async save<T>(typeId: string, item: T): Promise<T> {
    const provider = this.getTypeProvider<T>(typeId);
    if (!provider) {
      throw new Error(`No provider registered for type: ${typeId}`);
    }
    return provider.save(item);
  }

  /**
   * Delete an item
   */
  async delete(typeId: string, id: string): Promise<void> {
    const provider = this.getTypeProvider(typeId);
    if (!provider) {
      throw new Error(`No provider registered for type: ${typeId}`);
    }
    return provider.delete(id);
  }
}
