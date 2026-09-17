import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users, UsersRound, ChevronDown, Archive } from 'lucide-react'
import { useArchivedGroups, useGroups, useUnarchiveGroup } from '../features/groups/hooks'
import { useFriendsSummary } from '../features/friends/hooks'
import { GroupCardContainer } from '../components/GroupCardContainer'
import { Avatar } from '../components/Avatar'
import { EmptyState } from '../components/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../features/toast'
import { formatCurrency } from '../utils/money'

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[68px] w-full !rounded-2xl" />
      ))}
    </div>
  )
}

type View = 'groups' | 'friends'

export function GroupsListPage() {
  const [view, setView] = useState<View>('groups')
  const [showArchived, setShowArchived] = useState(false)
  const { data: groups, isLoading: groupsLoading } = useGroups()
  const { data: archivedGroups } = useArchivedGroups()
  const { data: friends, isLoading: friendsLoading } = useFriendsSummary()
  const unarchiveGroup = useUnarchiveGroup()
  const showToast = useToast()

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

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {view === 'groups' ? (
          <>
            {groupsLoading ? (
              <ListSkeleton />
            ) : !groups || groups.length === 0 ? (
              <EmptyState
                icon={Users}
                message="No groups yet."
                action={{ label: 'Create a group', to: '/groups/new' }}
              />
            ) : (
              <div className="space-y-3">
                {groups.map((g) => (
                  <GroupCardContainer key={g.id} group={g} />
                ))}
              </div>
            )}

            {archivedGroups && archivedGroups.length > 0 && (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setShowArchived((v) => !v)}
                  aria-expanded={showArchived}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ink-muted)]"
                >
                  <Archive size={13} strokeWidth={2.25} />
                  Archived ({archivedGroups.length})
                  <ChevronDown
                    size={13}
                    strokeWidth={2.5}
                    className={`transition-transform ${showArchived ? 'rotate-180' : ''}`}
                  />
                </button>
                {showArchived && (
                  <div className="animate-rise mt-3 space-y-3">
                    {archivedGroups.map((g) => (
                      <GroupCardContainer
                        key={g.id}
                        group={g}
                        archived
                        onUnarchive={() =>
                          unarchiveGroup.mutate(g.id, { onSuccess: () => showToast(`${g.name} unarchived`) })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : friendsLoading ? (
          <ListSkeleton />
        ) : !friends || friends.length === 0 ? (
          <EmptyState icon={UsersRound} message="No balances with friends yet." />
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
