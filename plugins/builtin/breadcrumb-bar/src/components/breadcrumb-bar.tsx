'use client';

import { Box, Text, Theme } from '@radix-ui/themes';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  BookmarkIcon,
  BookmarkFilledIcon,
  ChevronRightIcon,
  DotsVerticalIcon,
} from '@radix-ui/react-icons';
import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useWindowManager, type LayoutNode, type TabState } from '@orcher/workbench-window-manager';
import { useTheme } from '@orcher/workbench-ui';

export interface BreadcrumbItem {
  id: string;
  label: string;
  path?: string;
  /** URI to activate when clicked (matches a tab's URI) */
  uri?: string;
}

export interface BreadcrumbBarProps {
  /** Whether the current item is bookmarked */
  isBookmarked?: boolean;
  /** Additional breadcrumb items to prepend (e.g., app name) */
  breadcrumbs?: BreadcrumbItem[];
  /** Called when bookmark button is clicked */
  onToggleBookmark?: () => void;
  /** Called when a breadcrumb item is clicked (override default tab activation) */
  onBreadcrumbClick?: (item: BreadcrumbItem) => void;
  /** Called when menu button is clicked */
  onMenuClick?: () => void;
  /** Custom label formatter for URI segments */
  formatLabel?: (segment: string, index: number) => string;
  /**
   * Optional sibling/children provider for a crumb. When it returns a
   * non-empty list, that crumb shows a ⌄ caret and clicking it opens a
   * dropdown of those items (each routed through `onBreadcrumbClick`) for
   * fast lateral navigation — e.g. a "Financials" group crumb listing
   * Trial Balance / P&L / Balance Sheet. Return [] (or omit the prop) to
   * keep a crumb as a plain link.
   */
  getChildren?: (item: BreadcrumbItem) => BreadcrumbItem[];
}

interface NavButtonProps {
  icon: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}

const NavButton = memo(function NavButton({
  icon,
  disabled,
  onClick,
  title,
}: NavButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Box
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        borderRadius: 0,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        backgroundColor:
          isHovered && !disabled ? 'var(--gray-a3)' : 'transparent',
        color: 'var(--gray-11)',
        transition: 'background-color 0.1s, opacity 0.1s',
      }}
    >
      {icon}
    </Box>
  );
});

/** Format a URI segment as a readable label */
function defaultFormatLabel(segment: string, index: number): string {
  if (index === 0) {
    // First segment is typically the app/scheme name — capitalize it
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }
  // Truncate long IDs (UUIDs)
  if (segment.length > 20) {
    return segment.slice(0, 12) + '...';
  }
  // Capitalize regular segments
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/** Find the active tab in the layout tree */
function findActiveTab(node: LayoutNode, activePaneId: string | null): TabState | null {
  if (node.type === 'tabGroup') {
    if (node.id !== activePaneId) return null;
    return node.tabs.find((t) => t.id === node.activeTabId) ?? null;
  }
  for (const child of node.children) {
    const found = findActiveTab(child, activePaneId);
    if (found) return found;
  }
  return null;
}

/** Find a tab by URI across all tab groups */
function findTabByUri(node: LayoutNode, uri: string): { tab: TabState; groupId: string } | null {
  if (node.type === 'tabGroup') {
    const tab = node.tabs.find((t) => t.uri === uri);
    if (tab) return { tab, groupId: node.id };
    return null;
  }
  for (const child of node.children) {
    const found = findTabByUri(child, uri);
    if (found) return found;
  }
  return null;
}

// =============================================================================
// MENU DROPDOWN
// =============================================================================

interface MenuItemProps {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick?: () => void;
}

function BreadcrumbMenuItem({ label, shortcut, disabled, onClick }: MenuItemProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Box
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 12px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        backgroundColor: hovered && !disabled ? 'var(--gray-3)' : 'transparent',
        transition: 'background-color 0.1s',
      }}
    >
      <Text style={{ fontSize: 12, color: 'var(--gray-12)' }}>{label}</Text>
      {shortcut && <Text style={{ fontSize: 10, color: 'var(--gray-8)', fontFamily: 'monospace', marginLeft: 16 }}>{shortcut}</Text>}
    </Box>
  );
}

