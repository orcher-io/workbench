import type { ComponentType } from 'react';
import type {
  ResolvedCommand,
  ResolvedEditor,
  ResolvedView,
  ResolvedMenuItem,
  ResolvedKeybinding,
  ResolvedEditorComponentProps,
  ViewComponentProps,
  TypeProvider,
} from './types';
import type { CollectedContributions } from './collector';
import { evaluateWhenClause, type WhenContext } from './when-clause';

/**
 * Resolver for contribution handlers
 */
export class ContributionResolver {
  private contributions: CollectedContributions;
  private commandHandlers = new Map<string, (...args: unknown[]) => unknown>();
  private editorComponents = new Map<
    string,
    ComponentType<ResolvedEditorComponentProps>
  >();
  private viewComponents = new Map<string, ComponentType<ViewComponentProps>>();
  private typeProviders = new Map<string, TypeProvider>();

  constructor(contributions: CollectedContributions) {
    this.contributions = contributions;
  }

  // ============ COMMAND RESOLUTION ============

  /**
   * Register a command handler
   */
  registerCommandHandler(
    commandId: string,
    handler: (...args: unknown[]) => unknown,
  ): void {
    const command = this.contributions.commands.get(commandId);
    if (!command) {
      console.warn(`Registering handler for unknown command: ${commandId}`);
    }
    this.commandHandlers.set(commandId, handler);

    if (command) {
      command.handler = handler;
      command.active = true;
    }
  }

  /**
   * Execute a command
   */
  async executeCommand(
    commandId: string,
    ...args: unknown[]
  ): Promise<unknown> {
    const handler = this.commandHandlers.get(commandId);
    if (!handler) {
      throw new Error(`No handler registered for command: ${commandId}`);
    }
    return handler(...args);
  }

  /**
   * Check if a command has a registered handler
   */
  hasCommandHandler(commandId: string): boolean {
    return this.commandHandlers.has(commandId);
  }

  /**
   * Get all commands (optionally filtered by context)
   */
  getCommands(context?: WhenContext): ResolvedCommand[] {
    const commands = Array.from(this.contributions.commands.values());

    if (!context) return commands;

    return commands.filter((cmd) =>
      evaluateWhenClause(cmd.enablement, context),
    );
  }

  // ============ EDITOR RESOLUTION ============

  /**
   * Register an editor component
   */
  registerEditorComponent(
    editorId: string,
    component: ComponentType<ResolvedEditorComponentProps>,
  ): void {
    const editor = this.contributions.editors.get(editorId);
    if (!editor) {
      console.warn(`Registering component for unknown editor: ${editorId}`);
    }
    this.editorComponents.set(editorId, component);

    if (editor) {
      editor.component = component;
      editor.active = true;
    }
  }

  /**
   * Get the component for an editor
   */
  getEditorComponent(
    editorId: string,
  ): ComponentType<ResolvedEditorComponentProps> | undefined {
    return this.editorComponents.get(editorId);
  }

