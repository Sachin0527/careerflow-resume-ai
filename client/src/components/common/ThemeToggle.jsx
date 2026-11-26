import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme.js';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-[#2A303E] dark:bg-[#14171F] dark:text-[#CBD5E1] dark:hover:bg-[#1D212D] dark:hover:text-white"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
