import type { PluginDefinition } from '@orcher/workbench-plugin-api';

export const sampleDefinition: PluginDefinition = {
  id: '@orcher/workbench-plugin-sample',
  version: '0.0.1',
  name: 'Sample',
  description: 'Sample plugin',
  activationEvents: ['onStartup'],
  contributes: {
    commands: [
      {
        id: 'sample.hello',
        title: 'Hello from Sample',
        category: 'Sample',
      },
    ],
    editors: [
      {
        id: 'sample.editor',
        name: 'Sample Editor',
        selector: {
          scheme: 'sample',
        },
      },
    ],
    views: {
      explorer: [
        {
          id: 'sample.view',
          name: 'Sample',
        },
      ],
    },
  },
};
