'use client';

import { Box, Text, ContextMenu, Popover, ScrollArea } from '@radix-ui/themes';
import {
  Cross1Icon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SizeIcon,
} from '@radix-ui/react-icons';
import {
  type MouseEvent,
  useCallback,
  useState,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TabState } from '../models';
import { IconButton, transition, DefaultTreeIcon } from '@orcher/workbench-ui';

/**
 * Menu item for the new tab dropdown
 */
export interface NewTabMenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Optional description */
  description?: string;
  /** Optional category for grouping */
  category?: string;
}

// =============================================================================
// TAB ITEM
// =============================================================================

interface TabItemProps {
  tab: TabState;
  isActive: boolean;
  /** Group this tab belongs to — carried in the sortable's drag data. */
  groupId: string;
  /** Position within the group — used to compute the drop index. */
  index: number;
  iconResolver?: (iconId: string) => React.ReactElement;
  onActivate: () => void;
  onClose: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
  onCloseSaved: () => void;
  onPin: () => void;
  onSplitRight: () => void;
  onSplitDown: () => void;
  onOpenInFloatingWindow: () => void;
}

function TabItem({
  tab,
  isActive,
  groupId,
  index,
  iconResolver,
  onActivate,
  onClose,
  onCloseOthers,
  onCloseAll,
  onCloseSaved,
  onPin,
  onSplitRight,
  onSplitDown,
  onOpenInFloatingWindow,
}: TabItemProps) {
  // Pointer-based sortable drag (dnd-kit). The lifted tab is rendered by the
  // DragOverlay in layout-renderer; here we just hold the slot and slide via
  // the sorting transform as other tabs are dragged past.
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition: sortableTransition,
    isDragging,
  } = useSortable({
    id: tab.id,
    data: { type: 'tab', groupId, index, tab },
  });
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    tooltipTimerRef.current = setTimeout(() => {
      if (tabRef.current) {
        const rect = tabRef.current.getBoundingClientRect();
        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 });
      }
      setShowTooltip(true);
    }, 600);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowTooltip(false);
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
  }, []);

  const handleClose = (e: MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const showCloseButton = !tab.pinned && (isHovered || isActive || tab.dirty);

  return (
    <>
    <div
      ref={setNodeRef}
      style={{
        flexShrink: 0,
        transform: CSS.Transform.toString(transform),
        transition: sortableTransition,
        // Keep the slot visible but faded while the DragOverlay shows the
        // lifted copy — other tabs slide around this gap.
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 1 : undefined,
      }}
      {...attributes}
      {...listeners}
    >
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <Box
          ref={tabRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
            height: '28px',
            borderRadius: 0,
            backgroundColor: isActive
              ? 'var(--gray-5)'
              : isHovered
                ? 'var(--gray-a3)'
                : 'transparent',
            border: '1px solid transparent',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            minWidth: 0,
            maxWidth: '200px',
            position: 'relative',
          }}
          onClick={onActivate}
        >
          {/* Vertical divider */}
          <Box
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '1px',
              height: '16px',
              backgroundColor: 'var(--gray-6)',
            }}
          />
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
            {tab.icon && iconResolver
              ? iconResolver(tab.icon)
              : <DefaultTreeIcon type="file" name={tab.title} size={16} />}
          </Box>
          <Text
            size="1"
            style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontStyle: tab.preview ? 'italic' : 'normal',
            }}
          >
            {tab.pinned && '📌 '}
            {tab.title}
            {tab.dirty && ' •'}
          </Text>
          {/* Fixed width container for close button to prevent layout shift */}
          <Box
            style={{
              flexShrink: 0,
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showCloseButton && (
              <IconButton size="1" variant="ghost" onClick={handleClose}>
                <Cross1Icon width={12} height={12} />
              </IconButton>
            )}
          </Box>
        </Box>
      </ContextMenu.Trigger>
      <ContextMenu.Content size="1" style={{ borderRadius: 0 }}>
        <ContextMenu.Item onClick={onClose}>Close</ContextMenu.Item>
        <ContextMenu.Item onClick={onCloseOthers}>
          Close Others
        </ContextMenu.Item>
        <ContextMenu.Item onClick={onCloseAll}>Close All</ContextMenu.Item>
        <ContextMenu.Item onClick={onCloseSaved}>Close Saved</ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item onClick={onPin}>
          {tab.pinned ? 'Unpin Tab' : 'Pin Tab'}
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger>Split Editor</ContextMenu.SubTrigger>
          <ContextMenu.SubContent style={{ borderRadius: 0 }}>
            <ContextMenu.Item onClick={onSplitRight}>
              Split Right
            </ContextMenu.Item>
            <ContextMenu.Item onClick={onSplitDown}>
              Split Down
            </ContextMenu.Item>
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
        <ContextMenu.Item onClick={onOpenInFloatingWindow}>
          Open in Floating Window
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
    </div>
    {showTooltip && typeof window !== 'undefined' && createPortal(
      (() => {
        const isDark = document.querySelector('.radix-themes')?.classList.contains('light') === false
          || localStorage.getItem('workbench-theme') !== 'light';
        return (
          <div
            style={{
              position: 'fixed',
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: 'translateX(-50%)',
              padding: '8px 12px',
              background: isDark ? '#1c1c1e' : '#ffffff',
              border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
              borderRadius: 0,
              boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 99999,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 500, color: isDark ? '#f5f5f5' : '#1a1a1a' }}>
              {tab.title}
            </div>
            {tab.uri && (
              <div style={{ fontSize: 10, color: isDark ? '#888' : '#666', marginTop: 3 }}>
                {tab.uri}
              </div>
            )}
          </div>
        );
      })(),
      document.body,
    )}
    </>
  );
}

