'use client';

import { Box, Text } from '@radix-ui/themes';
import {
  Cross1Icon,
  CopyIcon,
  SizeIcon,
  MinusIcon,
  PlusIcon,
} from '@radix-ui/react-icons';
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type MouseEvent,
} from 'react';
import { motion } from 'framer-motion';
import type { FloatingWindow as FloatingWindowType, TabState } from '../models';
import { IconButton } from '@orcher/workbench-ui';
import { transition } from '@orcher/workbench-ui';

const ZOOM_STEP = 50; // pixels to increase/decrease

export interface FloatingWindowProps {
  window: FloatingWindowType;
  renderEditor: (tab: TabState) => ReactNode;
  onClose: (windowId: string) => void;
  onDockBack: (windowId: string) => void;
  onMove: (windowId: string, position: { x: number; y: number }) => void;
  onResize: (windowId: string, size: { width: number; height: number }) => void;
  onFocus: (windowId: string) => void;
}

const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1000;

export function FloatingWindow({
  window,
  renderEditor,
  onClose,
  onDockBack,
  onMove,
  onResize,
  onFocus,
}: FloatingWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const preMaximizeStateRef = useRef<{
    position: { x: number; y: number };
    size: { width: number; height: number };
  } | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, windowX: 0, windowY: 0 });
  const resizeStartRef = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    windowX: 0,
    windowY: 0,
  });

  const handleTitleBarMouseDown = useCallback(
    (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        windowX: window.position.x,
        windowY: window.position.y,
      };
      onFocus(window.id);
    },
    [window.id, window.position, onFocus],
  );

  const handleResizeMouseDown = useCallback(
    (direction: string) => (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setResizeDirection(direction);
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: window.size.width,
        height: window.size.height,
        windowX: window.position.x,
        windowY: window.position.y,
      };
      onFocus(window.id);
    },
    [window.id, window.size, window.position, onFocus],
  );

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        onMove(window.id, {
          x: Math.max(0, dragStartRef.current.windowX + deltaX),
          y: Math.max(0, dragStartRef.current.windowY + deltaY),
        });
      } else if (isResizing && resizeDirection) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;

        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;
        let newX = resizeStartRef.current.windowX;
        let newY = resizeStartRef.current.windowY;

        if (resizeDirection.includes('e')) {
          newWidth = Math.max(MIN_WIDTH, resizeStartRef.current.width + deltaX);
        }
        if (resizeDirection.includes('w')) {
          const widthDelta = Math.min(
            deltaX,
            resizeStartRef.current.width - MIN_WIDTH,
          );
          newWidth = resizeStartRef.current.width - widthDelta;
          newX = resizeStartRef.current.windowX + widthDelta;
        }
        if (resizeDirection.includes('s')) {
          newHeight = Math.max(
            MIN_HEIGHT,
            resizeStartRef.current.height + deltaY,
          );
        }
        if (resizeDirection.includes('n')) {
          const heightDelta = Math.min(
            deltaY,
            resizeStartRef.current.height - MIN_HEIGHT,
          );
          newHeight = resizeStartRef.current.height - heightDelta;
          newY = resizeStartRef.current.windowY + heightDelta;
        }

        onResize(window.id, { width: newWidth, height: newHeight });
        if (resizeDirection.includes('w') || resizeDirection.includes('n')) {
          onMove(window.id, { x: newX, y: newY });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, resizeDirection, window.id, onMove, onResize]);

  const handleToggleMaximize = useCallback(() => {
    if (isMaximized) {
      // Restore to previous size and position
      if (preMaximizeStateRef.current) {
        onMove(window.id, preMaximizeStateRef.current.position);
        onResize(window.id, preMaximizeStateRef.current.size);
      }
      setIsMaximized(false);
    } else {
      // Save current state and maximize
      preMaximizeStateRef.current = {
        position: { ...window.position },
        size: { ...window.size },
      };
      const viewportWidth = globalThis.window?.innerWidth ?? 1200;
      const viewportHeight = globalThis.window?.innerHeight ?? 800;
      const padding = 20;
      onMove(window.id, { x: padding, y: padding });
      onResize(window.id, {
        width: viewportWidth - padding * 2,
        height: viewportHeight - padding * 2,
      });
      setIsMaximized(true);
    }
    onFocus(window.id);
  }, [
    window.id,
    window.position,
    window.size,
    isMaximized,
    onMove,
    onResize,
    onFocus,
  ]);

  const handleDoubleClickTitle = useCallback(() => {
    // Double-click to maximize/restore
    handleToggleMaximize();
  }, [handleToggleMaximize]);

  const handleZoomIn = useCallback(() => {
    if (isMaximized) return;
    const newWidth = Math.min(window.size.width + ZOOM_STEP, MAX_WIDTH);
    const newHeight = Math.min(window.size.height + ZOOM_STEP, MAX_HEIGHT);
    onResize(window.id, { width: newWidth, height: newHeight });
    onFocus(window.id);
  }, [window.id, window.size, isMaximized, onResize, onFocus]);

  const handleZoomOut = useCallback(() => {
    if (isMaximized) return;
    const newWidth = Math.max(window.size.width - ZOOM_STEP, MIN_WIDTH);
    const newHeight = Math.max(window.size.height - ZOOM_STEP, MIN_HEIGHT);
    onResize(window.id, { width: newWidth, height: newHeight });
    onFocus(window.id);
  }, [window.id, window.size, isMaximized, onResize, onFocus]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={transition.springSnappy}
      style={{
        position: 'fixed',
        left: window.position.x,
        top: window.position.y,
        width: window.size.width,
        height: window.size.height,
        zIndex: window.zIndex + 1000,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--gray-1)',
        borderRadius: '8px',
        boxShadow: '0 16px 70px rgba(0, 0, 0, 0.4)',
        border: '1px solid var(--gray-6)',
        overflow: 'hidden',
      }}
      onClick={() => onFocus(window.id)}
    >
      {/* Title bar */}
      <Box
        onMouseDown={handleTitleBarMouseDown}
        onDoubleClick={handleDoubleClickTitle}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '36px',
          backgroundColor: 'var(--gray-2)',
          borderBottom: '1px solid var(--gray-6)',
          padding: '0 8px',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <Text
          size="2"
          weight="medium"
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {window.tab.dirty && '• '}
          {window.tab.title}
        </Text>
        <Box style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Zoom controls */}
          <IconButton
            size="1"
            variant="ghost"
            onClick={handleZoomOut}
            title="Zoom out (smaller)"
            disabled={isMaximized}
          >
            <MinusIcon width={14} height={14} />
          </IconButton>
          <IconButton
            size="1"
            variant="ghost"
            onClick={handleZoomIn}
            title="Zoom in (larger)"
            disabled={isMaximized}
          >
            <PlusIcon width={14} height={14} />
          </IconButton>

          <Box
            style={{
              width: '1px',
              height: '16px',
              backgroundColor: 'var(--gray-6)',
              margin: '0 2px',
            }}
          />

          {/* Window controls */}
          <IconButton
            size="1"
            variant="ghost"
            onClick={handleToggleMaximize}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <SizeIcon width={14} height={14} />
          </IconButton>
          <IconButton
            size="1"
            variant="ghost"
            onClick={() => onDockBack(window.id)}
            title="Dock back to tabs"
          >
            <CopyIcon width={14} height={14} />
          </IconButton>
          <IconButton
            size="1"
            variant="ghost"
            onClick={() => onClose(window.id)}
            title="Close"
          >
            <Cross1Icon width={14} height={14} />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Box
        style={{
          flex: 1,
          overflow: 'auto',
          minHeight: 0,
        }}
      >
        {renderEditor(window.tab)}
      </Box>

      {/* Resize handles */}
      {/* Corners */}
      <Box
        onMouseDown={handleResizeMouseDown('nw')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '12px',
          height: '12px',
          cursor: 'nw-resize',
        }}
      />
      <Box
        onMouseDown={handleResizeMouseDown('ne')}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '12px',
          height: '12px',
          cursor: 'ne-resize',
        }}
      />
      <Box
        onMouseDown={handleResizeMouseDown('sw')}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '12px',
          height: '12px',
          cursor: 'sw-resize',
        }}
      />
      <Box
        onMouseDown={handleResizeMouseDown('se')}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '12px',
          height: '12px',
          cursor: 'se-resize',
        }}
      />
      {/* Edges */}
      <Box
        onMouseDown={handleResizeMouseDown('n')}
        style={{
          position: 'absolute',
          top: 0,
          left: '12px',
          right: '12px',
          height: '6px',
          cursor: 'n-resize',
        }}
      />
      <Box
        onMouseDown={handleResizeMouseDown('s')}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '12px',
          right: '12px',
          height: '6px',
          cursor: 's-resize',
        }}
      />
      <Box
        onMouseDown={handleResizeMouseDown('w')}
        style={{
          position: 'absolute',
          top: '12px',
          bottom: '12px',
          left: 0,
          width: '6px',
          cursor: 'w-resize',
        }}
      />
      <Box
        onMouseDown={handleResizeMouseDown('e')}
        style={{
          position: 'absolute',
          top: '12px',
          bottom: '12px',
          right: 0,
          width: '6px',
          cursor: 'e-resize',
        }}
      />
    </motion.div>
  );
}
