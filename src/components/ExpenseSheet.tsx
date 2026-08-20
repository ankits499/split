import { useEffect, useMemo, useState } from 'react'
import { Check, X, Receipt, ChevronDown } from 'lucide-react'
import type { GroupMember } from '../features/groups/hooks'
import { useGroups } from '../features/groups/hooks'
import { useAddExpense } from '../features/expenses/hooks'
import { splitEqually, splitByPercentage, formatCurrency } from '../utils/money'
import { POPULAR_CATEGORIES, MORE_CATEGORIES } from '../utils/categories'

type SplitMode = 'equal' | 'exact' | 'percent'

export function ExpenseSheet({
  groupId: fixedGroupId,
  members: fixedMembers,
  currentUserId,
  onClose,
}: {
  groupId?: string
  members?: GroupMember[]
  currentUserId: string
  onClose: () => void
}) {
  const { data: allGroups } = useGroups()
  const needsGroupPicker = !fixedGroupId
  const [selectedGroupId, setSelectedGroupId] = useState(fixedGroupId ?? '')

  const groupId = fixedGroupId ?? selectedGroupId
  const members = fixedGroupId ? fixedMembers! : allGroups?.find((g) => g.id === selectedGroupId)?.members ?? []

  const addExpense = useAddExpense(groupId)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('other')
  const [showMoreCategories, setShowMoreCategories] = useState(false)
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [mode, setMode] = useState<SplitMode>('equal')
  const [included, setIncluded] = useState<Set<string>>(new Set(members.map((m) => m.user_id)))
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (needsGroupPicker) {
      setIncluded(new Set(members.map((m) => m.user_id)))
      setPaidBy(currentUserId)
      setCustomValues({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId])

  useEffect(() => {
    if (needsGroupPicker && !selectedGroupId && allGroups?.length === 1) {
      setSelectedGroupId(allGroups[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allGroups])

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
    if (!groupId) {
      setError('Choose a group first')
      return
    }
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
        category,
        splits: [...shares.entries()].map(([user_id, share]) => ({ user_id, share })),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const selectedMoreCategory = MORE_CATEGORIES.find((c) => c.id === category)

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40" onClick={onClose} role="presentation">
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="animate-rise max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-[var(--color-surface)] p-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-line)]" />
        <div className="mb-4 flex items-center justify-center gap-2">
          <Receipt size={18} className="text-[var(--color-ledger)]" strokeWidth={2.25} />
          <h2 className="text-base font-semibold text-[var(--color-ink)]">New line item</h2>
        </div>

        {needsGroupPicker && (
          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              Group
            </p>
            <div className="relative">
              <select
                required
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[var(--color-line)] bg-transparent px-4 py-3 pr-10 text-[var(--color-ink)] outline-none focus:border-[var(--color-ledger)]"
              >
                <option value="" disabled>
                  Choose a group
                </option>
                {(allGroups ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                strokeWidth={2.25}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
              />
            </div>
            {allGroups && allGroups.length === 0 && (
              <p className="mt-1.5 text-xs text-[var(--color-receipt)]">Create a group first to add an expense.</p>
            )}
          </div>
        )}

        <input
          autoFocus={!needsGroupPicker}
          placeholder="What was it for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mb-3 w-full rounded-xl border border-[var(--color-line)] bg-transparent px-4 py-3 text-[var(--color-ink)] outline-none focus:border-[var(--color-ledger)]"
        />

        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="₹ 0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="font-mono-nums mb-4 w-full rounded-xl border border-[var(--color-line)] bg-transparent px-4 py-3 text-center text-2xl font-semibold text-[var(--color-ink)] outline-none focus:border-[var(--color-ledger)]"
        />

        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Category
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {POPULAR_CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => {
                setCategory(c.id)
                setShowMoreCategories(false)
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                category === c.id
                  ? 'border-[var(--color-ledger)] bg-[var(--color-ledger)] text-white'
                  : 'border-[var(--color-line)] text-[var(--color-ink)]'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowMoreCategories((v) => !v)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              selectedMoreCategory
                ? 'border-[var(--color-ledger)] bg-[var(--color-ledger)] text-white'
                : 'border-[var(--color-line)] text-[var(--color-ink)]'
            }`}
          >
            {selectedMoreCategory ? `${selectedMoreCategory.emoji} ${selectedMoreCategory.label}` : 'More'}
          </button>
        </div>

        {showMoreCategories && (
          <div className="animate-rise mb-4 flex flex-wrap gap-2 rounded-xl border border-[var(--color-line)] p-3">
            {MORE_CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => {
                  setCategory(c.id)
                  setShowMoreCategories(false)
                }}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  category === c.id
                    ? 'border-[var(--color-ledger)] bg-[var(--color-ledger)] text-white'
                    : 'border-[var(--color-line)] text-[var(--color-ink)]'
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        )}

        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Paid by
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              type="button"
              key={m.user_id}
              onClick={() => setPaidBy(m.user_id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                paidBy === m.user_id
                  ? 'border-[var(--color-ledger)] bg-[var(--color-ledger)] text-white'
                  : 'border-[var(--color-line)] text-[var(--color-ink)]'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Split</p>
          <div className="flex gap-1 rounded-full bg-[var(--color-bg)] p-1">
            {(['equal', 'exact', 'percent'] as SplitMode[]).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-2.5 py-1 text-xs capitalize transition-colors ${
                  mode === m
                    ? 'bg-[var(--color-surface)] font-semibold text-[var(--color-ink)] shadow-sm'
                    : 'text-[var(--color-ink-muted)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="receipt-dotted mb-3 space-y-2 pb-3">
          {members.map((m) => {
            const isIncluded = included.has(m.user_id)
            return (
              <div key={m.user_id} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleMember(m.user_id)}
                  aria-pressed={isIncluded}
                  aria-label={`Include ${m.name}`}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    isIncluded
                      ? 'border-[var(--color-ledger)] bg-[var(--color-ledger)] text-white'
                      : 'border-[var(--color-line)]'
                  }`}
                >
                  {isIncluded && <Check size={14} strokeWidth={3} />}
                </button>
                <span className="flex-1 text-sm text-[var(--color-ink)]">{m.name}</span>
                {mode === 'equal' ? (
                  <span className="font-mono-nums text-sm text-[var(--color-ink-muted)]">
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
                    onChange={(e) => setCustomValues((prev) => ({ ...prev, [m.user_id]: e.target.value }))}
                    className="font-mono-nums w-20 rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1 text-right text-sm text-[var(--color-ink)] outline-none disabled:opacity-40"
                  />
                )}
              </div>
            )
          })}
        </div>

        {total > 0 && (
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="font-semibold text-[var(--color-ink)]">Total</span>
            <span className="font-mono-nums font-semibold text-[var(--color-ink)]">{formatCurrency(total)}</span>
          </div>
        )}

        {error && (
          <p className="mb-3 flex items-center gap-1.5 text-sm text-[var(--color-receipt)]">
            <X size={14} strokeWidth={2.5} /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={addExpense.isPending || !groupId}
          className="w-full rounded-xl bg-[var(--color-ledger)] py-3 font-semibold text-white disabled:opacity-50"
        >
          {addExpense.isPending ? 'Adding…' : 'Add expense'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full py-2 text-sm font-medium text-[var(--color-ink-muted)]"
        >
          Cancel
        </button>
      </form>
    </div>
  )
}
