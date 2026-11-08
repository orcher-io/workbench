'use client';

/**
 * Motion Components
 *
 * Pre-configured animated components for common UI patterns.
 * Built on Framer Motion with workbench motion tokens.
 */

import {
  motion,
  AnimatePresence,
  type HTMLMotionProps,
  type MotionProps,
} from 'framer-motion';
import { forwardRef, type ReactNode } from 'react';
import { transition } from './tokens';
import * as variants from './variants';

// =============================================================================
// RE-EXPORTS
// =============================================================================

export { motion, AnimatePresence };
export type { MotionProps, HTMLMotionProps };

// =============================================================================
// MOTION BOX (Base animated container)
// =============================================================================

export interface MotionBoxProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
}

export const MotionBox = motion.div;

// =============================================================================
// FADE IN/OUT
// =============================================================================

export interface FadeProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
}

export const Fade = forwardRef<HTMLDivElement, FadeProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants.fade}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
Fade.displayName = 'Fade';

// =============================================================================
// FADE SCALE (Dropdowns, Popovers)
// =============================================================================

export interface FadeScaleProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
  /** Transform origin for scale animation */
  origin?: string;
}

export const FadeScale = forwardRef<HTMLDivElement, FadeScaleProps>(
  ({ children, origin, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={origin ? variants.fadeScaleOrigin(origin) : variants.fadeScale}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
FadeScale.displayName = 'FadeScale';

// =============================================================================
// SLIDE COMPONENTS
// =============================================================================

export interface SlideProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
}

export const SlideUp = forwardRef<HTMLDivElement, SlideProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants.slideUp}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
SlideUp.displayName = 'SlideUp';

export const SlideDown = forwardRef<HTMLDivElement, SlideProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants.slideDown}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
SlideDown.displayName = 'SlideDown';

export const SlideLeft = forwardRef<HTMLDivElement, SlideProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants.slideLeft}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
SlideLeft.displayName = 'SlideLeft';

export const SlideRight = forwardRef<HTMLDivElement, SlideProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants.slideRight}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
SlideRight.displayName = 'SlideRight';

// =============================================================================
// EXPAND/COLLAPSE
// =============================================================================

export interface ExpandProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
}

export const ExpandHeight = forwardRef<HTMLDivElement, ExpandProps>(
  ({ children, style, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants.expandHeight}
      style={{ overflow: 'hidden', ...style }}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
ExpandHeight.displayName = 'ExpandHeight';

export const ExpandWidth = forwardRef<HTMLDivElement, ExpandProps>(
  ({ children, style, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants.expandWidth}
      style={{ overflow: 'hidden', ...style }}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
ExpandWidth.displayName = 'ExpandWidth';

// =============================================================================
// STAGGER CONTAINER
// =============================================================================

export interface StaggerProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
  /** Use faster stagger timing */
  fast?: boolean;
}

export const Stagger = forwardRef<HTMLDivElement, StaggerProps>(
  ({ children, fast, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={
        fast ? variants.staggerContainerFast : variants.staggerContainer
      }
      {...props}
    >
      {children}
    </motion.div>
  ),
);
Stagger.displayName = 'Stagger';

// =============================================================================
// PRESSABLE (Buttons, Interactive elements)
// =============================================================================

export interface PressableProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
  /** Use subtle press effect */
  subtle?: boolean;
  /** Disable all motion */
  disabled?: boolean;
}

export const Pressable = forwardRef<HTMLDivElement, PressableProps>(
  ({ children, subtle, disabled, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="idle"
      whileHover={disabled ? undefined : 'hover'}
      whileTap={disabled ? undefined : 'tap'}
      variants={subtle ? variants.pressableSubtle : variants.pressable}
      transition={transition.springSnappy}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
Pressable.displayName = 'Pressable';

// =============================================================================
// LAYOUT ITEM (For reorderable lists/tabs)
// =============================================================================

export interface LayoutItemProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
  /** Unique ID for layout animations */
  layoutId?: string;
}

export const LayoutItem = forwardRef<HTMLDivElement, LayoutItemProps>(
  ({ children, layoutId, ...props }, ref) => (
    <motion.div
      ref={ref}
      layout
      layoutId={layoutId}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants.tabItem}
      transition={transition.layout}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
LayoutItem.displayName = 'LayoutItem';

// =============================================================================
// MODAL COMPONENTS
// =============================================================================

export interface ModalOverlayProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
}

export const ModalOverlay = forwardRef<HTMLDivElement, ModalOverlayProps>(
  ({ children, style, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants.modalOverlay}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
ModalOverlay.displayName = 'ModalOverlay';

export interface ModalContentProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
}

export const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants.modalContent}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
ModalContent.displayName = 'ModalContent';

// =============================================================================
// TOAST COMPONENTS
// =============================================================================

export interface ToastProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
  /** Direction toast slides from */
  direction?: 'up' | 'right';
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({ children, direction = 'up', ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={
        direction === 'up' ? variants.toastSlideUp : variants.toastSlideRight
      }
      {...props}
    >
      {children}
    </motion.div>
  ),
);
Toast.displayName = 'Toast';

// =============================================================================
// PANEL COMPONENTS
// =============================================================================

export interface MotionPanelProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
  /** Side panel slides from */
  side?: 'left' | 'right' | 'bottom';
}

export const MotionPanel = forwardRef<HTMLDivElement, MotionPanelProps>(
  ({ children, side = 'left', ...props }, ref) => {
    const panelVariants = {
      left: variants.panelLeft,
      right: variants.panelRight,
      bottom: variants.panelBottom,
    };

    return (
      <motion.div
        ref={ref}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={panelVariants[side]}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
MotionPanel.displayName = 'MotionPanel';

// =============================================================================
// SPINNER
// =============================================================================

export interface SpinnerProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
}

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      variants={variants.iconSpin}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
Spinner.displayName = 'Spinner';

// =============================================================================
// PULSE
// =============================================================================

export interface PulseProps extends HTMLMotionProps<'div'> {
  children?: ReactNode;
}

export const Pulse = forwardRef<HTMLDivElement, PulseProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      variants={variants.pulse}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
Pulse.displayName = 'Pulse';