  /**
   * Find the best editor for a resource
   */
  findEditorForResource(
    uri: string,
    mimeType?: string,
  ): ResolvedEditor | undefined {
    const editors = Array.from(this.contributions.editors.values()).filter(
      (e) => e.active,
    );

    // Parse URI to get scheme and filename
    const schemeMatch = uri.match(/^([^:]+):/);
    const scheme = schemeMatch?.[1] ?? 'file';
    const filename = uri.split('/').pop() ?? '';

    // Score each editor
    const scored = editors.map((editor) => {
      let score = 0;
      const selector = editor.selector;

      if (!selector) return { editor, score: 0 };

      // Scheme match
      if (selector.scheme && selector.scheme === scheme) {
        score += 100;
      }

      // MIME type match
      if (selector.mimeType && mimeType && selector.mimeType === mimeType) {
        score += 50;
      }

      // Filename pattern match
      if (selector.filenamePattern) {
        const regex = patternToRegex(selector.filenamePattern);
        if (regex.test(filename)) {
          score += 10;
        }
      }

      // Priority adjustment
      switch (editor.priority) {
        case 'builtin':
          score -= 5;
          break;
        case 'default':
          score += 5;
          break;
        case 'option':
          score += 0;
          break;
      }

      return { editor, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.score > 0 ? scored[0].editor : undefined;
  }

  // ============ VIEW RESOLUTION ============

  /**
   * Register a view component
   */
  registerViewComponent(
    viewId: string,
    component: ComponentType<ViewComponentProps>,
  ): void {
    const view = this.contributions.views.get(viewId);
    if (!view) {
      console.warn(`Registering component for unknown view: ${viewId}`);
    }
    this.viewComponents.set(viewId, component);

    if (view) {
      view.component = component;
      view.active = true;
    }
  }

  /**
   * Get the component for a view
   */
  getViewComponent(
    viewId: string,
  ): ComponentType<ViewComponentProps> | undefined {
    return this.viewComponents.get(viewId);
  }

  /**
   * Get views for a container (optionally filtered by context)
   */
  getViewsForContainer(
    containerId: string,
    context?: WhenContext,
  ): ResolvedView[] {
    const views = Array.from(this.contributions.views.values()).filter(
      (v) => v.containerId === containerId && v.active,
    );

    if (!context) return views;

    return views.filter((view) => evaluateWhenClause(view.when, context));
  }

  // ============ MENU RESOLUTION ============

  /**
   * Get menu items for a menu (filtered by context)
   */
  getMenuItems(menuId: string, context: WhenContext): ResolvedMenuItem[] {
    const items = this.contributions.menuItems.get(menuId) ?? [];

    return items
      .filter((item) => evaluateWhenClause(item.when, context))
      .map((item) => {
        // Resolve command if specified
        let resolvedCommand: ResolvedCommand | undefined;
        if (item.command) {
          resolvedCommand = this.contributions.commands.get(item.command);
        }

        const enabled = resolvedCommand
          ? evaluateWhenClause(resolvedCommand.enablement, context)
          : true;

        return {
          ...item,
          resolvedCommand,
          visible: true,
          enabled,
        };
      })
      .sort((a, b) => {
        // Sort by group, then by order
        if (a.group !== b.group) {
          return (a.group ?? '').localeCompare(b.group ?? '');
        }
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }

  // ============ KEYBINDING RESOLUTION ============

  /**
   * Find keybindings for a key combination
   */
  findKeybindings(
    normalizedKey: string,
    context: WhenContext,
  ): ResolvedKeybinding[] {
    return this.contributions.keybindings
      .filter((kb) => kb.normalizedKey === normalizedKey)
      .filter((kb) => evaluateWhenClause(kb.when, context))
      .map((kb) => ({
        ...kb,
        resolvedCommand: this.contributions.commands.get(kb.command),
      }));
  }

  /**
   * Get the keybinding for a command
   */
  getKeybindingForCommand(commandId: string): ResolvedKeybinding | undefined {
    return this.contributions.keybindings.find(
      (kb) => kb.command === commandId,
    );
  }

  // ============ TYPE RESOLUTION ============

  /**
   * Register a type provider
   */
  registerTypeProvider(typeId: string, provider: TypeProvider): void {
    const type = this.contributions.types.get(typeId);
    if (!type) {
      console.warn(`Registering provider for unknown type: ${typeId}`);
    }
    this.typeProviders.set(typeId, provider);

    if (type) {
      type.provider = provider;
      type.active = true;
    }
  }

  /**
   * Get a type provider
   */
  getTypeProvider(typeId: string): TypeProvider | undefined {
    return this.typeProviders.get(typeId);
  }

  // ============ UTILITIES ============

  /**
   * Get the underlying contributions collection
   */
  getContributions(): CollectedContributions {
    return this.contributions;
  }
}

/**
 * Convert a glob pattern to a regex
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Create a contribution resolver
 */
export function createResolver(
  contributions: CollectedContributions,
): ContributionResolver {
  return new ContributionResolver(contributions);
}
