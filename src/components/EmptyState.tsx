import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import type { LucideProps } from 'lucide-react'

/** The dashed-card "nothing here yet" treatment, shared so every empty list
 *  in the app reads the same way instead of some being a bare line of text. */
export function EmptyState({
  icon: Icon,
  message,
  action,
}: {
  icon: ComponentType<LucideProps>
  message: string
  action?: { label: string; to: string }
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-line)] p-8 text-center">
      <Icon size={28} strokeWidth={1.75} className="mb-2 text-[var(--color-ink-muted)]" />
      <p className="text-sm text-[var(--color-ink-muted)]">{message}</p>
      {action && (
        <Link
          to={action.to}
          className="mt-4 inline-block rounded-xl bg-[var(--color-ledger)] px-4 py-2 text-sm font-semibold text-white"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
