'use client';

import { Box } from '@radix-ui/themes';
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  Fragment,
  type ReactNode,
  type MouseEvent,
} from 'react';
import type { SplitNode } from '../models';

export interface SplitContainerProps {
  node: SplitNode;
  renderChild: (child: SplitNode['children'][number]) => ReactNode;
  onResize: (sizes: number[]) => void;
}

export function SplitContainer({
  node,
  renderChild,
  onResize,
}: SplitContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleMouseDown = useCallback(
    (index: number) => (e: MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setDragIndex(index);
    },
    [],
  );

  const handleDoubleClick = useCallback(
    (index: number) => () => {
      // Reset to equal sizes on double-click
      const equalSize = 100 / node.children.length;
      const newSizes = node.children.map(() => equalSize);
      onResize(newSizes);
    },
    [node.children.length, onResize],
  );

  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!isDragging || dragIndex === null || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const isHorizontal = node.direction === 'horizontal';
      const totalSize = isHorizontal ? rect.width : rect.height;
      const position = isHorizontal
        ? e.clientX - rect.left
        : e.clientY - rect.top;

      // Account for divider widths (6px each)
      const dividerCount = node.children.length - 1;
      const dividerTotalWidth = dividerCount * 6;
      const availableSize = totalSize - dividerTotalWidth;

      // Calculate the cumulative size up to the dragged divider
      let sizeBeforeDivider = 0;
      for (let i = 0; i < dragIndex; i++) {
        sizeBeforeDivider += (node.sizes[i] / 100) * availableSize + 6; // pane + divider
      }

      // Position relative to available space (excluding dividers before this one)
      const adjustedPosition = position - dragIndex * 6; // subtract dividers before
      const percentage = (adjustedPosition / availableSize) * 100;

      // Calculate new sizes - allow very small minimum (2%) to nearly collapse
      const newSizes = [...node.sizes];
      const minSize = 2;

      // Sum of sizes before the divider
      let sumBefore = 0;
      for (let i = 0; i < dragIndex; i++) {
        sumBefore += node.sizes[i];
      }

      // Sum of sizes after the divider (excluding the two panes we're adjusting)
      let sumAfter = 0;
      for (let i = dragIndex + 2; i < node.sizes.length; i++) {
        sumAfter += node.sizes[i];
      }

      // Available space for the two panes being adjusted
      const availablePercentage = 100 - sumBefore - sumAfter;

      // New size for the pane before the divider
      const newLeftSize = Math.max(
        minSize,
        Math.min(availablePercentage - minSize, percentage - sumBefore),
      );
      const newRightSize = availablePercentage - newLeftSize;

      newSizes[dragIndex] = newLeftSize;
      newSizes[dragIndex + 1] = newRightSize;

      onResize(newSizes);
    },
    [
      isDragging,
      dragIndex,
      node.direction,
      node.sizes,
      node.children.length,
      onResize,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragIndex(null);
  }, []);

  // Add/remove global listeners for drag
  useEffect(() => {
    if (!isDragging) return;

    const moveHandler = (e: globalThis.MouseEvent) => handleMouseMove(e);
    const upHandler = () => handleMouseUp();

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);

    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const isHorizontal = node.direction === 'horizontal';

  return (
    <Box
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {node.children.map((child, index) => {
        const isLast = index === node.children.length - 1;
        return (
          <Fragment key={child.id}>
            <Box
              style={{
                flex: `1 1 ${node.sizes[index]}%`,
                [isHorizontal ? 'minWidth' : 'minHeight']: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {renderChild(child)}
            </Box>
            {!isLast && (
              <Box
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  [isHorizontal ? 'width' : 'height']: '6px',
                  backgroundColor: isDragging
                    ? 'var(--accent-9)'
                    : 'var(--gray-4)',
                  cursor: isHorizontal ? 'col-resize' : 'row-resize',
                  transition: isDragging ? 'none' : 'background-color 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseDown={handleMouseDown(index)}
                onDoubleClick={handleDoubleClick(index)}
                onMouseEnter={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.backgroundColor = 'var(--accent-9)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.backgroundColor = 'var(--gray-4)';
                  }
                }}
              >
                {/* Resize handle grip indicator */}
                <Box
                  style={{
                    display: 'flex',
                    flexDirection: isHorizontal ? 'column' : 'row',
                    gap: '2px',
                    opacity: 0.6,
                  }}
                >
                  <Box
                    style={{
                      width: '2px',
                      height: '2px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--gray-11)',
                    }}
                  />
                  <Box
                    style={{
                      width: '2px',
                      height: '2px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--gray-11)',
                    }}
                  />
                  <Box
                    style={{
                      width: '2px',
                      height: '2px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--gray-11)',
                    }}
                  />
                </Box>
              </Box>
            )}
          </Fragment>
        );
      })}
    </Box>
  );
}
