'use client';

/**
 * Motion Hooks
 *
 * Custom hooks for common animation patterns.
 */

import {
  useAnimation,
  useInView,
  useReducedMotion,
  useSpring,
  useTransform,
  useMotionValue,
  type AnimationControls,
  type MotionValue,
} from 'framer-motion';
import { useRef, useEffect, useCallback, useState } from 'react';
import { transition } from './tokens';

// =============================================================================
// RE-EXPORTS
// =============================================================================

export {
  useAnimation,
  useInView,
  useReducedMotion,
  useSpring,
  useTransform,
  useMotionValue,
};

// =============================================================================
// USE ENTER ANIMATION
// =============================================================================

/**
 * Triggers animation when component mounts or enters viewport
 */
export function useEnterAnimation(options?: {
  /** Trigger when element enters viewport */
  inView?: boolean;
  /** Only animate once */
  once?: boolean;
  /** Delay before animation starts (ms) */
  delay?: number;
}): {
  ref: React.RefObject<HTMLElement>;
  controls: AnimationControls;
  isInView: boolean;
} {
  const { inView = false, once = true, delay = 0 } = options ?? {};
  const ref = useRef<HTMLElement>(null);
  const controls = useAnimation();
  const isInView = useInView(ref as React.RefObject<Element>, { once });

  useEffect(() => {
    const shouldAnimate = inView ? isInView : true;

    if (shouldAnimate) {
      const timer = setTimeout(() => {
        controls.start('animate');
      }, delay);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [controls, delay, inView, isInView]);

  return { ref: ref as React.RefObject<HTMLElement>, controls, isInView };
}

// =============================================================================
// USE HOVER ANIMATION
// =============================================================================

/**
 * Provides hover state and handlers for hover animations
 */
export function useHoverAnimation(): {
  isHovered: boolean;
  hoverProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
} {
  const [isHovered, setIsHovered] = useState(false);

  const hoverProps = {
    onMouseEnter: useCallback(() => setIsHovered(true), []),
    onMouseLeave: useCallback(() => setIsHovered(false), []),
  };

  return { isHovered, hoverProps };
}

// =============================================================================
// USE PRESS ANIMATION
// =============================================================================

/**
 * Provides press state and handlers for press animations
 */
export function usePressAnimation(): {
  isPressed: boolean;
  pressProps: {
    onMouseDown: () => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
} {
  const [isPressed, setIsPressed] = useState(false);

  const pressProps = {
    onMouseDown: useCallback(() => setIsPressed(true), []),
    onMouseUp: useCallback(() => setIsPressed(false), []),
    onMouseLeave: useCallback(() => setIsPressed(false), []),
  };

  return { isPressed, pressProps };
}

// =============================================================================
// USE SPRING VALUE
// =============================================================================

/**
 * Creates a spring-animated motion value
 */
export function useSpringValue(
  initialValue: number,
  springConfig = transition.springDefault,
): MotionValue<number> {
  const motionValue = useMotionValue(initialValue);
  const springValue = useSpring(motionValue, springConfig);

  return springValue;
}

// =============================================================================
// USE SMOOTH COUNT
// =============================================================================

/**
 * Animates number changes with spring physics
 */
export function useSmoothCount(
  value: number,
  springConfig = transition.springDefault,
): MotionValue<number> {
  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, springConfig);

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  return springValue;
}

// =============================================================================
// USE SCROLL PROGRESS
// =============================================================================

/**
 * Tracks scroll progress of an element
 */
export function useScrollProgress(): {
  ref: React.RefObject<HTMLElement>;
  scrollProgress: MotionValue<number>;
} {
  const ref = useRef<HTMLElement>(null);
  const scrollProgress = useMotionValue(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const progress = scrollTop / (scrollHeight - clientHeight);
      scrollProgress.set(Math.max(0, Math.min(1, progress)));
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [scrollProgress]);

  return { ref: ref as React.RefObject<HTMLElement>, scrollProgress };
}

// =============================================================================
// USE REDUCED MOTION SAFE
// =============================================================================

/**
 * Returns animation values that respect reduced motion preferences
 */
export function useReducedMotionSafe<T>(animatedValue: T, staticValue: T): T {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? staticValue : animatedValue;
}

// =============================================================================
// USE PRESENCE
// =============================================================================

/**
 * Manages presence state for enter/exit animations
 */
export function usePresence(
  isVisible: boolean,
  exitDuration = 200,
): {
  isPresent: boolean;
  isAnimating: boolean;
} {
  const [isPresent, setIsPresent] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsPresent(true);
      setIsAnimating(true);
      // Small delay to ensure mount before animation
      requestAnimationFrame(() => setIsAnimating(false));
      return undefined;
    } else {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsPresent(false);
        setIsAnimating(false);
      }, exitDuration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, exitDuration]);

  return { isPresent, isAnimating };
}

// =============================================================================
// USE SEQUENCE
// =============================================================================

/**
 * Runs a sequence of animations
 */
export function useSequence(controls: AnimationControls) {
  const run = useCallback(
    async (
      sequence: Array<{
        animation: string | Record<string, unknown>;
        delay?: number;
      }>,
    ) => {
      for (const step of sequence) {
        if (step.delay) {
          await new Promise((resolve) => setTimeout(resolve, step.delay));
        }
        await controls.start(step.animation as string);
      }
    },
    [controls],
  );

  return { run };
}
