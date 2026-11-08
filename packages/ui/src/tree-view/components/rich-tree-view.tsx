'use client';

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  type CSSProperties,
} from 'react';
import { Box, Flex, Text, IconButton, Spinner } from '@radix-ui/themes';
import type {
  TreeDataProvider,
  TreeView as ITreeView,
} from '@orcher/workbench-plugin-api';
import { useTreeView } from '../use-tree-view';
import type {
  RichTreeViewOptions,
  BreadcrumbItem,
  TreeViewAction,
} from '../types';
import { TreeRow } from './tree-row';
import { SearchInput } from './search-input';
import { Breadcrumb } from './breadcrumb';
import {
  SearchIcon,
  ExpandAllIcon,
  CollapseAllIcon,
  RefreshIcon,
} from './tree-icons';

const ROW_HEIGHT = 28;
const OVERSCAN = 5;

interface RichTreeViewProps<T> {
  /** The data provider */
  provider: TreeDataProvider<T>;
  /** Tree view instance for programmatic control */
  treeView?: ITreeView<T>;
  /** Display options */
  options?: RichTreeViewOptions<T>;
  /** Callback when an item is selected */
  onSelect?: (element: T) => void;
  /** Callback when an item is activated (double-click/Enter) */
  onActivate?: (element: T) => void;
}

