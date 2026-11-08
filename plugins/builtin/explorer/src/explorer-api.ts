import type {
  Disposable,
  ExplorerMenuItem,
  ExplorerMenuSection,
  ExplorerRegistrationOptions,
  IExplorerAPI,
  IRoutingService,
  NavigateOptions,
  ITreeViewService,
  RichTreeViewOptions,
} from '@orcher/workbench-plugin-api';
import type {
  ExplorerRegistry,
  MenuTreeNode,
  ViewService,
} from '@orcher/workbench-services';

/**
 * ExplorerAPI implementation - the simple API for plugins to register menu items
 */
export class ExplorerAPI implements IExplorerAPI {
  private pluginId: string;

  constructor(
    private registry: ExplorerRegistry,
    private routingService: IRoutingService,
    private viewService: ViewService,
    private treeViewService: ITreeViewService,
    pluginId: string,
  ) {
    this.pluginId = pluginId;
  }

  /**
   * Register a new section in the activity bar
   */
  registerSection(
    section: ExplorerMenuSection,
    options: ExplorerRegistrationOptions = {},
  ): Disposable {
    // 1. Register section in our registry
    const registryDisposable = this.registry.registerSection(
      section,
      options,
      this.pluginId,
    );

    // 2. Register view container in ViewService (creates activity bar item)
    const containerDisposable = this.viewService.registerViewContainer(
      {
        id: section.id,
        title: section.title,
        icon: section.icon,
        order: section.order,
      },
      'activityBar',
      this.pluginId,
    );

    // 3. Create tree data provider for this section
    const provider = this.registry.createTreeDataProvider(section.id);
    if (!provider) {
      return {
        dispose: () => {
          containerDisposable.dispose();
          registryDisposable.dispose();
        },
      };
    }

    // 4. Register tree view with the provider
    const richOptions: RichTreeViewOptions<MenuTreeNode> = {
      title: section.title,
      showSearch: options.searchable ?? false,
      searchPlaceholder: options.searchPlaceholder,
      showBreadcrumb: options.showBreadcrumb ?? false,
      showStatusBar: options.showStatusBar ?? true,
      showExpandCollapseAll: options.showExpandCollapseAll ?? true,
      storageKey: options.storageKey,
      getItemType: (element) =>
        element.item.hasChildren || element.children.length > 0
          ? 'folder'
          : 'file',
      getItemName: (element) => element.item.label,
    };

    const treeViewDisposable = this.treeViewService.registerTreeDataProvider(
      `explorer.${section.id}`,
      provider,
      { richOptions },
      this.pluginId,
    );

    // 5. Register view contribution (links view to container)
    const viewDisposable = this.viewService.registerContribution(
      { id: `explorer.${section.id}`, name: section.title },
      section.id,
      this.pluginId,
    );

    return {
      dispose: () => {
        viewDisposable.dispose();
        treeViewDisposable.dispose();
        containerDisposable.dispose();
        registryDisposable.dispose();
      },
    };
  }

  /**
   * Register multiple menu items within a section
   */
  registerMenuItems(sectionId: string, items: ExplorerMenuItem[]): Disposable {
    return this.registry.registerMenuItems(sectionId, items, this.pluginId);
  }

  /**
   * Register a single menu item
   */
  registerMenuItem(sectionId: string, item: ExplorerMenuItem): Disposable {
    return this.registry.registerMenuItem(sectionId, item, this.pluginId);
  }

  /**
   * Update a menu item dynamically
   */
  updateMenuItem(itemId: string, updates: Partial<ExplorerMenuItem>): void {
    this.registry.updateMenuItem(itemId, updates);
  }

  /**
   * Remove a menu item
   */
  removeMenuItem(itemId: string): void {
    this.registry.removeMenuItem(itemId);
  }

  /**
   * Navigate to a path programmatically
   */
  async navigateTo(path: string, options?: NavigateOptions): Promise<void> {
    this.routingService.navigate(path, options);
  }

  /**
   * Get current navigation path
   */
  getCurrentPath(): string {
    return this.routingService.getState().path;
  }

  /**
   * Subscribe to path changes
   */
  onPathChange(listener: (path: string) => void): Disposable {
    return this.routingService.subscribe((state) => {
      listener(state.path);
    });
  }

  /**
   * Get all items in a section
   */
  getItems(sectionId: string): ExplorerMenuItem[] {
    return this.registry.getItems(sectionId);
  }

  /**
   * Get a specific item by ID
   */
  getItem(itemId: string): ExplorerMenuItem | undefined {
    return this.registry.getItem(itemId);
  }

  /**
   * Build URL path for an item
   */
  buildPath(itemId: string): string {
    return this.registry.buildPathForItem(itemId);
  }
}
