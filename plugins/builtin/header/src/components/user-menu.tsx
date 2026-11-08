'use client';

import { memo } from 'react';
import {
  Box,
  Flex,
  Text,
  DropdownMenu,
  Avatar,
  Separator,
} from '@radix-ui/themes';
import {
  GearIcon,
  PersonIcon,
  ExitIcon,
  MixerHorizontalIcon,
  SunIcon,
  MoonIcon,
} from '@radix-ui/react-icons';

export type ThemeAppearance = 'light' | 'dark';

export interface UserMenuProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  /** Current theme appearance */
  theme?: ThemeAppearance;
  /** Called when theme toggle is clicked */
  onThemeToggle?: () => void;
  onAccountSettings?: () => void;
  onIntegrations?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}

/** Menu item with consistent icon alignment */
function MenuItem({
  icon,
  label,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  color?: 'red';
}) {
  return (
    <DropdownMenu.Item
      onClick={onClick}
      color={color}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
      }}
    >
      <Box
        style={{
          width: 16,
          height: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Text size="2">{label}</Text>
    </DropdownMenu.Item>
  );
}

export const UserMenu = memo(function UserMenu({
  user = {
    name: 'User',
    email: 'user@example.com',
  },
  theme = 'dark',
  onThemeToggle,
  onAccountSettings,
  onIntegrations,
  onSettings,
  onLogout,
}: UserMenuProps) {
  const isDark = theme === 'dark';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Box style={{ cursor: 'pointer' }} className="navbar-user-trigger">
          <Avatar
            size="2"
            radius="full"
            fallback={user.name.charAt(0).toUpperCase()}
            src={user.avatar}
          />
        </Box>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        side="bottom"
        align="end"
        sideOffset={8}
        style={{
          minWidth: 240,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* User info header */}
        <Flex gap="3" align="center" px="3" py="2">
          <Avatar
            size="2"
            radius="full"
            fallback={user.name.charAt(0).toUpperCase()}
            src={user.avatar}
          />
          <Box style={{ minWidth: 0 }}>
            <Text
              size="2"
              weight="medium"
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.name}
            </Text>
            <Text
              size="1"
              color="gray"
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.email}
            </Text>
          </Box>
        </Flex>

        <Separator size="4" />

        {/* Menu items */}
        <Box py="1">
          <MenuItem
            icon={<PersonIcon width={15} height={15} />}
            label="Account Settings"
            onClick={onAccountSettings}
          />
          <MenuItem
            icon={<MixerHorizontalIcon width={15} height={15} />}
            label="Integrations"
            onClick={onIntegrations}
          />
          <MenuItem
            icon={<GearIcon width={15} height={15} />}
            label="Settings"
            onClick={onSettings}
          />
          {onThemeToggle && (
            <MenuItem
              icon={
                isDark ? (
                  <SunIcon width={15} height={15} />
                ) : (
                  <MoonIcon width={15} height={15} />
                )
              }
              label={isDark ? 'Light Mode' : 'Dark Mode'}
              onClick={onThemeToggle}
            />
          )}
        </Box>

        <Separator size="4" />

        {/* Logout */}
        <Box py="1">
          <MenuItem
            icon={<ExitIcon width={15} height={15} />}
            label="Logout"
            onClick={onLogout}
            color="red"
          />
        </Box>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
});
