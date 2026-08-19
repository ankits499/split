import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateGroup } from '../features/groups/hooks'

export function NewGroupPage() {
  const navigate = useNavigate()
  const createGroup = useCreateGroup()
  const [name, setName] = useState('')
  const [emails, setEmails] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Give the group a name')
      return
    }
    try {
      const memberEmails = emails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean)
      const groupId = await createGroup.mutateAsync({ name: name.trim(), memberEmails })
      navigate(`/groups/${groupId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="flex-1 px-4 pb-6">
      <h1 className="pt-6 pb-4 text-lg font-semibold text-[var(--color-text)]">New group</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          autoFocus
          placeholder="Group name (e.g. Goa Trip)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
        />
        <textarea
          placeholder="Friends' emails, comma separated (optional — they must have signed in to Split at least once)"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
        />
        {error && <p className="text-sm text-[var(--color-owe)]">{error}</p>}
        <button
          type="submit"
          disabled={createGroup.isPending}
          className="w-full rounded-xl bg-[var(--color-accent)] py-3 font-medium text-white disabled:opacity-50"
        >
          {createGroup.isPending ? 'Creating…' : 'Create group'}
        </button>
      </form>
    </div>
  )
}
