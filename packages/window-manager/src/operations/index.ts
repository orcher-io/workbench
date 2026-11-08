// ID generation
export { generateId, resetIdCounter } from './id-generator';

// Tree utilities
export {
  findNode,
  findTabGroup,
  findParent,
  getAllTabGroups,
  getAllTabs,
  findTab,
  findTabByUri,
  countTabs,
  isPaneEmpty,
  getTreeDepth,
  cloneNode,
  cloneLayout,
} from './tree-utils';

// Tab operations
export {
  openTab,
  closeTab,
  closeAllTabs,
  closeOtherTabs,
  activateTab,
  moveTab,
  updateTab,
  pinTab,
  reorderTabs,
} from './tab-operations';
export type { TabOperationResult } from './tab-operations';

// Split operations
export {
  splitPane,
  mergePane,
  resizeSplit,
  handleDrop,
  activatePane,
  swapPanes,
  maximizePane,
} from './split-operations';
export type { SplitOperationResult } from './split-operations';

// Cleanup utilities
export {
  cleanupEmptyPanes,
  cleanupLayout,
  createEmptyLayout,
  flattenSplits,
  validateLayout,
} from './cleanup';
