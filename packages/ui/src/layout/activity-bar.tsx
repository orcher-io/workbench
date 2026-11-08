'use client';

import { Box, Tooltip, Popover } from '@radix-ui/themes';
import {
  forwardRef,
  useState,
  type ReactNode,
  type CSSProperties,
  memo,
} from 'react';

export interface ActivityBarItem {
  /** Unique identifier */
  id: string;
  /** Icon component */
  icon: ReactNode;
  /** Tooltip label */
  label: string;
  /** Whether this item is active */
  active?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Popover content — when provided, clicking opens a popover instead of triggering onClick */
  content?: ReactNode;
}

export interface ActivityBarProps {
  /** Logo/brand element at the top */
  logo?: ReactNode;
  /** Callback when logo is clicked */
  onLogoClick?: () => void;
  /** Activity bar items */
  items: ActivityBarItem[];
  /** Secondary items (shown after a separator) */
  secondaryItems?: ActivityBarItem[];
  /** Position of the bar */
  position?: 'left' | 'right';
  /** Bottom items (settings, account, etc.) */
  bottomItems?: ActivityBarItem[];
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: CSSProperties;
}

/** Separator line between groups */
const Separator = memo(function Separator() {
  return (
    <Box
      style={{
        width: 24,
        height: 1,
        backgroundColor: 'var(--gray-6)',
        margin: '8px 0',
      }}
    />
  );
});

/** The icon button styling used in the activity bar */
const IconBox = memo(function IconBox({
  item,
  onClick,
}: {
  item: ActivityBarItem;
  onClick?: () => void;
}) {
  return (
    <Box
      onClick={onClick ?? item.onClick}
      style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        cursor: 'pointer',
        backgroundColor: item.active ? 'var(--accent-4)' : 'transparent',
        color: item.active ? 'var(--accent-11)' : 'var(--gray-11)',
        transition: 'all 0.15s ease',
        margin: '2px 0',
      }}
      onMouseEnter={(e) => {
        if (!item.active) {
          e.currentTarget.style.backgroundColor = 'var(--gray-4)';
          e.currentTarget.style.color = 'var(--gray-12)';
        }
      }}
      onMouseLeave={(e) => {
        if (!item.active) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--gray-11)';
        }
      }}
    >
      {item.icon}
    </Box>
  );
});

/** Activity bar icon button — wraps in Popover if content is provided, otherwise Tooltip */
const ActivityBarButton = memo(function ActivityBarButton({
  item,
  position,
}: {
  item: ActivityBarItem;
  position: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);

  if (item.content) {
    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger>
          <Box>
            <IconBox item={{ ...item, active: item.active || open }} />
          </Box>
        </Popover.Trigger>
        <Popover.Content
          side={position === 'left' ? 'right' : 'left'}
          align="end"
          sideOffset={8}
          style={{ padding: 0, borderRadius: 0, overflow: 'visible' }}
        >
          {item.content}
        </Popover.Content>
      </Popover.Root>
    );
  }

  return (
    <Tooltip
      content={item.label}
      side={position === 'left' ? 'right' : 'left'}
      sideOffset={8}
    >
      <Box>
        <IconBox item={item} />
      </Box>
    </Tooltip>
  );
});

/**
 * Activity bar component (vertical icon bar)
 */
export const ActivityBar = forwardRef<HTMLDivElement, ActivityBarProps>(
  (
    {
      logo,
      onLogoClick,
      items,
      secondaryItems = [],
      position = 'left',
      bottomItems = [],
      className,
      style,
    },
    ref,
  ) => {
    return (
      <Box
        ref={ref}
        className={className}
        style={{
          width: 48,
          minWidth: 48,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '8px 0',
          backgroundColor: 'var(--gray-1)',
          borderRight:
            position === 'left' ? '1px solid var(--gray-6)' : undefined,
          borderLeft:
            position === 'right' ? '1px solid var(--gray-6)' : undefined,
          ...style,
        }}
      >
        {/* Logo at top */}
        {logo && (
          <Box
            onClick={onLogoClick}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: onLogoClick ? 'pointer' : 'default',
              marginBottom: 8,
            }}
          >
            {logo}
          </Box>
        )}

        {/* Main items */}
        <Box
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {items.map((item) => (
            <ActivityBarButton key={item.id} item={item} position={position} />
          ))}

          {/* Secondary items with separator */}
          {secondaryItems.length > 0 && (
            <>
              <Separator />
              {secondaryItems.map((item) => (
                <ActivityBarButton
                  key={item.id}
                  item={item}
                  position={position}
                />
              ))}
            </>
          )}
        </Box>

        {/* Bottom items */}
        {bottomItems.length > 0 && (
          <>
            <Separator />
            <Box
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {bottomItems.map((item) => (
                <ActivityBarButton
                  key={item.id}
                  item={item}
                  position={position}
                />
              ))}
            </Box>
          </>
        )}
      </Box>
    );
  },
);

ActivityBar.displayName = 'ActivityBar';
