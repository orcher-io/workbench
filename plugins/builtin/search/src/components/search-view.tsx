'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Flex,
  Text,
  TextField,
  IconButton,
  Checkbox,
} from '@radix-ui/themes';

interface SearchResult {
  file: string;
  matches: {
    line: number;
    content: string;
    matchStart: number;
    matchEnd: number;
  }[];
}

interface SearchViewProps {
  /** View ID from the plugin system */
  viewId?: string;
  /** Callback when a search result is clicked */
  onResultClick?: (file: string, line: number) => void;
}

// Mock search results for demo
const mockSearch = (query: string): SearchResult[] => {
  if (!query.trim()) return [];

  return [
    {
      file: 'src/components/Button.tsx',
      matches: [
        {
          line: 12,
          content: `  const ${query}Handler = () => {`,
          matchStart: 8,
          matchEnd: 8 + query.length,
        },
        {
          line: 45,
          content: `    onClick={${query}Handler}`,
          matchStart: 12,
          matchEnd: 12 + query.length,
        },
      ],
    },
    {
      file: 'src/hooks/useAuth.ts',
      matches: [
        {
          line: 23,
          content: `export function use${query}() {`,
          matchStart: 19,
          matchEnd: 19 + query.length,
        },
      ],
    },
    {
      file: 'src/pages/index.tsx',
      matches: [
        {
          line: 8,
          content: `import { ${query} } from '../components';`,
          matchStart: 10,
          matchEnd: 10 + query.length,
        },
        {
          line: 34,
          content: `      <${query} variant="primary" />`,
          matchStart: 7,
          matchEnd: 7 + query.length,
        },
        {
          line: 56,
          content: `      <${query} variant="secondary" />`,
          matchStart: 7,
          matchEnd: 7 + query.length,
        },
      ],
    },
  ];
};

export function SearchView({ onResultClick }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(() => {
    const searchResults = mockSearch(query);
    setResults(searchResults);
    setExpandedFiles(new Set(searchResults.map((r) => r.file)));
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleFile = (file: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(file)) {
        next.delete(file);
      } else {
        next.add(file);
      }
      return next;
    });
  };

  const totalMatches = results.reduce((acc, r) => acc + r.matches.length, 0);

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search Header */}
      <Box
        p="3"
        style={{
          borderBottom: '1px solid var(--gray-5)',
          flexShrink: 0,
        }}
      >
        <Flex direction="column" gap="2">
          {/* Search Input */}
          <Flex gap="1" align="center">
            <IconButton
              size="1"
              variant="ghost"
              onClick={() => setShowReplace(!showReplace)}
              title={showReplace ? 'Hide Replace' : 'Show Replace'}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M11 3l3 3-3 3V6H5v4h1V7h5v3l3-3-3-3z" />
              </svg>
            </IconButton>
            <Box style={{ flex: 1 }}>
              <TextField.Root
                size="1"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </Box>
          </Flex>

          {/* Replace Input */}
          {showReplace && (
            <Flex gap="1" align="center" pl="5">
              <Box style={{ flex: 1 }}>
                <TextField.Root
                  size="1"
                  placeholder="Replace"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                />
              </Box>
              <IconButton size="1" variant="ghost" title="Replace">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M3.5 3h9v1h-9z" />
                </svg>
              </IconButton>
              <IconButton size="1" variant="ghost" title="Replace All">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M3.5 3h9v1h-9zM3.5 6h9v1h-9z" />
                </svg>
              </IconButton>
            </Flex>
          )}

          {/* Search Options */}
          <Flex gap="3" pl="5">
            <Flex align="center" gap="1">
              <Checkbox
                size="1"
                checked={caseSensitive}
                onCheckedChange={(c) => setCaseSensitive(c === true)}
              />
              <Text size="1">Aa</Text>
            </Flex>
            <Flex align="center" gap="1">
              <Checkbox
                size="1"
                checked={wholeWord}
                onCheckedChange={(c) => setWholeWord(c === true)}
              />
              <Text size="1">Word</Text>
            </Flex>
            <Flex align="center" gap="1">
              <Checkbox
                size="1"
                checked={useRegex}
                onCheckedChange={(c) => setUseRegex(c === true)}
              />
              <Text size="1">.*</Text>
            </Flex>
          </Flex>
        </Flex>
      </Box>

      {/* Results Summary */}
      {results.length > 0 && (
        <Box
          px="3"
          py="2"
          style={{ borderBottom: '1px solid var(--gray-5)', flexShrink: 0 }}
        >
          <Text size="1" color="gray">
            {totalMatches} results in {results.length} files
          </Text>
        </Box>
      )}

      {/* Results List */}
      <Box style={{ flex: 1, overflow: 'auto' }} py="1">
        {results.length === 0 && query && (
          <Box p="3">
            <Text size="1" color="gray">
              No results found
            </Text>
          </Box>
        )}
        {results.map((result) => (
          <Box key={result.file}>
            {/* File Header */}
            <Flex
              px="3"
              py="1"
              align="center"
              gap="1"
              style={{
                cursor: 'pointer',
                backgroundColor: 'var(--gray-2)',
              }}
              onClick={() => toggleFile(result.file)}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 15 15"
                fill="currentColor"
                style={{
                  transform: expandedFiles.has(result.file)
                    ? 'rotate(90deg)'
                    : 'rotate(0deg)',
                  transition: 'transform 0.1s',
                }}
              >
                <path d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z" />
              </svg>
              <Text size="1" weight="medium" style={{ flex: 1 }}>
                {result.file}
              </Text>
              <Text size="1" color="gray">
                {result.matches.length}
              </Text>
            </Flex>

            {/* Matches */}
            {expandedFiles.has(result.file) && (
              <Box>
                {result.matches.map((match, idx) => (
                  <Flex
                    key={idx}
                    px="3"
                    py="1"
                    pl="6"
                    align="center"
                    gap="2"
                    style={{
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                    onClick={() => onResultClick?.(result.file, match.line)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--gray-3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Text
                      size="1"
                      color="gray"
                      style={{ minWidth: '32px', textAlign: 'right' }}
                    >
                      {match.line}
                    </Text>
                    <Text size="1" style={{ whiteSpace: 'pre' }}>
                      {match.content.slice(0, match.matchStart)}
                      <span
                        style={{
                          backgroundColor: 'var(--yellow-5)',
                          color: 'var(--yellow-11)',
                        }}
                      >
                        {match.content.slice(match.matchStart, match.matchEnd)}
                      </span>
                      {match.content.slice(match.matchEnd)}
                    </Text>
                  </Flex>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
