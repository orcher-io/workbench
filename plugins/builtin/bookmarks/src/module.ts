import type {
  PluginModule,
  PluginActivationContext,
  IExplorerAPI,
} from '@orcher/workbench-plugin-api';
import { ServiceTokens } from '@orcher/workbench-plugin-api';

export const bookmarksModule: PluginModule = {
  activate(context: PluginActivationContext) {
    // Get the Explorer API - the simple way to register menu items!
    const explorerAPI = context.container.resolve<IExplorerAPI>(
      ServiceTokens.ExplorerAPI,
    );

    // Register section (creates activity bar item automatically)
    const sectionDisposable = explorerAPI.registerSection(
      {
        id: 'bookmarks',
        title: 'Bookmarks',
        icon: 'bookmark',
        order: 20,
      },
      {
        storageKey: 'bookmarks-tree-v2',
        searchable: true,
        searchPlaceholder: 'Search bookmarks...',
        showStatusBar: true,
        showExpandCollapseAll: true,
      },
    );
    context.subscriptions.push(sectionDisposable);

    // Register menu items - no TreeDataProvider knowledge needed!
    const itemsDisposable = explorerAPI.registerMenuItems('bookmarks', [
      // Development Tools group
      {
        id: 'dev-tools',
        label: 'Development',
        hasChildren: true,
        order: 1,
      },
      {
        id: 'github',
        label: 'GitHub',
        parentId: 'dev-tools',
        uri: 'https://github.com',
        description: 'Code hosting',
        order: 1,
      },
      {
        id: 'stackoverflow',
        label: 'Stack Overflow',
        parentId: 'dev-tools',
        uri: 'https://stackoverflow.com',
        description: 'Q&A for developers',
        order: 2,
      },
      {
        id: 'mdn',
        label: 'MDN Web Docs',
        parentId: 'dev-tools',
        uri: 'https://developer.mozilla.org',
        description: 'Web documentation',
        order: 3,
      },

      // Documentation group
      {
        id: 'docs',
        label: 'Documentation',
        hasChildren: true,
        order: 2,
      },
      {
        id: 'react-docs',
        label: 'React Docs',
        parentId: 'docs',
        uri: 'https://react.dev',
        description: 'React documentation',
        order: 1,
      },
      {
        id: 'typescript-docs',
        label: 'TypeScript Docs',
        parentId: 'docs',
        uri: 'https://www.typescriptlang.org/docs',
        description: 'TypeScript handbook',
        order: 2,
      },
      {
        id: 'nextjs-docs',
        label: 'Next.js Docs',
        parentId: 'docs',
        uri: 'https://nextjs.org/docs',
        description: 'Next.js documentation',
        order: 3,
      },

      // Tools group
      {
        id: 'tools',
        label: 'Tools',
        hasChildren: true,
        order: 3,
      },
      {
        id: 'figma',
        label: 'Figma',
        parentId: 'tools',
        uri: 'https://figma.com',
        description: 'Design tool',
        order: 1,
      },
      {
        id: 'vercel',
        label: 'Vercel',
        parentId: 'tools',
        uri: 'https://vercel.com',
        description: 'Deployment platform',
        order: 2,
      },

      // Learning group with nested subgroups
      {
        id: 'learning',
        label: 'Learning',
        hasChildren: true,
        order: 4,
      },
      {
        id: 'courses',
        label: 'Courses',
        parentId: 'learning',
        hasChildren: true,
        order: 1,
      },
      {
        id: 'udemy',
        label: 'Udemy',
        parentId: 'courses',
        uri: 'https://udemy.com',
        order: 1,
      },
      {
        id: 'coursera',
        label: 'Coursera',
        parentId: 'courses',
        uri: 'https://coursera.org',
        order: 2,
      },
      {
        id: 'tutorials',
        label: 'Tutorials',
        parentId: 'learning',
        hasChildren: true,
        order: 2,
      },
      {
        id: 'freecodecamp',
        label: 'freeCodeCamp',
        parentId: 'tutorials',
        uri: 'https://freecodecamp.org',
        order: 1,
      },
    ]);
    context.subscriptions.push(itemsDisposable);

    // Example: Dynamic updates are easy
    // explorerAPI.registerMenuItem('bookmarks', {
    //   id: 'new-bookmark',
    //   label: 'New Bookmark',
    //   parentId: 'dev-tools',
    //   uri: 'https://example.com',
    // });
  },
};
