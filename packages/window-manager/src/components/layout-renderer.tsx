'use client';

import React, { type ReactNode, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Box, Text } from '@radix-ui/themes';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { DefaultTreeIcon } from '@orcher/workbench-ui';
import type { LayoutNode, TabState, DropPosition } from '../models';
import { SplitContainer } from './split-container';
import { TabGroup } from './tab-group';
import { FloatingWindow } from './floating-window';
import { type NewTabMenuItem } from './tab-bar';
import { useWindowManager } from '../hooks';

export interface LayoutRendererProps {
  /** Render function for editor content */
  renderEditor: (tab: TabState) => ReactNode;
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

/** Shape of the data each sortable tab carries (set in TabItem's useSortable). */
interface TabDragData {
  type: 'tab';
  groupId: string;
  index: number;
  tab: TabState;
}

/**
 * The floating tab that tracks the cursor during a drag. Rendered through
 * dnd-kit's DragOverlay (a portal), so it follows the pointer 1:1 with no
 * native ghost — this is what gives the browser-tab feel.
 */
function TabDragPreview({
  tab,
  iconResolver,
}: {
  tab: TabState;
  iconResolver?: (iconId: string) => React.ReactElement;
}) {
  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0 12px',
        height: '28px',
        maxWidth: '200px',
        backgroundColor: 'var(--gray-5)',
        border: '1px solid var(--gray-7)',
        borderRadius: '4px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
        cursor: 'grabbing',
        userSelect: 'none',
      }}
    >
      <Box
        style={{
          flexShrink: 0,
          width: 16,
          height: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {tab.icon && iconResolver ? (
          iconResolver(tab.icon)
        ) : (
          <DefaultTreeIcon type="file" name={tab.title} size={16} />
        )}
      </Box>
      <Text
        size="1"
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {tab.title}
      </Text>
    </Box>
  );
}

/**
 * Renders the layout tree recursively.
 *
 * A single dnd-kit DndContext wraps the whole tree so tab drags can cross
 * panes. Each tab bar is a SortableContext (see tab-bar.tsx) — tabs slide live
 * as you drag, and the DragOverlay above renders the lifted tab following the
 * cursor. Drop resolution:
 *   - over a tab in the same group  → reorder
 *   - over a tab in another group   → move the tab to that group
 * (Edge-split via drag is handled separately; the Split context-menu action
 * remains available in the meantime.)
 */
export function LayoutRenderer({
  renderEditor,
  newTabMenuItems,
  onNewTabSelect,
  newTabSearchPlaceholder,
  breadcrumbBar,
  iconResolver,
}: LayoutRendererProps) {
  const {
    layout,
    resizeSplit,
    reorderTab,
    moveTab,
    handleDrop,
    floatingWindows,
    closeFloatingWindow,
    dockFloatingWindow,
    moveFloatingWindow,
    resizeFloatingWindow,
    focusFloatingWindow,
  } = useWindowManager();

  const [activeTab, setActiveTab] = useState<TabState | null>(null);

  // A few px of travel before a drag starts, so plain clicks still activate
  // the tab and the close button / context menu keep working.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as TabDragData | undefined;
    if (data?.type === 'tab') setActiveTab(data.tab);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTab(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const from = active.data.current as TabDragData | undefined;
      const target = over.data.current as
        | TabDragData
        | { type: 'zone'; paneId: string; position: DropPosition }
        | undefined;
      if (!from || from.type !== 'tab' || !target) return;

      if (target.type === 'zone') {
        // Dropped on a pane edge → split (or center → move into that pane).
        handleDrop(String(active.id), target.paneId, target.position);
      } else if (target.type === 'tab') {
        if (from.groupId === target.groupId) {
          reorderTab(String(active.id), target.index);
        } else {
          moveTab(String(active.id), target.groupId);
        }
      }
    },
    [reorderTab, moveTab, handleDrop],
  );

  const handleDragCancel = useCallback(() => setActiveTab(null), []);

  // Pointer-first collision so the editor split bands (which overlap tabs
  // spatially only at the bar) resolve by where the cursor actually is;
  // fall back to closest-center for the gaps between tabs.
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointer = pointerWithin(args);
    return pointer.length > 0 ? pointer : closestCenter(args);
  }, []);

  const renderNode = (node: LayoutNode): ReactNode => {
    if (node.type === 'split') {
      return (
        <SplitContainer
          key={node.id}
          node={node}
          renderChild={renderNode}
          onResize={(sizes) => resizeSplit(node.id, sizes)}
        />
      );
    }

    return (
      <TabGroup
        key={node.id}
        node={node}
        renderEditor={renderEditor}
        isActive={layout.activePaneId === node.id}
        newTabMenuItems={newTabMenuItems}
        onNewTabSelect={onNewTabSelect}
        newTabSearchPlaceholder={newTabSearchPlaceholder}
        breadcrumbBar={breadcrumbBar}
        iconResolver={iconResolver}
      />
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {renderNode(layout.root)}

      <DragOverlay dropAnimation={null}>
        {activeTab ? (
          <TabDragPreview tab={activeTab} iconResolver={iconResolver} />
        ) : null}
      </DragOverlay>

      {/* Floating windows */}
      <AnimatePresence>
        {floatingWindows.map((floatingWindow) => (
          <FloatingWindow
            key={floatingWindow.id}
            window={floatingWindow}
            renderEditor={renderEditor}
            onClose={closeFloatingWindow}
            onDockBack={dockFloatingWindow}
            onMove={moveFloatingWindow}
            onResize={resizeFloatingWindow}
            onFocus={focusFloatingWindow}
          />
        ))}
      </AnimatePresence>
    </DndContext>
  );
}
