'use client';

import { Box, Text } from '@radix-ui/themes';

export function SampleView() {
  return (
    <Box p="3">
      <Text size="2" weight="bold" style={{ textTransform: 'uppercase' }}>
        Sample
      </Text>
      <Box mt="3">
        <Text size="1" color="gray">
          Sample view content
        </Text>
      </Box>
    </Box>
  );
}
