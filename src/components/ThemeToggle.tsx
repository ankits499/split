import { Sun, Moon } from 'lucide-react'
import type { Theme } from '../features/theme'

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      onClick={onToggle}
      className="relative flex h-8 w-14 shrink-0 items-center rounded-full border border-[var(--color-line)] bg-[var(--color-bg)] transition-colors"
    >
      <span
        className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-ledger)] text-white shadow-sm transition-transform duration-200 ease-out"
        style={{ transform: isDark ? 'translateX(29px)' : 'translateX(3px)' }}
      >
        {isDark ? <Moon size={13} strokeWidth={2.5} /> : <Sun size={13} strokeWidth={2.5} />}
      </span>
    </button>
  )
}
