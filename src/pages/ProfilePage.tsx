import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { useLocalUser, useRenameLocalUser } from '../features/localUser'
import { useAuth } from '../features/auth/AuthProvider'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ThemeToggle } from '../components/ThemeToggle'
import { useTheme } from '../features/theme'

export function ProfilePage() {
  const { name: currentName } = useLocalUser()
  const rename = useRenameLocalUser()
  const { session, signOut } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const [name, setName] = useState(currentName)
  const [saved, setSaved] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  useEffect(() => setName(currentName), [currentName])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    await rename.mutateAsync(name.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="flex-1 px-4 pb-6">
      <h1 className="pt-6 pb-4 text-lg font-semibold text-[var(--color-ink)]">Profile</h1>

      <form onSubmit={save} className="space-y-3">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Your name
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-ink)] outline-none focus:border-[var(--color-ledger)]"
          />
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Email
          </p>
          <p className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-ink-muted)]">
            {session?.user?.email}
          </p>
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-[var(--color-ledger)] py-3 font-semibold text-white"
        >
          {saved ? 'Saved ✓' : 'Save'}
        </button>
      </form>

      <p className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
        Appearance
      </p>
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
        <span className="text-sm text-[var(--color-ink)]">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <p className="mt-8 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
        Account
      </p>
      <button
        onClick={() => setConfirmSignOut(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] py-3 font-semibold text-[var(--color-receipt)]"
      >
        <LogOut size={16} strokeWidth={2.25} />
        Sign out
      </button>

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out?"
        description="You'll need to enter your email again to sign back in."
        confirmLabel="Sign out"
        tone="danger"
        onConfirm={() => {
          setConfirmSignOut(false)
          signOut()
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </div>
  )
}
