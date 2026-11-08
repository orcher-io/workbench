// Schema
export * from './schema';

// Extension Points
export * from './extension-points';

// Tree
export * from './tree';

// Explorer
export * from './explorer';

// Lifecycle
export * from './lifecycle';

// Context
export * from './context';

// Contributions - explicit exports to avoid conflicts with extension-points
export type {
  ResolvedContribution,
  ResolvedCommand,
  ResolvedEditor,
  ResolvedView,
  ResolvedKeybinding,
  ResolvedConfiguration,
  ResolvedType,
  ResolvedStatusBarItem,
  ResolvedEditorComponentProps,
  CollectedContributions,
  WhenContext,
} from './contributions';
export {
  createEmptyContributions,
  collectContributions,
  collectAllContributions,
  evaluateWhenClause,
  createWhenContext,
  ContributionResolver,
  createResolver,
} from './contributions';
