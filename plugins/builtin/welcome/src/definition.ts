import type { PluginDefinition } from '@orcher/workbench-plugin-api';

export const welcomeDefinition: PluginDefinition = {
  id: '@orcher/workbench-plugin-welcome',
  version: '0.0.1',
  name: 'Welcome',
  description: 'Welcome screen plugin showing quick actions and recent items',
  activationEvents: ['onStartup'],
  contributes: {
    commands: [
      {
        id: 'welcome.show',
        title: 'Show Welcome',
        category: 'Help',
      },
    ],
    editors: [
      {
        id: 'welcome.editor',
        name: 'Welcome',
        selector: {
          scheme: 'welcome',
        },
      },
    ],
  },
};
