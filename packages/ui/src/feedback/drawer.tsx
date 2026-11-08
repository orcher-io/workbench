'use client';

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type MouseEvent,
} from 'react';
import { Box, Text, Flex } from '@radix-ui/themes';
import { Cross1Icon, ExternalLinkIcon } from '@radix-ui/react-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton } from '../primitives';

// =============================================================================
// TYPES
// =============================================================================

export interface DrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when drawer should close */
  onClose: () => void;
  /** Drawer title */
  title?: string;
  /** Subtitle (shown below title) */
  subtitle?: string;
  /** Drawer content */
  children: ReactNode;
  /** Initial width in pixels */
  width?: number;
  /** Minimum width */
  minWidth?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Whether the drawer is resizable */
  resizable?: boolean;
  /** Callback to open content in a new tab */
  onOpenInTab?: () => void;
  /** Header actions (rendered before close button) */
  headerActions?: ReactNode;
}

// =============================================================================
// DRAWER COMPONENT
// =============================================================================

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width: initialWidth = 520,
  minWidth = 320,
  maxWidth = 900,
  resizable = true,
  onOpenInTab,
  headerActions,
}: DrawerProps) {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, width: 0 });

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: MouseEvent) => {
      if (!resizable) return;
      e.preventDefault();
      setIsResizing(true);
      resizeStartRef.current = { x: e.clientX, width };
    },
    [resizable, width],
  );

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: globalThis.MouseEvent) => {
      const dx = resizeStartRef.current.x - e.clientX;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartRef.current.width + dx));
      setWidth(newWidth);
    };
    const onUp = () => setIsResizing(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          style={{
            height: '100%',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--gray-1)',
            borderLeft: '1px solid var(--gray-a3)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Resize handle */}
          {resizable && (
            <div
              onMouseDown={handleResizeStart}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                cursor: 'col-resize',
                zIndex: 10,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--gray-a4)';
              }}
              onMouseLeave={(e) => {
                if (!isResizing) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            />
          )}

          {/* Header */}
          <Flex
            align="center"
            gap="2"
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--gray-a3)',
              flexShrink: 0,
            }}
          >
            <Flex direction="column" gap="0" style={{ flex: 1, minWidth: 0 }}>
              {title && (
                <Text size="2" weight="medium" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={{ fontSize: 10, color: 'var(--gray-8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {subtitle}
                </Text>
              )}
            </Flex>

            {headerActions}

            {onOpenInTab && (
              <IconButton
                size="1"
                variant="ghost"
                onClick={() => { onOpenInTab(); onClose(); }}
                title="Open in tab"
              >
                <ExternalLinkIcon width={14} height={14} />
              </IconButton>
            )}

            <IconButton
              size="1"
              variant="ghost"
              onClick={onClose}
              title="Close"
            >
              <Cross1Icon width={14} height={14} />
            </IconButton>
          </Flex>

          {/* Content */}
          <Box style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {children}
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
