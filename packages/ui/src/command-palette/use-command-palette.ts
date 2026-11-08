'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseCommandPaletteOptions {
  /** Keyboard shortcut to open (default: Cmd/Ctrl+K) */
  shortcut?: string;
}

/**
 * Hook to manage command palette open/close state with keyboard shortcut
 */
export function useCommandPalette(options: UseCommandPaletteOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }

      // Cmd/Ctrl + Shift + P (VSCode style)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        open();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle, open]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
