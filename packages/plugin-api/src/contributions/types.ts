import type { ComponentType } from 'react';
import type {
  CommandContribution,
  EditorContribution,
  ViewContribution,
  MenuItemContribution,
  ConfigurationContribution,
  KeybindingContribution,
  TypeContribution,
  StatusBarContribution,
} from '../schema';

/**
 * Base contribution with source plugin info
 */
export interface ResolvedContribution {
  /** Source plugin ID */
  pluginId: string;
  /** Whether the contribution is active */
  active: boolean;
}

/**
 * Resolved command with handler
 */
export interface ResolvedCommand
  extends CommandContribution,
    ResolvedContribution {
  /** Command handler function */
  handler?: (...args: unknown[]) => unknown | Promise<unknown>;
}

/**
 * Resolved editor with component
 */
export interface ResolvedEditor
  extends EditorContribution,
    ResolvedContribution {
  /** Editor React component */
  component?: ComponentType<ResolvedEditorComponentProps>;
}

/**
 * Props passed to resolved editor components
 */
export interface ResolvedEditorComponentProps {
  /** URI of the resource being edited */
  uri: string;
  /** Resource type */
  resourceType?: string;
  /** Resource identifier */
  resourceId?: string;
  /** Editor-specific state */
  state?: Record<string, unknown>;
  /** Callback to update state */
  onStateChange?: (state: Record<string, unknown>) => void;
  /** Callback when content becomes dirty */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Resolved view with component
 */
export interface ResolvedView extends ViewContribution, ResolvedContribution {
  /** View React component */
  component?: ComponentType<ViewComponentProps>;
  /** Container this view belongs to */
  containerId: string;
}

/**
 * Props passed to view components
 */
export interface ViewComponentProps {
  /** Whether the view is currently visible */
  visible: boolean;
  /** View-specific state */
  state?: Record<string, unknown>;
  /** Callback to update state */
  onStateChange?: (state: Record<string, unknown>) => void;
}

/**
 * Resolved menu item with all info needed for rendering
 */
export interface ResolvedMenuItem
  extends MenuItemContribution,
    ResolvedContribution {
  /** Resolved command (if command is specified) */
  resolvedCommand?: ResolvedCommand;
  /** Menu location ID */
  menuId: string;
  /** Computed visibility based on when clause */
  visible: boolean;
  /** Computed enabled state */
  enabled: boolean;
}

/**
 * Resolved keybinding
 */
export interface ResolvedKeybinding
  extends KeybindingContribution,
    ResolvedContribution {
  /** Resolved command */
  resolvedCommand?: ResolvedCommand;
  /** Normalized key sequence */
  normalizedKey: string;
}

/**
 * Resolved configuration with current values
 */
export interface ResolvedConfiguration
  extends ConfigurationContribution,
    ResolvedContribution {
  /** Current values for each property */
  values: Record<string, unknown>;
}

/**
 * Resolved type with provider
 */
export interface ResolvedType extends TypeContribution, ResolvedContribution {
  /** Type provider for data operations */
  provider?: TypeProvider;
}

/**
 * Type provider interface for data operations
 */
export interface TypeProvider<T = unknown> {
  /** Query items of this type */
  query?(filter?: Record<string, unknown>): Promise<T[]>;
  /** Get a single item by ID */
  get?(id: string): Promise<T | null>;
  /** Save an item */
  save?(item: T): Promise<T>;
  /** Delete an item */
  delete?(id: string): Promise<boolean>;
  /** Subscribe to changes */
  subscribe?(callback: (items: T[]) => void): () => void;
}

/**
 * Resolved status bar item
 */
export interface ResolvedStatusBarItem
  extends StatusBarContribution,
    ResolvedContribution {
  /** Resolved command (if command is specified) */
  resolvedCommand?: ResolvedCommand;
  /** Dynamic text content */
  dynamicText?: () => string;
  /** Dynamic tooltip */
  dynamicTooltip?: () => string;
  /** Current visibility */
  visible: boolean;
}
