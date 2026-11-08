// Types
export type {
  ResolvedContribution,
  ResolvedCommand,
  ResolvedEditor,
  ResolvedView,
  ResolvedMenuItem,
  ResolvedKeybinding,
  ResolvedConfiguration,
  ResolvedType,
  ResolvedStatusBarItem,
  ResolvedEditorComponentProps,
  ViewComponentProps,
  TypeProvider,
} from './types';

// Collector
export {
  createEmptyContributions,
  collectContributions,
  collectAllContributions,
} from './collector';
export type { CollectedContributions } from './collector';

// When clause evaluation
export { evaluateWhenClause, createWhenContext } from './when-clause';
export type { WhenContext } from './when-clause';

// Resolver
export { ContributionResolver, createResolver } from './resolver';
