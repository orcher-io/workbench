'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { Box, Text } from '@radix-ui/themes';
import { ChevronRightIcon, ChevronDownIcon } from '@radix-ui/react-icons';

export interface TreeNode {
  id: string;
  label: string;
  icon?: ReactNode;
  children?: TreeNode[];
  data?: unknown;
}

export interface TreeItemProps {
  node: TreeNode;
  level: number;
  expanded: Set<string>;
  selected: string | null;
  onToggle: (id: string) => void;
  onSelect: (node: TreeNode) => void;
  onContextMenu?: (node: TreeNode, e: React.MouseEvent) => void;
}

function TreeItem({
  node,
  level,
  expanded,
  selected,
  onToggle,
  onSelect,
  onContextMenu,
}: TreeItemProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selected === node.id;

  const handleClick = useCallback(() => {
    if (hasChildren) {
      onToggle(node.id);
    }
    onSelect(node);
  }, [node, hasChildren, onToggle, onSelect]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu?.(node, e);
    },
    [node, onContextMenu]
  );

  return (
    <>
      <Box
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '2px 8px',
          paddingLeft: level * 16 + 8,
          cursor: 'pointer',
          backgroundColor: isSelected ? 'var(--accent-4)' : 'transparent',
          borderRadius: 4,
          gap: 4,
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'var(--gray-3)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {/* Expand/collapse icon */}
        <Box style={{ width: 16, height: 16, flexShrink: 0 }}>
          {hasChildren && (
            isExpanded ? (
              <ChevronDownIcon width={16} height={16} />
            ) : (
              <ChevronRightIcon width={16} height={16} />
            )
          )}
        </Box>

        {/* Node icon */}
        {node.icon && (
          <Box style={{ width: 16, height: 16, flexShrink: 0 }}>
            {node.icon}
          </Box>
        )}

        {/* Label */}
        <Text size="1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.label}
        </Text>
      </Box>

      {/* Children */}
      {hasChildren && isExpanded && (
        <Box>
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              expanded={expanded}
              selected={selected}
              onToggle={onToggle}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </Box>
      )}
    </>
  );
}

export interface TreeViewProps {
  /** Tree data */
  nodes: TreeNode[];
  /** Initially expanded node IDs */
  defaultExpanded?: string[];
  /** Callback when a node is selected */
  onSelect?: (node: TreeNode) => void;
  /** Callback for double-click */
  onDoubleClick?: (node: TreeNode) => void;
  /** Callback for context menu */
  onContextMenu?: (node: TreeNode, e: React.MouseEvent) => void;
  /** Empty state content */
  emptyContent?: ReactNode;
}

/**
 * Tree view component for hierarchical data
 */
export function TreeView({
  nodes,
  defaultExpanded = [],
  onSelect,
  onDoubleClick,
  onContextMenu,
  emptyContent,
}: TreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(defaultExpanded));
  const [selected, setSelected] = useState<string | null>(null);

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (node: TreeNode) => {
      setSelected(node.id);
      onSelect?.(node);
    },
    [onSelect]
  );

  if (nodes.length === 0) {
    return (
      <Box style={{ padding: 16, textAlign: 'center' }}>
        {emptyContent ?? (
          <Text size="1" color="gray">
            No items
          </Text>
        )}
      </Box>
    );
  }

  return (
    <Box
      style={{ padding: '4px 0' }}
      onDoubleClick={(e) => {
        if (selected && onDoubleClick) {
          const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
            for (const node of nodes) {
              if (node.id === selected) return node;
              if (node.children) {
                const found = findNode(node.children);
                if (found) return found;
              }
            }
            return undefined;
          };
          const node = findNode(nodes);
          if (node) onDoubleClick(node);
        }
      }}
    >
      {nodes.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          level={0}
          expanded={expanded}
          selected={selected}
          onToggle={handleToggle}
          onSelect={handleSelect}
          onContextMenu={onContextMenu}
        />
      ))}
    </Box>
  );
}
