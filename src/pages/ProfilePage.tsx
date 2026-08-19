import { useState } from 'react'
import { useAuth } from '../features/auth/AuthProvider'

export function ProfilePage() {
  const { profile, session, updateName, signOut } = useAuth()
  const [name, setName] = useState(profile?.name ?? '')
  const [saved, setSaved] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateName(name.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="flex-1 px-4 pb-6">
      <h1 className="pt-6 pb-4 text-lg font-semibold text-[var(--color-text)]">Profile</h1>

      <form onSubmit={save} className="space-y-3">
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-[var(--color-text-muted)]">Name</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-[var(--color-text-muted)]">Email</p>
          <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text-muted)]">
            {session?.user.email}
          </p>
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-[var(--color-accent)] py-3 font-medium text-white"
        >
          {saved ? 'Saved ✓' : 'Save'}
        </button>
      </form>

      <button
        onClick={() => signOut()}
        className="mt-6 w-full rounded-xl border border-[var(--color-border)] py-3 font-medium text-[var(--color-owe)]"
      >
        Sign out
      </button>
    </div>
  )
}
