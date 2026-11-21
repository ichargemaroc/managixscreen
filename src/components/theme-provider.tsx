import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export const THEME_STORAGE_KEY = 'screenflow-appearance';
type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({ theme: 'light', toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    try { setTheme(localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'); } catch { /* Appearance stays usable without storage. */ }
    const sync = (event: StorageEvent) => { if (event.key === THEME_STORAGE_KEY) setTheme(event.newValue === 'dark' ? 'dark' : 'light'); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Keep the current session preference. */ }
  };
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }