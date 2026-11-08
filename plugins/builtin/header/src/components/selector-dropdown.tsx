'use client';

import {
  memo,
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import {
  Box,
  Flex,
  Text,
  Popover,
  ScrollArea,
  Spinner,
} from '@radix-ui/themes';
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  PlusIcon,
} from '@radix-ui/react-icons';

/**
 * Base interface for selectable items
 */
export interface SelectorItem {
  id: string;
  name: string;
  icon?: ReactNode;
  description?: string;
}

/**
 * Props for the SelectorDropdown component
 */
export interface SelectorDropdownProps<T extends SelectorItem> {
  /** List of items to display */
  items: T[];
  /** Currently selected item */
  selectedItem: T | null;
  /** Called when an item is selected */
  onSelect: (item: T) => void;
  /** Placeholder text when no item is selected */
  placeholder?: string;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Whether items are loading */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Icon to show before the selected item name */
  icon?: ReactNode;
  /** Called when "Create new" is clicked */
  onCreate?: () => void;
  /** Label for create action */
  createLabel?: string;
  /** Message when no items match search */
  emptyMessage?: string;
  /** Max width for the trigger text */
  maxWidth?: number;
  /** Size variant */
  size?: '1' | '2';
}

/**
 * A reusable dropdown component with search functionality.
 * Uses Popover with command-palette style design.
 */
export const SelectorDropdown = memo(function SelectorDropdown<
  T extends SelectorItem,
>({
  items,
  selectedItem,
  onSelect,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  isLoading = false,
  error = null,
  disabled = false,
  icon,
  onCreate,
  createLabel = 'Create new',
  emptyMessage = 'No items found',
  maxWidth = 120,
}: SelectorDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter items based on search
  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
  );

  // Handle item selection
  const handleSelect = useCallback(
    (item: T) => {
      onSelect(item);
      setSearch('');
      setIsOpen(false);
      setSelectedIndex(0);
    },
    [onSelect],
  );

  // Handle dropdown open/close
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearch('');
      setSelectedIndex(0);
    } else {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = filteredItems.length + (onCreate ? 1 : 0);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, totalItems - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex < filteredItems.length) {
            handleSelect(filteredItems[selectedIndex]);
          } else if (onCreate && selectedIndex === filteredItems.length) {
            onCreate();
            setIsOpen(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    },
    [filteredItems, selectedIndex, handleSelect, onCreate],
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Get display text for trigger
  const displayText = isLoading
    ? 'Loading...'
    : error
      ? 'Error'
      : selectedItem?.name || placeholder;

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger disabled={disabled}>
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            borderRadius: '6px',
            backgroundColor: isOpen ? 'var(--gray-4)' : 'transparent',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!disabled && !isOpen) {
              e.currentTarget.style.backgroundColor = 'var(--gray-3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {icon && (
            <Box
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                color: 'var(--gray-11)',
              }}
            >
              {icon}
            </Box>
          )}
          <Text
            size="2"
            weight="medium"
            style={{
              maxWidth,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayText}
          </Text>
          <ChevronDownIcon
            width={12}
            height={12}
            style={{
              color: 'var(--gray-9)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          />
        </Box>
      </Popover.Trigger>

      <Popover.Content
        side="bottom"
        align="start"
        sideOffset={4}
        onKeyDown={handleKeyDown}
        style={{
          width: '280px',
          padding: 0,
          backgroundColor: 'var(--gray-2)',
          borderRadius: '8px',
          boxShadow: '0 16px 70px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Search input - command palette style */}
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--gray-6)',
            gap: '12px',
          }}
        >
          <MagnifyingGlassIcon
            width={18}
            height={18}
            style={{ color: 'var(--gray-9)', flexShrink: 0 }}
          />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: 'var(--gray-12)',
              fontFamily: 'inherit',
            }}
          />
        </Box>

        {/* Results */}
        <ScrollArea style={{ maxHeight: '280px' }}>
          <Box ref={listRef} style={{ padding: '8px 0' }}>
            {isLoading ? (
              <Flex justify="center" align="center" py="6">
                <Spinner size="2" />
              </Flex>
            ) : error ? (
              <Box style={{ padding: '24px 16px', textAlign: 'center' }}>
                <Text size="2" color="red">
                  {error}
                </Text>
              </Box>
            ) : filteredItems.length === 0 && !onCreate ? (
              <Box style={{ padding: '24px 16px', textAlign: 'center' }}>
                <Text size="2" color="gray">
                  {search ? `No results for "${search}"` : emptyMessage}
                </Text>
              </Box>
            ) : (
              <>
                {filteredItems.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  const isCurrentItem = selectedItem?.id === item.id;

                  return (
                    <Box
                      key={item.id}
                      data-index={index}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? 'var(--accent-4)'
                          : 'transparent',
                      }}
                    >
                      {item.icon && (
                        <Box
                          style={{
                            flexShrink: 0,
                            width: 18,
                            height: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--gray-11)',
                          }}
                        >
                          {item.icon}
                        </Box>
                      )}
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="2" style={{ display: 'block' }}>
                          {item.name}
                        </Text>
                        {item.description && (
                          <Text
                            size="1"
                            color="gray"
                            style={{ display: 'block', marginTop: '2px' }}
                          >
                            {item.description}
                          </Text>
                        )}
                      </Box>
                      {isCurrentItem && (
                        <CheckIcon
                          width={16}
                          height={16}
                          style={{ flexShrink: 0, color: 'var(--accent-9)' }}
                        />
                      )}
                    </Box>
                  );
                })}

                {/* Create action */}
                {onCreate && (
                  <>
                    {filteredItems.length > 0 && (
                      <Box
                        style={{
                          height: '1px',
                          backgroundColor: 'var(--gray-6)',
                          margin: '8px 0',
                        }}
                      />
                    )}
                    <Box
                      data-index={filteredItems.length}
                      onClick={() => {
                        onCreate();
                        setIsOpen(false);
                      }}
                      onMouseEnter={() =>
                        setSelectedIndex(filteredItems.length)
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        backgroundColor:
                          selectedIndex === filteredItems.length
                            ? 'var(--accent-4)'
                            : 'transparent',
                      }}
                    >
                      <Box
                        style={{
                          flexShrink: 0,
                          width: 18,
                          height: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent-9)',
                        }}
                      >
                        <PlusIcon width={16} height={16} />
                      </Box>
                      <Text size="2" color="blue">
                        {createLabel}
                      </Text>
                    </Box>
                  </>
                )}
              </>
            )}
          </Box>
        </ScrollArea>
      </Popover.Content>
    </Popover.Root>
  );
}) as <T extends SelectorItem>(
  props: SelectorDropdownProps<T>,
) => React.ReactElement;
