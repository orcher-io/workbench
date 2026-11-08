'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

export type ThemeAppearance = 'light' | 'dark';

export interface ThemeContextValue {
  /** Current theme appearance */
  appearance: ThemeAppearance;
  /** Toggle between light and dark */
  toggleTheme: () => void;
  /** Set specific theme */
  setTheme: (appearance: ThemeAppearance) => void;
  /** Whether theme is being resolved (for SSR) */
  isResolving: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'workbench-theme';

/**
 * Get initial theme from storage or system preference
 */
function getInitialTheme(defaultTheme: ThemeAppearance): ThemeAppearance {
  if (typeof window === 'undefined') {
    return defaultTheme;
  }

  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  // Fall back to system preference
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }

  return defaultTheme;
}

export interface ThemeProviderProps {
  /** Default theme if no preference is stored */
  defaultTheme?: ThemeAppearance;
  /** Children */
  children: ReactNode;
  /** Callback when theme changes */
  onThemeChange?: (appearance: ThemeAppearance) => void;
}

/**
 * Theme provider that manages appearance state and persistence
 */
export function ThemeProvider({
  defaultTheme = 'dark',
  children,
  onThemeChange,
}: ThemeProviderProps) {
  const [appearance, setAppearance] = useState<ThemeAppearance>(defaultTheme);
  const [isResolving, setIsResolving] = useState(true);

  // Initialize theme on mount (client-side only)
  useEffect(() => {
    const initial = getInitialTheme(defaultTheme);
    setAppearance(initial);
    setIsResolving(false);
  }, [defaultTheme]);

  // Persist theme changes
  useEffect(() => {
    if (!isResolving) {
      localStorage.setItem(STORAGE_KEY, appearance);
      onThemeChange?.(appearance);
    }
  }, [appearance, isResolving, onThemeChange]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setAppearance(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setAppearance((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((newAppearance: ThemeAppearance) => {
    setAppearance(newAppearance);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ appearance, toggleTheme, setTheme, isResolving }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to check if we're in a ThemeProvider (optional usage)
 */
export function useThemeOptional(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
