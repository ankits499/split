import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils/money'
import { Avatar } from './Avatar'
import { Skeleton } from './ui/Skeleton'

export function GroupCard({
  id,
  name,
  memberNames,
  netBalance,
  loading,
  archived,
  onUnarchive,
}: {
  id: string
  name: string
  memberNames: string[]
  netBalance: number
  loading?: boolean
  archived?: boolean
  onUnarchive?: () => void
}) {
  const settled = Math.abs(netBalance) < 0.01

  return (
    <Link
      to={`/groups/${id}`}
      className={`block rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] active:opacity-80 ${
        archived ? 'opacity-70' : ''
      }`}
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
          {archived ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onUnarchive?.()
              }}
              className="rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)]"
            >
              Unarchive
            </button>
          ) : loading ? (
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-14" />
            </div>
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
