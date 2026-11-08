'use client';

import {
  type ReactNode,
  type ReactElement,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { Box, Flex } from '@radix-ui/themes';
import {
  ActivityBar,
  AnimatePresence,
  Sidebar,
  SidebarHeader,
  StatusBar,
  StatusBarItem,
  type ActivityBarItem,
} from '@orcher/workbench-ui';
import {
  LayoutRenderer,
  useWindowManager,
  type TabState,
  type NewTabMenuItem,
} from '@orcher/workbench-window-manager';
import { FileIcon, MagnifyingGlassIcon, GearIcon } from '@radix-ui/react-icons';
import { useContainer } from '@orcher/workbench-di';
import { ServiceTokens, type ActivationEvent } from '@orcher/workbench-plugin-api';
import type { ExtensionRegistry } from '@orcher/workbench-services';
import { useViewService } from '../hooks/use-view-service';
import { useTabTreeSync } from '../hooks/use-tab-tree-sync';
import { SidebarRenderer } from './sidebar-renderer';

export interface ShellProps {
  /** Header content (rendered above the main content area) */
  header?: ReactNode;
  /** Breadcrumb bar content (rendered below tabs) */
  breadcrumbBar?: ReactNode;
  /** Logo element for activity bar */
  logo?: ReactNode;
  /** Callback when logo is clicked */
  onLogoClick?: () => void;
  /** Override activity bar items (if not using plugin system) */
  activityBarItems?: ActivityBarItem[];
  /** Secondary activity bar items (shown after separator) */
  activityBarSecondaryItems?: ActivityBarItem[];
  /** Bottom activity bar items */
  activityBarBottomItems?: ActivityBarItem[];
  /** Left sidebar content (if not using plugin system) */
  leftSidebar?: ReactNode;
  /** Right sidebar content */
  rightSidebar?: ReactNode;
  /** Status bar left items */
  statusBarLeft?: ReactNode;
  /** Status bar right items */
  statusBarRight?: ReactNode;
  /** Render function for editor content */
  renderEditor?: (tab: TabState) => ReactNode;
  /** Whether left sidebar is visible (only used if not using ViewService) */
  showLeftSidebar?: boolean;
  /** Title for the left sidebar header (when not using ViewService) */
  sidebarTitle?: string;
  /** Callback when sidebar toggle button is clicked */
  onSidebarToggle?: () => void;
  /** Whether right sidebar is visible */
  showRightSidebar?: boolean;
  /** Drawer panel rendered inside the editor area (right side, pushes content) */
  drawer?: ReactNode;
  /** Menu items for the new tab dropdown */
  newTabMenuItems?: NewTabMenuItem[];
  /** Callback when a new tab menu item is selected */
  onNewTabSelect?: (item: NewTabMenuItem) => void;
  /** Placeholder text for the new tab search */
  newTabSearchPlaceholder?: string;
  /** Icon resolver for activity bar items from plugins */
  iconResolver?: (iconId: string) => ReactElement;
  /** Settings menu content — rendered in a popover from the gear icon */
  settingsMenu?: ReactNode;
}

const defaultIconResolver = (iconId: string): ReactElement => {
  switch (iconId) {
    case 'files':
      return <FileIcon width={20} height={20} />;
    case 'search':
      return <MagnifyingGlassIcon width={20} height={20} />;
    case 'settings':
      return <GearIcon width={20} height={20} />;
    default:
      return <FileIcon width={20} height={20} />;
  }
};

/**
 * Main application shell component
 *
 * If plugins contribute viewContainers to the activityBar, those will be used
 * automatically. Otherwise, falls back to the provided activityBarItems prop.
 */
export function Shell({
  header,
  breadcrumbBar,
  logo,
  onLogoClick,
  activityBarItems,
  activityBarSecondaryItems,
  activityBarBottomItems,
  leftSidebar,
  rightSidebar,
  statusBarLeft,
  statusBarRight,
  renderEditor = () => null,
  showLeftSidebar = true,
  sidebarTitle,
  onSidebarToggle,
  showRightSidebar = false,
  drawer,
  newTabMenuItems,
  onNewTabSelect,
  newTabSearchPlaceholder,
  iconResolver = defaultIconResolver,
  settingsMenu,
}: ShellProps) {
  const {
    activeContainerId,
    sidebarVisible,
    activityBarContainers,
    handleActivityItemClick,
    toggleSidebar,
  } = useViewService();

  // Track which activity bar item was last clicked (for active state).
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Sync activeItemId with the active tab's icon — handles tab switches,
  // page refresh, and programmatic tab activation.
  const { layout } = useWindowManager();
  const container = useContainer();
  useEffect(() => {
    if (!layout?.root) return;

    const findActiveTab = (node: any): any => {
      if (node.type === 'tabGroup' && node.id === layout.activePaneId) {
        return node.tabs?.find((t: any) => t.id === node.activeTabId);
      }
      if (node.children) {
        for (const child of node.children) {
          const found = findActiveTab(child);
          if (found) return found;
        }
      }
      return null;
    };

    const activeTab = findActiveTab(layout.root);
    if (activeTab?.groupId || activeTab?.icon) {
      setActiveItemId(activeTab.groupId ?? activeTab.icon);
    }

    // Trigger onView: and onEditor: activation events for lazy plugins
    if (activeTab) {
      try {
        const registry = container.resolve<ExtensionRegistry>(ServiceTokens.PluginRegistry);
        if (activeTab.editorId) {
          registry.triggerActivation(`onEditor:${activeTab.editorId}` as ActivationEvent);
        }
        if (activeTab.uri) {
          // Extract view ID from URI: "orcher://billing" → "orcher.billing"
          const match = activeTab.uri.match(/^([^:]+):\/\/(.+)$/);
          if (match) {
            registry.triggerActivation(`onView:${match[1]}.${match[2]}` as ActivationEvent);
          }
        }
      } catch { /* container may not have registry yet */ }
    }
  }, [layout, layout?.activePaneId, container]);

  // Search visibility state for sidebar
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const toggleSearch = useCallback(() => {
    setIsSearchVisible((prev) => !prev);
  }, []);

  // Sync tab activation with tree view selection
  useTabTreeSync();

  // Get active container title
  const activeContainerTitle = useMemo(() => {
    if (!activeContainerId) return 'Explorer';
    const container = activityBarContainers.find(
      (c) => c.id === activeContainerId,
    );
    return container?.title ?? 'Explorer';
  }, [activeContainerId, activityBarContainers]);

  // Use plugin-contributed containers or fallback to props
  const usePluginContainers = activityBarContainers.length > 0;

  const items: ActivityBarItem[] = useMemo(() => {
    if (usePluginContainers) {
      return activityBarContainers.map((container) => ({
        id: container.id,
        icon: iconResolver(container.icon),
        label: container.title,
        active: container.id === activeContainerId,
        onClick: () => handleActivityItemClick(container.id),
      }));
    }

    // Fallback to provided items — use local activeItemId for active state.
    // Items with their own onClick handle navigation (e.g. opening tabs);
    // items without onClick fall back to the view service sidebar toggle.
    if (activityBarItems) {
      return activityBarItems.map((item) => ({
        ...item,
        active: item.id === activeItemId,
        onClick: item.onClick
          ? () => { setActiveItemId(item.id); item.onClick?.(); }
          : () => { setActiveItemId(item.id); handleActivityItemClick(item.id); },
      }));
    }

    return [];
  }, [
    usePluginContainers,
    activityBarContainers,
    activeContainerId,
    activeItemId,
    handleActivityItemClick,
    iconResolver,
    activityBarItems,
  ]);

  // Build bottom items — settings gear with optional popover content.
  // Skip auto-adding settings if the caller already provided one.
  const bottomItems: ActivityBarItem[] = useMemo(() => {
    const items: ActivityBarItem[] = (activityBarBottomItems ?? []).map((item) => ({
      ...item,
      active: item.id === activeItemId,
      onClick: item.onClick
        ? () => { setActiveItemId(item.id); item.onClick?.(); }
        : item.onClick,
    }));
    const hasSettings = items.some((i) => i.id === 'settings');
    if (!hasSettings) {
      items.push({
        id: 'settings',
        icon: <GearIcon width={20} height={20} />,
        label: 'Settings',
        content: settingsMenu,
      });
    }
    return items;
  }, [activityBarBottomItems, settingsMenu, activeItemId]);

  // Determine sidebar visibility
  const leftSidebarVisible = usePluginContainers
    ? sidebarVisible
    : showLeftSidebar;

  return (
    <Flex
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Activity bar - spans full height */}
      <ActivityBar
        logo={logo}
        onLogoClick={onLogoClick}
        items={items}
        secondaryItems={activityBarSecondaryItems}
        bottomItems={bottomItems}
      />

      {/* Main content area */}
      <Flex direction="column" style={{ flex: 1, overflow: 'hidden' }}>
        {/* Header */}
        {header}

        {/* Content below header */}
        <Flex style={{ flex: 1, overflow: 'hidden' }}>
          {/* Left sidebar — AnimatePresence drives the expand/collapse so
              toggling from the activity bar animates instead of snapping.
              initial={false} skips the animation on first paint. */}
          <AnimatePresence initial={false}>
            {leftSidebarVisible && (
              <Sidebar position="left" width={260} animateMount>
              <SidebarHeader
                title={usePluginContainers ? activeContainerTitle : (sidebarTitle ?? activeContainerTitle)}
                position="left"
                onToggle={onSidebarToggle ?? toggleSidebar}
                showSearchButton={usePluginContainers}
                isSearchActive={isSearchVisible}
                onSearchToggle={toggleSearch}
              />
              {usePluginContainers ? (
                <SidebarRenderer
                  fallback={leftSidebar}
                  isSearchVisible={isSearchVisible}
                  onSearchVisibilityChange={setIsSearchVisible}
                />
              ) : (
                leftSidebar
              )}
              </Sidebar>
            )}
          </AnimatePresence>

          {/* Editor area + drawer */}
          <Flex style={{ flex: 1, overflow: 'hidden' }}>
            <Box style={{ flex: 1, overflow: 'hidden' }}>
              <LayoutRenderer
                renderEditor={renderEditor}
                newTabMenuItems={newTabMenuItems}
                onNewTabSelect={onNewTabSelect}
                newTabSearchPlaceholder={newTabSearchPlaceholder}
                breadcrumbBar={breadcrumbBar}
                iconResolver={iconResolver}
              />
            </Box>
            {drawer}
          </Flex>

          {/* Right sidebar */}
          <AnimatePresence initial={false}>
            {showRightSidebar && rightSidebar && (
              <Sidebar position="right" width={300} animateMount>
                {rightSidebar}
              </Sidebar>
            )}
          </AnimatePresence>
        </Flex>

        {/* Status bar */}
        <StatusBar
          leftItems={
            statusBarLeft ?? (
              <>
                <StatusBarItem>main</StatusBarItem>
                <StatusBarItem>Ln 1, Col 1</StatusBarItem>
              </>
            )
          }
          rightItems={
            statusBarRight ?? (
              <>
                <StatusBarItem>UTF-8</StatusBarItem>
                <StatusBarItem>TypeScript</StatusBarItem>
              </>
            )
          }
        />
      </Flex>
    </Flex>
  );
}
