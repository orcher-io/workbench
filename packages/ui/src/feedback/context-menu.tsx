'use client';

import { ContextMenu as RadixContextMenu } from '@radix-ui/themes';
import { type ReactNode } from 'react';

export interface ContextMenuItemProps {
  /** Item label */
  label: string;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Icon */
  icon?: ReactNode;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Click handler */
  onSelect?: () => void;
}

export interface ContextMenuProps {
  /** Trigger element */
  children: ReactNode;
  /** Menu items */
  items: ContextMenuItemProps[];
}

/**
 * Context menu component
 */
export function ContextMenu({ children, items }: ContextMenuProps) {
  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger>{children}</RadixContextMenu.Trigger>
      <RadixContextMenu.Content>
        {items.map((item, index) => (
          <RadixContextMenu.Item
            key={index}
            disabled={item.disabled}
            onSelect={item.onSelect}
            shortcut={item.shortcut}
          >
            {item.icon && <span style={{ marginRight: 8 }}>{item.icon}</span>}
            {item.label}
          </RadixContextMenu.Item>
        ))}
      </RadixContextMenu.Content>
    </RadixContextMenu.Root>
  );
}
