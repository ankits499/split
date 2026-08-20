import type { SpendingBucket } from '../utils/spending'

export function SpendingChart({ buckets }: { buckets: SpendingBucket[] }) {
  const max = Math.max(...buckets.map((b) => b.total), 1)

  return (
    <div className="flex h-24 items-end gap-1.5">
      {buckets.map((b, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
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
