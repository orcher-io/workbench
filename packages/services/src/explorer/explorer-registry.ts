import type {
  Disposable,
  ExplorerMenuItem,
  ExplorerMenuSection,
  ExplorerRegistrationOptions,
  TreeDataProvider,
  TreeItem,
} from '@orcher/workbench-plugin-api';
import { TreeItemCollapsibleState as CollapsibleState } from '@orcher/workbench-plugin-api';
import type { RoutingService } from '../routing/routing-service';

/**
 * Internal tree node used by the generated TreeDataProvider
 */
export interface MenuTreeNode {
  id: string;
  item: ExplorerMenuItem;
  children: MenuTreeNode[];
}

interface RegisteredSection {
  section: ExplorerMenuSection;
  options: ExplorerRegistrationOptions;
  pluginId: string;
  rootNodes: MenuTreeNode[];
}

interface RegisteredItem {
  item: ExplorerMenuItem;
  sectionId: string;
  pluginId: string;
  node: MenuTreeNode;
}

type RegistryListener = () => void;

/**
 * Explorer Registry - manages menu sections and items
 * Internally creates TreeDataProviders for each section
 */
export class ExplorerRegistry {
  private sections = new Map<string, RegisteredSection>();
  private items = new Map<string, RegisteredItem>();
  private sectionItems = new Map<string, Set<string>>();
  private listeners = new Set<RegistryListener>();
  private changeListeners = new Map<
    string,
    Set<(element?: MenuTreeNode) => void>
  >();

  constructor(private routingService?: RoutingService) {}

  /**
   * Set routing service (for circular dependency resolution)
   */
  setRoutingService(routingService: RoutingService): void {
    this.routingService = routingService;
    this.syncWithRoutingService();
  }

  /**
   * Sync item registry with routing service
   */
  private syncWithRoutingService(): void {
    if (this.routingService) {
      const itemMap = new Map<string, ExplorerMenuItem>();
      for (const [id, registered] of this.items) {
        itemMap.set(id, registered.item);
      }
      this.routingService.setItemRegistry(itemMap, this.sectionItems);
    }
  }

