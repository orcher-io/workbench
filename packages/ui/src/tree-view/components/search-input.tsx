'use client';

import {
  memo,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from 'react';
import { Box, Flex, IconButton } from '@radix-ui/themes';
import { SearchIcon, CloseIcon } from './tree-icons';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onEscape?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const SearchInput = memo(function SearchInput({
  value,
  onChange,
  onClear,
  onEscape,
  placeholder = 'Search...',
  autoFocus = false,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        if (value) {
          onClear();
        } else {
          onEscape?.();
        }
        e.preventDefault();
      }
    },
    [value, onClear, onEscape],
  );

  const handleClearClick = useCallback(() => {
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  return (
    <Box
      style={{
        height: 36,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        borderBottom: '1px solid var(--gray-6)',
        flexShrink: 0,
      }}
    >
      <Flex
        align="center"
        gap="2"
        style={{
          flex: 1,
          backgroundColor: 'var(--gray-a3)',
          borderRadius: 4,
          padding: '0 8px',
          height: 26,
        }}
      >
        <Box style={{ flexShrink: 0, opacity: 0.6 }}>
          <SearchIcon size={14} />
        </Box>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 12,
            color: 'var(--gray-12)',
            minWidth: 0,
          }}
        />

        {value && (
          <IconButton
            size="1"
            variant="ghost"
            onClick={handleClearClick}
            style={{ flexShrink: 0 }}
          >
            <CloseIcon size={12} />
          </IconButton>
        )}
      </Flex>
    </Box>
  );
});
