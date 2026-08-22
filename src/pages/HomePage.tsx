import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { Moon, Sun } from 'lucide-react'
import { useLocalUser } from '../features/localUser'
import { useGroups } from '../features/groups/hooks'
import { useOverallSummary } from '../features/dashboard/hooks'
import { useFriendsSummary } from '../features/friends/hooks'
import { useTheme } from '../features/theme'
import { Avatar } from '../components/Avatar'
import type { GroupSummary } from '../features/groups/hooks'
import { CategoryIcon } from '../components/CategoryIcon'
import { InstallPrompt } from '../components/InstallPrompt'
import { OnlineIndicator } from '../components/OnlineIndicator'
import { formatCurrency, firstName } from '../utils/money'
import { myExpenseDelta } from '../utils/balances'

/** Groups ordered by most recent expense activity (from the already-fetched
 *  recent-expenses list), with any remaining groups appended in their
 *  existing order — avoids a dedicated "last activity per group" query. */
function recentGroups(groups: GroupSummary[], recentExpenses: { group_id: string }[]): GroupSummary[] {
  const byId = new Map(groups.map((g) => [g.id, g]))
  const seen = new Set<string>()
  const ordered: GroupSummary[] = []
  for (const e of recentExpenses) {
    const g = byId.get(e.group_id)
    if (g && !seen.has(g.id)) {
      seen.add(g.id)
      ordered.push(g)
    }
  }
  for (const g of groups) {
    if (!seen.has(g.id)) {
      seen.add(g.id)
      ordered.push(g)
    }
  }
  return ordered
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function HomePage() {
  const { id: userId, name } = useLocalUser()
  const { data: groups } = useGroups()
  const { data: summary } = useOverallSummary()
  const { data: friends } = useFriendsSummary()
  const { theme, toggle: toggleTheme } = useTheme()

  const recentExpenses = summary?.recentExpenses ?? []
  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]))
  const memberNameById = new Map((groups ?? []).flatMap((g) => g.members.map((m) => [m.user_id, m.name] as const)))

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-4 pt-6 pb-4">
        <div>
          <h1 className="text-lg font-medium text-[var(--color-ink)]">
            Hi, {name} <span aria-hidden>👋</span>
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs text-[var(--color-ink-muted)]">{greeting()}, here's your overview</p>
            <OnlineIndicator />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[var(--shadow-card)]"
          >
            {theme === 'dark' ? <Moon size={18} strokeWidth={2.25} /> : <Sun size={18} strokeWidth={2.25} />}
          </button>
          <Link
            to="/profile"
            aria-label="Profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[var(--shadow-card)]"
          >
            <Avatar name={name} size="sm" />
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <InstallPrompt />

      <div className="px-4">
        {!groups || groups.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--color-line)] p-8 text-center">
            <Receipt size={28} strokeWidth={1.75} className="mb-2 text-[var(--color-ink-muted)]" />
            <p className="text-sm text-[var(--color-ink-muted)]">
              No groups yet. Create one to start splitting expenses.
            </p>
            <Link
              to="/groups/new"
              className="mt-4 inline-block rounded-xl bg-[var(--color-ledger)] px-4 py-2 text-sm font-semibold text-white"
            >
              Create a group
            </Link>
          </div>
        ) : (
          <>
            {friends && friends.length > 0 && (
              <>
                <p className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                  Friends
                </p>
                <div className="space-y-2">
                  {friends.map((f) => (
                    <Link
                      key={f.friendId}
                      to={`/friends/${f.friendId}`}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"
                    >
                      <Avatar name={f.friendName} size="md" />
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-ink)]">
                        {f.friendName}
                      </p>
                      <span
                        className={`font-mono-nums shrink-0 text-sm font-semibold ${
                          f.net > 0 ? 'text-[var(--color-ledger)]' : 'text-[var(--color-receipt)]'
                        }`}
                      >
                        {f.net > 0 ? '+' : '−'}
                        {formatCurrency(Math.abs(f.net))}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {groups.length > 0 && (
              <>
                <p className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                  Recent groups
                </p>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                  {recentGroups(groups, recentExpenses).map((g) => (
                    <Link
                      key={g.id}
                      to={`/groups/${g.id}`}
                      className="flex w-28 shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] py-3 text-center shadow-[var(--shadow-card)]"
                    >
                      <Avatar name={g.name} size="md" />
                      <p className="w-full truncate px-1.5 text-xs font-medium text-[var(--color-ink)]">{g.name}</p>
                      <p className="text-[11px] text-[var(--color-ink-muted)]">
                        {g.members.length} {g.members.length === 1 ? 'member' : 'members'}
                      </p>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {recentExpenses.length > 0 && (
              <>
                <div className="mt-6 mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                    Recent expenses
                  </p>
                  <Link to="/activity" className="text-xs font-semibold text-[var(--color-ledger)]">
                    See all
                  </Link>
                </div>
                <div className="receipt-edge divide-y divide-dashed divide-[var(--color-line)] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] pb-3 shadow-[var(--shadow-card)]">
                  {recentExpenses.map((e) => {
                    const delta = myExpenseDelta(e, userId)
                    const groupName = groupNameById.get(e.group_id) ?? 'Group'
                    const addedByName = memberNameById.get(e.created_by)
                    const editedByName = e.edited_at
                      ? (e.edited_by && memberNameById.get(e.edited_by)) || 'Someone'
                      : undefined
                    return (
                      <Link
                        key={e.id}
                        to={`/groups/${e.group_id}`}
                        className="flex items-center gap-3 p-3"
                      >
                        <CategoryIcon category={e.category} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--color-ink)]">{e.description}</p>
                          <p className="truncate text-xs text-[var(--color-ink-muted)]">
                            {groupName} · {formatCurrency(e.amount)}
                            {editedByName
                              ? ` · Edited by ${firstName(editedByName)}`
                              : addedByName
                                ? ` · Added by ${firstName(addedByName)}`
                                : ''}
                          </p>
                        </div>
                        {Math.abs(delta) > 0.01 && (
                          <span
                            className={`font-mono-nums shrink-0 text-sm font-semibold ${
                              delta > 0 ? 'text-[var(--color-ledger)]' : 'text-[var(--color-receipt)]'
                            }`}
                          >
                            {delta > 0 ? '+' : '−'}
                            {formatCurrency(Math.abs(delta))}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  )
}
