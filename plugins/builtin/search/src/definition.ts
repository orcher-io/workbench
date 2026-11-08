import type { PluginDefinition } from '@orcher/workbench-plugin-api';

export const searchDefinition: PluginDefinition = {
  id: '@orcher/workbench-plugin-search',
  version: '0.0.1',
  name: 'Search',
  description: 'Search across files and content',
  activationEvents: ['onCommand:search.focus', 'onView:search'],
  contributes: {
    commands: [
      {
        id: 'search.focus',
        title: 'Search: Focus on Search View',
        category: 'Search',
      },
      {
        id: 'search.findInFiles',
        title: 'Search: Find in Files',
        category: 'Search',
      },
      {
        id: 'search.replaceInFiles',
        title: 'Search: Replace in Files',
        category: 'Search',
      },
    ],
    keybindings: [
      {
        command: 'search.focus',
        key: 'Ctrl+Shift+F',
        mac: 'Cmd+Shift+F',
      },
      {
        command: 'search.replaceInFiles',
        key: 'Ctrl+Shift+H',
        mac: 'Cmd+Shift+H',
      },
    ],
    viewContainers: {
      activityBar: [
        {
          id: 'search',
          title: 'Search',
          icon: 'search',
        },
      ],
    },
    views: {
      search: [
        {
          id: 'search.results',
          name: 'Search Results',
        },
      ],
    },
  },
};