function RichTreeViewComponent<T>({
  provider,
  treeView,
  options = {},
  onSelect,
  onActivate,
}: RichTreeViewProps<T>) {
  const {
    title,
    showSearch = false,
    isSearchVisible: controlledSearchVisible,
    onSearchVisibilityChange,
    showHeader = false,
    searchPlaceholder = 'Search...',
    showBreadcrumb = false,
    showStatusBar = true,
    showExpandCollapseAll = true,
    actions = [],
    renderIcon,
    getItemType,
    getItemName,
    emptyContent,
    loadingContent,
    onNavigate,
    storageKey,
  } = options;

  // Support both controlled and uncontrolled search visibility
  const isControlled = controlledSearchVisible !== undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [internalSearchVisible, setInternalSearchVisible] =
    useState(showSearch);

  // Use controlled or internal search visibility
  const showSearchInput = isControlled
    ? controlledSearchVisible
    : internalSearchVisible;

  const setShowSearchInput = useCallback(
    (visible: boolean) => {
      if (isControlled) {
        onSearchVisibilityChange?.(visible);
      } else {
        setInternalSearchVisible(visible);
      }
    },
    [isControlled, onSearchVisibilityChange],
  );

  // Delay showing tree content to avoid flickering during hydration
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const {
    state,
    toggle,
    expand,
    collapse,
    expandAll,
    collapseAll,
    select,
    activate,
    focusUp,
    focusDown,
    focusFirst,
    focusLast,
    refresh,
    getElement,
    setSearchQuery,
    clearSearch,
    getNodePath,
    reveal,
  } = useTreeView({
    provider,
    onSelect,
    onActivate,
    storageKey,
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

  // Connect tree view instance for reveal events
  useEffect(() => {
    if (treeView && 'onReveal' in treeView) {
      const disposable = (treeView as any).onReveal(
        (
          element: T,
          options?: {
            select?: boolean;
            focus?: boolean;
            expand?: boolean | number;
          },
        ) => {
          // Get the tree item to find its ID
          const treeItem = provider.getTreeItem(element);
          if (treeItem instanceof Promise) {
            treeItem.then((item) => {
              reveal(item.id);
              if (options?.select) {
                select(item.id);
              }
            });
          } else {
            reveal(treeItem.id);
            if (options?.select) {
              select(treeItem.id);
            }
          }
        },
      );
      return () => disposable.dispose();
    }
    return undefined;
  }, [treeView, provider, reveal, select]);

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

  // If container height is not yet measured, show all nodes (no virtualization)
  const effectiveContainerHeight = containerHeight || totalHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    state.flattenedNodes.length - 1,
    Math.ceil((scrollTop + effectiveContainerHeight) / ROW_HEIGHT) + OVERSCAN,
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
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowSearchInput(true);
          }
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

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => {
    if (!state.selectedId || state.isSearching) return [];

    const path = getNodePath(state.selectedId);
    return path.map((node, index) => ({
      id: node.id,
      name: node.treeItem.label,
      isLast: index === path.length - 1,
    }));
  }, [state.selectedId, state.isSearching, getNodePath]);

  // Notify external navigation handler when selection changes
  useEffect(() => {
    if (!onNavigate) return;

    if (!state.selectedId || state.isSearching) {
      onNavigate([]);
      return;
    }

    // Don't call onNavigate if the selected node doesn't exist in state yet
    // (happens during hydration when selectedId is loaded from storage but nodes aren't loaded)
    const selectedNode = state.nodes.get(state.selectedId);
    if (!selectedNode) {
      return;
    }

    const path = getNodePath(state.selectedId);
    const navBreadcrumbs = path.map((node) => ({
      id: node.id,
      label: node.treeItem.label,
      path: node.treeItem.resourceUri,
    }));
    onNavigate(navBreadcrumbs);
  }, [
    state.selectedId,
    state.isSearching,
    state.nodes,
    getNodePath,
    onNavigate,
  ]);

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback(
    (id: string) => {
      reveal(id);
    },
    [reveal],
  );

  // Toggle search visibility
  const toggleSearch = useCallback(() => {
    if (showSearchInput) {
      clearSearch();
      setShowSearchInput(false);
    } else {
      setShowSearchInput(true);
    }
  }, [showSearchInput, clearSearch]);

  // Handle search escape
  const handleSearchEscape = useCallback(() => {
    if (!state.searchQuery) {
      setShowSearchInput(false);
    }
  }, [state.searchQuery]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // Build header actions
  const headerActions: TreeViewAction[] = useMemo(() => {
    const builtInActions: TreeViewAction[] = [];

    if (showSearch) {
      builtInActions.push({
        id: 'search',
        icon: <SearchIcon />,
        title: 'Search (Ctrl+F)',
        onClick: toggleSearch,
      });
    }

    // Add custom actions
    builtInActions.push(...actions);

    if (showExpandCollapseAll) {
      builtInActions.push(
        {
          id: 'expandAll',
          icon: <ExpandAllIcon />,
          title: 'Expand All',
          onClick: expandAll,
        },
        {
          id: 'collapseAll',
          icon: <CollapseAllIcon />,
          title: 'Collapse All',
          onClick: collapseAll,
        },
      );
    }

    builtInActions.push({
      id: 'refresh',
      icon: <RefreshIcon />,
      title: 'Refresh',
      onClick: handleRefresh,
    });

    return builtInActions;
  }, [
    showSearch,
    showExpandCollapseAll,
    actions,
    toggleSearch,
    expandAll,
    collapseAll,
    handleRefresh,
  ]);

  // Loading state
  if (state.isLoading && state.flattenedNodes.length === 0) {
    return (
      <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {showHeader && title && (
          <Header title={title} actions={headerActions} />
        )}
        {loadingContent ?? (
          <Flex align="center" justify="center" p="4" style={{ flex: 1 }}>
            <Spinner size="2" />
          </Flex>
        )}
      </Box>
    );
  }

  // Error state
  if (state.error && state.flattenedNodes.length === 0) {
    return (
      <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {showHeader && title && (
          <Header title={title} actions={headerActions} />
        )}
        <Box p="4">
          <Text size="2" color="red">
            {state.error}
          </Text>
        </Box>
      </Box>
    );
  }

  // Empty state
  if (state.flattenedNodes.length === 0) {
    return (
      <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {showHeader && title && (
          <Header title={title} actions={headerActions} />
        )}
        {showSearchInput && (
          <SearchInput
            value={state.searchQuery}
            onChange={setSearchQuery}
            onClear={clearSearch}
            onEscape={handleSearchEscape}
            placeholder={searchPlaceholder}
            autoFocus
          />
        )}
        {emptyContent ?? (
          <Box p="4">
            <Text size="2" color="gray">
              {state.isSearching ? 'No results found' : 'No items'}
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  const treeContainerStyle: CSSProperties = {
    flex: 1,
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
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: isReady ? 1 : 0,
        transition: 'opacity 150ms ease-in',
      }}
    >
      {/* Header */}
      {showHeader && title && <Header title={title} actions={headerActions} />}

      {/* Search input */}
      {showSearchInput && (
        <SearchInput
          value={state.searchQuery}
          onChange={setSearchQuery}
          onClear={clearSearch}
          onEscape={handleSearchEscape}
          placeholder={searchPlaceholder}
          autoFocus
        />
      )}

      {/* Breadcrumb */}
      {showBreadcrumb && !state.isSearching && breadcrumbItems.length > 0 && (
        <Breadcrumb
          items={breadcrumbItems}
          onNavigate={handleBreadcrumbNavigate}
        />
      )}

      {/* Search results count */}
      {state.isSearching && (
        <Flex
          px="3"
          py="1"
          style={{
            borderBottom: '1px solid var(--gray-5)',
            flexShrink: 0,
          }}
        >
          <Text size="1" color="gray">
            {state.flattenedNodes.length} result
            {state.flattenedNodes.length !== 1 ? 's' : ''}
          </Text>
        </Flex>
      )}

      {/* Tree */}
      <Box
        ref={containerRef}
        style={treeContainerStyle}
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

              return (
                <TreeRow
                  key={node.id}
                  node={node}
                  isSelected={isSelected}
                  isFocused={isFocused}
                  onSelect={() => select(node.id)}
                  onToggle={() => toggle(node.id)}
                  onActivate={() => activate(node.id)}
                  renderIcon={renderIcon}
                  getItemType={getItemType}
                  getItemName={getItemName}
                />
              );
            })}
          </div>
        </div>
      </Box>

      {/* Status bar */}
      {showStatusBar && (
        <Flex
          px="3"
          py="1"
          justify="between"
          align="center"
          style={{
            borderTop: '1px solid var(--gray-5)',
            flexShrink: 0,
            minHeight: 24,
          }}
        >
          <Text size="1" color="gray">
            {state.flattenedNodes.length} items
          </Text>
          {state.selectedId && (
            <Text
              size="1"
              color="gray"
              style={{
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {state.selectedId}
            </Text>
          )}
        </Flex>
      )}
    </Box>
  );
}

// Header component
interface HeaderProps {
  title: string;
  actions: TreeViewAction[];
}

const Header = memo(function Header({ title, actions }: HeaderProps) {
  return (
    <Flex
      px="3"
      py="2"
      justify="between"
      align="center"
      style={{
        borderBottom: '1px solid var(--gray-5)',
        flexShrink: 0,
      }}
    >
      <Text size="1" weight="bold" style={{ textTransform: 'uppercase' }}>
        {title}
      </Text>
      <Flex gap="1">
        {actions.map((action) => (
          <IconButton
            key={action.id}
            size="1"
            variant="ghost"
            title={action.title}
            onClick={action.onClick}
          >
            {action.icon}
          </IconButton>
        ))}
      </Flex>
    </Flex>
  );
});

export const RichTreeView = memo(
  RichTreeViewComponent,
) as typeof RichTreeViewComponent;
