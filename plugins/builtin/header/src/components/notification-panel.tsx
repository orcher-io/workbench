'use client';

import {
  memo,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import {
  Box,
  Flex,
  Text,
  ScrollArea,
  IconButton,
  Separator,
  DropdownMenu,
} from '@radix-ui/themes';
import {
  BellIcon,
  DotsHorizontalIcon,
  CheckIcon,
  Cross2Icon,
  TrashIcon,
  CheckCircledIcon,
} from '@radix-ui/react-icons';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface WorkbenchNotification {
  /** Unique identifier */
  id: string;
  /** Notification title */
  title: string;
  /** Optional description / secondary text */
  description?: string;
  /** Notification type */
  type?: NotificationType;
  /** Custom icon (overrides type-based icon) */
  icon?: ReactNode;
  /** Whether notification has been read */
  read?: boolean;
  /** Timestamp (ISO string or Date) */
  timestamp: string | Date;
  /** Optional action label */
  actionLabel?: string;
  /** Optional action callback */
  onAction?: () => void;
}

export interface NotificationPanelProps {
  /** List of notifications */
  notifications: WorkbenchNotification[];
  /** Called when a notification is marked as read */
  onMarkRead?: (id: string) => void;
  /** Called when a notification is dismissed */
  onDismiss?: (id: string) => void;
  /** Called when all notifications are cleared */
  onClearAll?: () => void;
  /** Called when all are marked as read */
  onMarkAllRead?: () => void;
  /** Called when a notification is clicked */
  onNotificationClick?: (notification: WorkbenchNotification) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: string | Date): string {
  const date =
    typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

type TimeGroup = 'Today' | 'Yesterday' | 'Earlier';

function getTimeGroup(timestamp: string | Date): TimeGroup {
  const date =
    typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  return 'Earlier';
}

function groupNotifications(
  items: WorkbenchNotification[],
): Map<TimeGroup, WorkbenchNotification[]> {
  const groups = new Map<TimeGroup, WorkbenchNotification[]>();
  const order: TimeGroup[] = ['Today', 'Yesterday', 'Earlier'];

  for (const group of order) {
    groups.set(group, []);
  }

  for (const item of items) {
    const group = getTimeGroup(item.timestamp);
    groups.get(group)!.push(item);
  }

  // Remove empty groups
  for (const group of order) {
    if (groups.get(group)!.length === 0) {
      groups.delete(group);
    }
  }

  return groups;
}

// ─── Type Indicator ──────────────────────────────────────────────────────────

const typeColors: Record<NotificationType, string> = {
  info: 'var(--gray-9)',
  success: 'var(--green-9, #30a46c)',
  warning: 'var(--amber-9, #f5a623)',
  error: 'var(--red-9, #e5484d)',
};

function TypeDot({ type = 'info' }: { type?: NotificationType }) {
  return (
    <Box
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: typeColors[type],
        flexShrink: 0,
      }}
    />
  );
}

// ─── Notification Item ───────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: WorkbenchNotification;
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onClick?: (notification: WorkbenchNotification) => void;
}

