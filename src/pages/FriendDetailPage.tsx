import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useFriendsSummary, useSettleWithFriend } from '../features/friends/hooks'
import { Avatar } from '../components/Avatar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { formatCurrency } from '../utils/money'

export function FriendDetailPage() {
  const { friendId } = useParams<{ friendId: string }>()
  const navigate = useNavigate()
  const { data: friends, isLoading } = useFriendsSummary()
  const settleWithFriend = useSettleWithFriend()
  const [confirmSettle, setConfirmSettle] = useState(false)

  const friend = friends?.find((f) => f.friendId === friendId)

  if (isLoading || !friend) {
    return (
      <div className="flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center gap-3 px-4 pt-6 pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="text-[var(--color-ink-muted)]"
          >
            <ArrowLeft size={20} strokeWidth={2.25} />
          </button>
        </div>
        <p className="px-4 text-center text-sm text-[var(--color-ink-muted)]">
          {isLoading ? 'Loading…' : "You're all settled up with this person."}
        </p>
      </div>
    )
  }

  const settled = Math.abs(friend.net) < 0.005

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-4 pt-6 pb-4">
        <Link to="/groups" aria-label="Back to friends" className="text-[var(--color-ink-muted)]">
          <ArrowLeft size={20} strokeWidth={2.25} />
        </Link>
        <Avatar name={friend.friendName} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-[var(--color-ink)]">{friend.friendName}</h1>
          <p className="text-xs text-[var(--color-ink-muted)]">
            {friend.groups.length} shared {friend.groups.length === 1 ? 'group' : 'groups'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-center shadow-[var(--shadow-card)]">
          {settled ? (
            <p className="text-sm text-[var(--color-ink-muted)]">You're all settled up</p>
          ) : (
            <>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {friend.net > 0 ? `${friend.friendName} owes you` : `You owe ${friend.friendName}`}
              </p>
              <p
                className={`font-mono-nums mt-1 text-3xl font-bold ${
                  friend.net > 0 ? 'text-[var(--color-ledger)]' : 'text-[var(--color-receipt)]'
                }`}
              >
                {formatCurrency(Math.abs(friend.net))}
              </p>
              <button
                onClick={() => setConfirmSettle(true)}
                className="mt-4 rounded-full bg-[var(--color-ledger)] px-5 py-2 text-sm font-semibold text-white"
              >
                Settle up
              </button>
            </>
          )}
        </div>

        <p className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          By group
        </p>
        <div className="space-y-2">
          {friend.groups.map((g) => (
            <Link
              key={g.groupId}
              to={`/groups/${g.groupId}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"
            >
              <span className="flex items-center gap-1.5 text-sm text-[var(--color-ink)]">
                {g.groupName}
                <ArrowRight size={13} strokeWidth={2.25} className="text-[var(--color-ink-muted)]" />
              </span>
              <span
                className={`font-mono-nums text-sm font-semibold ${
                  g.net > 0 ? 'text-[var(--color-ledger)]' : 'text-[var(--color-receipt)]'
                }`}
              >
                {g.net > 0 ? '+' : '−'}
                {formatCurrency(Math.abs(g.net))}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmSettle}
        title={`Settle up with ${friend.friendName}?`}
        description={`${
          friend.net > 0 ? `${friend.friendName} pays you` : `You pay ${friend.friendName}`
        } ${formatCurrency(Math.abs(friend.net))}, split across ${friend.groups.length} ${
          friend.groups.length === 1 ? 'group' : 'groups'
        }. This updates the balance for everyone in each group.`}
        confirmLabel="Settle up"
        onConfirm={() => {
          setConfirmSettle(false)
          settleWithFriend.mutate(
            { friendId: friend.friendId, groups: friend.groups },
            { onSuccess: () => navigate('/groups') }
          )
        }}
        onCancel={() => setConfirmSettle(false)}
      />
    </div>
  )
}