// =============================================================================
// NEW TAB BUTTON
// =============================================================================

interface NewTabButtonProps {
  menuItems: NewTabMenuItem[];
  onSelectItem: (item: NewTabMenuItem) => void;
  placeholder?: string;
}

function NewTabButton({
  menuItems,
  onSelectItem,
  placeholder = 'Search or select...',
}: NewTabButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems;

    const query = searchQuery.toLowerCase();
    return menuItems.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query),
    );
  }, [menuItems, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, NewTabMenuItem[]>();

    for (const item of filteredItems) {
      const category = item.category || 'Items';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(item);
    }

    return groups;
  }, [filteredItems]);

  const handleSelect = useCallback(
    (item: NewTabMenuItem) => {
      onSelectItem(item);
      setIsOpen(false);
      setSearchQuery('');
      setSelectedIndex(0);
    },
    [onSelectItem],
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchQuery('');
      setSelectedIndex(0);
    } else {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            handleSelect(filteredItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    },
    [filteredItems, selectedIndex, handleSelect],
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  let itemIndex = 0;

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger>
        <motion.div
          whileHover={{ scale: 1.05, backgroundColor: 'var(--gray-3)' }}
          whileTap={{ scale: 0.95 }}
          transition={transition.fast}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            borderRadius: 0,
            marginLeft: '4px',
          }}
          onClick={() => setIsOpen(true)}
        >
          <IconButton size="1" variant="ghost">
            <PlusIcon width={14} height={14} />
          </IconButton>
        </motion.div>
      </Popover.Trigger>
      <Popover.Content
        side="bottom"
        align="start"
        sideOffset={4}
        onKeyDown={handleKeyDown}
        style={{
          width: '320px',
          padding: 0,
          backgroundColor: 'var(--gray-2)',
          borderRadius: 0,
          boxShadow: '0 16px 70px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Search input - command palette style */}
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--gray-6)',
            gap: '12px',
          }}
        >
          <MagnifyingGlassIcon
            width={18}
            height={18}
            style={{ color: 'var(--gray-9)', flexShrink: 0 }}
          />
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: 'var(--gray-12)',
              fontFamily: 'inherit',
            }}
          />
        </Box>

        {/* Results */}
        <ScrollArea style={{ maxHeight: '320px' }}>
          <Box ref={listRef} style={{ padding: '8px 0' }}>
            {filteredItems.length === 0 ? (
              <Box style={{ padding: '24px 16px', textAlign: 'center' }}>
                <Text size="2" color="gray">
                  No items found
                </Text>
              </Box>
            ) : (
              Array.from(groupedItems.entries()).map(([category, items]) => (
                <Box key={category}>
                  <Box style={{ padding: '8px 16px 4px' }}>
                    <Text
                      size="1"
                      color="gray"
                      style={{
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 500,
                      }}
                    >
                      {category}
                    </Text>
                  </Box>
                  {items.map((item) => {
                    const currentIndex = itemIndex++;
                    const isSelected = currentIndex === selectedIndex;

                    return (
                      <Box
                        key={item.id}
                        data-index={currentIndex}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 16px',
                          cursor: 'pointer',
                          backgroundColor: isSelected
                            ? 'var(--accent-4)'
                            : 'transparent',
                        }}
                      >
                        {item.icon && (
                          <Box
                            style={{
                              flexShrink: 0,
                              width: 18,
                              height: 18,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--gray-11)',
                            }}
                          >
                            {item.icon}
                          </Box>
                        )}
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="2" style={{ display: 'block' }}>
                            {item.label}
                          </Text>
                          {item.description && (
                            <Text
                              size="1"
                              color="gray"
                              style={{ display: 'block', marginTop: '2px' }}
                            >
                              {item.description}
                            </Text>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ))
            )}
          </Box>
        </ScrollArea>
      </Popover.Content>
    </Popover.Root>
  );
}

// =============================================================================
// TAB BAR
// =============================================================================

export interface TabBarProps {
  tabs: TabState[];
  /** Pane/group id this bar belongs to — carried in each tab's drag data. */
  groupId: string;
  activeTabId: string | null;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs?: (tabId: string) => void;
  onCloseAllTabs?: () => void;
  onPinTab?: (tabId: string, pinned: boolean) => void;
  onSplitRight?: (tabId: string) => void;
  onSplitDown?: (tabId: string) => void;
  onOpenInFloatingWindow?: (tabId: string) => void;
  onReorderTab?: (tabId: string, newIndex: number) => void;
  /** Called when an external tab is dropped onto this tab bar */
  onExternalTabDrop?: (tabId: string) => void;
  /** Called when maximize/restore is toggled */
  onToggleMaximize?: () => void;
  /** Whether this pane is currently maximized */
  isMaximized?: boolean;
  /** Icon resolver for tab icons */
  iconResolver?: (iconId: string) => React.ReactElement;
  newTabMenuItems?: NewTabMenuItem[];
  onNewTabSelect?: (item: NewTabMenuItem) => void;
  newTabSearchPlaceholder?: string;
}

export function TabBar({
  tabs,
  groupId,
  activeTabId,
  onActivateTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
  onPinTab,
  onSplitRight,
  onSplitDown,
  onOpenInFloatingWindow,
  onToggleMaximize,
  isMaximized = false,
  newTabMenuItems = [],
  onNewTabSelect,
  newTabSearchPlaceholder,
  iconResolver,
}: TabBarProps) {
  // Drag/drop is owned by the single DndContext in layout-renderer; each tab is
  // a dnd-kit sortable (see TabItem). The SortableContext below just declares
  // the ordered item ids for this bar.
  const tabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

  const handleCloseSaved = useCallback(() => {
    tabs.forEach((tab) => {
      if (!tab.dirty) {
        onCloseTab(tab.id);
      }
    });
  }, [tabs, onCloseTab]);

  // Scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    setHasOverflow(scrollWidth > clientWidth);
  }, []);

  // Translate a vertical wheel / trackpad gesture into horizontal scrolling
  // of the tab strip. The strip overflows horizontally but a normal mouse
  // only scrolls vertically, so without this the overflow is reachable only
  // via the chevron buttons. Registered as a non-passive listener so we can
  // preventDefault and stop the page from scrolling underneath; only active
  // when the strip actually overflows. The native momentum (trackpads,
  // smooth-scroll mice) keeps it smooth.
  const handleWheel = useCallback((e: WheelEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollWidth <= container.clientWidth) return; // no overflow
    // Prefer the dominant axis: vertical wheels map to horizontal scroll,
    // while a real horizontal gesture (deltaX) still works as-is.
    const delta =
      Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (delta === 0) return;
    e.preventDefault();
    container.scrollLeft += delta;
  }, []);

  useEffect(() => {
    updateScrollState();
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', updateScrollState);
    container.addEventListener('wheel', handleWheel, { passive: false });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateScrollState);
      container.removeEventListener('wheel', handleWheel);
      resizeObserver.disconnect();
    };
  }, [updateScrollState, handleWheel, tabs.length]);

  // Auto-scroll to keep active tab visible
  useEffect(() => {
    if (!activeTabId || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const activeEl = container.querySelector(`[data-tab-id="${activeTabId}"]`) as HTMLElement | null;
    if (activeEl) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeEl.getBoundingClientRect();
      if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeTabId]);

  const scrollLeft = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({ left: -150, behavior: 'smooth' });
  }, []);

  const scrollRight = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({ left: 150, behavior: 'smooth' });
  }, []);

  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '36px',
        backgroundColor: 'var(--gray-2)',
        borderBottom: '1px solid var(--gray-6)',
        overflow: 'hidden',
      }}
    >
      {/* Left scroll button */}
      <AnimatePresence>
        {canScrollLeft && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 24 }}
            exit={{ opacity: 0, width: 0 }}
            transition={transition.fast}
            onClick={scrollLeft}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              cursor: 'pointer',
              backgroundColor: 'var(--gray-2)',
              borderRight: '1px solid var(--gray-6)',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            <ChevronLeftIcon width={14} height={14} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable tabs container */}
      <Box
        ref={scrollContainerRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flex: 1,
          overflow: 'hidden',
          scrollbarWidth: 'none',
          padding: '0 8px',
        }}
      >
        <SortableContext
          items={tabIds}
          strategy={horizontalListSortingStrategy}
        >
          {tabs.map((tab, idx) => (
            <TabItem
              key={tab.id}
              tab={tab}
              groupId={groupId}
              index={idx}
              isActive={tab.id === activeTabId}
              iconResolver={iconResolver}
              onActivate={() => onActivateTab(tab.id)}
              onClose={() => onCloseTab(tab.id)}
              onCloseOthers={() => onCloseOtherTabs?.(tab.id)}
              onCloseAll={() => onCloseAllTabs?.()}
              onCloseSaved={handleCloseSaved}
              onPin={() => onPinTab?.(tab.id, !tab.pinned)}
              onSplitRight={() => onSplitRight?.(tab.id)}
              onSplitDown={() => onSplitDown?.(tab.id)}
              onOpenInFloatingWindow={() => onOpenInFloatingWindow?.(tab.id)}
            />
          ))}
        </SortableContext>

        {/* Plus button inside scrollable area when no overflow */}
        <AnimatePresence>
          {onNewTabSelect && !hasOverflow && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={transition.springSnappy}
              style={{ flexShrink: 0 }}
            >
              <NewTabButton
                menuItems={newTabMenuItems}
                onSelectItem={onNewTabSelect}
                placeholder={newTabSearchPlaceholder}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Plus button pinned outside when tabs overflow */}
      <AnimatePresence>
        {onNewTabSelect && hasOverflow && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={transition.springSnappy}
            style={{
              flexShrink: 0,
              borderLeft: '1px solid var(--gray-6)',
              overflow: 'hidden',
            }}
          >
            <NewTabButton
              menuItems={newTabMenuItems}
              onSelectItem={onNewTabSelect}
              placeholder={newTabSearchPlaceholder}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right scroll button */}
      <AnimatePresence>
        {canScrollRight && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 24 }}
            exit={{ opacity: 0, width: 0 }}
            transition={transition.fast}
            onClick={scrollRight}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              cursor: 'pointer',
              backgroundColor: 'var(--gray-2)',
              borderLeft: '1px solid var(--gray-6)',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            <ChevronRightIcon width={14} height={14} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Maximize/Restore button */}
      {onToggleMaximize && (
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            padding: '0 6px',
          }}
        >
          <IconButton
            size="1"
            variant={isMaximized ? 'soft' : 'ghost'}
            color={isMaximized ? 'blue' : undefined}
            onClick={onToggleMaximize}
            title={isMaximized ? 'Restore pane' : 'Maximize pane'}
          >
            <SizeIcon width={14} height={14} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
