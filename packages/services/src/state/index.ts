// Types
export type {
  StateSlice,
  StateChangeEvent,
  StateSubscriber,
  StateAction,
  StateHistory,
  Selector,
  StateMiddleware,
} from './types';

// State manager
export {
  StateManager,
  createStateManager,
} from './state-manager';
export type { StateManagerOptions } from './state-manager';

// React integration
export {
  StateManagerProvider,
  useStateManager,
  useSlice,
  useSelector,
  useUndo,
  useCreateSlice,
  useBatchUpdate,
} from './react';
export type { StateManagerProviderProps } from './react';
