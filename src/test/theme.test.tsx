import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { ThemeProvider, THEME_STORAGE_KEY, useTheme } from '@/components/theme-provider';

let current: ReturnType<typeof useTheme>;
function Probe() { current = useTheme(); return null; }
beforeEach(() => { localStorage.clear(); document.documentElement.classList.remove('dark'); });
afterEach(() => cleanup());
it('switches between night and day and persists the chosen appearance', () => {
  render(<ThemeProvider><Probe /></ThemeProvider>);
  act(() => current.toggleTheme());
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  act(() => current.toggleTheme());
  expect(document.documentElement.classList.contains('dark')).toBe(false);
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
});
it('restores a saved night preference when reopened', () => {
  localStorage.setItem(THEME_STORAGE_KEY, 'dark');
  render(<ThemeProvider><Probe /></ThemeProvider>);
  expect(current.theme).toBe('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
});