import type {
  StateSlice,
  StateChangeEvent,
  StateSubscriber,
  StateAction,
  StateHistory,
  StateMiddleware,
  Selector,
} from './types';

/**
 * Options for the state manager
 */
export interface StateManagerOptions {
  /** Storage key prefix for persisted slices */
  storageKeyPrefix?: string;
  /** Maximum undo history size */
  maxHistorySize?: number;
  /** Enable undo/redo */
  enableHistory?: boolean;
  /** Middleware stack */
  middleware?: StateMiddleware[];
}

/**
 * Centralized state manager with persistence, undo/redo, and subscriptions
 */
export class StateManager {
  private slices = new Map<string, StateSlice<unknown>>();
  private state = new Map<string, unknown>();
  private subscribers = new Map<string, Set<StateSubscriber<unknown>>>();
  private globalSubscribers = new Set<(event: StateChangeEvent) => void>();
  private history: StateHistory;
  private middleware: StateMiddleware[];
  private storageKeyPrefix: string;
  private enableHistory: boolean;

  constructor(options: StateManagerOptions = {}) {
    this.storageKeyPrefix = options.storageKeyPrefix ?? 'workbench-state';
    this.enableHistory = options.enableHistory ?? true;
    this.middleware = options.middleware ?? [];
    this.history = {
      past: [],
      future: [],
      maxSize: options.maxHistorySize ?? 50,
    };
  }

  /**
   * Register a state slice
   */
  registerSlice<T>(slice: StateSlice<T>): void {
    if (this.slices.has(slice.name)) {
      console.warn(`State slice already registered: ${slice.name}`);
      return;
    }

    this.slices.set(slice.name, slice as StateSlice<unknown>);
    this.subscribers.set(slice.name, new Set());

    // Load persisted state or use initial
    let initialState = slice.initialState;
    if (slice.persist) {
      const persisted = this.loadFromStorage(slice.name);
      if (persisted !== null) {
        try {
          initialState = slice.deserialize
            ? slice.deserialize(persisted)
            : JSON.parse(persisted);
        } catch {
          console.warn(`Failed to deserialize persisted state for: ${slice.name}`);
        }
      }
    }

    this.state.set(slice.name, initialState);
  }

  /**
   * Unregister a state slice
   */
  unregisterSlice(name: string): void {
    this.slices.delete(name);
    this.state.delete(name);
    this.subscribers.delete(name);
  }

  /**
   * Get the current state of a slice
   */
  getState<T>(sliceName: string): T {
    const state = this.state.get(sliceName);
    if (state === undefined) {
      throw new Error(`State slice not found: ${sliceName}`);
    }
    return state as T;
  }

  /**
   * Try to get state, returns undefined if slice doesn't exist
   */
  tryGetState<T>(sliceName: string): T | undefined {
    return this.state.get(sliceName) as T | undefined;
  }

  /**
   * Set the state of a slice
   */
  setState<T>(
    sliceName: string,
    newState: T | ((prev: T) => T),
    options: { silent?: boolean; recordHistory?: boolean; description?: string } = {}
  ): void {
    const slice = this.slices.get(sliceName);
    if (!slice) {
      throw new Error(`State slice not found: ${sliceName}`);
    }

    const previousState = this.state.get(sliceName) as T;
    const resolvedNewState =
      typeof newState === 'function'
        ? (newState as (prev: T) => T)(previousState)
        : newState;

    // Skip if state hasn't changed
    if (previousState === resolvedNewState) {
      return;
    }

    // Run middleware
    this.runMiddleware(sliceName, previousState, resolvedNewState, () => {
      // Update state
      this.state.set(sliceName, resolvedNewState);

      // Record history for undo
      if (this.enableHistory && options.recordHistory !== false) {
        this.recordHistory({
          type: 'SET_STATE',
          slice: sliceName,
          previousState,
          newState: resolvedNewState,
          timestamp: Date.now(),
          description: options.description,
        });
      }

      // Persist if configured
      if (slice.persist) {
        this.saveToStorage(sliceName, resolvedNewState, slice);
      }

      // Notify subscribers
      if (!options.silent) {
        this.notifySubscribers(sliceName, resolvedNewState, previousState);
      }
    });
  }

  /**
   * Update part of a slice's state (shallow merge)
   */
  updateState<T extends object>(
    sliceName: string,
    updates: Partial<T>,
    options: { silent?: boolean; recordHistory?: boolean; description?: string } = {}
  ): void {
    this.setState<T>(
      sliceName,
      (prev) => ({ ...prev, ...updates }),
      options
    );
  }

  /**
   * Subscribe to changes in a slice
   */
  subscribe<T>(sliceName: string, subscriber: StateSubscriber<T>): () => void {
    const subscribers = this.subscribers.get(sliceName);
    if (!subscribers) {
      throw new Error(`State slice not found: ${sliceName}`);
    }

    subscribers.add(subscriber as StateSubscriber<unknown>);

    // Return unsubscribe function
    return () => {
      subscribers.delete(subscriber as StateSubscriber<unknown>);
    };
  }

