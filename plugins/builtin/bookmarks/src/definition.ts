import type { PluginDefinition } from '@orcher/workbench-plugin-api';

export const bookmarksDefinition: PluginDefinition = {
  id: '@orcher/workbench-plugin-bookmarks',
  version: '1.0.0',
  name: 'Bookmarks V2',
  description: 'Bookmarks plugin using the new simple Explorer API',
  activationEvents: ['onStartup'],
  contributes: {
    commands: [
      {
        id: 'bookmarks.addBookmark',
        title: 'Add Bookmark',
        category: 'Bookmarks',
      },
      {
        id: 'bookmarks.addGroup',
        title: 'Add Group',
        category: 'Bookmarks',
      },
    ],
  },
};
