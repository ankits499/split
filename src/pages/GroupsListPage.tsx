import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users, UsersRound } from 'lucide-react'
import { useGroups } from '../features/groups/hooks'
import { useFriendsSummary } from '../features/friends/hooks'
import { GroupCardContainer } from '../components/GroupCardContainer'
import { Avatar } from '../components/Avatar'
import { formatCurrency } from '../utils/money'

type View = 'groups' | 'friends'

export function GroupsListPage() {
  const [view, setView] = useState<View>('groups')
  const { data: groups, isLoading: groupsLoading } = useGroups()
  const { data: friends, isLoading: friendsLoading } = useFriendsSummary()

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">
            {view === 'groups' ? 'Groups' : 'Friends'}
          </h1>
          {view === 'groups' && (
            <Link
              to="/groups/new"
              className="flex items-center gap-1 rounded-full bg-[var(--color-ledger)] px-3.5 py-1.5 text-sm font-semibold text-white"
            >
              <Plus size={16} strokeWidth={2.5} /> New
            </Link>
          )}
        </div>
        <div className="mt-3 flex gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5">
          {(['groups', 'friends'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold capitalize transition-colors ${
                view === v ? 'bg-[var(--color-ledger)] text-white' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {view === 'groups' ? (
          groupsLoading ? (
            <p className="py-8 text-center text-sm text-[var(--color-ink-muted)]">Loading…</p>
          ) : !groups || groups.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-line)] p-8 text-center">
              <Users size={28} strokeWidth={1.75} className="mb-2 text-[var(--color-ink-muted)]" />
              <p className="text-sm text-[var(--color-ink-muted)]">No groups yet.</p>
              <Link
                to="/groups/new"
                className="mt-4 inline-block rounded-xl bg-[var(--color-ledger)] px-4 py-2 text-sm font-semibold text-white"
              >
                Create a group
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <GroupCardContainer key={g.id} group={g} />
              ))}
            </div>
          )
        ) : friendsLoading ? (
          <p className="py-8 text-center text-sm text-[var(--color-ink-muted)]">Loading…</p>
        ) : !friends || friends.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-line)] p-8 text-center">
            <UsersRound size={28} strokeWidth={1.75} className="mb-2 text-[var(--color-ink-muted)]" />
            <p className="text-sm text-[var(--color-ink-muted)]">No balances with friends yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((f) => (
              <Link
                key={f.friendId}
                to={`/friends/${f.friendId}`}
                className="block rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] active:opacity-80"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={f.friendName} size="md" />
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">{f.friendName}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {f.groups.length} shared {f.groups.length === 1 ? 'group' : 'groups'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {f.net > 0 ? 'Owes you' : 'You owe'}
                    </p>
                    <p
                      className={`font-mono-nums text-base font-semibold ${
                        f.net > 0 ? 'text-[var(--color-ledger)]' : 'text-[var(--color-receipt)]'
                      }`}
                    >
                      {formatCurrency(Math.abs(f.net))}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