const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
  onClick,
}: NotificationItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        onClick?.(notification);
        if (!notification.read) {
          onMarkRead?.(notification.id);
        }
      }}
      style={{
        display: 'flex',
        gap: '10px',
        padding: '10px 16px',
        cursor: 'pointer',
        backgroundColor: isHovered ? 'var(--gray-a3)' : 'transparent',
        transition: 'background-color 0.1s',
      }}
    >
      {/* Unread dot / icon area */}
      <Box
        style={{
          width: 20,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {notification.icon ? (
          notification.icon
        ) : !notification.read ? (
          <TypeDot type={notification.type} />
        ) : (
          <Box style={{ width: 6, height: 6 }} />
        )}
      </Box>

      {/* Content */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text
          size="2"
          weight={notification.read ? 'regular' : 'medium'}
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: notification.read ? 'var(--gray-10)' : 'var(--gray-12)',
          }}
        >
          {notification.title}
        </Text>
        {notification.description && (
          <Text
            size="1"
            style={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--gray-9)',
              marginTop: 2,
            }}
          >
            {notification.description}
          </Text>
        )}
        <Flex align="center" gap="2" mt="1">
          <Text size="1" style={{ color: 'var(--gray-8)' }}>
            {formatRelativeTime(notification.timestamp)}
          </Text>
          {notification.actionLabel && notification.onAction && (
            <>
              <Text size="1" style={{ color: 'var(--gray-6)' }}>
                ·
              </Text>
              <Text
                size="1"
                weight="medium"
                style={{
                  color: 'var(--gray-11)',
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  notification.onAction!();
                }}
              >
                {notification.actionLabel}
              </Text>
            </>
          )}
        </Flex>
      </Box>

      {/* Overflow menu */}
      <Box
        style={{
          flexShrink: 0,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.1s',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton size="1" variant="ghost">
              <DotsHorizontalIcon width={14} height={14} />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content side="left" align="start" sideOffset={4}>
            {!notification.read && (
              <DropdownMenu.Item
                onClick={() => onMarkRead?.(notification.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                }}
              >
                <CheckIcon width={14} height={14} />
                <Text size="1">Mark as read</Text>
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item
              onClick={() => onDismiss?.(notification.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
              }}
            >
              <Cross2Icon width={14} height={14} />
              <Text size="1">Dismiss</Text>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Box>
    </Box>
  );
});

// ─── Filter Tabs ─────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'unread';

function FilterTabs({
  active,
  onChange,
  unreadCount,
}: {
  active: FilterTab;
  onChange: (tab: FilterTab) => void;
  unreadCount: number;
}) {
  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
  ];

  return (
    <Flex gap="1" px="3" py="2">
      {tabs.map((tab) => (
        <Box
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '4px 10px',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: active === tab.id ? 500 : 400,
            color:
              active === tab.id ? 'var(--gray-12)' : 'var(--gray-10)',
            backgroundColor:
              active === tab.id ? 'var(--gray-a4)' : 'transparent',
            transition: 'all 0.1s',
          }}
        >
          {tab.label}
        </Box>
      ))}
    </Flex>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterTab }) {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      py="9"
      px="4"
      gap="2"
    >
      <Box
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'var(--gray-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--gray-8)',
        }}
      >
        {filter === 'unread' ? (
          <CheckCircledIcon width={20} height={20} />
        ) : (
          <BellIcon width={20} height={20} />
        )}
      </Box>
      <Text size="2" weight="medium" style={{ color: 'var(--gray-11)' }}>
        {filter === 'unread' ? 'All caught up' : 'No notifications'}
      </Text>
      <Text size="1" style={{ color: 'var(--gray-9)', textAlign: 'center' }}>
        {filter === 'unread'
          ? "You've read all your notifications."
          : "You don't have any notifications yet."}
      </Text>
    </Flex>
  );
}

// ─── Notification Panel ──────────────────────────────────────────────────────

export const NotificationPanel = memo(function NotificationPanel({
  notifications,
  onMarkRead,
  onDismiss,
  onClearAll,
  onMarkAllRead,
  onNotificationClick,
}: NotificationPanelProps) {
  const [filter, setFilter] = useState<FilterTab>('all');

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const filtered = useMemo(() => {
    const items =
      filter === 'unread'
        ? notifications.filter((n) => !n.read)
        : notifications;
    // Sort newest first
    return [...items].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [notifications, filter]);

  const grouped = useMemo(() => groupNotifications(filtered), [filtered]);

  const handleFilterChange = useCallback((tab: FilterTab) => {
    setFilter(tab);
  }, []);

  return (
    <Box style={{ width: 360 }}>
      {/* Header */}
      <Flex
        align="center"
        justify="between"
        px="3"
        style={{ height: 44 }}
      >
        <Text size="3" weight="medium">
          Notifications
        </Text>
        <Flex gap="1">
          {unreadCount > 0 && onMarkAllRead && (
            <IconButton
              size="1"
              variant="ghost"
              onClick={onMarkAllRead}
              title="Mark all as read"
            >
              <CheckCircledIcon width={15} height={15} />
            </IconButton>
          )}
          {notifications.length > 0 && onClearAll && (
            <IconButton
              size="1"
              variant="ghost"
              onClick={onClearAll}
              title="Clear all"
            >
              <TrashIcon width={15} height={15} />
            </IconButton>
          )}
        </Flex>
      </Flex>

      <Separator size="4" />

      {/* Filter tabs */}
      <FilterTabs
        active={filter}
        onChange={handleFilterChange}
        unreadCount={unreadCount}
      />

      <Separator size="4" />

      {/* Notification list */}
      <ScrollArea style={{ maxHeight: 420 }}>
        {filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <Box py="1">
            {Array.from(grouped.entries()).map(([group, items]) => (
              <Box key={group}>
                {/* Group label */}
                <Box px="4" py="2">
                  <Text
                    size="1"
                    weight="medium"
                    style={{
                      color: 'var(--gray-9)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontSize: 10,
                    }}
                  >
                    {group}
                  </Text>
                </Box>

                {/* Items */}
                {items.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={onMarkRead}
                    onDismiss={onDismiss}
                    onClick={onNotificationClick}
                  />
                ))}
              </Box>
            ))}
          </Box>
        )}
      </ScrollArea>
    </Box>
  );
});
