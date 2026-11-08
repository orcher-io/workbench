'use client';

import { memo, useCallback, type CSSProperties, type ReactNode } from 'react';
import { Flex, Text, Spinner } from '@radix-ui/themes';
import type { FlattenedTreeNode } from '../types';
import { ChevronIcon, DefaultTreeIcon } from './tree-icons';
import { highlightMatches } from '../utils/fuzzy-search';

const ROW_HEIGHT = 28;
const INDENT_SIZE = 16;

interface TreeRowProps<T> {
  node: FlattenedTreeNode<T>;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onActivate: () => void;
  renderIcon?: (element: T, expanded: boolean) => ReactNode;
  getItemType?: (element: T) => 'file' | 'folder';
  getItemName?: (element: T) => string;
}

function TreeRowComponent<T>({
  node,
  isSelected,
  isFocused,
  onSelect,
  onToggle,
  onActivate,
  renderIcon,
  getItemType,
  getItemName,
}: TreeRowProps<T>) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect();
      // Single click activates non-folder items (opens them)
      if (!node.hasChildren) {
        onActivate();
      }
    },
    [onSelect, node.hasChildren, onActivate],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // Double click toggles folders
      if (node.hasChildren) {
        onToggle();
      }
    },
    [node.hasChildren, onToggle],
  );

  const handleChevronClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle();
    },
    [onToggle],
  );

  const indent = node.indentLevel * INDENT_SIZE;

  const rowStyle: CSSProperties = {
    height: ROW_HEIGHT,
    paddingLeft: indent + 4,
    paddingRight: 8,
    cursor: 'pointer',
    userSelect: 'none',
    backgroundColor: isSelected
      ? 'var(--accent-a4)'
      : isFocused
        ? 'var(--gray-a3)'
        : 'transparent',
    borderRadius: 4,
    margin: '0 4px',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  // Render icon
  const renderNodeIcon = () => {
    if (renderIcon) {
      return renderIcon(node.element, node.expanded);
    }

    const itemType = getItemType?.(node.element) ?? 'file';
    const itemName = getItemName?.(node.element) ?? node.treeItem.label;

    return (
      <DefaultTreeIcon
        type={itemType}
        name={itemName}
        expanded={node.expanded}
        size={16}
      />
    );
  };

  // Render label with highlighting
  const renderLabel = () => {
    if (node.matchIndices && node.matchIndices.length > 0) {
      const segments = highlightMatches(node.treeItem.label, node.matchIndices);
      return (
        <Text
          size="1"
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {segments.map((segment, i) =>
            segment.highlighted ? (
              <span
                key={i}
                style={{
                  backgroundColor: 'var(--amber-a5)',
                  borderRadius: 2,
                }}
              >
                {segment.text}
              </span>
            ) : (
              <span key={i}>{segment.text}</span>
            ),
          )}
        </Text>
      );
    }

    return (
      <Text
        size="1"
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {node.treeItem.label}
      </Text>
    );
  };

  return (
    <div
      style={rowStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={node.hasChildren ? node.expanded : undefined}
    >
      {/* Chevron */}
      <Flex
        align="center"
        justify="center"
        style={{
          width: 16,
          height: 16,
          flexShrink: 0,
          opacity: node.hasChildren ? 1 : 0,
        }}
        onClick={node.hasChildren ? handleChevronClick : undefined}
      >
        {node.hasChildren && <ChevronIcon expanded={node.expanded} />}
      </Flex>

      {/* Loading spinner */}
      {node.isLoading && <Spinner size="1" />}

      {/* Icon */}
      {!node.isLoading && renderNodeIcon()}

      {/* Label */}
      {renderLabel()}

      {/* Description */}
      {node.treeItem.description && (
        <Text size="1" color="gray" style={{ flexShrink: 0 }}>
          {node.treeItem.description}
        </Text>
      )}
    </div>
  );
}

export const TreeRow = memo(TreeRowComponent) as typeof TreeRowComponent;
