'use client';

import { Button as RadixButton, type ButtonProps as RadixButtonProps } from '@radix-ui/themes';
import { forwardRef } from 'react';

export interface ButtonProps extends RadixButtonProps {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  return <RadixButton ref={ref} {...props} />;
});

Button.displayName = 'Button';
