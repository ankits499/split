import { Link } from 'react-router-dom'
import { ArrowLeftRight, Receipt } from 'lucide-react'
import { useLocalUser } from '../features/localUser'
import { useActivityFeed, type ActivityEntry } from '../features/dashboard/hooks'
import { Avatar } from '../components/Avatar'
import { formatCurrency } from '../utils/money'
import { myExpenseDelta } from '../utils/balances'

function dateLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(date, today)) return 'Today'
  if (sameDay(date, yesterday)) return 'Yesterday'
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function groupByDate(entries: ActivityEntry[]): [string, ActivityEntry[]][] {
  const groups = new Map<string, ActivityEntry[]>()
  for (const entry of entries) {
    const label = dateLabel(entry.createdAt)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entry)
  }
  return [...groups.entries()]
}

export function ActivityPage() {
  const { id: userId } = useLocalUser()
  const { data, isLoading, isFetching, loadMore } = useActivityFeed()

  const sections = groupByDate(data?.entries ?? [])

  return (
    <div className="flex-1 px-4 pb-6">
      <h1 className="pt-6 pb-4 text-lg font-semibold text-[var(--color-ink)]">Activity</h1>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : sections.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-line)] p-8 text-center">
          <Receipt size={28} strokeWidth={1.75} className="mb-2 text-[var(--color-ink-muted)]" />
          <p className="text-sm text-[var(--color-ink-muted)]">No activity yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map(([label, entries]) => (
            <div key={label}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                {label}
              </p>
              <div className="space-y-2">
                {entries.map((entry) =>
                  entry.kind === 'expense' && entry.expense ? (
                    <Link
                      key={`e-${entry.id}`}
                      to={`/groups/${entry.groupId}`}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"
                    >
                      <Avatar name={entry.groupName} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                          {entry.expense.description}
                        </p>
                        <p className="truncate text-xs text-[var(--color-ink-muted)]">
                          {entry.groupName} · {formatCurrency(entry.expense.amount)}
                        </p>
                      </div>
                      {(() => {
                        const delta = myExpenseDelta(entry.expense, userId)
                        if (Math.abs(delta) < 0.01) return null
                        return (
                          <span
                            className={`font-mono-nums shrink-0 text-sm font-semibold ${
                              delta > 0 ? 'text-[var(--color-ledger)]' : 'text-[var(--color-receipt)]'
                            }`}
                          >
                            {delta > 0 ? '+' : '−'}
                            {formatCurrency(Math.abs(delta))}
                          </span>
                        )
                      })()}
                    </Link>
                  ) : entry.settlement ? (
                    <Link
                      key={`s-${entry.id}`}
                      to={`/groups/${entry.groupId}`}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-ledger-soft)] text-[var(--color-ledger)]">
                        <ArrowLeftRight size={16} strokeWidth={2.25} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--color-ink)]">Settled up</p>
                        <p className="truncate text-xs text-[var(--color-ink-muted)]">{entry.groupName}</p>
                      </div>
                      <span className="font-mono-nums shrink-0 text-sm font-semibold text-[var(--color-ink)]">
                        {formatCurrency(entry.settlement.amount)}
                      </span>
                    </Link>
                  ) : null
                )}
              </div>
            </div>
          ))}

          {data?.hasMore && (
            <button
              onClick={loadMore}
              disabled={isFetching}
              className="w-full rounded-xl border border-[var(--color-line)] py-2.5 text-sm font-medium text-[var(--color-ink)] disabled:opacity-50"
            >
              {isFetching ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
