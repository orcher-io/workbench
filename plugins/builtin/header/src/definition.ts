import type { PluginDefinition } from '@orcher/workbench-plugin-api';

export const headerDefinition: PluginDefinition = {
  id: '@orcher/workbench-plugin-header',
  version: '0.0.1',
  name: 'Header',
  description: 'Top header bar with user menu and notifications',
  activationEvents: ['onStartup'],
};
