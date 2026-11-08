'use client';

import { memo } from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';

export interface SidebarHeaderProps {
  /** Title to display */
  title: string;
  /** Position of the sidebar (affects chevron direction) */
  position?: 'left' | 'right';
  /** Callback when toggle button is clicked */
  onToggle?: () => void;
  /** Whether to show search button */
  showSearchButton?: boolean;
  /** Whether search is currently active */
  isSearchActive?: boolean;
  /** Callback when search button is clicked */
  onSearchToggle?: () => void;
}

/** Small icon button for header actions */
function HeaderButton({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick?: () => void;
  isActive?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: 4,
        cursor: 'pointer',
        backgroundColor: isActive ? 'var(--accent-4)' : 'var(--gray-3)',
        border: `1px solid ${isActive ? 'var(--accent-6)' : 'var(--gray-6)'}`,
        color: isActive ? 'var(--accent-11)' : 'var(--gray-11)',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--gray-4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--gray-3)';
        }
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Simple header for sidebar with title, search toggle, and collapse toggle
 */
export const SidebarHeader = memo(function SidebarHeader({
  title,
  position = 'left',
  onToggle,
  showSearchButton = false,
  isSearchActive = false,
  onSearchToggle,
}: SidebarHeaderProps) {
  const ChevronIcon = position === 'left' ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        borderBottom: '1px solid var(--gray-6)',
        flexShrink: 0,
        height: 36,
      }}
    >
      <Text size="2" weight="medium" style={{ color: 'var(--gray-11)' }}>
        {title}
      </Text>
      <Flex gap="2" align="center">
        {showSearchButton && onSearchToggle && (
          <HeaderButton
            onClick={onSearchToggle}
            isActive={isSearchActive}
            title="Search (Ctrl+F)"
          >
            <MagnifyingGlassIcon width={14} height={14} />
          </HeaderButton>
        )}
        {onToggle && (
          <HeaderButton onClick={onToggle} title="Toggle sidebar">
            <ChevronIcon width={14} height={14} />
          </HeaderButton>
        )}
      </Flex>
    </Box>
  );
});
