'use client';

import { Box, Text, Heading, Flex } from '@radix-ui/themes';
import { Cross1Icon } from '@radix-ui/react-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useState, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton, Button } from '../primitives';
import { modalOverlay, modalContent } from '../motion';

// =============================================================================
// TYPES
// =============================================================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal description */
  description?: string;
  /** Modal content */
  children: ReactNode;
  /** Modal size */
  size?: ModalSize;
  /** Whether clicking overlay closes modal */
  closeOnOverlayClick?: boolean;
  /** Whether pressing Escape closes modal */
  closeOnEscape?: boolean;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Footer content */
  footer?: ReactNode;
}

// =============================================================================
// SIZE CONFIG
// =============================================================================

const sizeStyles: Record<ModalSize, React.CSSProperties> = {
  sm: { width: '400px', maxWidth: '90vw' },
  md: { width: '500px', maxWidth: '90vw' },
  lg: { width: '700px', maxWidth: '90vw' },
  xl: { width: '900px', maxWidth: '90vw' },
  full: { width: '95vw', height: '95vh' },
};

// =============================================================================
// MODAL COMPONENT
// =============================================================================

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  footer,
}: ModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEscape, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, [open]);

  // Don't render on server
  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <Box
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Overlay */}
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={modalOverlay}
            onClick={closeOnOverlayClick ? onClose : undefined}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Content */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={modalContent}
            style={{
              position: 'relative',
              backgroundColor: 'var(--gray-1)',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              ...sizeStyles[size],
            }}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <Flex
                align="center"
                justify="between"
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--gray-6)',
                  flexShrink: 0,
                }}
              >
                <Box>
                  {title && (
                    <Heading id="modal-title" size="4" weight="medium">
                      {title}
                    </Heading>
                  )}
                  {description && (
                    <Text
                      id="modal-description"
                      size="2"
                      color="gray"
                      style={{ marginTop: '4px', display: 'block' }}
                    >
                      {description}
                    </Text>
                  )}
                </Box>
                {showCloseButton && (
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <IconButton size="2" variant="ghost" onClick={onClose}>
                      <Cross1Icon width={16} height={16} />
                    </IconButton>
                  </motion.div>
                )}
              </Flex>
            )}

            {/* Body */}
            <Box
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '20px',
              }}
            >
              {children}
            </Box>

            {/* Footer */}
            {footer && (
              <Flex
                gap="3"
                justify="end"
                style={{
                  padding: '16px 20px',
                  borderTop: '1px solid var(--gray-6)',
                  flexShrink: 0,
                }}
              >
                {footer}
              </Flex>
            )}
          </motion.div>
        </Box>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// =============================================================================
// CONFIRM MODAL
// =============================================================================

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="soft" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant="solid"
            color={variant === 'danger' ? 'red' : undefined}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Loading...' : confirmLabel}
          </Button>
        </>
      }
    >
      {null}
    </Modal>
  );
}

// =============================================================================
// MODAL HOOKS
// =============================================================================

export function useModal(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    modalProps: {
      open: isOpen,
      onClose: close,
    },
  };
}

export function useConfirmModal() {
  const [state, setState] = useState<{
    isOpen: boolean;
    config: Omit<ConfirmModalProps, 'open' | 'onClose' | 'onConfirm'> | null;
    resolve: ((confirmed: boolean) => void) | null;
  }>({
    isOpen: false,
    config: null,
    resolve: null,
  });

  const confirm = useCallback(
    (
      config: Omit<ConfirmModalProps, 'open' | 'onClose' | 'onConfirm'>,
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          isOpen: true,
          config,
          resolve,
        });
      });
    },
    [],
  );

  const handleClose = useCallback(() => {
    state.resolve?.(false);
    setState({ isOpen: false, config: null, resolve: null });
  }, [state.resolve]);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ isOpen: false, config: null, resolve: null });
  }, [state.resolve]);

  return {
    confirm,
    modalProps: {
      open: state.isOpen,
      onClose: handleClose,
      onConfirm: handleConfirm,
      ...state.config,
    } as ConfirmModalProps,
  };
}
