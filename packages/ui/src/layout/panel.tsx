'use client';

import { Box, type BoxProps } from '@radix-ui/themes';
import { forwardRef, type ReactNode } from 'react';

export type PanelProps = BoxProps & {
  children: ReactNode;
};

/**
 * Panel component for containing content areas
 */
export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ children, ...props }, ref) => {
    return (
      <Box
        ref={ref}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          ...props.style,
        }}
        {...props}
      >
        {children}
      </Box>
    );
  },
);

Panel.displayName = 'Panel';
