import type { PluginDefinition, ConfigurationContribution } from '../schema';
import type {
  ResolvedCommand,
  ResolvedEditor,
  ResolvedView,
  ResolvedMenuItem,
  ResolvedKeybinding,
  ResolvedConfiguration,
  ResolvedType,
  ResolvedStatusBarItem,
} from './types';

/**
 * Collected contributions from all plugins
 */
export interface CollectedContributions {
  commands: Map<string, ResolvedCommand>;
  editors: Map<string, ResolvedEditor>;
  views: Map<string, ResolvedView>;
  menuItems: Map<string, ResolvedMenuItem[]>;
  keybindings: ResolvedKeybinding[];
  configurations: Map<string, ResolvedConfiguration>;
  types: Map<string, ResolvedType>;
  statusBarItems: Map<string, ResolvedStatusBarItem>;
}

/**
 * Create an empty contributions collection
 */
export function createEmptyContributions(): CollectedContributions {
  return {
    commands: new Map(),
    editors: new Map(),
    views: new Map(),
    menuItems: new Map(),
    keybindings: [],
    configurations: new Map(),
    types: new Map(),
    statusBarItems: new Map(),
  };
}

/**
 * Collect contributions from a plugin definition
 */
export function collectContributions(
  definition: PluginDefinition,
  existing: CollectedContributions = createEmptyContributions(),
): CollectedContributions {
  const pluginId = definition.id;
  const contributions = definition.contributes;

  if (!contributions) {
    return existing;
  }

  // Collect commands
  if (contributions.commands) {
    for (const command of contributions.commands) {
      if (existing.commands.has(command.id)) {
        console.warn(`Duplicate command: ${command.id} (from ${pluginId})`);
        continue;
      }
      existing.commands.set(command.id, {
        ...command,
        pluginId,
        active: false,
      });
    }
  }

  // Collect editors
  if (contributions.editors) {
    for (const editor of contributions.editors) {
      if (existing.editors.has(editor.id)) {
        console.warn(`Duplicate editor: ${editor.id} (from ${pluginId})`);
        continue;
      }
      existing.editors.set(editor.id, {
        ...editor,
        pluginId,
        active: false,
      });
    }
  }

  // Collect views
  if (contributions.views) {
    for (const [containerId, views] of Object.entries(contributions.views)) {
      for (const view of views) {
        if (existing.views.has(view.id)) {
          console.warn(`Duplicate view: ${view.id} (from ${pluginId})`);
          continue;
        }
        existing.views.set(view.id, {
          ...view,
          pluginId,
          active: false,
          containerId,
        });
      }
    }
  }

  // Collect menu items
  if (contributions.menus) {
    for (const [menuId, items] of Object.entries(contributions.menus)) {
      const menuItems = existing.menuItems.get(menuId) ?? [];
      for (const item of items) {
        menuItems.push({
          ...item,
          pluginId,
          active: false,
          menuId,
          visible: true,
          enabled: true,
        });
      }
      existing.menuItems.set(menuId, menuItems);
    }
  }

  // Collect keybindings
  if (contributions.keybindings) {
    for (const keybinding of contributions.keybindings) {
      existing.keybindings.push({
        ...keybinding,
        pluginId,
        active: false,
        normalizedKey: normalizeKeyBinding(keybinding.key),
      });
    }
  }

  // Collect configurations
  if (contributions.configuration) {
    for (const config of contributions.configuration) {
      if (existing.configurations.has(config.id)) {
        console.warn(
          `Duplicate configuration: ${config.id} (from ${pluginId})`,
        );
        continue;
      }
      existing.configurations.set(config.id, {
        ...config,
        pluginId,
        active: false,
        values: getDefaultConfigValues(config),
      });
    }
  }

  // Collect types
  if (contributions.types) {
    for (const type of contributions.types) {
      if (existing.types.has(type.id)) {
        console.warn(`Duplicate type: ${type.id} (from ${pluginId})`);
        continue;
      }
      existing.types.set(type.id, {
        ...type,
        pluginId,
        active: false,
      });
    }
  }

  // Collect status bar items
  if (contributions.statusBar) {
    for (const item of contributions.statusBar) {
      if (existing.statusBarItems.has(item.id)) {
        console.warn(
          `Duplicate status bar item: ${item.id} (from ${pluginId})`,
        );
        continue;
      }
      existing.statusBarItems.set(item.id, {
        ...item,
        pluginId,
        active: false,
        visible: true,
      });
    }
  }

  return existing;
}

/**
 * Collect contributions from multiple plugins
 */
export function collectAllContributions(
  definitions: PluginDefinition[],
): CollectedContributions {
  let contributions = createEmptyContributions();

  for (const definition of definitions) {
    contributions = collectContributions(definition, contributions);
  }

  return contributions;
}

/**
 * Normalize a key binding to a standard format
 */
function normalizeKeyBinding(key: string): string {
  // Convert to lowercase and standardize modifiers
  return key
    .toLowerCase()
    .replace(/cmd/g, 'meta')
    .replace(/ctrl/g, 'control')
    .replace(/\s+/g, '')
    .split('+')
    .sort((a, b) => {
      // Sort modifiers first in consistent order
      const order = ['control', 'alt', 'shift', 'meta'];
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    })
    .join('+');
}

/**
 * Get default values from a configuration contribution
 */
function getDefaultConfigValues(
  config: ConfigurationContribution,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  if (!config.properties) {
    return values;
  }

  for (const [key, prop] of Object.entries(config.properties)) {
    if (prop.default !== undefined) {
      values[key] = prop.default;
    }
  }

  return values;
}
