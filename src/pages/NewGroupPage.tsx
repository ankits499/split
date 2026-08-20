import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useCreateGroup } from '../features/groups/hooks'

export function NewGroupPage() {
  const navigate = useNavigate()
  const createGroup = useCreateGroup()
  const [name, setName] = useState('')
  const [members, setMembers] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Give the group a name')
      return
    }
    try {
      const memberEmails = members
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
      const groupId = await createGroup.mutateAsync({ name: name.trim(), memberEmails })
      navigate(`/groups/${groupId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <h1 className="shrink-0 px-4 pt-6 pb-4 text-lg font-semibold text-[var(--color-ink)]">New group</h1>
      <form onSubmit={submit} className="flex-1 overflow-y-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] space-y-3">
        <input
          autoFocus
          placeholder="Group name (e.g. Goa Trip)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-ink)] outline-none focus:border-[var(--color-ledger)]"
        />
        <textarea
          placeholder="Friends' emails, comma separated (they must already have a Split account)"
          value={members}
          onChange={(e) => setMembers(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ledger)]"
        />
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-receipt)]">
            <AlertCircle size={14} strokeWidth={2.5} /> {error}
          </p>
        )}
        <button
          type="submit"
          disabled={createGroup.isPending}
          className="w-full rounded-xl bg-[var(--color-ledger)] py-3 font-semibold text-white disabled:opacity-50"
        >
          {createGroup.isPending ? 'Creating…' : 'Create group'}
        </button>
      </form>
    </div>
  )
}
