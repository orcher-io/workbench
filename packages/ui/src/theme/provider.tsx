'use client';

import { Theme, type ThemeProps } from '@radix-ui/themes';
import { type ReactNode } from 'react';

export interface WorkbenchThemeProps extends Omit<ThemeProps, 'children'> {
  children: ReactNode;
}

/**
 * Workbench theme provider wrapping Radix Themes
 */
export function WorkbenchTheme({
  children,
  appearance = 'dark',
  accentColor = 'blue',
  radius = 'medium',
  scaling = '100%',
  ...props
}: WorkbenchThemeProps) {
  return (
    <Theme
      appearance={appearance}
      accentColor={accentColor}
      radius={radius}
      scaling={scaling}
      hasBackground={true}
      {...props}
    >
      {children}
    </Theme>
  );
}
