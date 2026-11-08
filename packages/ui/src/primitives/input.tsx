'use client';

import { TextField } from '@radix-ui/themes';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export interface InputProps extends ComponentPropsWithoutRef<typeof TextField.Root> {}

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <TextField.Root ref={ref} {...props} />;
});

Input.displayName = 'Input';