  /**
   * Subscribe to registry changes
   */
  subscribe(listener: RegistryListener): Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
    this.syncWithRoutingService();
  }

  /**
   * Register a new section
   */
  registerSection(
    section: ExplorerMenuSection,
    options: ExplorerRegistrationOptions = {},
    pluginId: string,
  ): Disposable {
    if (this.sections.has(section.id)) {
      console.warn(`Explorer section already registered: ${section.id}`);
      return { dispose: () => {} };
    }

    this.sections.set(section.id, {
      section,
      options,
      pluginId,
      rootNodes: [],
    });

    this.sectionItems.set(section.id, new Set());
    this.changeListeners.set(section.id, new Set());

    this.notify();

    return {
      dispose: () => {
        // Remove all items in this section
        const itemIds = this.sectionItems.get(section.id);
        if (itemIds) {
          for (const itemId of itemIds) {
            this.items.delete(itemId);
          }
        }
        this.sectionItems.delete(section.id);
        this.changeListeners.delete(section.id);
        this.sections.delete(section.id);
        this.notify();
      },
    };
  }

  /**
   * Register multiple menu items
   */
  registerMenuItems(
    sectionId: string,
    items: ExplorerMenuItem[],
    pluginId: string,
  ): Disposable {
    const section = this.sections.get(sectionId);
    if (!section) {
      console.warn(`Section not found: ${sectionId}`);
      return { dispose: () => {} };
    }

    const registeredIds: string[] = [];

    for (const item of items) {
      if (this.items.has(item.id)) {
        console.warn(`Menu item already registered: ${item.id}`);
        continue;
      }

      const node: MenuTreeNode = {
        id: item.id,
        item,
        children: [],
      };

      this.items.set(item.id, {
        item,
        sectionId,
        pluginId,
        node,
      });

      this.sectionItems.get(sectionId)?.add(item.id);
      registeredIds.push(item.id);
    }

    // Build tree structure
    this.rebuildSectionTree(sectionId);
    this.notifySectionChange(sectionId);
    this.notify();

    return {
      dispose: () => {
        for (const id of registeredIds) {
          this.items.delete(id);
          this.sectionItems.get(sectionId)?.delete(id);
        }
        this.rebuildSectionTree(sectionId);
        this.notifySectionChange(sectionId);
        this.notify();
      },
    };
  }

  /**
   * Register a single menu item
   */
  registerMenuItem(
    sectionId: string,
    item: ExplorerMenuItem,
    pluginId: string,
  ): Disposable {
    return this.registerMenuItems(sectionId, [item], pluginId);
  }

  /**
   * Update a menu item
   */
  updateMenuItem(itemId: string, updates: Partial<ExplorerMenuItem>): void {
    const registered = this.items.get(itemId);
    if (!registered) {
      console.warn(`Menu item not found: ${itemId}`);
      return;
    }

    Object.assign(registered.item, updates);
    registered.node.item = registered.item;

    // If parent changed, rebuild tree
    if ('parentId' in updates) {
      this.rebuildSectionTree(registered.sectionId);
    }

    this.notifySectionChange(registered.sectionId, registered.node);
    this.notify();
  }

  /**
   * Remove a menu item
   */
  removeMenuItem(itemId: string): void {
    const registered = this.items.get(itemId);
    if (!registered) {
      return;
    }

    this.items.delete(itemId);
    this.sectionItems.get(registered.sectionId)?.delete(itemId);
    this.rebuildSectionTree(registered.sectionId);
    this.notifySectionChange(registered.sectionId);
    this.notify();
  }

  /**
   * Rebuild the tree structure for a section
   */
  private rebuildSectionTree(sectionId: string): void {
    const section = this.sections.get(sectionId);
    if (!section) return;

    const itemIds = this.sectionItems.get(sectionId);
    if (!itemIds) return;

    // Create a map of nodes
    const nodeMap = new Map<string, MenuTreeNode>();
    for (const itemId of itemIds) {
      const registered = this.items.get(itemId);
      if (registered) {
        registered.node.children = [];
        nodeMap.set(itemId, registered.node);
      }
    }

    // Build parent-child relationships
    const rootNodes: MenuTreeNode[] = [];

    for (const itemId of itemIds) {
      const registered = this.items.get(itemId);
      if (!registered) continue;

      const node = nodeMap.get(itemId);
      if (!node) continue;

      if (registered.item.parentId) {
        const parentNode = nodeMap.get(registered.item.parentId);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          // Parent not found, treat as root
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    }

    // Sort nodes by order
    const sortByOrder = (a: MenuTreeNode, b: MenuTreeNode) =>
      (a.item.order ?? 0) - (b.item.order ?? 0);

    rootNodes.sort(sortByOrder);
    for (const node of nodeMap.values()) {
      node.children.sort(sortByOrder);
    }

    section.rootNodes = rootNodes;
  }

  /**
   * Notify section change listeners
   */
  private notifySectionChange(sectionId: string, element?: MenuTreeNode): void {
    const listeners = this.changeListeners.get(sectionId);
    if (listeners) {
      for (const listener of listeners) {
        listener(element);
      }
    }
  }

  /**
   * Get all sections
   */
  getSections(): ExplorerMenuSection[] {
    return Array.from(this.sections.values())
      .map((s) => s.section)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * Get a section by ID
   */
  getSection(sectionId: string): ExplorerMenuSection | undefined {
    return this.sections.get(sectionId)?.section;
  }

  /**
   * Get section options
   */
  getSectionOptions(
    sectionId: string,
  ): ExplorerRegistrationOptions | undefined {
    return this.sections.get(sectionId)?.options;
  }

  /**
   * Get all items in a section
   */
  getItems(sectionId: string): ExplorerMenuItem[] {
    const itemIds = this.sectionItems.get(sectionId);
    if (!itemIds) return [];

    return Array.from(itemIds)
      .map((id) => this.items.get(id)?.item)
      .filter((item): item is ExplorerMenuItem => item !== undefined);
  }

  /**
   * Get a specific item
   */
  getItem(itemId: string): ExplorerMenuItem | undefined {
    return this.items.get(itemId)?.item;
  }

  /**
   * Get the section ID for an item
   */
  getSectionForItem(itemId: string): string | undefined {
    return this.items.get(itemId)?.sectionId;
  }

  /**
   * Find item by path
   */
  findItemByPath(path: string): ExplorerMenuItem | null {
    const segments = path.split('/').filter(Boolean);
    if (segments.length < 2) return null;

    const sectionId = segments[0];
    const section = this.sections.get(sectionId);
    if (!section) return null;

    // Search through the tree
    const searchSegments = segments.slice(1);
    let currentNodes = section.rootNodes;

    for (let i = 0; i < searchSegments.length; i++) {
      const segment = searchSegments[i];
      const node = currentNodes.find((n) => {
        const nodeSegment =
          n.item.pathSegment || this.toKebabCase(n.item.label);
        return nodeSegment === segment;
      });

      if (!node) return null;

      if (i === searchSegments.length - 1) {
        return node.item;
      }

      currentNodes = node.children;
    }

    return null;
  }

  /**
   * Build URL path for an item
   */
  buildPathForItem(itemId: string): string {
    const registered = this.items.get(itemId);
    if (!registered) return '/';

    const segments: string[] = [];
    let current: ExplorerMenuItem | undefined = registered.item;

    while (current) {
      const segment = current.pathSegment || this.toKebabCase(current.label);
      segments.unshift(segment);

      if (current.parentId) {
        current = this.items.get(current.parentId)?.item;
      } else {
        break;
      }
    }

    segments.unshift(registered.sectionId);
    return '/' + segments.join('/');
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Create a TreeDataProvider for a section
   */
  createTreeDataProvider(
    sectionId: string,
  ): TreeDataProvider<MenuTreeNode> | null {
    const section = this.sections.get(sectionId);
    if (!section) return null;

    const self = this;

    return {
      getRoot(): MenuTreeNode[] {
        return section.rootNodes;
      },

      getChildren(element: MenuTreeNode): MenuTreeNode[] {
        return element.children;
      },

      getTreeItem(element: MenuTreeNode): TreeItem {
        const item = element.item;
        const hasChildren = item.hasChildren || element.children.length > 0;

        return {
          id: item.id,
          label: item.label,
          description: item.description,
          collapsibleState: hasChildren
            ? CollapsibleState.Collapsed
            : CollapsibleState.None,
          contextValue: item.contextValue || (hasChildren ? 'folder' : 'file'),
          resourceUri: item.uri || self.buildPathForItem(item.id),
          command:
            !hasChildren && item.uri
              ? { id: 'explorer.openItem', arguments: [item] }
              : undefined,
        };
      },

      getParent(element: MenuTreeNode): MenuTreeNode | undefined {
        if (!element.item.parentId) return undefined;
        return self.items.get(element.item.parentId)?.node;
      },

      onDidChangeTreeData: (
        listener: (element: MenuTreeNode | undefined) => void,
      ): Disposable => {
        const listeners = self.changeListeners.get(sectionId);
        if (listeners) {
          listeners.add(listener);
          return {
            dispose: () => {
              listeners.delete(listener);
            },
          };
        }
        return { dispose: () => {} };
      },
    };
  }

  /**
   * Check if a section exists
   */
  hasSection(sectionId: string): boolean {
    return this.sections.has(sectionId);
  }
}
