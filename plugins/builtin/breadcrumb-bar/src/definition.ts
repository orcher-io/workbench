import type { PluginDefinition } from '@orcher/workbench-plugin-api';

export const breadcrumbBarDefinition: PluginDefinition = {
  id: '@orcher/workbench-plugin-breadcrumb-bar',
  version: '0.0.1',
  name: 'Breadcrumb Bar',
  description: 'Breadcrumb bar for the active tab, with bookmark and menu controls',
  activationEvents: ['onStartup'],
};
