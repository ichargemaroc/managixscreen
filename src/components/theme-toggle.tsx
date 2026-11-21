import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Activer le mode jour' : 'Activer le mode nuit';
  return <Button variant="ghost" size="icon" className="size-10 shrink-0" onClick={toggleTheme} aria-label={label} title={label}>
    {theme === 'dark' ? <Sun /> : <Moon />}
  </Button>;
}