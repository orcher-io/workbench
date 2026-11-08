import type { ComponentType } from 'react';
import type { IContainer } from '@orcher/workbench-di';

/**
 * Disposable interface for cleanup
 */
export interface Disposable {
  dispose(): void;
}

/**
 * Event emitter interface
 */
export interface Event<T> {
  (listener: (e: T) => void): Disposable;
}

/**
 * Base extension point interface
 */
export interface ExtensionPoint<TContribution, TProvider = unknown> {
  /** Unique identifier */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;

  /** Register a contribution from manifest */
  registerContribution(contribution: TContribution, pluginId: string): void;
  /** Register a runtime provider */
  registerProvider(id: string, provider: TProvider, pluginId: string): void;
  /** Get all contributions */
  getContributions(): Array<TContribution & { pluginId: string }>;
  /** Get provider by ID */
  getProvider(id: string): TProvider | undefined;
}

// ============ COMMAND EXTENSION POINT ============

export interface CommandContext {
  /** Plugin that invoked the command */
  readonly caller?: string;
  /** Active editor instance */
  readonly activeEditor?: EditorInstance;
  /** Current selection */
  readonly selection?: unknown;
  /** Container for service access */
  readonly container: IContainer;
}

export type CommandHandler<T = unknown> = (
  context: CommandContext,
  ...args: unknown[]
) => T | Promise<T>;

export interface ICommandExtensionPoint {
  /** Execute a command by ID */
  executeCommand<T = unknown>(
    commandId: string,
    ...args: unknown[]
  ): Promise<T>;
  /** Check if command exists */
  hasCommand(commandId: string): boolean;
  /** Register a command handler */
  registerHandler(
    commandId: string,
    handler: CommandHandler,
    pluginId: string,
  ): Disposable;
}

// ============ EDITOR EXTENSION POINT ============

export interface EditorContext {
  /** Resource URI */
  uri: string;
  /** Resource type */
  type?: string;
  /** Resource ID */
  resourceId?: string;
  /** Additional data */
  data?: Record<string, unknown>;
}

export interface EditorInstance {
  /** Unique instance ID */
  readonly id: string;
  /** Editor contribution */
  readonly editor: { id: string; name: string };
  /** Resource being edited */
  readonly uri: string;
  /** Focus the editor */
  focus(): void;
  /** Dispose the editor */
  dispose(): void;
  /** State changed event */
  onDidChangeState?: Event<void>;
  /** Dirty state changed event */
  onDidChangeDirty?: Event<boolean>;
}

export interface EditorProvider {
  /** React component for the editor */
  component: ComponentType<EditorComponentProps>;
  /** Serialize editor state */
  serialize?(instance: EditorInstance): SerializedEditorState;
  /** Deserialize editor state */
  deserialize?(state: SerializedEditorState): EditorContext;
}

export interface EditorComponentProps {
  /** Editor context */
  context: EditorContext;
  /** Callback when editor is ready */
  onReady?: (instance: EditorInstance) => void;
}

export interface SerializedEditorState {
  /** Editor type for deserialization */
  editorType: string;
  /** Version for migration */
  version: number;
  /** Editor-specific data */
  data: Record<string, unknown>;
}

export interface IEditorExtensionPoint {
  /** Find best editor for a resource */
  findEditor(
    uri: string,
    type?: string,
  ): { id: string; name: string } | undefined;
  /** Get editor provider */
  getEditorProvider(editorId: string): EditorProvider | undefined;
  /** Register an editor provider */
  registerProvider(
    editorId: string,
    provider: EditorProvider,
    pluginId: string,
  ): Disposable;
}

// ============ VIEW EXTENSION POINT ============

export interface ViewProvider {
  /** React component for the view */
  component: ComponentType<ViewComponentProps>;
  /** Called when view becomes visible */
  onDidShow?(): void;
  /** Called when view is hidden */
  onDidHide?(): void;
}

export interface ViewComponentProps {
  /** View ID */
  viewId: string;
}

export interface IViewExtensionPoint {
  /** Get views for a container */
  getViewsForContainer(
    containerId: string,
  ): Array<{ id: string; name: string; icon?: string }>;
  /** Get view provider */
  getViewProvider(viewId: string): ViewProvider | undefined;
  /** Register a view provider */
  registerProvider(
    viewId: string,
    provider: ViewProvider,
    pluginId: string,
  ): Disposable;
}

// ============ MENU EXTENSION POINT ============

export interface MenuContext {
  /** Current selection */
  selection?: unknown;
  /** Active editor */
  activeEditor?: EditorInstance;
  /** Additional context data */
  data?: Record<string, unknown>;
}

export interface ResolvedMenuItem {
  /** Item ID */
  id: string;
  /** Display label */
  label: string;
  /** Icon identifier */
  icon?: string;
  /** Whether item is enabled */
  enabled: boolean;
  /** Whether item is visible */
  visible: boolean;
  /** Whether item is checked */
  checked?: boolean;
  /** Submenu items */
  submenu?: ResolvedMenuItem[];
  /** Execute action */
  execute?: () => void | Promise<void>;
}

export interface IMenuExtensionPoint {
  /** Get menu items for a location */
  getMenuItems(
    menuId: string,
    context: MenuContext,
  ): Promise<ResolvedMenuItem[]>;
}

// ============ CONFIGURATION EXTENSION POINT ============

export type ConfigurationScope = 'application' | 'window' | 'resource';

export interface IConfigurationExtensionPoint {
  /** Get configuration value */
  get<T>(key: string, defaultValue?: T): T;
  /** Set configuration value */
  set(key: string, value: unknown, scope?: ConfigurationScope): Promise<void>;
  /** Listen for configuration changes */
  onDidChange(key: string, listener: (value: unknown) => void): Disposable;
}

// ============ TYPE EXTENSION POINT ============

export interface TypeProvider<T = unknown> {
  /** Query items of this type */
  query(filter?: Record<string, unknown>): Promise<T[]>;
  /** Get single item by ID */
  get(id: string): Promise<T | undefined>;
  /** Save an item */
  save(item: T): Promise<T>;
  /** Delete an item */
  delete(id: string): Promise<void>;
}

export interface ITypeExtensionPoint {
  /** Get all registered types */
  getTypes(): Array<{ id: string; name: string; icon?: string }>;
  /** Get type provider */
  getTypeProvider<T>(typeId: string): TypeProvider<T> | undefined;
  /** Register a type provider */
  registerProvider<T>(
    typeId: string,
    provider: TypeProvider<T>,
    pluginId: string,
  ): Disposable;
}
