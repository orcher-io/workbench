'use client';

import { Box, Text } from '@radix-ui/themes';
import { forwardRef, type ReactNode, type CSSProperties } from 'react';

export interface StatusBarItemProps {
  /** Item content */
  children: ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Tooltip */
  tooltip?: string;
}

export interface StatusBarProps {
  /** Left-aligned items */
  leftItems?: ReactNode;
  /** Right-aligned items */
  rightItems?: ReactNode;
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: CSSProperties;
}

/**
 * Status bar item component
 */
export function StatusBarItem({ children, onClick, tooltip }: StatusBarItemProps) {
  return (
    <Box
      asChild
      style={{
        padding: '0 8px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
      }}
      title={tooltip}
      onClick={onClick}
    >
      <Text size="1" style={{ whiteSpace: 'nowrap' }}>
        {children}
      </Text>
    </Box>
  );
}

/**
 * Status bar component (bottom bar)
 */
export const StatusBar = forwardRef<HTMLDivElement, StatusBarProps>(
  ({ leftItems, rightItems, className, style }, ref) => {
    return (
      <Box
        ref={ref}
        className={className}
        style={{
          height: 22,
          minHeight: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--gray-2)',
          color: 'var(--gray-11)',
          borderTop: '1px solid var(--gray-a3)',
          fontSize: '12px',
          ...style,
        }}
      >
        <Box style={{ display: 'flex', alignItems: 'center', height: '100%', paddingLeft: 12 }}>
          {leftItems}
        </Box>
        <Box style={{ display: 'flex', alignItems: 'center', height: '100%', paddingRight: 12 }}>
          {rightItems}
        </Box>
      </Box>
    );
  }
);

StatusBar.displayName = 'StatusBar';
