/**
 * Motion Design Tokens
 *
 * Centralized animation values for consistent motion across the workbench.
 * Based on Material Design motion principles and Apple HIG.
 */

import type { Transition } from 'framer-motion';

// =============================================================================
// DURATION TOKENS
// =============================================================================

/**
 * Duration values in seconds
 * - instant: Micro-interactions (button press feedback)
 * - fast: Small UI changes (hover states, toggles)
 * - normal: Standard transitions (menus, dropdowns)
 * - slow: Larger transitions (modals, page transitions)
 * - slower: Complex animations (onboarding, celebrations)
 */
export const duration = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  slower: 0.5,
} as const;

// =============================================================================
// EASING TOKENS
// =============================================================================

/**
 * Cubic bezier easing curves
 * - ease: General purpose, natural feel
 * - easeIn: Elements entering (accelerating)
 * - easeOut: Elements exiting (decelerating)
 * - easeInOut: Symmetrical transitions
 * - spring: Not a bezier, use spring config instead
 */
export const easing = {
  // Standard easings
  ease: [0.25, 0.1, 0.25, 1.0],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],

  // Expressive easings (more pronounced)
  expressiveEase: [0.4, 0, 0.2, 1],
  expressiveDecelerate: [0, 0, 0.2, 1],
  expressiveAccelerate: [0.4, 0, 1, 1],

  // Snappy easings (quick response)
  snappy: [0.2, 0, 0, 1],
  snappyIn: [0.5, 0, 1, 1],
  snappyOut: [0, 0, 0.3, 1],
} as const;

// =============================================================================
// SPRING CONFIGURATIONS
// =============================================================================

/**
 * Spring physics configurations
 * - gentle: Soft, slow movements (panels, large elements)
 * - default: Balanced for most interactions
 * - snappy: Quick, responsive (tabs, toggles)
 * - bouncy: Playful with overshoot (notifications, success states)
 * - stiff: Tight, controlled (precise positioning)
 */
export const spring = {
  gentle: {
    type: 'spring' as const,
    stiffness: 120,
    damping: 20,
    mass: 1,
  },
  default: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 25,
    mass: 1,
  },
  snappy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
    mass: 1,
  },
  bouncy: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 15,
    mass: 1,
  },
  stiff: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 35,
    mass: 1,
  },
} as const;

// =============================================================================
// TRANSITION PRESETS
// =============================================================================

/**
 * Pre-configured transitions for common use cases
 */
export const transition = {
  // Tween-based transitions
  instant: {
    duration: duration.instant,
    ease: easing.ease,
  } satisfies Transition,

  fast: {
    duration: duration.fast,
    ease: easing.snappy,
  } satisfies Transition,

  normal: {
    duration: duration.normal,
    ease: easing.expressiveEase,
  } satisfies Transition,

  slow: {
    duration: duration.slow,
    ease: easing.expressiveDecelerate,
  } satisfies Transition,

  // Spring-based transitions
  springDefault: spring.default,
  springSnappy: spring.snappy,
  springBouncy: spring.bouncy,
  springGentle: spring.gentle,

  // Layout animations (for reordering)
  layout: {
    type: 'spring' as const,
    stiffness: 350,
    damping: 30,
    mass: 0.8,
  } satisfies Transition,

  // Stagger children
  stagger: {
    staggerChildren: 0.05,
    delayChildren: 0.02,
  },

  staggerFast: {
    staggerChildren: 0.03,
    delayChildren: 0.01,
  },
} as const;

// =============================================================================
// TRANSFORM ORIGINS
// =============================================================================

export const origin = {
  center: '50% 50%',
  top: '50% 0%',
  topLeft: '0% 0%',
  topRight: '100% 0%',
  bottom: '50% 100%',
  bottomLeft: '0% 100%',
  bottomRight: '100% 100%',
  left: '0% 50%',
  right: '100% 50%',
} as const;
