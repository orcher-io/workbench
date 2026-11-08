'use client';

import { memo } from 'react';
import { Flex, Text } from '@radix-ui/themes';
import type { BreadcrumbItem } from '../types';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate?: (id: string) => void;
}

export const Breadcrumb = memo(function Breadcrumb({
  items,
  onNavigate,
}: BreadcrumbProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Flex
      align="center"
      gap="1"
      px="3"
      py="1"
      style={{
        borderBottom: '1px solid var(--gray-5)',
        overflow: 'hidden',
        flexShrink: 0,
        minHeight: 28,
      }}
    >
      {items.map((item, index) => (
        <Flex key={item.id} align="center" gap="1">
          {index > 0 && (
            <Text size="1" color="gray" style={{ flexShrink: 0 }}>
              /
            </Text>
          )}
          <Text
            size="1"
            weight={item.isLast ? 'medium' : 'regular'}
            style={{
              cursor: item.isLast ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: item.isLast ? 'var(--gray-12)' : 'var(--gray-11)',
            }}
            onClick={item.isLast ? undefined : () => onNavigate?.(item.id)}
          >
            {item.name}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
});
