// Bootstrap
export * from './bootstrap';

// Shell
export * from './shell';

// SSR
export * from './ssr';

// Hooks
export * from './hooks';

// Re-export commonly used items from other packages
export {
  useWindowManager,
  type TabState,
  type LayoutState,
  type NewTabMenuItem,
} from '@orcher/workbench-window-manager';
export { useService, useContainer } from '@orcher/workbench-di';
export type { PluginDefinition, PluginModule } from '@orcher/workbench-plugin-api';
export { useTheme, type ThemeAppearance } from '@orcher/workbench-ui';
