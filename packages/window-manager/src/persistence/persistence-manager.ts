import type { LayoutState } from '../models';
import type { StorageAdapter } from './storage';
import { createStorageAdapter } from './storage';
import { layoutsEqual } from './serializer';
import { validateLayout, createEmptyLayout } from '../operations/cleanup';

/**
 * Options for the persistence manager
 */
export interface PersistenceManagerOptions {
  /** Storage key for the layout */
  storageKey?: string;
  /** Custom storage adapter */
  storageAdapter?: StorageAdapter;
  /** Debounce delay for auto-save (ms) */
  autoSaveDelay?: number;
  /** Enable auto-save */
  autoSave?: boolean;
  /** Callback when layout is loaded */
  onLoad?: (layout: LayoutState) => void;
  /** Callback when layout is saved */
  onSave?: (layout: LayoutState) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Manages layout persistence with auto-save and debouncing
 */
export class PersistenceManager {
  private storage: StorageAdapter;
  private autoSaveDelay: number;
  private autoSaveEnabled: boolean;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastSavedLayout: LayoutState | null = null;
  private onLoad?: (layout: LayoutState) => void;
  private onSave?: (layout: LayoutState) => void;
  private onError?: (error: Error) => void;

  constructor(options: PersistenceManagerOptions = {}) {
    this.storage =
      options.storageAdapter ?? createStorageAdapter(options.storageKey);
    this.autoSaveDelay = options.autoSaveDelay ?? 1000;
    this.autoSaveEnabled = options.autoSave ?? true;
    this.onLoad = options.onLoad;
    this.onSave = options.onSave;
    this.onError = options.onError;
  }

  /**
   * Load the layout from storage
   */
  load(): LayoutState {
    try {
      const stored = this.storage.get();

      if (!stored) {
        return createEmptyLayout();
      }

      // Validate the loaded layout
      const { valid, errors } = validateLayout(stored);

      if (!valid) {
        console.warn('Loaded layout has validation errors:', errors);
        // The serializer's deserialize already handles repair
      }

      this.lastSavedLayout = stored;
      this.onLoad?.(stored);

      return stored;
    } catch (error) {
      this.handleError(new Error(`Failed to load layout: ${error}`));
      return createEmptyLayout();
    }
  }

  /**
   * Save the layout to storage
   */
  save(layout: LayoutState): void {
    try {
      // Skip if layout hasn't changed
      if (this.lastSavedLayout && layoutsEqual(layout, this.lastSavedLayout)) {
        return;
      }

      this.storage.set(layout);
      this.lastSavedLayout = layout;
      this.onSave?.(layout);
    } catch (error) {
      this.handleError(new Error(`Failed to save layout: ${error}`));
    }
  }

  /**
   * Schedule an auto-save (debounced)
   */
  scheduleAutoSave(layout: LayoutState): void {
    if (!this.autoSaveEnabled) return;

    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Schedule new save
    this.saveTimeout = setTimeout(() => {
      this.save(layout);
      this.saveTimeout = null;
    }, this.autoSaveDelay);
  }

  /**
   * Force an immediate save (bypasses debounce)
   */
  saveImmediate(layout: LayoutState): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.save(layout);
  }

  /**
   * Clear the stored layout
   */
  clear(): void {
    this.storage.clear();
    this.lastSavedLayout = null;
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges(currentLayout: LayoutState): boolean {
    if (!this.lastSavedLayout) return true;
    return !layoutsEqual(currentLayout, this.lastSavedLayout);
  }

  /**
   * Enable or disable auto-save
   */
  setAutoSave(enabled: boolean): void {
    this.autoSaveEnabled = enabled;

    if (!enabled && this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  /**
   * Get the last saved layout
   */
  getLastSavedLayout(): LayoutState | null {
    return this.lastSavedLayout;
  }

  /**
   * Dispose of the manager
   */
  dispose(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  private handleError(error: Error): void {
    console.error(error);
    this.onError?.(error);
  }
}

/**
 * Create a persistence manager with default options
 */
export function createPersistenceManager(
  options?: PersistenceManagerOptions,
): PersistenceManager {
  return new PersistenceManager(options);
}
