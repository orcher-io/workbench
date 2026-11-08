import type { IContainer } from '@orcher/workbench-di';
import type {
  PluginDefinition,
  PluginModule,
  PluginInstance,
  PluginState,
  PluginActivationContext,
  PluginStorage,
  PluginSubscriptions,
  Disposable,
  ActivationEvent,
} from '@orcher/workbench-plugin-api';
import { type EventBus, createEvent } from '../events';

/**
 * Plugin loader function type
 */
export type PluginLoader = () => Promise<PluginModule>;

interface RegisteredPlugin {
  definition: PluginDefinition;
  loader?: PluginLoader;
  module?: PluginModule;
  state: PluginState;
  error?: Error;
  subscriptions: Disposable[];
}

/**
 * Extension registry service - manages plugin lifecycle
 */
export class ExtensionRegistry {
  private plugins = new Map<string, RegisteredPlugin>();
  private activationListeners = new Map<string, Set<() => void>>();

  private readonly onDidActivatePlugin = createEvent<PluginInstance>();
  private readonly onDidDeactivatePlugin = createEvent<PluginDefinition>();

  /** Event fired when a plugin is activated */
  readonly onPluginActivated = this.onDidActivatePlugin.event;
  /** Event fired when a plugin is deactivated */
  readonly onPluginDeactivated = this.onDidDeactivatePlugin.event;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(
    private container: IContainer,
    _eventBus: EventBus,
  ) {}

  /**
   * Register a plugin definition (for eager plugins)
   */
  register(definition: PluginDefinition, module: PluginModule): void {
    if (this.plugins.has(definition.id)) {
      throw new Error(`Plugin already registered: ${definition.id}`);
    }

    this.plugins.set(definition.id, {
      definition,
      module,
      state: 'loaded',
      subscriptions: [],
    });

    // Set up activation event listeners (same as lazy plugins)
    this.setupActivationListeners(definition);
  }

  /**
   * Register a lazy-loaded plugin
   */
  registerLazy(definition: PluginDefinition, loader: PluginLoader): void {
    if (this.plugins.has(definition.id)) {
      throw new Error(`Plugin already registered: ${definition.id}`);
    }

    this.plugins.set(definition.id, {
      definition,
      loader,
      state: 'unloaded',
      subscriptions: [],
    });

    // Set up activation event listeners
    this.setupActivationListeners(definition);
  }

  /**
   * Get a plugin instance by ID
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    const registered = this.plugins.get(pluginId);
    if (!registered) return undefined;

    return this.createPluginInstance(registered);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values()).map((r) =>
      this.createPluginInstance(r),
    );
  }

  /**
   * Get all plugin definitions
   */
  getAllDefinitions(): PluginDefinition[] {
    return Array.from(this.plugins.values()).map((r) => r.definition);
  }

  /**
   * Activate a plugin by ID
   */
  async activatePlugin(pluginId: string): Promise<void> {
    const registered = this.plugins.get(pluginId);
    if (!registered) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (registered.state === 'active') {
      return; // Already active
    }

    if (registered.state === 'activating') {
      return; // Already activating
    }

    // Load if necessary
    if (registered.state === 'unloaded' && registered.loader) {
      registered.state = 'loading';
      try {
        registered.module = await registered.loader();
        registered.state = 'loaded';
      } catch (error) {
        registered.state = 'error';
        registered.error =
          error instanceof Error ? error : new Error(String(error));
        throw registered.error;
      }
    }

    // Activate dependencies first
    if (registered.definition.dependencies) {
      for (const dep of registered.definition.dependencies) {
        if (!dep.optional || this.plugins.has(dep.id)) {
          await this.activatePlugin(dep.id);
        }
      }
    }

    // Activate plugin
    registered.state = 'activating';
    try {
      if (registered.module?.activate) {
        const context = this.createActivationContext(registered);
        await registered.module.activate(context);
      }
      registered.state = 'active';
      this.onDidActivatePlugin.fire(this.createPluginInstance(registered));
    } catch (error) {
      registered.state = 'error';
      registered.error =
        error instanceof Error ? error : new Error(String(error));
      throw registered.error;
    }
  }

  /**
   * Deactivate a plugin by ID
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const registered = this.plugins.get(pluginId);
    if (!registered) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (registered.state !== 'active') {
      return; // Not active
    }

    registered.state = 'deactivating';
    try {
      // Call deactivate hook
      if (registered.module?.deactivate) {
        await registered.module.deactivate();
      }

      // Dispose all subscriptions
      for (const disposable of registered.subscriptions) {
        disposable.dispose();
      }
      registered.subscriptions = [];

      registered.state = 'loaded';
      this.onDidDeactivatePlugin.fire(registered.definition);
    } catch (error) {
      registered.state = 'error';
      registered.error =
        error instanceof Error ? error : new Error(String(error));
      throw registered.error;
    }
  }

  /**
   * Trigger activation for an event
   */
  triggerActivation(event: ActivationEvent): void {
    const listeners = this.activationListeners.get(event);
    if (listeners) {
      for (const activate of listeners) {
        activate();
      }
    }
  }

  /**
   * Dispose of the registry
   */
  dispose(): void {
    for (const registered of this.plugins.values()) {
      if (registered.state === 'active') {
        this.deactivatePlugin(registered.definition.id).catch(console.error);
      }
    }
    this.plugins.clear();
    this.activationListeners.clear();
  }

  private setupActivationListeners(definition: PluginDefinition): void {
    const events = definition.activationEvents ?? [];

    for (const event of events) {
      if (!this.activationListeners.has(event)) {
        this.activationListeners.set(event, new Set());
      }

      this.activationListeners.get(event)!.add(() => {
        this.activatePlugin(definition.id).catch(console.error);
      });
    }

    // Handle '*' (always active)
    if (events.includes('*')) {
      this.activatePlugin(definition.id).catch(console.error);
    }
  }

  private createPluginInstance(registered: RegisteredPlugin): PluginInstance {
    return {
      definition: registered.definition,
      state: registered.state,
      error: registered.error,
      activate: () => this.activatePlugin(registered.definition.id),
      deactivate: () => this.deactivatePlugin(registered.definition.id),
    };
  }

  private createActivationContext(
    registered: RegisteredPlugin,
  ): PluginActivationContext {
    const storage = this.createPluginStorage(registered.definition.id);
    const subscriptions: PluginSubscriptions = {
      push: (...disposables) => {
        registered.subscriptions.push(...disposables);
      },
    };

    return {
      definition: registered.definition,
      container: this.container.createScope(),
      storage,
      subscriptions,
    };
  }

  private createPluginStorage(pluginId: string): PluginStorage {
    const prefix = `plugin:${pluginId}:`;

    return {
      get<T>(key: string, defaultValue?: T): T | undefined {
        if (typeof localStorage === 'undefined') return defaultValue;
        const value = localStorage.getItem(prefix + key);
        if (value === null) return defaultValue;
        try {
          return JSON.parse(value) as T;
        } catch {
          return defaultValue;
        }
      },
      async set<T>(key: string, value: T): Promise<void> {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(prefix + key, JSON.stringify(value));
      },
      async remove(key: string): Promise<void> {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem(prefix + key);
      },
      async clear(): Promise<void> {
        if (typeof localStorage === 'undefined') return;
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      },
    };
  }
}
