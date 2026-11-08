'use client';

import { memo, type ReactNode } from 'react';
import { Box, Flex, IconButton, Popover } from '@radix-ui/themes';
import { BellIcon } from '@radix-ui/react-icons';
import { UserMenu, type UserMenuProps } from './user-menu';
import {
  NotificationPanel,
  type WorkbenchNotification,
  type NotificationPanelProps,
} from './notification-panel';

export interface HeaderProps {
  /** Left side content (e.g., logo, breadcrumbs) */
  left?: ReactNode;
  /** Center content (e.g., search) */
  center?: ReactNode;
  /** User menu props */
  userMenuProps?: UserMenuProps;
  /** Show notifications icon */
  showNotifications?: boolean;
  /** Notifications list */
  notifications?: WorkbenchNotification[];
  /** Called when a notification is marked as read */
  onMarkRead?: NotificationPanelProps['onMarkRead'];
  /** Called when a notification is dismissed */
  onDismiss?: NotificationPanelProps['onDismiss'];
  /** Called when all notifications are cleared */
  onClearAll?: NotificationPanelProps['onClearAll'];
  /** Called when all are marked as read */
  onMarkAllRead?: NotificationPanelProps['onMarkAllRead'];
  /** Called when a notification is clicked */
  onNotificationClick?: NotificationPanelProps['onNotificationClick'];
  /** On notifications click (legacy — opens panel if not using built-in popover) */
  onNotificationsClick?: () => void;
  /** Additional right side items before user menu */
  rightItems?: ReactNode;
  /** Header height (default: 36, same as tab bar) */
  height?: number;
}

export const Header = memo(function Header({
  left,
  center,
  userMenuProps,
  showNotifications = true,
  notifications = [],
  onMarkRead,
  onDismiss,
  onClearAll,
  onMarkAllRead,
  onNotificationClick,
  onNotificationsClick,
  rightItems,
  height = 36,
}: HeaderProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Flex
      align="center"
      justify="between"
      px="3"
      style={{
        height,
        borderBottom: '1px solid var(--gray-5)',
        backgroundColor: 'var(--color-background)',
        flexShrink: 0,
      }}
    >
      {/* Left section */}
      <Flex align="center" gap="3" style={{ flex: 1 }}>
        {left}
      </Flex>

      {/* Center section */}
      {center && (
        <Flex align="center" justify="center" style={{ flex: 2 }}>
          {center}
        </Flex>
      )}

      {/* Right section */}
      <Flex align="center" gap="2" justify="end" style={{ flex: 1 }}>
        {rightItems}

        {/* Notifications */}
        {showNotifications && (
          <Popover.Root>
            <Popover.Trigger>
              <Box
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={onNotificationsClick}
              >
                <IconButton variant="ghost" size="2">
                  <BellIcon width={18} height={18} />
                </IconButton>
                {unreadCount > 0 && (
                  <Box
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      minWidth: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: 'var(--red-9, #e5484d)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                      fontSize: 9,
                      fontWeight: 700,
                      color: 'white',
                      lineHeight: 1,
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Box>
                )}
              </Box>
            </Popover.Trigger>
            <Popover.Content
              side="bottom"
              align="end"
              sideOffset={8}
              style={{
                padding: 0,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <NotificationPanel
                notifications={notifications}
                onMarkRead={onMarkRead}
                onDismiss={onDismiss}
                onClearAll={onClearAll}
                onMarkAllRead={onMarkAllRead}
                onNotificationClick={onNotificationClick}
              />
            </Popover.Content>
          </Popover.Root>
        )}

        {/* User menu */}
        {userMenuProps && <UserMenu {...userMenuProps} />}
      </Flex>
    </Flex>
  );
});
