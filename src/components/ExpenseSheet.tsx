import { useMemo, useState } from 'react'
import type { GroupMember } from '../features/groups/hooks'
import { useAddExpense } from '../features/expenses/hooks'
import { splitEqually, splitByPercentage, formatCurrency } from '../utils/money'

type SplitMode = 'equal' | 'exact' | 'percent'

export function ExpenseSheet({
  groupId,
  members,
  currentUserId,
  onClose,
}: {
  groupId: string
  members: GroupMember[]
  currentUserId: string
  onClose: () => void
}) {
  const addExpense = useAddExpense(groupId)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [mode, setMode] = useState<SplitMode>('equal')
  const [included, setIncluded] = useState<Set<string>>(new Set(members.map((m) => m.user_id)))
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const total = parseFloat(amount) || 0
  const includedMembers = members.filter((m) => included.has(m.user_id))

  const shares = useMemo(() => {
    if (includedMembers.length === 0 || total <= 0) return new Map<string, number>()
    if (mode === 'equal') {
      const parts = splitEqually(total, includedMembers.length)
      return new Map(includedMembers.map((m, i) => [m.user_id, parts[i]]))
    }
    if (mode === 'percent') {
      const percentages = includedMembers.map((m) => parseFloat(customValues[m.user_id]) || 0)
      const parts = splitByPercentage(total, percentages)
      return new Map(includedMembers.map((m, i) => [m.user_id, parts[i]]))
    }
    return new Map(includedMembers.map((m) => [m.user_id, parseFloat(customValues[m.user_id]) || 0]))
  }, [mode, includedMembers, total, customValues])

  const shareSum = [...shares.values()].reduce((a, b) => a + b, 0)
  const exactMismatch = mode === 'exact' && Math.abs(shareSum - total) > 0.01
  const percentSum =
    mode === 'percent'
      ? includedMembers.reduce((sum, m) => sum + (parseFloat(customValues[m.user_id]) || 0), 0)
      : 0
  const percentMismatch = mode === 'percent' && Math.abs(percentSum - 100) > 0.5

  const toggleMember = (userId: string) => {
    setIncluded((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!description.trim() || total <= 0) {
      setError('Add a description and an amount')
      return
    }
    if (includedMembers.length === 0) {
      setError('Select at least one person to split with')
      return
    }
    if (exactMismatch) {
      setError(`Splits add up to ${formatCurrency(shareSum)}, not ${formatCurrency(total)}`)
      return
    }
    if (percentMismatch) {
      setError(`Percentages add up to ${percentSum}%, not 100%`)
      return
    }

    try {
      await addExpense.mutateAsync({
        description: description.trim(),
        amount: total,
        paidBy,
        date: new Date().toISOString().slice(0, 10),
        splits: [...shares.entries()].map(([user_id, share]) => ({ user_id, share })),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-[var(--color-surface)] p-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-border)]" />
        <h2 className="mb-4 text-center text-lg font-semibold text-[var(--color-text)]">Add expense</h2>

        <input
          autoFocus
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mb-3 w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 py-3 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
        />

        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="₹ 0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mb-3 w-full rounded-xl border border-[var(--color-border)] bg-transparent px-4 py-3 text-center text-2xl font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
        />

        <p className="mb-1 text-xs font-medium uppercase text-[var(--color-text-muted)]">Paid by</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              type="button"
              key={m.user_id}
              onClick={() => setPaidBy(m.user_id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                paidBy === m.user_id
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                  : 'border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Split</p>
          <div className="flex gap-1 rounded-full bg-[var(--color-bg)] p-1">
            {(['equal', 'exact', 'percent'] as SplitMode[]).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-2.5 py-1 text-xs capitalize ${
                  mode === m ? 'bg-[var(--color-surface)] font-medium text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 space-y-2">
          {members.map((m) => {
            const isIncluded = included.has(m.user_id)
            return (
              <div key={m.user_id} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleMember(m.user_id)}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs ${
                    isIncluded
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  {isIncluded ? '✓' : ''}
                </button>
                <span className="flex-1 text-sm text-[var(--color-text)]">{m.name}</span>
                {mode === 'equal' ? (
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {isIncluded ? formatCurrency(shares.get(m.user_id) ?? 0) : '—'}
                  </span>
                ) : (
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    disabled={!isIncluded}
                    placeholder={mode === 'percent' ? '%' : '₹'}
                    value={customValues[m.user_id] ?? ''}
                    onChange={(e) =>
                      setCustomValues((prev) => ({ ...prev, [m.user_id]: e.target.value }))
                    }
                    className="w-20 rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1 text-right text-sm text-[var(--color-text)] outline-none disabled:opacity-40"
                  />
                )}
              </div>
            )
          })}
        </div>

        {error && <p className="mb-3 text-sm text-[var(--color-owe)]">{error}</p>}

        <button
          type="submit"
          disabled={addExpense.isPending}
          className="w-full rounded-xl bg-[var(--color-accent)] py-3 font-medium text-white disabled:opacity-50"
        >
          {addExpense.isPending ? 'Adding…' : 'Add expense'}
        </button>
        <button type="button" onClick={onClose} className="mt-2 w-full py-2 text-sm text-[var(--color-text-muted)]">
          Cancel
        </button>
      </form>
    </div>
  )
}
