import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils/money'

export function GroupCard({
  id,
  name,
  memberCount,
  netBalance,
}: {
  id: string
  name: string
  memberCount: number
  netBalance: number
}) {
  const settled = Math.abs(netBalance) < 0.01

  return (
    <Link
      to={`/groups/${id}`}
      className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 active:opacity-70"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-[var(--color-text)]">{name}</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {memberCount} {memberCount === 1 ? 'person' : 'people'}
          </p>
        </div>
        <div className="text-right">
          {settled ? (
            <p className="text-sm text-[var(--color-text-muted)]">Settled up</p>
          ) : (
            <>
              <p className="text-sm text-[var(--color-text-muted)]">
                {netBalance > 0 ? 'You are owed' : 'You owe'}
              </p>
              <p
                className={`font-semibold ${
                  netBalance > 0 ? 'text-[var(--color-owed)]' : 'text-[var(--color-owe)]'
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
