import type {
  ViewContribution,
  ViewContainerContribution,
  ViewProvider,
  IViewExtensionPoint,
  Disposable,
} from '@orcher/workbench-plugin-api';

interface RegisteredView {
  contribution: ViewContribution;
  containerId: string;
  provider?: ViewProvider;
  pluginId: string;
}

interface RegisteredViewContainer {
  contribution: ViewContainerContribution;
  location: 'activityBar' | 'panel';
  pluginId: string;
}

type ViewServiceListener = () => void;

/** Container of a view whose provider arrived before its contribution */
const UNPLACED = 'unknown';

const STORAGE_KEY_ACTIVE_CONTAINER = 'workbench-active-container';
const STORAGE_KEY_SIDEBAR_VISIBLE = 'workbench-sidebar-visible';

/**
 * Load active container ID from localStorage
 */
function loadActiveContainerId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_CONTAINER);
  } catch {
    return null;
  }
}

/**
 * Save active container ID to localStorage
 */
function saveActiveContainerId(containerId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (containerId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_CONTAINER, containerId);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_CONTAINER);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load sidebar visibility from localStorage
 */
function loadSidebarVisible(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SIDEBAR_VISIBLE);
    return stored !== 'false';
  } catch {
    return true;
  }
}

/**
 * Save sidebar visibility to localStorage
 */
function saveSidebarVisible(visible: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_VISIBLE, String(visible));
  } catch {
    // Ignore storage errors
  }
}

/**
 * View service - manages view registration and lookup with reactive state
 */
export class ViewService implements IViewExtensionPoint {
  private views = new Map<string, RegisteredView>();
  private containers = new Map<string, RegisteredViewContainer>();
  private listeners = new Set<ViewServiceListener>();

  // Active state - start with defaults, hydrate from localStorage after mount
  private _activeContainerId: string | null = null;
  private _sidebarVisible = true;

  // Track if we've hydrated from localStorage
  private _hasHydrated = false;

  private activationTrigger?: (event: string) => void;

  /**
   * Set a callback to trigger plugin activation events (onView:*)
   */
  setActivationTrigger(trigger: (event: string) => void): void {
    this.activationTrigger = trigger;
  }

