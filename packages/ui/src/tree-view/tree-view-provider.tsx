'use client';

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Box, Flex, Text, Spinner } from '@radix-ui/themes';
import { ChevronRightIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import type {
  TreeDataProvider,
  TreeView as ITreeView,
} from '@orcher/workbench-plugin-api';
import { useTreeView } from './use-tree-view';
import type { FlattenedTreeNode } from './types';

const ROW_HEIGHT = 28;
const OVERSCAN = 5;
const INDENT_SIZE = 16;

interface RowRenderProps {
  isSelected: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onActivate: () => void;
}

interface TreeViewProviderProps<T> {
  /** The data provider */
  provider: TreeDataProvider<T>;
  /** Tree view instance for programmatic control */
  treeView?: ITreeView<T>;
  /** Callback when an item is selected */
  onSelect?: (element: T) => void;
  /** Callback when an item is activated (double-click/Enter) */
  onActivate?: (element: T) => void;
  /** Show collapse all button */
  showCollapseAll?: boolean;
  /** Custom row renderer */
  renderRow?: (node: FlattenedTreeNode<T>, props: RowRenderProps) => ReactNode;
  /** Empty state content */
  emptyContent?: ReactNode;
  /** Loading content */
  loadingContent?: ReactNode;
  /** Error content */
  errorContent?: (error: string) => ReactNode;
}

export function TreeViewProvider<T>({
  provider,
  treeView,
  onSelect,
  onActivate,
  renderRow,
  emptyContent,
  loadingContent,
  errorContent,
}: TreeViewProviderProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const {
    state,
    toggle,
    expand,
    collapse,
    select,
    activate,
    focusUp,
    focusDown,
    focusFirst,
    focusLast,
    refresh,
    getElement,
  } = useTreeView({
    provider,
    onSelect,
    onActivate,
    onExpand: (element) => {
      if (treeView && 'notifyExpand' in treeView) {
        (treeView as any).notifyExpand(element);
      }
    },
    onCollapse: (element) => {
      if (treeView && 'notifyCollapse' in treeView) {
        (treeView as any).notifyCollapse(element);
      }
    },
  });

  // Connect tree view instance for refresh events
  useEffect(() => {
    if (treeView && 'onRefresh' in treeView) {
      const disposable = (treeView as any).onRefresh((element?: T) => {
        refresh(element);
      });
      return () => disposable.dispose();
    }
    return undefined;
  }, [treeView, refresh]);

  // Update tree view selection
  useEffect(() => {
    if (treeView && 'setSelection' in treeView && state.selectedId) {
      const element = getElement(state.selectedId);
      if (element !== undefined) {
        (treeView as any).setSelection([element]);
      }
    }
  }, [treeView, state.selectedId, getElement]);

  // Virtual scrolling calculations
  const totalHeight = state.flattenedNodes.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    state.flattenedNodes.length - 1,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN,
  );

  const visibleNodes = state.flattenedNodes.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * ROW_HEIGHT;

  // Scroll handling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(container);
    setContainerHeight(container.clientHeight);

    return () => observer.disconnect();
  }, []);

  // Scroll focused into view
  useEffect(() => {
    if (!state.focusedId || !containerRef.current) return;

    const idx = state.flattenedNodes.findIndex((n) => n.id === state.focusedId);
    if (idx === -1) return;

    const itemTop = idx * ROW_HEIGHT;
    const itemBottom = itemTop + ROW_HEIGHT;
    const container = containerRef.current;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;

    if (itemTop < viewTop) {
      container.scrollTop = itemTop;
    } else if (itemBottom > viewBottom) {
      container.scrollTop = itemBottom - container.clientHeight;
    }
  }, [state.focusedId, state.flattenedNodes]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          focusUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          focusDown();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (state.focusedId) {
            const node = state.flattenedNodes.find(
              (n) => n.id === state.focusedId,
            );
            if (node?.hasChildren && !node.expanded) {
              expand(state.focusedId);
            } else if (
              node?.hasChildren &&
              node.expanded &&
              node.childIds?.length
            ) {
              // Move to first child
              focusDown();
            }
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (state.focusedId) {
            const node = state.flattenedNodes.find(
              (n) => n.id === state.focusedId,
            );
            if (node?.hasChildren && node.expanded) {
              collapse(state.focusedId);
            } else if (node?.parentId) {
              // Move to parent
              select(node.parentId);
            }
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (state.focusedId) {
            select(state.focusedId);
            const node = state.flattenedNodes.find(
              (n) => n.id === state.focusedId,
            );
            if (node && !node.hasChildren) {
              activate(state.focusedId);
            } else if (node?.hasChildren) {
              toggle(state.focusedId);
            }
          }
          break;
        case ' ':
          e.preventDefault();
          if (state.focusedId) {
            const node = state.flattenedNodes.find(
              (n) => n.id === state.focusedId,
            );
            if (node?.hasChildren) {
              toggle(state.focusedId);
            } else {
              select(state.focusedId);
            }
          }
          break;
        case 'Home':
          e.preventDefault();
          focusFirst();
          break;
        case 'End':
          e.preventDefault();
          focusLast();
          break;
      }
    },
    [
      state.focusedId,
      state.flattenedNodes,
      focusUp,
      focusDown,
      focusFirst,
      focusLast,
      expand,
      collapse,
      toggle,
      select,
      activate,
    ],
  );

  // Loading state
  if (state.isLoading && state.flattenedNodes.length === 0) {
    return (
      loadingContent ?? (
        <Flex align="center" justify="center" p="4">
          <Spinner size="2" />
        </Flex>
      )
    );
  }

  // Error state
  if (state.error && state.flattenedNodes.length === 0) {
    return (
      errorContent?.(state.error) ?? (
        <Box p="4">
          <Text size="2" color="red">
            {state.error}
          </Text>
        </Box>
      )
    );
  }

  // Empty state
  if (state.flattenedNodes.length === 0) {
    return (
      emptyContent ?? (
        <Box p="4">
          <Text size="2" color="gray">
            No items
          </Text>
        </Box>
      )
    );
  }

  const containerStyle: CSSProperties = {
    height: '100%',
    overflow: 'auto',
    position: 'relative',
    outline: 'none',
  };

  const innerStyle: CSSProperties = {
    height: totalHeight,
    position: 'relative',
  };

  const listStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    transform: `translateY(${offsetY}px)`,
  };

  return (
    <Box
      ref={containerRef}
      style={containerStyle}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="tree"
    >
      <div style={innerStyle}>
        <div style={listStyle}>
          {visibleNodes.map((node) => {
            const isSelected = node.id === state.selectedId;
            const isFocused = node.id === state.focusedId;

            if (renderRow) {
              return (
                <div key={node.id}>
                  {renderRow(node, {
                    isSelected,
                    isFocused,
                    onSelect: () => select(node.id),
                    onToggle: () => toggle(node.id),
                    onActivate: () => activate(node.id),
                  })}
                </div>
              );
            }

            return (
              <DefaultTreeRow
                key={node.id}
                node={node}
                isSelected={isSelected}
                isFocused={isFocused}
                onSelect={() => select(node.id)}
                onToggle={() => toggle(node.id)}
                onActivate={() => activate(node.id)}
              />
            );
          })}
        </div>
      </div>
    </Box>
  );
}

