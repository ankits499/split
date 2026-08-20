import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils/money'
import { Avatar } from './Avatar'

export function GroupCard({
  id,
  name,
  memberNames,
  netBalance,
  loading,
}: {
  id: string
  name: string
  memberNames: string[]
  netBalance: number
  loading?: boolean
}) {
  const settled = Math.abs(netBalance) < 0.01

  return (
    <Link
      to={`/groups/${id}`}
      className="block rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] active:opacity-80"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={name} size="md" />
          <div>
            <p className="font-semibold text-[var(--color-ink)]">{name}</p>
            <p className="text-xs text-[var(--color-ink-muted)]">
              {memberNames.length} {memberNames.length === 1 ? 'person' : 'people'}
            </p>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <p className="text-xs text-[var(--color-ink-muted)]">…</p>
          ) : settled ? (
            <p className="text-xs text-[var(--color-ink-muted)]">Settled up</p>
          ) : (
            <>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {netBalance > 0 ? 'You are owed' : 'You owe'}
              </p>
              <p
                className={`font-mono-nums text-base font-semibold ${
                  netBalance > 0 ? 'text-[var(--color-ledger)]' : 'text-[var(--color-receipt)]'
                }`}
              >
                {formatCurrency(Math.abs(netBalance))}
              </p>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
