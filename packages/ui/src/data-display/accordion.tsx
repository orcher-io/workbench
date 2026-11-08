'use client';

import { Box, Text } from '@radix-ui/themes';
import { ChevronRightIcon } from '@radix-ui/react-icons';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { transition, expandHeight } from '../motion';

// =============================================================================
// TYPES
// =============================================================================

export type AccordionType = 'single' | 'multiple';

interface AccordionContextValue {
  type: AccordionType;
  expandedItems: Set<string>;
  toggleItem: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion');
  }
  return context;
}

// =============================================================================
// ACCORDION ROOT
// =============================================================================

export interface AccordionProps {
  /** Accordion items */
  children: ReactNode;
  /** Whether single or multiple items can be expanded */
  type?: AccordionType;
  /** Initially expanded item(s) */
  defaultExpanded?: string | string[];
  /** Controlled expanded state */
  expanded?: string | string[];
  /** Callback when expansion changes */
  onExpandedChange?: (expanded: string[]) => void;
  /** Additional styles */
  style?: React.CSSProperties;
}

export function Accordion({
  children,
  type = 'single',
  defaultExpanded,
  expanded: controlledExpanded,
  onExpandedChange,
  style,
}: AccordionProps) {
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(() => {
    if (defaultExpanded) {
      return new Set(
        Array.isArray(defaultExpanded) ? defaultExpanded : [defaultExpanded],
      );
    }
    return new Set();
  });

  const expanded =
    controlledExpanded !== undefined
      ? new Set(
          Array.isArray(controlledExpanded)
            ? controlledExpanded
            : [controlledExpanded],
        )
      : internalExpanded;

  const toggleItem = useCallback(
    (id: string) => {
      const newExpanded = new Set(expanded);

      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        if (type === 'single') {
          newExpanded.clear();
        }
        newExpanded.add(id);
      }

      if (controlledExpanded === undefined) {
        setInternalExpanded(newExpanded);
      }
      onExpandedChange?.(Array.from(newExpanded));
    },
    [expanded, type, controlledExpanded, onExpandedChange],
  );

  return (
    <AccordionContext.Provider
      value={{ type, expandedItems: expanded, toggleItem }}
    >
      <Box style={{ display: 'flex', flexDirection: 'column', ...style }}>
        {children}
      </Box>
    </AccordionContext.Provider>
  );
}

// =============================================================================
// ACCORDION ITEM
// =============================================================================

interface AccordionItemContextValue {
  id: string;
  isExpanded: boolean;
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(
  null,
);

function useAccordionItemContext() {
  const context = useContext(AccordionItemContext);
  if (!context) {
    throw new Error(
      'AccordionItem components must be used within an AccordionItem',
    );
  }
  return context;
}

export interface AccordionItemProps {
  /** Unique identifier for this item */
  id: string;
  /** Item content */
  children: ReactNode;
  /** Whether this item is disabled */
  disabled?: boolean;
}

export function AccordionItem({
  id,
  children,
  disabled = false,
}: AccordionItemProps) {
  const { expandedItems } = useAccordionContext();
  const isExpanded = expandedItems.has(id);

  return (
    <AccordionItemContext.Provider value={{ id, isExpanded }}>
      <Box
        style={{
          borderBottom: '1px solid var(--gray-6)',
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
        }}
      >
        {children}
      </Box>
    </AccordionItemContext.Provider>
  );
}

// =============================================================================
// ACCORDION TRIGGER
// =============================================================================

export interface AccordionTriggerProps {
  /** Trigger content */
  children: ReactNode;
  /** Icon to show (defaults to chevron) */
  icon?: ReactNode;
  /** Additional styles */
  style?: React.CSSProperties;
}

export function AccordionTrigger({
  children,
  icon,
  style,
}: AccordionTriggerProps) {
  const { toggleItem } = useAccordionContext();
  const { id, isExpanded } = useAccordionItemContext();

  return (
    <motion.button
      type="button"
      onClick={() => toggleItem(id)}
      whileHover={{ backgroundColor: 'var(--gray-3)' }}
      whileTap={{ scale: 0.995 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '12px 16px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        ...style,
      }}
    >
      <Box style={{ flex: 1 }}>{children}</Box>
      <motion.div
        animate={{ rotate: isExpanded ? 90 : 0 }}
        transition={transition.fast}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: '8px',
        }}
      >
        {icon || <ChevronRightIcon width={16} height={16} />}
      </motion.div>
    </motion.button>
  );
}

// =============================================================================
// ACCORDION CONTENT
// =============================================================================

export interface AccordionContentProps {
  /** Content to show when expanded */
  children: ReactNode;
  /** Additional styles */
  style?: React.CSSProperties;
}

export function AccordionContent({ children, style }: AccordionContentProps) {
  const { isExpanded } = useAccordionItemContext();

  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={expandHeight}
          style={{ overflow: 'hidden' }}
        >
          <Box style={{ padding: '0 16px 16px', ...style }}>{children}</Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// SIMPLE ACCORDION (Convenience component)
// =============================================================================

export interface SimpleAccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface SimpleAccordionProps {
  items: SimpleAccordionItem[];
  type?: AccordionType;
  defaultExpanded?: string | string[];
}

export function SimpleAccordion({
  items,
  type = 'single',
  defaultExpanded,
}: SimpleAccordionProps) {
  return (
    <Accordion type={type} defaultExpanded={defaultExpanded}>
      {items.map((item) => (
        <AccordionItem key={item.id} id={item.id} disabled={item.disabled}>
          <AccordionTrigger>
            <Text size="2" weight="medium">
              {item.title}
            </Text>
          </AccordionTrigger>
          <AccordionContent>
            <Text size="2" color="gray">
              {item.content}
            </Text>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
