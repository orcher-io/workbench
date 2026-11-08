import type { PluginDefinition } from '@orcher/workbench-plugin-api';

export const explorerDefinition: PluginDefinition = {
  id: '@orcher/workbench-plugin-explorer',
  version: '1.0.0',
  name: 'Explorer',
  description:
    'Central explorer with simple plugin registration API and URL routing',
  activationEvents: ['*'], // Always active - manages all sections
  contributes: {
    commands: [
      {
        id: 'explorer.navigateTo',
        title: 'Navigate to Path',
        category: 'Navigation',
      },
      {
        id: 'explorer.refresh',
        title: 'Refresh Explorer',
        category: 'View',
      },
      {
        id: 'explorer.openItem',
        title: 'Open Item',
        category: 'Explorer',
      },
    ],
  },
};