  /**
   * Fire onView: for a container and each of its views, so a lazily
   * activated plugin registers its view provider when its container opens.
   */
  private activateViews(containerId: string): void {
    if (!this.activationTrigger) return;
    this.activationTrigger(`onView:${containerId}`);
    for (const view of this.getViewsForContainer(containerId)) {
      this.activationTrigger(`onView:${view.id}`);
    }
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: ViewServiceListener): Disposable {
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
   * Hydrate state from localStorage (call after client-side mount)
   */
  hydrate(): void {
    if (this._hasHydrated) return;
    this._hasHydrated = true;

    const persistedContainerId = loadActiveContainerId();
    const persistedSidebarVisible = loadSidebarVisible();

    if (persistedContainerId !== null) {
      // Restored even when the container is not registered yet
      this._activeContainerId = persistedContainerId;
      this.activateViews(persistedContainerId);
    }

    this._sidebarVisible = persistedSidebarVisible;
    this.notify();
  }

  /**
   * Get active container ID
   */
  get activeContainerId(): string | null {
    return this._activeContainerId;
  }

  /**
   * Set active container
   */
  setActiveContainer(containerId: string | null): void {
    if (this._activeContainerId !== containerId) {
      // Notify previous view of hiding
      if (this._activeContainerId) {
        const views = this.getViewsForContainer(this._activeContainerId);
        for (const view of views) {
          const provider = this.getViewProvider(view.id);
          provider?.onDidHide?.();
        }
      }

      this._activeContainerId = containerId;
      saveActiveContainerId(containerId);

      // Notify new view of showing
      if (containerId) {
        this.activateViews(containerId);
        const views = this.getViewsForContainer(containerId);
        for (const view of views) {
          const provider = this.getViewProvider(view.id);
          provider?.onDidShow?.();
        }
      }

      this.notify();
    }
  }

  /**
   * Get sidebar visibility
   */
  get sidebarVisible(): boolean {
    return this._sidebarVisible;
  }

  /**
   * Set sidebar visibility
   */
  setSidebarVisible(visible: boolean): void {
    if (this._sidebarVisible !== visible) {
      this._sidebarVisible = visible;
      saveSidebarVisible(visible);
      this.notify();
    }
  }

  /**
   * Toggle sidebar visibility
   */
  toggleSidebar(): void {
    this.setSidebarVisible(!this._sidebarVisible);
  }

  /**
   * Handle activity bar item click
   * - If clicking active item, toggle sidebar
   * - If clicking different item, switch to it and show sidebar
   */
  handleActivityItemClick(containerId: string): void {
    if (containerId === this._activeContainerId) {
      this.toggleSidebar();
    } else {
      this.setActiveContainer(containerId);
      this.setSidebarVisible(true);
    }
  }

  /**
   * Register a view container
   */
  registerViewContainer(
    contribution: ViewContainerContribution,
    location: 'activityBar' | 'panel',
    pluginId: string,
  ): Disposable {
    if (this.containers.has(contribution.id)) {
      console.warn(`View container already registered: ${contribution.id}`);
      return { dispose: () => {} };
    }

    this.containers.set(contribution.id, {
      contribution,
      location,
      pluginId,
    });

    // Handle active container selection for activity bar containers
    // Always auto-select first container during initial render to avoid hydration mismatch
    // The persisted state will be applied after hydration via hydrate()
    if (location === 'activityBar') {
      if (this._activeContainerId === null) {
        this._activeContainerId = contribution.id;
        this.activateViews(contribution.id);
      }
    }

    this.notify();

    return {
      dispose: () => {
        this.containers.delete(contribution.id);
        if (this._activeContainerId === contribution.id) {
          // Select next available container
          const containers = this.getViewContainers('activityBar');
          this._activeContainerId = containers[0]?.id ?? null;
          if (this._activeContainerId) this.activateViews(this._activeContainerId);
        }
        this.notify();
      },
    };
  }

  /**
   * Register a view contribution
   */
  registerContribution(
    contribution: ViewContribution,
    containerId: string,
    pluginId: string,
  ): Disposable {
    const existing = this.views.get(contribution.id);
    if (existing && existing.containerId !== UNPLACED) {
      console.warn(`View already registered: ${contribution.id}`);
      return { dispose: () => {} };
    }

    // A provider registered before its contribution left a placeholder;
    // place it now and keep its provider.
    this.views.set(contribution.id, {
      contribution,
      containerId,
      pluginId,
      provider: existing?.provider,
    });
    if (containerId === this._activeContainerId) {
      this.activationTrigger?.(`onView:${contribution.id}`);
    }

    this.notify();

    return {
      dispose: () => {
        this.views.delete(contribution.id);
        this.notify();
      },
    };
  }

  /**
   * Register a view provider
   */
  registerProvider(
    viewId: string,
    provider: ViewProvider,
    pluginId: string,
  ): Disposable {
    const view = this.views.get(viewId);
    if (!view) {
      // Create a temporary view registration if not exists
      // This allows plugins to register providers before contributions are processed
      this.views.set(viewId, {
        contribution: { id: viewId, name: viewId },
        containerId: UNPLACED,
        provider,
        pluginId,
      });
    } else {
      view.provider = provider;
    }

    this.notify();

    return {
      dispose: () => {
        const v = this.views.get(viewId);
        if (v) {
          v.provider = undefined;
          this.notify();
        }
      },
    };
  }

  /**
   * Get views for a specific container
   */
  getViewsForContainer(
    containerId: string,
  ): Array<{ id: string; name: string; icon?: string }> {
    const result: Array<{ id: string; name: string; icon?: string }> = [];

    for (const [id, view] of this.views) {
      if (view.containerId === containerId) {
        result.push({
          id,
          name: view.contribution.name,
          icon: view.contribution.icon,
        });
      }
    }

    return result;
  }

  /**
   * Get a view provider
   */
  getViewProvider(viewId: string): ViewProvider | undefined {
    return this.views.get(viewId)?.provider;
  }

  /**
   * Get all view containers for a location
   */
  getViewContainers(
    location: 'activityBar' | 'panel',
  ): ViewContainerContribution[] {
    const result: ViewContainerContribution[] = [];

    for (const container of this.containers.values()) {
      if (container.location === location) {
        result.push(container.contribution);
      }
    }

    return result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * Get all registered views
   */
  getAllViews(): ViewContribution[] {
    return Array.from(this.views.values()).map((v) => v.contribution);
  }

  /**
   * Get the active view provider for the current container
   */
  getActiveViewProvider(): ViewProvider | undefined {
    if (!this._activeContainerId) return undefined;

    const views = this.getViewsForContainer(this._activeContainerId);
    if (views.length === 0) return undefined;

    // Return the first view's provider for now
    // Could be extended to support multiple views per container
    return this.getViewProvider(views[0].id);
  }

  /**
   * Check if a container has any registered providers
   */
  hasProviderForContainer(containerId: string): boolean {
    const views = this.getViewsForContainer(containerId);
    return views.some((view) => this.getViewProvider(view.id) !== undefined);
  }

  /**
   * Get the container ID for a given view ID
   */
  getContainerForView(viewId: string): string | null {
    const view = this.views.get(viewId);
    return view?.containerId ?? null;
  }
}