  /**
   * Subscribe to all state changes
   */
  subscribeAll(subscriber: (event: StateChangeEvent) => void): () => void {
    this.globalSubscribers.add(subscriber);
    return () => {
      this.globalSubscribers.delete(subscriber);
    };
  }

  /**
   * Create a selector that derives values from state
   */
  select<T, R>(sliceName: string, selector: Selector<T, R>): R {
    const state = this.getState<T>(sliceName);
    return selector(state);
  }

  /**
   * Undo the last action
   */
  undo(): boolean {
    if (!this.enableHistory || this.history.past.length === 0) {
      return false;
    }

    const action = this.history.past.pop()!;
    this.history.future.unshift(action);

    // Restore previous state
    this.state.set(action.slice, action.previousState);

    // Persist if configured
    const slice = this.slices.get(action.slice);
    if (slice?.persist) {
      this.saveToStorage(action.slice, action.previousState, slice);
    }

    // Notify subscribers
    this.notifySubscribers(action.slice, action.previousState, action.newState);

    return true;
  }

  /**
   * Redo the last undone action
   */
  redo(): boolean {
    if (!this.enableHistory || this.history.future.length === 0) {
      return false;
    }

    const action = this.history.future.shift()!;
    this.history.past.push(action);

    // Restore new state
    this.state.set(action.slice, action.newState);

    // Persist if configured
    const slice = this.slices.get(action.slice);
    if (slice?.persist) {
      this.saveToStorage(action.slice, action.newState, slice);
    }

    // Notify subscribers
    this.notifySubscribers(action.slice, action.newState, action.previousState);

    return true;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.enableHistory && this.history.past.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.enableHistory && this.history.future.length > 0;
  }

  /**
   * Clear undo/redo history
   */
  clearHistory(): void {
    this.history.past = [];
    this.history.future = [];
  }

  /**
   * Get all registered slice names
   */
  getSliceNames(): string[] {
    return Array.from(this.slices.keys());
  }

  /**
   * Check if a slice is registered
   */
  hasSlice(name: string): boolean {
    return this.slices.has(name);
  }

  /**
   * Reset a slice to its initial state
   */
  resetSlice(sliceName: string): void {
    const slice = this.slices.get(sliceName);
    if (!slice) {
      throw new Error(`State slice not found: ${sliceName}`);
    }

    this.setState(sliceName, slice.initialState, {
      description: `Reset ${sliceName}`,
    });
  }

  /**
   * Reset all slices to initial state
   */
  resetAll(): void {
    for (const [name, slice] of this.slices) {
      this.setState(name, slice.initialState, {
        recordHistory: false,
      });
    }
    this.clearHistory();
  }

  /**
   * Add middleware
   */
  addMiddleware(middleware: StateMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Dispose of the state manager
   */
  dispose(): void {
    this.slices.clear();
    this.state.clear();
    this.subscribers.clear();
    this.globalSubscribers.clear();
    this.clearHistory();
  }

  // ============ PRIVATE METHODS ============

  private recordHistory(action: StateAction): void {
    this.history.past.push(action);

    // Clear future on new action
    this.history.future = [];

    // Trim history if too long
    while (this.history.past.length > this.history.maxSize) {
      this.history.past.shift();
    }
  }

  private notifySubscribers<T>(
    sliceName: string,
    newState: T,
    previousState: T
  ): void {
    // Slice-specific subscribers
    const subscribers = this.subscribers.get(sliceName);
    if (subscribers) {
      for (const subscriber of subscribers) {
        try {
          subscriber(newState, previousState);
        } catch (error) {
          console.error(`Error in state subscriber for ${sliceName}:`, error);
        }
      }
    }

    // Global subscribers
    const event: StateChangeEvent<T> = {
      slice: sliceName,
      previousState,
      newState,
      timestamp: Date.now(),
    };

    for (const subscriber of this.globalSubscribers) {
      try {
        subscriber(event);
      } catch (error) {
        console.error('Error in global state subscriber:', error);
      }
    }
  }

  private runMiddleware(
    slice: string,
    previousState: unknown,
    newState: unknown,
    next: () => void
  ): void {
    if (this.middleware.length === 0) {
      next();
      return;
    }

    let index = 0;

    const runNext = () => {
      if (index >= this.middleware.length) {
        next();
        return;
      }

      const middleware = this.middleware[index++];
      middleware(slice, previousState, newState, runNext);
    };

    runNext();
  }

  private loadFromStorage(sliceName: string): string | null {
    if (typeof localStorage === 'undefined') return null;

    try {
      return localStorage.getItem(`${this.storageKeyPrefix}:${sliceName}`);
    } catch {
      return null;
    }
  }

  private saveToStorage(
    sliceName: string,
    state: unknown,
    slice: StateSlice<unknown>
  ): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const serialized = slice.serialize
        ? slice.serialize(state)
        : JSON.stringify(state);
      localStorage.setItem(`${this.storageKeyPrefix}:${sliceName}`, serialized);
    } catch (error) {
      console.error(`Failed to persist state for ${sliceName}:`, error);
    }
  }
}

/**
 * Create a state manager instance
 */
export function createStateManager(options?: StateManagerOptions): StateManager {
  return new StateManager(options);
}
