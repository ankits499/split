import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { useGroups } from '../features/groups/hooks'
import { GroupCardContainer } from '../components/GroupCardContainer'

export function GroupsListPage() {
  const { session } = useAuth()
  const { data: groups, isLoading } = useGroups()

  return (
    <div className="flex-1 px-4 pb-6">
      <div className="flex items-center justify-between pt-6 pb-4">
        <h1 className="text-lg font-semibold text-[var(--color-text)]">Groups</h1>
        <Link
          to="/groups/new"
          className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white"
        >
          + New
        </Link>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : !groups || groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">No groups yet.</p>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <GroupCardContainer key={g.id} group={g} userId={session!.user.id} />
          ))}
        </div>
      )}
    </div>
  )
}
