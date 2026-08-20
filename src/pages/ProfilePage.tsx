import { useEffect, useMemo, useState } from 'react'
import { Bell, LogOut } from 'lucide-react'
import { useLocalUser, useRenameLocalUser } from '../features/localUser'
import { useAuth } from '../features/auth/AuthProvider'
import { usePushSubscription } from '../features/push/register'
import { useSpendingHistory } from '../features/dashboard/hooks'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ThemeToggle } from '../components/ThemeToggle'
import { SpendingChart } from '../components/SpendingChart'
import { DonutChart } from '../components/DonutChart'
import { useTheme } from '../features/theme'
import { formatCurrency } from '../utils/money'
import { categoryById } from '../utils/categories'
import { computeSpendingBreakdown, type SpendingRange } from '../utils/spending'

const RANGES: { id: SpendingRange; label: string }[] = [
  { id: '1w', label: '1W' },
  { id: 'mtd', label: 'MTD' },
  { id: '3m', label: '3M' },
]

export function ProfilePage() {
  const { id: userId, name: currentName } = useLocalUser()
  const rename = useRenameLocalUser()
  const { session, signOut } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const push = usePushSubscription(userId)
  const { data: spendingHistory } = useSpendingHistory()
  const [name, setName] = useState(currentName)
  const [saved, setSaved] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [range, setRange] = useState<SpendingRange>('mtd')

  useEffect(() => setName(currentName), [currentName])

  const breakdown = useMemo(
    () => computeSpendingBreakdown(spendingHistory ?? [], userId, range),
    [spendingHistory, userId, range]
  )

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    await rename.mutateAsync(name.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <h1 className="shrink-0 px-4 pt-6 pb-4 text-lg font-semibold text-[var(--color-ink)]">Profile</h1>

      <div className="flex-1 overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Spending
        </p>
        <div className="flex gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                range === r.id
                  ? 'bg-[var(--color-ledger)] text-white'
                  : 'text-[var(--color-ink-muted)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {breakdown.buckets.some((b) => b.total > 0) ? (
        <div className="mt-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <SpendingChart buckets={breakdown.buckets} />
        </div>
      ) : (
        <p className="mt-2 rounded-2xl border border-dashed border-[var(--color-line)] p-4 text-center text-sm text-[var(--color-ink-muted)]">
          No spending in this period.
        </p>
      )}

      {breakdown.byCategory.length > 0 && (
        <div className="mt-3 flex items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <DonutChart
            segments={breakdown.byCategory.map((c) => ({
              value: c.total,
              color: categoryById(c.category).color,
            }))}
            centerValue={formatCurrency(breakdown.total)}
            centerLabel="Your share"
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            {breakdown.byCategory.map((c) => {
              const cat = categoryById(c.category)
              return (
                <div key={c.category} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-[var(--color-ink)]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="truncate">
                      {cat.emoji} {cat.label}
                    </span>
                  </span>
                  <span className="font-mono-nums shrink-0 text-[var(--color-ink-muted)]">
                    {formatCurrency(c.total)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
        Settings
      </p>

      <form onSubmit={save} className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs text-[var(--color-ink-muted)]">Your name</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-ink)] outline-none focus:border-[var(--color-ledger)]"
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs text-[var(--color-ink-muted)]">Email</p>
          <p className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-ink-muted)]">
            {session?.user?.email}
          </p>
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-[var(--color-ledger)] py-3 font-semibold text-white"
        >
          {saved ? 'Saved ✓' : 'Save'}
        </button>
      </form>

      <p className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
        Appearance
      </p>
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
        <span className="text-sm text-[var(--color-ink)]">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <p className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
        Notifications
      </p>
      {push.permission === 'unsupported' ? (
        <p className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink-muted)]">
          Not supported on this device or browser.
        </p>
      ) : push.permission === 'denied' ? (
        <p className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink-muted)]">
          Blocked — enable notifications for Split in your device settings to turn this on.
        </p>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
            <Bell size={16} strokeWidth={2.25} />
            Group activity alerts
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={push.subscribed}
            aria-label={push.subscribed ? 'Disable notifications' : 'Enable notifications'}
            disabled={push.checking || push.busy}
            onClick={() => (push.subscribed ? push.unsubscribe() : push.subscribe())}
            className="relative flex h-8 w-14 shrink-0 items-center rounded-full border border-[var(--color-line)] bg-[var(--color-bg)] transition-colors disabled:opacity-50"
          >
            <span
              className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-ledger)] text-white shadow-sm transition-transform duration-200 ease-out"
              style={{ transform: push.subscribed ? 'translateX(29px)' : 'translateX(3px)' }}
            />
          </button>
        </div>
      )}
      {push.error && <p className="mt-1.5 text-xs text-[var(--color-receipt)]">{push.error}</p>}

      <p className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
        Account
      </p>
      <button
        onClick={() => setConfirmSignOut(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] py-3 font-semibold text-[var(--color-receipt)]"
      >
        <LogOut size={16} strokeWidth={2.25} />
        Sign out
      </button>

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out?"
        description="You'll need to enter your email again to sign back in."
        confirmLabel="Sign out"
        tone="danger"
        onConfirm={() => {
          setConfirmSignOut(false)
          signOut()
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
      </div>
    </div>
  )
}
