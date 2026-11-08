import type { IContainer } from '@orcher/workbench-di';
import type { PluginDefinition } from '../schema';

/**
 * Plugin lifecycle state
 */
export type PluginState =
  | 'unloaded'
  | 'loading'
  | 'loaded'
  | 'activating'
  | 'active'
  | 'deactivating'
  | 'error';

/**
 * Plugin activation context provided to plugins during activation
 */
export interface PluginActivationContext {
  /** The plugin's definition */
  readonly definition: PluginDefinition;
  /** DI container scoped to this plugin */
  readonly container: IContainer;
  /** Storage for plugin-specific state */
  readonly storage: PluginStorage;
  /** Register disposables for cleanup */
  readonly subscriptions: PluginSubscriptions;
}

/**
 * Plugin storage interface for persisting plugin state
 */
export interface PluginStorage {
  /** Get a value from storage */
  get<T>(key: string, defaultValue?: T): T | undefined;
  /** Set a value in storage */
  set<T>(key: string, value: T): Promise<void>;
  /** Remove a value from storage */
  remove(key: string): Promise<void>;
  /** Clear all plugin storage */
  clear(): Promise<void>;
}

/**
 * Subscription manager for plugin cleanup
 */
export interface PluginSubscriptions {
  /** Add a disposable to be cleaned up when plugin deactivates */
  push(...disposables: { dispose(): void }[]): void;
}

/**
 * Plugin module interface - what a plugin exports
 */
export interface PluginModule {
  /** Called when plugin is activated */
  activate?(context: PluginActivationContext): void | Promise<void>;
  /** Called when plugin is deactivated */
  deactivate?(): void | Promise<void>;
}

/**
 * Plugin instance representing a loaded plugin
 */
export interface PluginInstance {
  /** Plugin definition */
  readonly definition: PluginDefinition;
  /** Current state */
  readonly state: PluginState;
  /** Error if in error state */
  readonly error?: Error;
  /** Activate the plugin */
  activate(): Promise<void>;
  /** Deactivate the plugin */
  deactivate(): Promise<void>;
}
