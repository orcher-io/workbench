/**
 * Animation Variants
 *
 * Reusable animation state definitions for common UI patterns.
 * Use with Framer Motion's `variants` prop.
 */

import type { Variants } from 'framer-motion';
import { transition, duration, easing } from './tokens';

// =============================================================================
// FADE VARIANTS
// =============================================================================

export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeScale: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: transition.springSnappy,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: duration.fast },
  },
};

export const fadeScaleOrigin = (origin: string): Variants => ({
  initial: { opacity: 0, scale: 0.9, transformOrigin: origin },
  animate: {
    opacity: 1,
    scale: 1,
    transformOrigin: origin,
    transition: transition.springSnappy,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transformOrigin: origin,
    transition: { duration: duration.fast },
  },
});

// =============================================================================
// SLIDE VARIANTS
// =============================================================================

export const slideUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: transition.springDefault,
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: duration.fast },
  },
};

export const slideDown: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: transition.springDefault,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: duration.fast },
  },
};

export const slideLeft: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: transition.springDefault,
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: duration.fast },
  },
};

export const slideRight: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: transition.springDefault,
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: duration.fast },
  },
};

// =============================================================================
// EXPAND/COLLAPSE VARIANTS
// =============================================================================

export const expandHeight: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: transition.springDefault,
      opacity: { duration: duration.fast, delay: 0.05 },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: transition.springDefault,
      opacity: { duration: duration.instant },
    },
  },
};

export const expandWidth: Variants = {
  initial: { width: 0, opacity: 0 },
  animate: {
    width: 'auto',
    opacity: 1,
    transition: {
      width: transition.springDefault,
      opacity: { duration: duration.fast, delay: 0.05 },
    },
  },
  exit: {
    width: 0,
    opacity: 0,
    transition: {
      width: transition.springDefault,
      opacity: { duration: duration.instant },
    },
  },
};

// =============================================================================
// TAB/ITEM VARIANTS
// =============================================================================

export const tabItem: Variants = {
  initial: { opacity: 0, scale: 0.9, x: -10 },
  animate: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: transition.springSnappy,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    x: -10,
    transition: { duration: duration.fast },
  },
};

export const listItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: transition.springDefault,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: duration.fast },
  },
};

// =============================================================================
// CONTAINER VARIANTS (for staggered children)
// =============================================================================

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: transition.stagger,
  },
  exit: {},
};

export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: transition.staggerFast,
  },
  exit: {},
};

// =============================================================================
// MENU/DROPDOWN VARIANTS
// =============================================================================

export const menuContent: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: -5,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transition.springSnappy,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -5,
    transition: { duration: duration.fast },
  },
};

export const menuItem: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: transition.fast,
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: { duration: duration.instant },
  },
};

// =============================================================================
// MODAL/DIALOG VARIANTS
// =============================================================================

export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: duration.normal },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast },
  },
};

export const modalContent: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transition.springDefault,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: duration.fast },
  },
};

// =============================================================================
// TOAST/NOTIFICATION VARIANTS
// =============================================================================

export const toastSlideUp: Variants = {
  initial: { opacity: 0, y: 50, scale: 0.9 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transition.springBouncy,
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.9,
    transition: { duration: duration.fast },
  },
};

export const toastSlideRight: Variants = {
  initial: { opacity: 0, x: 100, scale: 0.9 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: transition.springBouncy,
  },
  exit: {
    opacity: 0,
    x: 100,
    scale: 0.9,
    transition: { duration: duration.normal },
  },
};

// =============================================================================
// PANEL/SIDEBAR VARIANTS
// =============================================================================

export const panelLeft: Variants = {
  initial: { x: '-100%' },
  animate: {
    x: 0,
    transition: transition.springDefault,
  },
  exit: {
    x: '-100%',
    transition: { duration: duration.normal, ease: easing.easeIn },
  },
};

export const panelRight: Variants = {
  initial: { x: '100%' },
  animate: {
    x: 0,
    transition: transition.springDefault,
  },
  exit: {
    x: '100%',
    transition: { duration: duration.normal, ease: easing.easeIn },
  },
};

export const panelBottom: Variants = {
  initial: { y: '100%' },
  animate: {
    y: 0,
    transition: transition.springDefault,
  },
  exit: {
    y: '100%',
    transition: { duration: duration.normal, ease: easing.easeIn },
  },
};

// =============================================================================
// MICRO-INTERACTION VARIANTS
// =============================================================================

export const pressable: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

export const pressableSubtle: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.01 },
  tap: { scale: 0.99 },
};

export const iconSpin: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const pulse: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// =============================================================================
// DRAG VARIANTS
// =============================================================================

export const draggable: Variants = {
  idle: {
    scale: 1,
    boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
    zIndex: 0,
  },
  dragging: {
    scale: 1.02,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
    zIndex: 100,
    transition: transition.springSnappy,
  },
};
