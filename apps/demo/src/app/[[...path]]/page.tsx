'use client';

import {
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { Box, Text, Heading } from '@radix-ui/themes';
import {
  FileIcon,
  RocketIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  GearIcon,
  BookmarkIcon,
} from '@radix-ui/react-icons';
import {
  WorkbenchProvider,
  Shell,
  useWindowManager,
  useNavigationService,
  useRoutingSync,
  useTheme,
  type TabState,
  type NewTabMenuItem,
} from '@orcher/workbench-core';
import {
  CommandPalette,
  useCommandPalette,
  type CommandItem,
} from '@orcher/workbench-ui';

// Import plugins
import {
  welcomeDefinition,
  welcomeModule,
  WelcomeEditor,
} from '@orcher/workbench-plugin-welcome';
import {
  settingsDefinition,
  settingsModule,
  SettingsEditor,
  SettingsMenu,
  type Workspace,
  type Project,
} from '@orcher/workbench-plugin-settings';
import { searchDefinition, searchModule } from '@orcher/workbench-plugin-search';
import {
  headerDefinition,
  headerModule,
  Header,
  type WorkbenchNotification,
} from '@orcher/workbench-plugin-header';
import {
  breadcrumbBarDefinition,
  breadcrumbBarModule,
  BreadcrumbBar,
} from '@orcher/workbench-plugin-breadcrumb-bar';
import { explorerDefinition, explorerModule } from '@orcher/workbench-plugin-explorer';
import {
  bookmarksDefinition,
  bookmarksModule,
} from '@orcher/workbench-plugin-bookmarks';

// ============ EDITORS ============

function WelcomeEditorWrapper() {
  const { openTab } = useWindowManager();

  const handleNewFile = () => {
    openTab({
      uri: `file://untitled-${Date.now()}`,
      title: 'Untitled',
      editorId: 'text.editor',
      dirty: false,
      pinned: false,
      preview: true,
    });
  };

  return (
    <WelcomeEditor
      onNewFile={handleNewFile}
      onOpenFolder={() => console.log('Open folder')}
    />
  );
}

function TextEditor({ tab }: { tab: TabState }) {
  const { updateTab } = useWindowManager();

  return (
    <Box
      p="4"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Heading size="4" mb="2">
        {tab.title}
      </Heading>
      <Text size="1" color="gray" mb="4">
        URI: {tab.uri}
      </Text>
      <textarea
        style={{
          width: '100%',
          flex: 1,
          minHeight: 200,
          backgroundColor: 'var(--gray-2)',
          border: '1px solid var(--gray-6)',
          borderRadius: 4,
          padding: 12,
          color: 'var(--gray-12)',
          fontFamily: 'monospace',
          fontSize: 14,
          resize: 'none',
        }}
        placeholder="Start typing..."
        onChange={() => {
          if (!tab.dirty) {
            updateTab(tab.id, { dirty: true });
          }
        }}
      />
    </Box>
  );
}

// Editor registry
const editorRegistry: Record<string, React.ComponentType<{ tab: TabState }>> = {
  'welcome.editor': () => <WelcomeEditorWrapper />,
  'text.editor': TextEditor,
  'settings.editor': () => <SettingsEditor />,
  'default.editor': TextEditor,
};

function renderEditor(tab: TabState) {
  const Editor = editorRegistry[tab.editorId];
  if (Editor) {
    return <Editor tab={tab} />;
  }
  return (
    <Box p="4">
      <Text color="red">Unknown editor: {tab.editorId}</Text>
    </Box>
  );
}

// ============ MAIN APP ============

// Breadcrumb bar wrapper that uses the navigation service and syncs with active tab
function BreadcrumbBarWrapper() {
  const {
    breadcrumbs,
    isBookmarked,
    toggleBookmark,
    setBreadcrumbs,
  } = useNavigationService();

  const { layout } = useWindowManager();

  // Get active tab info
  const activeTab = useMemo(() => {
    const findActiveTab = (node: typeof layout.root): TabState | null => {
      if (node.type === 'tabGroup') {
        return node.tabs.find((t) => t.id === node.activeTabId) || null;
      }
      for (const child of node.children) {
        const found = findActiveTab(child);
        if (found) return found;
      }
      return null;
    };
    return findActiveTab(layout.root);
  }, [layout]);

  // Track which tab URI we've set breadcrumbs for
  const lastBreadcrumbUri = useRef<string | null>(null);

  // Helper to create breadcrumbs from a tab
  const createBreadcrumbsFromTab = useCallback((tab: TabState) => {
    const uri = tab.uri || '';
    const path = uri.replace(/^(file|item):\/\//, '');
    const parts = path.split('/').filter(Boolean);

    if (parts.length > 0) {
      return parts.map((part, index) => ({
        id: parts.slice(0, index + 1).join('/'),
        label: part,
        path: '/' + parts.slice(0, index + 1).join('/'),
      }));
    } else {
      return [{ id: tab.id, label: tab.title }];
    }
  }, []);

  // Update breadcrumb when active tab changes
  useEffect(() => {
    if (activeTab) {
      const uri = activeTab.uri || '';

      // Only update if the URI changed (prevents resetting on every render)
      if (lastBreadcrumbUri.current === uri) return;
      lastBreadcrumbUri.current = uri;

      setBreadcrumbs(createBreadcrumbsFromTab(activeTab));
    }
  }, [activeTab, setBreadcrumbs, createBreadcrumbsFromTab]);

  // Track if we've done initial hydration sync
  const hasHydrated = useRef(false);

  // On mount, wait for hydration and set breadcrumbs from active tab
  useEffect(() => {
    if (hasHydrated.current) return;

    // Use a small delay to ensure Zustand state is hydrated
    const timeoutId = setTimeout(() => {
      hasHydrated.current = true;
      if (activeTab && breadcrumbs.length === 0) {
        lastBreadcrumbUri.current = activeTab.uri || '';
        setBreadcrumbs(createBreadcrumbsFromTab(activeTab));
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [activeTab, breadcrumbs.length, setBreadcrumbs, createBreadcrumbsFromTab]);

  return (
    <BreadcrumbBar
      isBookmarked={isBookmarked}
      breadcrumbs={breadcrumbs}
      onToggleBookmark={toggleBookmark}
      onBreadcrumbClick={(item) => console.log('Breadcrumb click:', item)}
      onMenuClick={() => console.log('Menu click')}
    />
  );
}

// Sample workspaces and projects for demo
const sampleWorkspaces: Workspace[] = [
  { id: 'ws-1', name: 'Personal', description: 'Personal workspace' },
  { id: 'ws-2', name: 'Acme Corp', description: 'Company workspace' },
  { id: 'ws-3', name: 'Side Project', description: 'Weekend experiments' },
];

const sampleProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Dashboard',
    workspaceId: 'ws-1',
    description: 'Personal dashboard',
  },
  {
    id: 'proj-2',
    name: 'Blog',
    workspaceId: 'ws-1',
    description: 'My tech blog',
  },
  {
    id: 'proj-3',
    name: 'Marketing Site',
    workspaceId: 'ws-2',
    description: 'Main company website',
  },
  {
    id: 'proj-4',
    name: 'Internal Tools',
    workspaceId: 'ws-2',
    description: 'Admin tools',
  },
  {
    id: 'proj-5',
    name: 'API Gateway',
    workspaceId: 'ws-2',
    description: 'API infrastructure',
  },
  {
    id: 'proj-6',
    name: 'Experiment Alpha',
    workspaceId: 'ws-3',
    description: 'Testing new ideas',
  },
];

function AppContent() {
  const { openTab, layout } = useWindowManager();
  const { isOpen, close } = useCommandPalette();
  const { appearance, toggleTheme } = useTheme();

  // Enable routing sync
  useRoutingSync();

  // Notification state
  const [notifications, setNotifications] = useState<WorkbenchNotification[]>(() => {
    const now = Date.now();
    return [
      {
        id: '1',
        title: 'Deploy succeeded',
        description: 'Production v2.4.1 is live',
        type: 'success' as const,
        read: false,
        timestamp: new Date(now - 2 * 60000).toISOString(),
      },
      {
        id: '2',
        title: 'John commented on PR #142',
        description: '"Looks good, one nit on the validation logic"',
        type: 'info' as const,
        read: false,
        timestamp: new Date(now - 15 * 60000).toISOString(),
        actionLabel: 'View PR',
        onAction: () => console.log('View PR #142'),
      },
      {
        id: '3',
        title: 'New team member joined',
        description: 'Sarah Chen joined the Engineering workspace',
        type: 'info' as const,
        read: false,
        timestamp: new Date(now - 3 * 3600000).toISOString(),
      },
      {
        id: '4',
        title: 'Build failed on staging',
        description: 'Tests failing in auth module — 3 assertions',
        type: 'error' as const,
        read: true,
        timestamp: new Date(now - 26 * 3600000).toISOString(),
        actionLabel: 'View logs',
        onAction: () => console.log('View build logs'),
      },
      {
        id: '5',
        title: 'Security update available',
        description: 'Critical patch for dependency lodash@4.17.20',
        type: 'warning' as const,
        read: true,
        timestamp: new Date(now - 50 * 3600000).toISOString(),
      },
      {
        id: '6',
        title: 'Workspace storage at 80%',
        description: 'Consider archiving old projects to free space',
        type: 'warning' as const,
        read: true,
        timestamp: new Date(now - 72 * 3600000).toISOString(),
      },
    ];
  });

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Workspace selector state
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    sampleWorkspaces[0],
  );
  const [selectedProject, setSelectedProject] = useState<Project | null>(
    sampleProjects[0],
  );

  // Menu items for the new tab button
  const newTabMenuItems: NewTabMenuItem[] = useMemo(
    () => [
      {
        id: 'new-file',
        label: 'New File',
        icon: <FileIcon />,
        description: 'Create a new text file',
        category: 'Create',
      },
      {
        id: 'welcome',
        label: 'Welcome',
        icon: <RocketIcon />,
        description: 'Open the welcome page',
        category: 'View',
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: <GearIcon />,
        description: 'Open settings editor',
        category: 'View',
      },
    ],
    [],
  );

  const handleNewTabSelect = (item: NewTabMenuItem) => {
    switch (item.id) {
      case 'new-file':
        openTab({
          uri: `file://untitled-${Date.now()}`,
          title: 'Untitled',
          editorId: 'text.editor',
          dirty: false,
          pinned: false,
          preview: false,
        });
        break;
      case 'welcome':
        openTab({
          uri: 'welcome://home',
          title: 'Welcome',
          editorId: 'welcome.editor',
          dirty: false,
          pinned: true,
          preview: false,
        });
        break;
      case 'settings':
        openTab({
          uri: 'settings://preferences',
          title: 'Settings',
          editorId: 'settings.editor',
          dirty: false,
          pinned: false,
          preview: false,
        });
        break;
    }
  };

  // Commands for the palette
  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'file.new',
        title: 'New File',
        category: 'File',
        icon: <PlusIcon />,
        shortcut: 'Cmd+N',
        onSelect: () => {
          openTab({
            uri: `file://untitled-${Date.now()}`,
            title: 'Untitled',
            editorId: 'text.editor',
            dirty: false,
            pinned: false,
            preview: false,
          });
        },
      },
      {
        id: 'file.open',
        title: 'Open File',
        category: 'File',
        icon: <FileIcon />,
        shortcut: 'Cmd+O',
        onSelect: () => {
          console.log('Open file');
        },
      },
      {
        id: 'view.welcome',
        title: 'Show Welcome',
        category: 'View',
        icon: <RocketIcon />,
        onSelect: () => {
          openTab({
            uri: 'welcome://home',
            title: 'Welcome',
            editorId: 'welcome.editor',
            dirty: false,
            pinned: true,
            preview: false,
          });
        },
      },
      {
        id: 'view.settings',
        title: 'Open Settings',
        category: 'Preferences',
        icon: <GearIcon />,
        shortcut: 'Cmd+,',
        onSelect: () => {
          openTab({
            uri: 'settings://preferences',
            title: 'Settings',
            editorId: 'settings.editor',
            dirty: false,
            pinned: false,
            preview: false,
          });
        },
      },
      {
        id: 'view.search',
        title: 'Search in Files',
        category: 'View',
        icon: <MagnifyingGlassIcon />,
        shortcut: 'Cmd+Shift+F',
        onSelect: () => {
          console.log('Search');
        },
      },
      {
        id: 'explorer.focus',
        title: 'Focus on Explorer',
        category: 'View',
        shortcut: 'Cmd+Shift+E',
        onSelect: () => {
          console.log('Focus explorer');
        },
      },
    ],
    [openTab],
  );

  // Open welcome tab on first load if no tabs
  const hasCheckedInitialTabs = useRef(false);

  useEffect(() => {
    if (hasCheckedInitialTabs.current) return;

    const timeoutId = setTimeout(() => {
      hasCheckedInitialTabs.current = true;

      const hasAnyTabs = (node: typeof layout.root): boolean => {
        if (node.type === 'tabGroup') {
          return node.tabs.length > 0;
        }
        return node.children.some(hasAnyTabs);
      };

      if (!hasAnyTabs(layout.root)) {
        openTab({
          uri: 'welcome://home',
          title: 'Welcome',
          editorId: 'welcome.editor',
          dirty: false,
          pinned: true,
          preview: false,
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [layout, openTab]);

  // Icon resolver for activity bar items from plugins
  const iconResolver = (iconId: string) => {
    switch (iconId) {
      case 'files':
        return <FileIcon width={20} height={20} />;
      case 'search':
        return <MagnifyingGlassIcon width={20} height={20} />;
      case 'settings':
        return <GearIcon width={20} height={20} />;
      case 'bookmark':
        return <BookmarkIcon width={20} height={20} />;
      default:
        return <FileIcon width={20} height={20} />;
    }
  };

  return (
    <>
      <Shell
        logo={
          <Box
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background:
                'linear-gradient(135deg, #1a1a1a, #000000)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14,
              color: 'white',
            }}
          >
            P
          </Box>
        }
        onLogoClick={() => console.log('Logo clicked')}
        header={
          <Header
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onDismiss={handleDismiss}
              onClearAll={handleClearAll}
              onMarkAllRead={handleMarkAllRead}
              onNotificationClick={(n) => console.log('Notification clicked:', n.id)}
            />
        }
        settingsMenu={
          <SettingsMenu
            workspaces={sampleWorkspaces}
            selectedWorkspace={selectedWorkspace}
            onWorkspaceSelect={(workspace) => {
              setSelectedWorkspace(workspace);
              const firstProject = sampleProjects.find(
                (p) => p.workspaceId === workspace.id,
              );
              setSelectedProject(firstProject || null);
            }}
            onWorkspaceCreate={() => console.log('Create workspace')}
            projects={sampleProjects}
            selectedProject={selectedProject}
            onProjectSelect={setSelectedProject}
            onProjectCreate={() => console.log('Create project')}
            theme={appearance}
            onThemeToggle={toggleTheme}
            onSettings={() => {
              openTab({
                uri: 'settings://preferences',
                title: 'Settings',
                editorId: 'settings.editor',
                dirty: false,
                pinned: false,
                preview: false,
              });
            }}
            onAccountSettings={() => console.log('Account settings')}
            onLogout={() => console.log('Log out')}
          />
        }
        breadcrumbBar={<BreadcrumbBarWrapper />}
        renderEditor={renderEditor}
        newTabMenuItems={newTabMenuItems}
        onNewTabSelect={handleNewTabSelect}
        newTabSearchPlaceholder="Open a new tab..."
        iconResolver={iconResolver}
      />
      <CommandPalette
        isOpen={isOpen}
        onClose={close}
        commands={commands}
        placeholder="Type a command or search..."
      />
    </>
  );
}

// Authenticated app — renders WorkbenchProvider + Shell
function DemoApp() {
  const pathname = usePathname();

  return (
    <WorkbenchProvider
      config={{
        theme: {
          appearance: 'dark',
          accentColor: 'gray',
        },
        plugins: [
          { definition: welcomeDefinition, module: welcomeModule },
          { definition: settingsDefinition, module: settingsModule },
          // Explorer must be loaded first to provide ExplorerAPI
          {
            definition: explorerDefinition,
            module: explorerModule,
          },
          // Bookmarks V2 uses the new simple ExplorerAPI
          { definition: bookmarksDefinition, module: bookmarksModule },
          { definition: searchDefinition, module: searchModule },
          { definition: headerDefinition, module: headerModule },
          { definition: breadcrumbBarDefinition, module: breadcrumbBarModule },
        ],
      }}
      initialPath={pathname}
    >
      <AppContent />
    </WorkbenchProvider>
  );
}

export default function Page() {
  return <DemoApp />;
}
