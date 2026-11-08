'use client';

import { IconButton as RadixIconButton, type IconButtonProps as RadixIconButtonProps } from '@radix-ui/themes';
import { forwardRef } from 'react';

export interface IconButtonProps extends RadixIconButtonProps {}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>((props, ref) => {
  return <RadixIconButton ref={ref} {...props} />;
});

IconButton.displayName = 'IconButton';