// Default row component
interface DefaultTreeRowProps<T> {
  node: FlattenedTreeNode<T>;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onActivate: () => void;
}

const DefaultTreeRowComponent = <T,>({
  node,
  isSelected,
  isFocused,
  onSelect,
  onToggle,
  onActivate,
}: DefaultTreeRowProps<T>) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect();
    },
    [onSelect],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (node.hasChildren) {
        onToggle();
      } else {
        onActivate();
      }
    },
    [node.hasChildren, onToggle, onActivate],
  );

  const handleChevronClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle();
    },
    [onToggle],
  );

  const indent = node.indentLevel * INDENT_SIZE;

  const rowStyle: CSSProperties = {
    height: ROW_HEIGHT,
    paddingLeft: indent + 4,
    paddingRight: 8,
    cursor: 'pointer',
    userSelect: 'none',
    backgroundColor: isSelected
      ? 'var(--accent-a4)'
      : isFocused
        ? 'var(--gray-a3)'
        : 'transparent',
    borderRadius: 4,
    margin: '0 4px',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  return (
    <div
      style={rowStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={node.hasChildren ? node.expanded : undefined}
    >
      {/* Chevron */}
      <Flex
        align="center"
        justify="center"
        style={{
          width: 16,
          height: 16,
          flexShrink: 0,
          opacity: node.hasChildren ? 1 : 0,
        }}
        onClick={node.hasChildren ? handleChevronClick : undefined}
      >
        {node.hasChildren &&
          (node.expanded ? <ChevronDownIcon /> : <ChevronRightIcon />)}
      </Flex>

      {/* Loading spinner */}
      {node.isLoading && <Spinner size="1" />}

      {/* Icon */}
      {node.treeItem.icon && typeof node.treeItem.icon !== 'string' && (
        <Box style={{ width: 16, height: 16, flexShrink: 0 }}>
          {node.treeItem.icon}
        </Box>
      )}

      {/* Label */}
      <Text
        size="1"
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {node.treeItem.label}
      </Text>

      {/* Description */}
      {node.treeItem.description && (
        <Text size="1" color="gray" style={{ flexShrink: 0 }}>
          {node.treeItem.description}
        </Text>
      )}
    </div>
  );
};

const DefaultTreeRow = memo(
  DefaultTreeRowComponent,
) as typeof DefaultTreeRowComponent;
