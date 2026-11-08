import type {
  MenuItemContribution,
  MenuContext,
  ResolvedMenuItem,
  IMenuExtensionPoint,
  Disposable,
} from '@orcher/workbench-plugin-api';

interface RegisteredMenuItem {
  contribution: MenuItemContribution;
  menuId: string;
  pluginId: string;
}

type DynamicMenuProvider = (context: MenuContext) => ResolvedMenuItem[] | Promise<ResolvedMenuItem[]>;

interface RegisteredMenuProvider {
  menuId: string;
  provider: DynamicMenuProvider;
  pluginId: string;
}

/**
 * Menu service - manages menu registration and resolution
 */
export class MenuService implements IMenuExtensionPoint {
  private menuItems: RegisteredMenuItem[] = [];
  private dynamicProviders: RegisteredMenuProvider[] = [];
  private commandExecutor?: (commandId: string) => Promise<void>;

  /**
   * Set the command executor for menu item execution
   */
  setCommandExecutor(executor: (commandId: string) => Promise<void>): void {
    this.commandExecutor = executor;
  }

  /**
   * Register menu items from manifest
   */
  registerContributions(
    menuId: string,
    contributions: MenuItemContribution[],
    pluginId: string
  ): void {
    for (const contribution of contributions) {
      this.menuItems.push({
        contribution,
        menuId,
        pluginId,
      });
    }
  }

  /**
   * Register a dynamic menu provider
   */
  registerMenuProvider(
    menuId: string,
    provider: DynamicMenuProvider,
    pluginId: string
  ): Disposable {
    const registered: RegisteredMenuProvider = {
      menuId,
      provider,
      pluginId,
    };

    this.dynamicProviders.push(registered);

    return {
      dispose: () => {
        const index = this.dynamicProviders.indexOf(registered);
        if (index !== -1) {
          this.dynamicProviders.splice(index, 1);
        }
      },
    };
  }

  /**
   * Get resolved menu items for a menu location
   */
  async getMenuItems(menuId: string, context: MenuContext): Promise<ResolvedMenuItem[]> {
    const items: ResolvedMenuItem[] = [];

    // Get static menu items
    const staticItems = this.menuItems
      .filter((m) => m.menuId === menuId)
      .filter((m) => this.evaluateWhen(m.contribution.when, context));

    for (const item of staticItems) {
      items.push(this.resolveMenuItem(item.contribution, context));
    }

    // Get dynamic menu items
    for (const provider of this.dynamicProviders) {
      if (provider.menuId === menuId) {
        const dynamicItems = await provider.provider(context);
        items.push(...dynamicItems);
      }
    }

    // Sort by group and order
    return this.sortMenuItems(items);
  }

  /**
   * Get menu locations
   */
  getMenuLocations(): string[] {
    const locations = new Set<string>();
    for (const item of this.menuItems) {
      locations.add(item.menuId);
    }
    for (const provider of this.dynamicProviders) {
      locations.add(provider.menuId);
    }
    return Array.from(locations);
  }

  private resolveMenuItem(contribution: MenuItemContribution, context: MenuContext): ResolvedMenuItem {
    return {
      id: contribution.command || contribution.submenu || crypto.randomUUID(),
      label: contribution.title || contribution.command || 'Unknown',
      icon: contribution.icon,
      enabled: true,
      visible: true,
      execute: contribution.command
        ? () => this.commandExecutor?.(contribution.command!)
        : undefined,
    };
  }

  private evaluateWhen(when: string | undefined, context: MenuContext): boolean {
    if (!when) return true;

    // Simple when clause evaluation
    // In a real implementation, this would be more sophisticated
    try {
      // Support simple conditions like "editorFocus", "viewVisible:explorer"
      if (when === 'true') return true;
      if (when === 'false') return false;

      // Check for context variables
      if (when.startsWith('!')) {
        return !this.evaluateWhen(when.slice(1), context);
      }

      // For now, return true for unrecognized conditions
      return true;
    } catch {
      return true;
    }
  }

  private sortMenuItems(items: ResolvedMenuItem[]): ResolvedMenuItem[] {
    // Group items by their group property (from contribution)
    // Then sort within groups by order
    return items.sort((a, b) => {
      // For now, just maintain order of registration
      return 0;
    });
  }
}
