import type {
  TreeDataProvider,
  TreeView,
  TreeViewOptions,
  RichTreeViewOptions,
  TreeViewSelectionChangeEvent,
  TreeViewVisibilityChangeEvent,
  TreeViewExpansionEvent,
  ITreeViewService,
  Disposable,
} from '@orcher/workbench-plugin-api';

interface RegisteredTreeDataProvider<T = unknown> {
  viewId: string;
  provider: TreeDataProvider<T>;
  options: TreeViewOptions<T>;
  pluginId: string;
  treeView: TreeViewImpl<T>;
}

type TreeViewServiceListener = () => void;

/**
 * Service for managing TreeDataProvider registrations
 */
export class TreeViewService implements ITreeViewService {
  private providers = new Map<string, RegisteredTreeDataProvider>();
  private listeners = new Set<TreeViewServiceListener>();

  /**
   * Subscribe to changes in the service
   */
  subscribe(listener: TreeViewServiceListener): Disposable {
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
  }

  /**
   * Register a tree data provider for a view
   */
  registerTreeDataProvider<T>(
    viewId: string,
    provider: TreeDataProvider<T>,
    options: Partial<Omit<TreeViewOptions<T>, 'dataProvider'>> = {},
    pluginId: string = 'unknown',
  ): TreeView<T> {
    if (this.providers.has(viewId)) {
      console.warn(`TreeDataProvider already registered for view: ${viewId}`);
      // Return existing tree view
      return this.providers.get(viewId)!.treeView as TreeView<T>;
    }

    const fullOptions: TreeViewOptions<T> = {
      dataProvider: provider,
      showCollapseAll: true,
      canSelectMany: false,
      ...options,
    };

    const treeView = new TreeViewImpl<T>(viewId, provider);

    this.providers.set(viewId, {
      viewId,
      provider: provider as TreeDataProvider<unknown>,
      options: fullOptions as TreeViewOptions<unknown>,
      pluginId,
      treeView: treeView as TreeViewImpl<unknown>,
    });

    // Subscribe to provider's data change events
    if (provider.onDidChangeTreeData) {
      const disposable = provider.onDidChangeTreeData((element) => {
        treeView.refresh(element);
        this.notify();
      });
      // Store disposable for cleanup
      treeView.addDisposable(disposable);
    }

    this.notify();

    return treeView;
  }

  /**
   * Get a registered tree data provider
   */
  getTreeDataProvider<T>(viewId: string): TreeDataProvider<T> | undefined {
    return this.providers.get(viewId)?.provider as
      | TreeDataProvider<T>
      | undefined;
  }

  /**
   * Get a tree view instance
   */
  getTreeView<T>(viewId: string): TreeView<T> | undefined {
    return this.providers.get(viewId)?.treeView as TreeView<T> | undefined;
  }

  /**
   * Get options for a tree view
   */
  getTreeViewOptions<T>(viewId: string): TreeViewOptions<T> | undefined {
    return this.providers.get(viewId)?.options as
      | TreeViewOptions<T>
      | undefined;
  }

  /**
   * Get rich tree view options for a view
   */
  getRichOptions<T>(viewId: string): RichTreeViewOptions<T> | undefined {
    const options = this.getTreeViewOptions<T>(viewId);
    return options?.richOptions;
  }

  /**
   * Check if a view has a tree data provider
   */
  hasTreeDataProvider(viewId: string): boolean {
    return this.providers.has(viewId);
  }

  /**
   * Get all registered view IDs
   */
  getRegisteredViewIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Find which view contains an item with the given URI
   * Returns the viewId and element if found
   */
  async findItemByUri(
    uri: string,
  ): Promise<{ viewId: string; element: unknown } | null> {
    for (const [viewId, registration] of this.providers) {
      const element = await this.searchProviderForUri(
        registration.provider,
        uri,
      );
      if (element) {
        return { viewId, element };
      }
    }
    return null;
  }

  /**
   * Search a provider recursively for an item with the given URI
   * Matches against resourceUri first, then falls back to item://{id} pattern
   */
  private async searchProviderForUri<T>(
    provider: TreeDataProvider<T>,
    uri: string,
  ): Promise<T | null> {
    const searchInElements = async (elements: T[]): Promise<T | null> => {
      for (const element of elements) {
        const treeItemOrPromise = provider.getTreeItem(element);
        const treeItem =
          treeItemOrPromise instanceof Promise
            ? await treeItemOrPromise
            : treeItemOrPromise;

        // Check resourceUri first
        if (treeItem.resourceUri === uri) {
          return element;
        }

        // Also check if URI matches the fallback pattern item://{id}
        if (uri === `item://${treeItem.id}`) {
          return element;
        }

        // Search in children
        const childrenOrPromise = provider.getChildren(element);
        const children =
          childrenOrPromise instanceof Promise
            ? await childrenOrPromise
            : childrenOrPromise;

        if (Array.isArray(children) && children.length > 0) {
          const found = await searchInElements(children);
          if (found) return found;
        }
      }
      return null;
    };

    const rootsOrPromise = provider.getRoot();
    const roots =
      rootsOrPromise instanceof Promise ? await rootsOrPromise : rootsOrPromise;
    return searchInElements(roots);
  }

