import { Link } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { useGroups } from '../features/groups/hooks'
import { GroupCardContainer } from '../components/GroupCardContainer'

export function GroupsListPage() {
  const { data: groups, isLoading } = useGroups()

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-4 pt-6 pb-4">
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">Groups</h1>
        <Link
          to="/groups/new"
          className="flex items-center gap-1 rounded-full bg-[var(--color-ledger)] px-3.5 py-1.5 text-sm font-semibold text-white"
        >
          <Plus size={16} strokeWidth={2.5} /> New
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {isLoading ? (
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
      )}
      </div>
    </div>
  )
}
