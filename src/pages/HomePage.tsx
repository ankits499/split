import { useAuth } from '../features/auth/AuthProvider'
import { useGroups } from '../features/groups/hooks'
import { GroupCardContainer } from '../components/GroupCardContainer'
import { InstallPrompt } from '../components/InstallPrompt'
import { Link } from 'react-router-dom'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function HomePage() {
  const { profile, session } = useAuth()
  const { data: groups, isLoading } = useGroups()

  return (
    <div className="flex-1 pb-6">
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <h1 className="text-lg font-medium text-[var(--color-text)]">
          {greeting()}, {profile?.name ?? 'there'}
        </h1>
        <Link
          to="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text)]"
        >
          👤
        </Link>
      </div>

      <InstallPrompt />

      <div className="px-4">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : !groups || groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              No groups yet. Create one to start splitting expenses.
            </p>
            <Link
              to="/groups/new"
              className="mt-3 inline-block rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Create a group
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-2 text-xs font-medium uppercase text-[var(--color-text-muted)]">
              Your groups
            </p>
            <div className="space-y-2">
              {groups.map((g) => (
                <GroupCardContainer key={g.id} group={g} userId={session!.user.id} />
              ))}
            </div>
          </>
        )}
      </div>

      <Link
        to="/groups/new"
        className="fixed bottom-20 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)] text-2xl text-white shadow-lg"
        aria-label="New group"
      >
        +
      </Link>
    </div>
  )
}
