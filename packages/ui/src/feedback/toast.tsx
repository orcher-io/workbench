'use client';

import { Box, Text } from '@radix-ui/themes';
import {
  Cross1Icon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  CrossCircledIcon,
} from '@radix-ui/react-icons';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { IconButton } from '../primitives';
import { toastSlideUp, toastSlideRight } from '../motion';

// =============================================================================
// TYPES
// =============================================================================

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastOptions {
  type?: ToastType;
  title: string;
  description?: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// =============================================================================
// CONTEXT
// =============================================================================

interface ToastContextValue {
  toasts: ToastData[];
  addToast: (options: ToastOptions) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// =============================================================================
// PROVIDER
// =============================================================================

export interface ToastProviderProps {
  children: ReactNode;
  /** Position of toast notifications */
  position?: ToastPosition;
  /** Default duration in ms (0 = no auto-dismiss) */
  defaultDuration?: number;
  /** Maximum number of visible toasts */
  maxToasts?: number;
}

export function ToastProvider({
  children,
  position = 'bottom-right',
  defaultDuration = 5000,
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback(
    (options: ToastOptions): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const toast: ToastData = {
        id,
        type: options.type || 'info',
        title: options.title,
        description: options.description,
        duration: options.duration ?? defaultDuration,
        dismissible: options.dismissible ?? true,
        action: options.action,
      };

      setToasts((prev) => {
        const next = [...prev, toast];
        return next.slice(-maxToasts);
      });

      return id;
    },
    [defaultDuration, maxToasts],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, clearToasts }}
    >
      {children}
      <ToastContainer
        toasts={toasts}
        position={position}
        onDismiss={removeToast}
      />
    </ToastContext.Provider>
  );
}

// =============================================================================
// CONTAINER
// =============================================================================

interface ToastContainerProps {
  toasts: ToastData[];
  position: ToastPosition;
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, position, onDismiss }: ToastContainerProps) {
  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '16px',
      pointerEvents: 'none',
    };

    switch (position) {
      case 'top-right':
        return { ...base, top: 0, right: 0, alignItems: 'flex-end' };
      case 'top-left':
        return { ...base, top: 0, left: 0, alignItems: 'flex-start' };
      case 'top-center':
        return {
          ...base,
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          alignItems: 'center',
        };
      case 'bottom-left':
        return { ...base, bottom: 0, left: 0, alignItems: 'flex-start' };
      case 'bottom-center':
        return {
          ...base,
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          alignItems: 'center',
        };
      case 'bottom-right':
      default:
        return { ...base, bottom: 0, right: 0, alignItems: 'flex-end' };
    }
  };

  const isFromRight = position.includes('right');
  const variants = isFromRight ? toastSlideRight : toastSlideUp;

  return (
    <div style={getPositionStyles()}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
            variants={variants}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// TOAST ITEM
// =============================================================================

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
  variants: typeof toastSlideUp;
}

function ToastItem({ toast, onDismiss, variants }: ToastItemProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(toast.duration || 0);
  const startTimeRef = useRef(Date.now());

  const startTimer = useCallback(() => {
    if (!remainingRef.current || remainingRef.current <= 0) return;
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, remainingRef.current);
  }, [toast.id, onDismiss]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      remainingRef.current -= Date.now() - startTimeRef.current;
    }
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [startTimer]);

  const getIcon = () => {
    const iconProps = { width: 14, height: 14 };
    switch (toast.type) {
      case 'success':
        return (
          <CheckCircledIcon
            {...iconProps}
            style={{ color: 'var(--green-9)' }}
          />
        );
      case 'warning':
        return (
          <ExclamationTriangleIcon
            {...iconProps}
            style={{ color: 'var(--yellow-9)' }}
          />
        );
      case 'error':
        return (
          <CrossCircledIcon {...iconProps} style={{ color: 'var(--red-9)' }} />
        );
      case 'info':
      default:
        return (
          <InfoCircledIcon {...iconProps} style={{ color: 'var(--blue-9)' }} />
        );
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'var(--green-6)';
      case 'warning':
        return 'var(--yellow-6)';
      case 'error':
        return 'var(--red-6)';
      case 'info':
      default:
        return 'var(--blue-6)';
    }
  };

  return (
    <motion.div
      layout
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      style={{ pointerEvents: 'auto' }}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
    >
      <Box
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '10px 12px',
          backgroundColor: 'var(--gray-1)',
          borderRadius: 0,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 0 0 0.5px var(--gray-a6)',
          borderLeft: `3px solid ${getBorderColor()}`,
          minWidth: '280px',
          maxWidth: '400px',
        }}
      >
        <Box style={{ flexShrink: 0, marginTop: '2px' }}>{getIcon()}</Box>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: 500, display: 'block', color: 'var(--gray-12)' }}>
            {toast.title}
          </Text>
          {toast.description && (
            <Text
              style={{ fontSize: 12, display: 'block', marginTop: 2, color: 'var(--gray-9)' }}
            >
              {toast.description}
            </Text>
          )}
          {toast.action && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={toast.action.onClick}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--accent-9)',
                backgroundColor: 'transparent',
                border: '1px solid var(--accent-7)',
                borderRadius: 0,
                cursor: 'pointer',
              }}
            >
              {toast.action.label}
            </motion.button>
          )}
        </Box>
        {toast.dismissible && (
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{ flexShrink: 0 }}
          >
            <IconButton
              size="1"
              variant="ghost"
              onClick={() => onDismiss(toast.id)}
            >
              <Cross1Icon width={12} height={12} />
            </IconButton>
          </motion.div>
        )}
      </Box>
    </motion.div>
  );
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Convenience hook with typed toast methods
 */
export function useToastActions() {
  const { addToast, removeToast, clearToasts } = useToast();

  return {
    info: (title: string, options?: Omit<ToastOptions, 'type' | 'title'>) =>
      addToast({ ...options, type: 'info', title }),
    success: (title: string, options?: Omit<ToastOptions, 'type' | 'title'>) =>
      addToast({ ...options, type: 'success', title }),
    warning: (title: string, options?: Omit<ToastOptions, 'type' | 'title'>) =>
      addToast({ ...options, type: 'warning', title }),
    error: (title: string, options?: Omit<ToastOptions, 'type' | 'title'>) =>
      addToast({ ...options, type: 'error', title }),
    dismiss: removeToast,
    clear: clearToasts,
  };
}
