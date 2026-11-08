'use client';

import { motion } from 'framer-motion';
import {
  forwardRef,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { transition } from '../motion';

export interface SidebarProps {
  /** Sidebar content */
  children: ReactNode;
  /** Width of the sidebar */
  width?: number | string;
  /** Position of the sidebar */
  position?: 'left' | 'right';
  /** Whether the sidebar is collapsed */
  collapsed?: boolean;
  /** Collapsed width */
  collapsedWidth?: number | string;
  /** Whether the sidebar is resizable */
  resizable?: boolean;
  /** Minimum width when resizing */
  minWidth?: number;
  /** Maximum width when resizing */
  maxWidth?: number;
  /** Callback when width changes */
  onWidthChange?: (width: number) => void;
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: CSSProperties;
  /**
   * Animate the sidebar on mount/unmount (width expand + fade). Requires the
   * parent to wrap it in `<AnimatePresence>` for the exit animation to play.
   * The app shell uses this so toggling the sidebar from the activity bar
   * expands/collapses smoothly instead of snapping in and out. Off by default,
   * so existing always-mounted usages keep their current (instant) behaviour.
   */
  animateMount?: boolean;
}

/**
 * Sidebar component for side navigation areas
 */
export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      children,
      width = 260,
      position = 'left',
      collapsed = false,
      collapsedWidth = 48,
      resizable = true,
      minWidth: minWidthProp = 180,
      maxWidth: maxWidthProp = 500,
      onWidthChange,
      className,
      style,
      animateMount = false,
    },
    ref,
  ) => {
    const initialWidth =
      typeof width === 'number' ? width : parseInt(width as string, 10) || 260;
    const collapsedW =
      typeof collapsedWidth === 'number'
        ? collapsedWidth
        : parseInt(collapsedWidth as string, 10) || 48;

    const [currentWidth, setCurrentWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);

    const displayWidth = collapsed ? collapsedW : currentWidth;

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (!resizable || collapsed) return;
        e.preventDefault();
        setIsResizing(true);
        startXRef.current = e.clientX;
        startWidthRef.current = currentWidth;
      },
      [resizable, collapsed, currentWidth],
    );

    useEffect(() => {
      if (!isResizing) return;

      const handleMouseMove = (e: MouseEvent) => {
        const delta =
          position === 'left'
            ? e.clientX - startXRef.current
            : startXRef.current - e.clientX;
        const newWidth = Math.min(
          maxWidthProp,
          Math.max(minWidthProp, startWidthRef.current + delta),
        );
        setCurrentWidth(newWidth);
        onWidthChange?.(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isResizing, position, minWidthProp, maxWidthProp, onWidthChange]);

    return (
      <motion.div
        ref={ref}
        className={className}
        initial={
          animateMount ? { width: 0, minWidth: 0, opacity: 0 } : false
        }
        animate={
          isResizing
            ? undefined
            : {
                width: displayWidth,
                minWidth: displayWidth,
                opacity: 1,
              }
        }
        exit={
          animateMount ? { width: 0, minWidth: 0, opacity: 0 } : undefined
        }
        transition={isResizing ? undefined : transition.springDefault}
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: isResizing ? currentWidth : undefined,
          minWidth: isResizing ? currentWidth : undefined,
          borderRight:
            position === 'left' ? '1px solid var(--gray-6)' : undefined,
          borderLeft:
            position === 'right' ? '1px solid var(--gray-6)' : undefined,
          ...style,
        }}
      >
        {children}

        {/* Resize handle */}
        {resizable && !collapsed && (
          <div
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '6px',
              cursor: 'col-resize',
              zIndex: 10,
              ...(position === 'left' ? { right: '-3px' } : { left: '-3px' }),
            }}
          >
            {/* Visual indicator */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '2px',
                left: '2px',
                backgroundColor:
                  isResizing || isHovering ? 'var(--accent-9)' : 'transparent',
                transition: 'background-color 0.15s',
              }}
            />
          </div>
        )}
      </motion.div>
    );
  },
);

Sidebar.displayName = 'Sidebar';
