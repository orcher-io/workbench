/**
 * Plugin definition - defines plugin identity, activation, and contributions
 */
export interface PluginDefinition {
  // ============ IDENTITY ============
  /** Unique plugin identifier (npm package naming convention) */
  id: string;
  /** Semantic version */
  version: string;
  /** Human-readable name */
  name: string;
  /** Plugin description */
  description?: string;
  /** Plugin icon (path or URL) */
  icon?: string;
  /** Publisher information */
  publisher?: {
    name: string;
    email?: string;
    url?: string;
  };
  /** Tags for categorization */
  tags?: string[];
  /** License */
  license?: string;

  // ============ ACTIVATION ============
  /** Whether plugin is enabled by default */
  enabled?: boolean;
  /** Activation events for lazy loading */
  activationEvents?: ActivationEvent[];
  /** Dependencies on other plugins */
  dependencies?: PluginDependency[];
  /** Workbench version range this plugin is compatible with */
  engines?: {
    workbench: string;
  };

  // ============ CONTRIBUTIONS ============
  /** Plugin contributions to the workbench */
  contributes?: PluginContributions;

  // ============ SSR ============
  /** Entry points for different contexts */
  main?: {
    browser?: string;
    server?: string;
  };
  /** Server-side capabilities */
  serverCapabilities?: ('prefetch' | 'render')[];
}

/**
 * Activation events that trigger plugin loading
 */
export type ActivationEvent =
  | '*' // Always active
  | `onCommand:${string}` // When command invoked
  | `onView:${string}` // When view opened
  | `onEditor:${string}` // When editor opened
  | `onLanguage:${string}` // When file of language opened
  | `onUri:${string}` // When URI scheme used
  | 'onStartup' // On workbench startup
  | `onConfiguration:${string}` // When config accessed
  | `workspaceContains:${string}`; // When workspace has file

/**
 * Plugin dependency declaration
 */
export interface PluginDependency {
  id: string;
  version: string;
  optional?: boolean;
}

/**
 * All contributions a plugin can make
 */
export interface PluginContributions {
  /** Command contributions */
  commands?: CommandContribution[];
  /** Menu contributions by location */
  menus?: Record<string, MenuItemContribution[]>;
  /** Editor contributions */
  editors?: EditorContribution[];
  /** View contributions by container */
  views?: Record<string, ViewContribution[]>;
  /** View container contributions */
  viewContainers?: {
    activityBar?: ViewContainerContribution[];
    panel?: ViewContainerContribution[];
  };
  /** Configuration schema contributions */
  configuration?: ConfigurationContribution[];
  /** Keybinding contributions */
  keybindings?: KeybindingContribution[];
  /** Type/data model contributions */
  types?: TypeContribution[];
  /** Status bar contributions */
  statusBar?: StatusBarContribution[];
}

// ============ CONTRIBUTION TYPES ============

export interface CommandContribution {
  /** Command identifier */
  id: string;
  /** Display title */
  title: string;
  /** Category for grouping */
  category?: string;
  /** Icon identifier */
  icon?: string;
  /** When expression for enablement */
  enablement?: string;
}

export interface MenuItemContribution {
  /** Command to execute */
  command?: string;
  /** Submenu identifier */
  submenu?: string;
  /** When expression for visibility */
  when?: string;
  /** Group for ordering */
  group?: string;
  /** Order within group */
  order?: number;
  /** Icon identifier */
  icon?: string;
  /** Override title */
  title?: string;
}

export interface EditorContribution {
  /** Editor identifier */
  id: string;
  /** Display name */
  name: string;
  /** Icon identifier */
  icon?: string;
  /** File selector */
  selector?: {
    filenamePattern?: string;
    mimeType?: string;
    scheme?: string;
  };
  /** Priority when multiple editors match */
  priority?: 'default' | 'option' | 'builtin';
}

export interface ViewContribution {
  /** View identifier */
  id: string;
  /** Display name */
  name: string;
  /** Icon identifier */
  icon?: string;
  /** When expression for visibility */
  when?: string;
  /** Contextual title */
  contextualTitle?: string;
}

export interface ViewContainerContribution {
  /** Container identifier */
  id: string;
  /** Display title */
  title: string;
  /** Icon (required for activity bar) */
  icon: string;
  /** Order in the bar */
  order?: number;
}

export interface ConfigurationContribution {
  /** Configuration section identifier */
  id: string;
  /** Display title */
  title: string;
  /** Configuration properties */
  properties: Record<string, ConfigurationProperty>;
}

export interface ConfigurationProperty {
  /** Property type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Default value */
  default?: unknown;
  /** Description */
  description?: string;
  /** Enum values for string type */
  enum?: unknown[];
  /** Descriptions for enum values */
  enumDescriptions?: string[];
  /** Configuration scope */
  scope?: 'application' | 'window' | 'resource';
}

export interface KeybindingContribution {
  /** Command to execute */
  command: string;
  /** Key combination (Windows/Linux) */
  key: string;
  /** Mac-specific key combination */
  mac?: string;
  /** Linux-specific key combination */
  linux?: string;
  /** When expression for activation */
  when?: string;
}

export interface TypeContribution {
  /** Type identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Icon identifier */
  icon?: string;
  /** Plural form for display */
  plural?: string;
  /** Whether to exclude from default views */
  exclude?: boolean;
}

export interface StatusBarContribution {
  /** Item identifier */
  id: string;
  /** Alignment in status bar */
  alignment: 'left' | 'right';
  /** Priority (higher = closer to edge) */
  priority?: number;
  /** Command to execute on click */
  command?: string;
  /** Static text content */
  text?: string;
  /** Tooltip text */
  tooltip?: string;
}
