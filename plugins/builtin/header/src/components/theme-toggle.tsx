'use client';

import { memo } from 'react';
import { Box, Tooltip } from '@radix-ui/themes';
import { SunIcon, MoonIcon } from '@radix-ui/react-icons';
import { motion, AnimatePresence } from 'framer-motion';

export interface ThemeToggleProps {
  /** Current theme appearance */
  appearance: 'light' | 'dark';
  /** Called when toggle is clicked */
  onToggle: () => void;
  /** Size of the toggle button */
  size?: 'small' | 'medium';
  /** Whether to show tooltip */
  showTooltip?: boolean;
}

/**
 * Theme toggle button with animated sun/moon icons
 */
export const ThemeToggle = memo(function ThemeToggle({
  appearance,
  onToggle,
  size = 'medium',
  showTooltip = true,
}: ThemeToggleProps) {
  const isDark = appearance === 'dark';
  const iconSize = size === 'small' ? 14 : 18;
  const buttonSize = size === 'small' ? 28 : 32;

  const button = (
    <Box
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: buttonSize,
        height: buttonSize,
        borderRadius: '6px',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        transition: 'background-color 0.15s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--gray-4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MoonIcon
              width={iconSize}
              height={iconSize}
              style={{ color: 'var(--gray-11)' }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SunIcon
              width={iconSize}
              height={iconSize}
              style={{ color: 'var(--amber-10)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );

  if (showTooltip) {
    return (
      <Tooltip content={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
        {button}
      </Tooltip>
    );
  }

  return button;
});
