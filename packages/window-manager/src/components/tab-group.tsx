'use client';

import { Box, Text } from '@radix-ui/themes';
import { type ReactNode } from 'react';
import type { TabGroupNode, TabState, DropPosition } from '../models';
import { TabBar, type NewTabMenuItem } from './tab-bar';
import { DropZone } from './drop-zone';
import { useWindowManager } from '../hooks';

export interface TabGroupProps {
  node: TabGroupNode;
  renderEditor: (tab: TabState) => ReactNode;
  isActive: boolean;
  /** Menu items for the new tab dropdown */
  newTabMenuItems?: NewTabMenuItem[];
  /** Callback when a new tab menu item is selected */
  onNewTabSelect?: (item: NewTabMenuItem) => void;
  /** Placeholder text for the new tab search */
  newTabSearchPlaceholder?: string;
  /** Breadcrumb bar to render below tabs */
  breadcrumbBar?: ReactNode;
  /** Icon resolver for tab icons */
  iconResolver?: (iconId: string) => React.ReactElement;
}

export function TabGroup({
  node,
  renderEditor,
  isActive,
  newTabMenuItems,
  onNewTabSelect,
  newTabSearchPlaceholder,
  breadcrumbBar,
  iconResolver,
}: TabGroupProps) {
  const {
    activateTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    pinTab,
    split,
    activatePane,
    handleDrop,
    reorderTab,
    moveTab,
    openFloatingWindow,
    toggleMaximizePane,
    maximizedPaneId,
  } = useWindowManager();

  const activeTab = node.tabs.find((t) => t.id === node.activeTabId);

  const onDropHandler = (
    tabId: string,
    paneId: string,
    position: DropPosition,
  ) => {
    handleDrop(tabId, paneId, position);
  };

  const handleSplitRight = (tabId: string) => {
    split(node.id, 'horizontal', { moveTabId: tabId });
  };

  const handleSplitDown = (tabId: string) => {
    split(node.id, 'vertical', { moveTabId: tabId });
  };

  const handleExternalTabDrop = (tabId: string) => {
    // Move the external tab to this pane's tab bar
    moveTab(tabId, node.id);
  };

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        minHeight: 0, // Allow flex shrinking
        outline: isActive ? '1px solid var(--accent-7)' : 'none',
      }}
      onClick={() => activatePane(node.id)}
    >
      <Box style={{ flexShrink: 0 }}>
        <TabBar
          tabs={node.tabs}
          groupId={node.id}
          activeTabId={node.activeTabId}
          onActivateTab={activateTab}
          onCloseTab={closeTab}
          onCloseOtherTabs={closeOtherTabs}
          onCloseAllTabs={() => closeAllTabs(node.id)}
          onPinTab={pinTab}
          onSplitRight={handleSplitRight}
          onSplitDown={handleSplitDown}
          onOpenInFloatingWindow={openFloatingWindow}
          onReorderTab={reorderTab}
          onExternalTabDrop={handleExternalTabDrop}
          onToggleMaximize={() => toggleMaximizePane(node.id)}
          isMaximized={maximizedPaneId === node.id}
          newTabMenuItems={newTabMenuItems}
          onNewTabSelect={onNewTabSelect}
          newTabSearchPlaceholder={newTabSearchPlaceholder}
          iconResolver={iconResolver}
        />
      </Box>

      {/* Breadcrumb bar below tabs */}
      {breadcrumbBar && <Box style={{ flexShrink: 0 }}>{breadcrumbBar}</Box>}

      <DropZone paneId={node.id} onDrop={onDropHandler}>
        <Box
          style={{
            flex: 1,
            minHeight: 0, // Allow flex shrinking
            overflow: 'hidden',
            backgroundColor: 'var(--gray-1)',
          }}
        >
          {activeTab ? (
            renderEditor(activeTab)
          ) : (
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--gray-9)',
              }}
            >
              <Text size="2">No tab selected</Text>
            </Box>
          )}
        </Box>
      </DropZone>
    </Box>
  );
}
