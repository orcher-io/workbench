/**
 * Motion System
 *
 * Comprehensive animation utilities for the workbench.
 *
 * @example
 * // Using motion tokens
 * import { transition, spring, duration } from '@orcher/workbench-ui/motion';
 *
 * @example
 * // Using pre-built components
 * import { FadeScale, AnimatePresence, LayoutItem } from '@orcher/workbench-ui/motion';
 *
 * @example
 * // Using variants directly
 * import { variants } from '@orcher/workbench-ui/motion';
 * <motion.div variants={variants.slideUp} />
 *
 * @example
 * // Using hooks
 * import { useEnterAnimation, useReducedMotion } from '@orcher/workbench-ui/motion';
 */

// Tokens
export { duration, easing, spring, transition, origin } from './tokens';

// Variants
export * as variants from './variants';
export {
  // Fade
  fade,
  fadeScale,
  fadeScaleOrigin,
  // Slide
  slideUp,
  slideDown,
  slideLeft,
  slideRight,
  // Expand
  expandHeight,
  expandWidth,
  // Items
  tabItem,
  listItem,
  // Containers
  staggerContainer,
  staggerContainerFast,
  // Menu
  menuContent,
  menuItem,
  // Modal
  modalOverlay,
  modalContent,
  // Toast
  toastSlideUp,
  toastSlideRight,
  // Panel
  panelLeft,
  panelRight,
  panelBottom,
  // Micro-interactions
  pressable,
  pressableSubtle,
  iconSpin,
  pulse,
  // Drag
  draggable,
} from './variants';

// Components
export {
  // Core
  motion,
  AnimatePresence,
  MotionBox,
  // Fade
  Fade,
  FadeScale,
  // Slide
  SlideUp,
  SlideDown,
  SlideLeft,
  SlideRight,
  // Expand
  ExpandHeight,
  ExpandWidth,
  // Container
  Stagger,
  // Interactive
  Pressable,
  LayoutItem,
  // Modal
  ModalOverlay,
  ModalContent,
  // Toast
  Toast,
  // Panel
  MotionPanel,
  // Effects
  Spinner,
  Pulse,
} from './components';

export type {
  MotionProps,
  HTMLMotionProps,
  MotionBoxProps,
  FadeProps,
  FadeScaleProps,
  SlideProps,
  ExpandProps,
  StaggerProps,
  PressableProps,
  LayoutItemProps,
  ModalOverlayProps,
  ModalContentProps,
  ToastProps,
  MotionPanelProps,
  SpinnerProps,
  PulseProps,
} from './components';

// Hooks
export {
  // Framer Motion re-exports
  useAnimation,
  useInView,
  useReducedMotion,
  useSpring,
  useTransform,
  useMotionValue,
  // Custom hooks
  useEnterAnimation,
  useHoverAnimation,
  usePressAnimation,
  useSpringValue,
  useSmoothCount,
  useScrollProgress,
  useReducedMotionSafe,
  usePresence,
  useSequence,
} from './hooks';