function BreadcrumbMenu({
  activeTab,
  onClose,
  onCopyPath,
  onDuplicateTab,
  onCloseTab,
  anchorRef,
}: {
  activeTab: any;
  onClose: () => void;
  onCopyPath: () => void;
  onDuplicateTab: () => void;
  onCloseTab: () => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [onClose]);

  return (
    <Box
      ref={menuRef}
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        zIndex: 9999,
        minWidth: 180,
        padding: '4px 0',
        backgroundColor: 'var(--gray-2)',
        border: '0.5px solid var(--gray-a6)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        borderRadius: 0,
      }}
    >
      <BreadcrumbMenuItem label="Copy Path" shortcut="⌘⇧C" onClick={onCopyPath} disabled={!activeTab?.uri} />
      <Box style={{ height: 1, backgroundColor: 'var(--gray-a3)', margin: '4px 0' }} />
      <BreadcrumbMenuItem label="Duplicate Tab" onClick={onDuplicateTab} disabled={!activeTab} />
      <BreadcrumbMenuItem label="Close Tab" shortcut="⌘W" onClick={onCloseTab} disabled={!activeTab} />
    </Box>
  );
}

// =============================================================================
// BREADCRUMB BAR
// =============================================================================

export const BreadcrumbBar = memo(function BreadcrumbBar({
  isBookmarked = false,
  breadcrumbs: extraBreadcrumbs,
  onToggleBookmark,
  onBreadcrumbClick,
  onMenuClick,
  formatLabel = defaultFormatLabel,
  getChildren,
}: BreadcrumbBarProps) {
  const { layout, activateTab, closeTab, openTab } = useWindowManager();
  const { appearance } = useTheme();
  const [hoveredBreadcrumb, setHoveredBreadcrumb] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLDivElement>(null);
  // Open crumb-children dropdown: which crumb + where to anchor it.
  const [childMenu, setChildMenu] = useState<{
    id: string;
    items: BreadcrumbItem[];
    left: number;
    top: number;
  } | null>(null);

  // Tab history for back/forward navigation (use state for reactivity)
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Build breadcrumbs from active tab URI
  const { breadcrumbs, activeTab } = useMemo(() => {
    const tab = findActiveTab(layout.root, layout.activePaneId);
    if (!tab?.uri) {
      return { breadcrumbs: extraBreadcrumbs ?? [], activeTab: null };
    }

    // Parse URI: "scheme://segment1/segment2" -> [scheme, segment1, segment2]
    const match = tab.uri.match(/^([^:]+):\/\/(.+)$/);
    if (!match) {
      return { breadcrumbs: extraBreadcrumbs ?? [], activeTab: tab };
    }

    const scheme = match[1];
    const pathSegments = match[2].split('/').filter(Boolean);

    const items: BreadcrumbItem[] = [];

    // Build breadcrumbs with reconstructed URIs for navigation
    // First segment: scheme level (e.g., "orcher://workflows" when clicking "Workflows")
    items.push({
      id: `${scheme}-root`,
      label: formatLabel(scheme, 0),
    });

    let uriSoFar = `${scheme}://`;
    pathSegments.forEach((seg, i) => {
      uriSoFar += (i > 0 ? '/' : '') + seg;
      items.push({
        id: `${scheme}-${i}-${seg}`,
        label: formatLabel(seg, i + 1),
        uri: uriSoFar,
      });
    });

    // Prepend any extra breadcrumbs
    const all = [...(extraBreadcrumbs ?? []), ...items];

    return { breadcrumbs: all, activeTab: tab };
  }, [layout, layout.activePaneId, extraBreadcrumbs, formatLabel]);

  // Track tab history and update nav button state
  useEffect(() => {
    if (!activeTab?.uri) {
      setCanGoBack(false);
      setCanGoForward(false);
      return;
    }

    const history = historyRef.current;
    const idx = historyIndexRef.current;

    // Don't add if it's the same as current position
    if (history[idx] !== activeTab.uri) {
      // If we navigated back and then opened something new, truncate forward history
      if (idx < history.length - 1) {
        history.splice(idx + 1);
      }

      history.push(activeTab.uri);
      historyIndexRef.current = history.length - 1;

      // Cap history size
      if (history.length > 50) {
        history.shift();
        historyIndexRef.current--;
      }
    }

    setCanGoBack(historyIndexRef.current > 0);
    setCanGoForward(historyIndexRef.current < history.length - 1);
  }, [activeTab?.uri]);

  const navigateToUri = useCallback(
    (uri: string) => {
      const result = findTabByUri(layout.root, uri);
      if (result) {
        activateTab(result.tab.id);
      }
    },
    [layout, activateTab],
  );

  const handleGoBack = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      navigateToUri(historyRef.current[historyIndexRef.current]);
      setCanGoBack(historyIndexRef.current > 0);
      setCanGoForward(true);
    }
  }, [navigateToUri]);

  const handleGoForward = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      navigateToUri(historyRef.current[historyIndexRef.current]);
      setCanGoBack(true);
      setCanGoForward(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, [navigateToUri]);

  const handleBreadcrumbClick = useCallback(
    (item: BreadcrumbItem) => {
      if (onBreadcrumbClick) {
        onBreadcrumbClick(item);
        return;
      }
      // Navigate to the tab matching this breadcrumb's URI
      if (item.uri) {
        navigateToUri(item.uri);
      }
    },
    [onBreadcrumbClick, navigateToUri],
  );

  // Go up: navigate to the parent breadcrumb
  const handleGoUp = useCallback(() => {
    if (breadcrumbs.length >= 2) {
      const parent = breadcrumbs[breadcrumbs.length - 2];
      if (parent.uri) {
        navigateToUri(parent.uri);
      }
    }
  }, [breadcrumbs, navigateToUri]);

  const canGoUp = breadcrumbs.length >= 2 && !!breadcrumbs[breadcrumbs.length - 2]?.uri;

  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '36px',
        padding: '0 8px',
        backgroundColor: 'var(--gray-2)',
        borderBottom: '1px solid var(--gray-6)',
        gap: '4px',
      }}
    >
      {/* Navigation buttons */}
      <Box style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <NavButton
          icon={<ArrowLeftIcon width={16} height={16} />}
          disabled={!canGoBack}
          onClick={handleGoBack}
          title="Go back"
        />
        <NavButton
          icon={<ArrowRightIcon width={16} height={16} />}
          disabled={!canGoForward}
          onClick={handleGoForward}
          title="Go forward"
        />
        <NavButton
          icon={<ChevronUpIcon width={16} height={16} />}
          disabled={!canGoUp}
          onClick={handleGoUp}
          title="Go to parent"
        />
      </Box>

      {/* Separator */}
      <Box
        style={{
          width: '1px',
          height: '20px',
          backgroundColor: 'var(--gray-6)',
          margin: '0 4px',
        }}
      />

      {/* Bookmark button */}
      <NavButton
        icon={
          isBookmarked ? (
            <BookmarkFilledIcon
              width={16}
              height={16}
              style={{ color: 'var(--accent-9)' }}
            />
          ) : (
            <BookmarkIcon width={16} height={16} />
          )
        }
        onClick={onToggleBookmark}
        title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      />

      {/* Separator */}
      <Box
        style={{
          width: '1px',
          height: '20px',
          backgroundColor: 'var(--gray-6)',
          margin: '0 4px',
        }}
      />

      {/* Breadcrumb trail */}
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          overflow: 'hidden',
          gap: '2px',
        }}
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isHovered = hoveredBreadcrumb === item.id;
          const children = getChildren ? getChildren(item) : [];
          const hasChildren = children.length > 0;
          const isClickable = !!item.uri || !!onBreadcrumbClick || hasChildren;

          // A crumb with children opens its dropdown; otherwise it navigates.
          const handleClick = hasChildren
            ? (e: { currentTarget: EventTarget | null }) => {
                const rect = (
                  e.currentTarget as HTMLElement
                ).getBoundingClientRect();
                setChildMenu((prev) =>
                  prev?.id === item.id
                    ? null
                    : { id: item.id, items: children, left: rect.left, top: rect.bottom + 4 },
                );
              }
            : item.uri || onBreadcrumbClick
              ? () => handleBreadcrumbClick(item)
              : undefined;

          return (
            <Box
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                minWidth: 0,
              }}
            >
              <Box
                onClick={handleClick}
                onMouseEnter={() => setHoveredBreadcrumb(item.id)}
                onMouseLeave={() => setHoveredBreadcrumb(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '4px 8px',
                  borderRadius: 0,
                  cursor: isClickable ? 'pointer' : 'default',
                  backgroundColor:
                    (isHovered && isClickable) || childMenu?.id === item.id
                      ? 'var(--gray-a3)'
                      : 'transparent',
                  transition: 'background-color 0.1s',
                }}
              >
                <Text
                  size="2"
                  weight={isLast ? 'medium' : 'regular'}
                  style={{
                    color: isLast ? 'var(--gray-12)' : 'var(--gray-11)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.label}
                </Text>
                {hasChildren && (
                  <ChevronDownIcon
                    width={12}
                    height={12}
                    style={{ color: 'var(--gray-9)', flexShrink: 0 }}
                  />
                )}
              </Box>
              {!isLast && (
                <ChevronRightIcon
                  width={14}
                  height={14}
                  style={{ color: 'var(--gray-8)', flexShrink: 0 }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Menu button */}
      <Box ref={menuButtonRef} style={{ position: 'relative' }}>
        <NavButton
          icon={<DotsVerticalIcon width={16} height={16} />}
          onClick={() => { if (onMenuClick) onMenuClick(); else setMenuOpen((v) => !v); }}
          title="More options"
        />
      </Box>

      {/* Menu dropdown */}
      {menuOpen && typeof document !== 'undefined' && createPortal(
        <Theme appearance={appearance} accentColor="gray" style={{ display: 'contents' }}>
          <BreadcrumbMenu
            activeTab={activeTab}
            onClose={() => setMenuOpen(false)}
            onCopyPath={() => {
              if (activeTab?.uri) navigator.clipboard.writeText(activeTab.uri);
              setMenuOpen(false);
            }}
            onDuplicateTab={() => {
              if (activeTab) {
                const dupUri = `${activeTab.uri}#dup-${Date.now()}`;
                openTab({ title: activeTab.title, editorId: activeTab.editorId, uri: dupUri, icon: activeTab.icon, groupId: activeTab.groupId, pinned: false, preview: false, dirty: false });
              }
              setMenuOpen(false);
            }}
            onCloseTab={() => {
              if (activeTab) closeTab(activeTab.id);
              setMenuOpen(false);
            }}
            anchorRef={menuButtonRef}
          />
        </Theme>,
        document.body,
      )}

      {/* Crumb-children dropdown (sibling navigation) */}
      {childMenu && typeof document !== 'undefined' && createPortal(
        <Theme appearance={appearance} accentColor="gray" style={{ display: 'contents' }}>
          <BreadcrumbChildMenu
            items={childMenu.items}
            left={childMenu.left}
            top={childMenu.top}
            onSelect={(child) => {
              setChildMenu(null);
              handleBreadcrumbClick(child);
            }}
            onClose={() => setChildMenu(null)}
          />
        </Theme>,
        document.body,
      )}
    </Box>
  );
});

/** Dropdown listing a crumb's children (siblings) for lateral navigation. */
function BreadcrumbChildMenu({
  items,
  left,
  top,
  onSelect,
  onClose,
}: {
  items: BreadcrumbItem[];
  left: number;
  top: number;
  onSelect: (item: BreadcrumbItem) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  return (
    <Box
      ref={ref}
      style={{
        position: 'fixed',
        top,
        left,
        minWidth: 180,
        background: 'var(--gray-1)',
        border: '0.5px solid var(--gray-a6)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        borderRadius: 0,
        padding: '2px 0',
        zIndex: 9999,
      }}
    >
      {items.map((child) => (
        <button
          key={child.id}
          onClick={() => onSelect(child)}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--gray-3)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '5px 12px',
            border: 'none',
            background: 'transparent',
            borderRadius: 0,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Text size="1" style={{ color: 'var(--gray-12)', whiteSpace: 'nowrap' }}>
            {child.label}
          </Text>
        </button>
      ))}
    </Box>
  );
}
