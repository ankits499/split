import type { Expense } from '../features/expenses/hooks'

const DAYS = 14

export function SpendingChart({ expenses }: { expenses: Expense[] }) {
  const today = new Date()
  const buckets: { date: string; label: string; total: number }[] = []
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    buckets.push({ date: iso, label: String(d.getDate()), total: 0 })
  }
  const byDate = new Map(buckets.map((b) => [b.date, b]))
  for (const e of expenses) {
    const bucket = byDate.get(e.expense_date)
    if (bucket) bucket.total += e.amount
  }

  const max = Math.max(...buckets.map((b) => b.total), 1)

  return (
    <div className="flex h-24 items-end gap-1.5">
      {buckets.map((b) => (
        <div key={b.date} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`w-full rounded-md transition-all ${
              b.total > 0 ? 'bg-[var(--color-ledger)]' : 'bg-[var(--color-line)]'
            }`}
            style={{ height: `${Math.max((b.total / max) * 64, 3)}px` }}
          />
          <span className="text-[9px] text-[var(--color-ink-muted)]">{b.label}</span>
        </div>
      ))}
    </div>
  )
}
