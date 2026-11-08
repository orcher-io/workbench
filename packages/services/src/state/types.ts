/**
 * State slice definition
 */
export interface StateSlice<T> {
  /** Slice name */
  name: string;
  /** Initial state */
  initialState: T;
  /** Whether to persist this slice */
  persist?: boolean;
  /** Custom serializer */
  serialize?: (state: T) => string;
  /** Custom deserializer */
  deserialize?: (data: string) => T;
}

/**
 * State change event
 */
export interface StateChangeEvent<T = unknown> {
  /** Slice name */
  slice: string;
  /** Previous state */
  previousState: T;
  /** New state */
  newState: T;
  /** Timestamp of the change */
  timestamp: number;
}

/**
 * State subscription callback
 */
export type StateSubscriber<T> = (state: T, previousState: T) => void;

/**
 * Undo/redo action
 */
export interface StateAction<T = unknown> {
  /** Action type */
  type: string;
  /** Slice name */
  slice: string;
  /** State before the action */
  previousState: T;
  /** State after the action */
  newState: T;
  /** Timestamp */
  timestamp: number;
  /** Optional description */
  description?: string;
}

/**
 * State history for undo/redo
 */
export interface StateHistory {
  /** Past actions (for undo) */
  past: StateAction[];
  /** Future actions (for redo) */
  future: StateAction[];
  /** Maximum history size */
  maxSize: number;
}

/**
 * Selector function to derive values from state
 */
export type Selector<TState, TResult> = (state: TState) => TResult;

/**
 * Middleware function for state changes
 */
export type StateMiddleware = (
  slice: string,
  previousState: unknown,
  newState: unknown,
  next: () => void
) => void;
