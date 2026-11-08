'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type KeyboardEvent,
} from 'react';
import { Box, Text, Kbd, ScrollArea } from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

export interface CommandItem {
  id: string;
  title: string;
  category?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  /** Whether the palette is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Commands to display */
  commands: CommandItem[];
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Command palette component (Cmd+K / Ctrl+K style)
 */
export function CommandPalette({
  isOpen,
  onClose,
  commands,
  placeholder = 'Type a command or search...',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lowerQuery) ||
        cmd.category?.toLowerCase().includes(lowerQuery),
    );
  }, [commands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups = new Map<string, CommandItem[]>();

    for (const cmd of filteredCommands) {
      const category = cmd.category || 'Commands';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(cmd);
    }

    return groups;
  }, [filteredCommands]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].onSelect();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onClose],
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let itemIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <Box
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
        }}
      />

      {/* Palette */}
      <Box
        style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 600,
          backgroundColor: 'var(--gray-2)',
          borderRadius: 8,
          boxShadow: '0 16px 70px rgba(0, 0, 0, 0.5)',
          zIndex: 1001,
          overflow: 'hidden',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--gray-6)',
            gap: 12,
          }}
        >
          <MagnifyingGlassIcon
            width={20}
            height={20}
            style={{ color: 'var(--gray-9)' }}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={placeholder}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 16,
              color: 'var(--gray-12)',
            }}
          />
        </Box>

        {/* Results */}
        <ScrollArea style={{ maxHeight: 400 }}>
          <Box ref={listRef} style={{ padding: '8px 0' }}>
            {filteredCommands.length === 0 ? (
              <Box style={{ padding: '16px', textAlign: 'center' }}>
                <Text size="2" color="gray">
                  No commands found
                </Text>
              </Box>
            ) : (
              Array.from(groupedCommands.entries()).map(([category, items]) => (
                <Box key={category}>
                  <Box style={{ padding: '8px 16px' }}>
                    <Text
                      size="1"
                      color="gray"
                      style={{ textTransform: 'uppercase' }}
                    >
                      {category}
                    </Text>
                  </Box>
                  {items.map((cmd) => {
                    const currentIndex = itemIndex++;
                    const isSelected = currentIndex === selectedIndex;

                    return (
                      <Box
                        key={cmd.id}
                        data-index={currentIndex}
                        onClick={() => {
                          cmd.onSelect();
                          onClose();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          backgroundColor: isSelected
                            ? 'var(--accent-4)'
                            : 'transparent',
                          gap: 12,
                        }}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                      >
                        {cmd.icon && (
                          <Box
                            style={{
                              width: 20,
                              height: 20,
                              color: 'var(--gray-11)',
                            }}
                          >
                            {cmd.icon}
                          </Box>
                        )}
                        <Text size="2" style={{ flex: 1 }}>
                          {cmd.title}
                        </Text>
                        {cmd.shortcut && <Kbd size="1">{cmd.shortcut}</Kbd>}
                      </Box>
                    );
                  })}
                </Box>
              ))
            )}
          </Box>
        </ScrollArea>
      </Box>
    </>
  );
}