  /**
   * Unregister a tree data provider
   */
  unregister(viewId: string): void {
    const registration = this.providers.get(viewId);
    if (registration) {
      registration.treeView.dispose();
      this.providers.delete(viewId);
      this.notify();
    }
  }
}

/**
 * Internal TreeView implementation
 */
class TreeViewImpl<T> implements TreeView<T> {
  private _selection: T[] = [];
  private _visible = false;
  private _disposed = false;
  private _disposables: Disposable[] = [];

  private selectionListeners = new Set<
    (e: TreeViewSelectionChangeEvent<T>) => void
  >();
  private visibilityListeners = new Set<
    (e: TreeViewVisibilityChangeEvent) => void
  >();
  private expandListeners = new Set<(e: TreeViewExpansionEvent<T>) => void>();
  private collapseListeners = new Set<(e: TreeViewExpansionEvent<T>) => void>();
  private refreshListeners = new Set<(element?: T) => void>();
  private revealListeners = new Set<
    (
      element: T,
      options?: {
        select?: boolean;
        focus?: boolean;
        expand?: boolean | number;
      },
    ) => void
  >();

  constructor(
    public readonly viewId: string,
    _provider: TreeDataProvider<T>,
  ) {}

  get selection(): readonly T[] {
    return this._selection;
  }

  get visible(): boolean {
    return this._visible;
  }

  onDidChangeSelection = (
    listener: (e: TreeViewSelectionChangeEvent<T>) => void,
  ): Disposable => {
    this.selectionListeners.add(listener);
    return { dispose: () => this.selectionListeners.delete(listener) };
  };

  onDidChangeVisibility = (
    listener: (e: TreeViewVisibilityChangeEvent) => void,
  ): Disposable => {
    this.visibilityListeners.add(listener);
    return { dispose: () => this.visibilityListeners.delete(listener) };
  };

  onDidExpandElement = (
    listener: (e: TreeViewExpansionEvent<T>) => void,
  ): Disposable => {
    this.expandListeners.add(listener);
    return { dispose: () => this.expandListeners.delete(listener) };
  };

  onDidCollapseElement = (
    listener: (e: TreeViewExpansionEvent<T>) => void,
  ): Disposable => {
    this.collapseListeners.add(listener);
    return { dispose: () => this.collapseListeners.delete(listener) };
  };

  /**
   * Internal: subscribe to refresh events from the component
   */
  onRefresh(listener: (element?: T) => void): Disposable {
    this.refreshListeners.add(listener);
    return { dispose: () => this.refreshListeners.delete(listener) };
  }

  /**
   * Internal: subscribe to reveal requests
   */
  onReveal(
    listener: (
      element: T,
      options?: {
        select?: boolean;
        focus?: boolean;
        expand?: boolean | number;
      },
    ) => void,
  ): Disposable {
    this.revealListeners.add(listener);
    return { dispose: () => this.revealListeners.delete(listener) };
  }

  async reveal(
    element: T,
    options: {
      select?: boolean;
      focus?: boolean;
      expand?: boolean | number;
    } = {},
  ): Promise<void> {
    for (const listener of this.revealListeners) {
      listener(element, options);
    }
  }

  refresh(element?: T): void {
    for (const listener of this.refreshListeners) {
      listener(element);
    }
  }

  /**
   * Internal: set selection from component
   */
  setSelection(selection: T[]): void {
    this._selection = selection;
    for (const listener of this.selectionListeners) {
      listener({ selection });
    }
  }

  /**
   * Internal: set visibility from component
   */
  setVisible(visible: boolean): void {
    if (this._visible !== visible) {
      this._visible = visible;
      for (const listener of this.visibilityListeners) {
        listener({ visible });
      }
    }
  }

  /**
   * Internal: notify expansion
   */
  notifyExpand(element: T): void {
    for (const listener of this.expandListeners) {
      listener({ element });
    }
  }

  /**
   * Internal: notify collapse
   */
  notifyCollapse(element: T): void {
    for (const listener of this.collapseListeners) {
      listener({ element });
    }
  }

  /**
   * Internal: add disposable for cleanup
   */
  addDisposable(disposable: Disposable): void {
    this._disposables.push(disposable);
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    // Dispose all tracked disposables
    for (const disposable of this._disposables) {
      disposable.dispose();
    }
    this._disposables = [];

    // Clear all listeners
    this.selectionListeners.clear();
    this.visibilityListeners.clear();
    this.expandListeners.clear();
    this.collapseListeners.clear();
    this.refreshListeners.clear();
    this.revealListeners.clear();
  }
}
