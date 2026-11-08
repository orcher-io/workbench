'use client';

import { Box, Flex, Heading, Text, Card, Grid } from '@radix-ui/themes';

interface RecentItem {
  id: string;
  name: string;
  path: string;
  lastOpened: Date;
}

interface WelcomeEditorProps {
  recentItems?: RecentItem[];
  onOpenItem?: (item: RecentItem) => void;
  onNewFile?: () => void;
  onOpenFolder?: () => void;
}

export function WelcomeEditor({
  recentItems = [],
  onOpenItem,
  onNewFile,
  onOpenFolder,
}: WelcomeEditorProps) {
  return (
    <Box
      p="6"
      style={{
        height: '100%',
        overflow: 'auto',
        background: 'var(--gray-1)',
      }}
    >
      <Flex direction="column" align="center" gap="6" py="8">
        <Flex direction="column" align="center" gap="2">
          <Heading size="8" weight="bold">
            Welcome
          </Heading>
          <Text size="3" color="gray">
            Get started with your project
          </Text>
        </Flex>

        <Grid columns="2" gap="4" width="100%" style={{ maxWidth: '600px' }}>
          <Card asChild>
            <button
              onClick={onNewFile}
              style={{
                cursor: 'pointer',
                textAlign: 'left',
                border: 'none',
                background: 'none',
              }}
            >
              <Flex direction="column" gap="2" p="4">
                <Text size="2" weight="bold">
                  New File
                </Text>
                <Text size="1" color="gray">
                  Create a new file in the workspace
                </Text>
              </Flex>
            </button>
          </Card>

          <Card asChild>
            <button
              onClick={onOpenFolder}
              style={{
                cursor: 'pointer',
                textAlign: 'left',
                border: 'none',
                background: 'none',
              }}
            >
              <Flex direction="column" gap="2" p="4">
                <Text size="2" weight="bold">
                  Open Folder
                </Text>
                <Text size="1" color="gray">
                  Open an existing project folder
                </Text>
              </Flex>
            </button>
          </Card>
        </Grid>

        {recentItems.length > 0 && (
          <Box width="100%" style={{ maxWidth: '600px' }}>
            <Heading size="3" mb="3">
              Recent
            </Heading>
            <Flex direction="column" gap="2">
              {recentItems.map((item) => (
                <Card key={item.id} asChild style={{ cursor: 'pointer' }}>
                  <button
                    onClick={() => onOpenItem?.(item)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: 'none',
                    }}
                  >
                    <Flex justify="between" align="center" p="3">
                      <Flex direction="column" gap="1">
                        <Text size="2" weight="medium">
                          {item.name}
                        </Text>
                        <Text size="1" color="gray">
                          {item.path}
                        </Text>
                      </Flex>
                      <Text size="1" color="gray">
                        {formatRelativeTime(item.lastOpened)}
                      </Text>
                    </Flex>
                  </button>
                </Card>
              ))}
            </Flex>
          </Box>
        )}

        <Box mt="4">
          <Text size="1" color="gray">
            Press{' '}
            <kbd
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'var(--gray-3)',
                border: '1px solid var(--gray-6)',
                fontSize: '11px',
              }}
            >
              Cmd+K
            </kbd>{' '}
            to open the command palette
          </Text>
        </Box>
      </Flex>
    </Box>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}
