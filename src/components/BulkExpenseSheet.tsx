import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { GroupMember } from '../features/groups/hooks'
import { useAddExpense } from '../features/expenses/hooks'
import { splitEqually, toIsoDate, formatCurrency, firstName } from '../utils/money'
import { CATEGORIES } from '../utils/categories'

interface Row {
  description: string
  amount: string
  paidBy: string
  date: string
  category: string
}

function blankRow(currentUserId: string): Row {
  return { description: '', amount: '', paidBy: currentUserId, date: toIsoDate(new Date()), category: 'other' }
}

// Parse a spreadsheet paste: one expense per line, columns
// description / amount / paid-by / date / category (last three optional).
function parsePaste(text: string, members: GroupMember[], currentUserId: string): Row[] {
  const today = toIsoDate(new Date())
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = (line.includes('\t') ? line.split('\t') : line.split(',')).map((c) => c.trim())
      const [description, amount, payer, date, category] = cols
      const member = members.find((m) => firstName(m.name).toLowerCase() === (payer ?? '').toLowerCase())
      const cat = CATEGORIES.find(
        (c) => c.id === (category ?? '').toLowerCase() || c.label.toLowerCase() === (category ?? '').toLowerCase()
      )
      return {
        description: description ?? '',
        amount: (amount ?? '').replace(/[^0-9.]/g, ''),
        paidBy: member?.user_id ?? currentUserId,
        date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today,
        category: cat?.id ?? 'other',
      }
    })
}

export function BulkExpenseSheet({
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
  const today = toIsoDate(new Date())
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 4 }, () => blankRow(currentUserId)))
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const valid = rows.filter((r) => r.description.trim() && Number(r.amount) > 0)
  const validTotal = valid.reduce((sum, r) => sum + Number(r.amount), 0)

  const handlePaste = (i: number) => (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text')
    if (!/[\t\n]/.test(text)) return // single value — let it paste normally
    e.preventDefault()
    const parsed = parsePaste(text, members, currentUserId)
    if (parsed.length === 0) return
    setRows((prev) => [...prev.slice(0, i), ...parsed, blankRow(currentUserId)])
  }

  const submit = async () => {
    setError(null)
    if (valid.length === 0) {
      setError('Add at least one row with a description and an amount')
      return
    }
    if (valid.some((r) => !r.date)) {
      setError('Every row needs a date')
      return
    }
    for (const [i, r] of valid.entries()) {
      setProgress({ done: i, total: valid.length })
      const amount = Number(r.amount)
      const parts = splitEqually(amount, members.length)
      try {
        await addExpense.mutateAsync({
          description: r.description.trim(),
          amount,
          paidBy: r.paidBy,
          date: r.date,
          category: r.category,
          splits: members.map((m, idx) => ({ user_id: m.user_id, share: parts[idx] })),
        })
      } catch (err) {
        setProgress(null)
        setError(
          `Row ${i + 1} ("${r.description.trim()}") failed: ${
            err instanceof Error ? err.message : 'something went wrong'
          }. ${i} earlier ${i === 1 ? 'row was' : 'rows were'} saved — remove the saved rows before retrying.`
        )
        return
      }
    }
    onClose()
  }

  const inputCls =
    'w-full rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ledger)]'

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Bulk add expenses"
        className="animate-rise flex max-h-[90vh] w-full max-w-3xl flex-col rounded-t-3xl bg-[var(--color-surface)] p-5 sm:rounded-3xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Bulk add expenses</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[var(--color-ink-muted)]">
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <p className="mb-3 text-xs text-[var(--color-ink-muted)]">
          Each row is split equally among all {members.length} members. Paste rows from a spreadsheet
          (description, amount, paid&nbsp;by, date, category) into the first field.
        </p>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-separate border-spacing-y-1.5">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                <th className="pr-2 font-semibold">Description</th>
                <th className="pr-2 font-semibold">Amount</th>
                <th className="pr-2 font-semibold">Paid by</th>
                <th className="pr-2 font-semibold">Date</th>
                <th className="pr-2 font-semibold">Category</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="pr-2">
                    <input
                      autoFocus={i === 0}
                      value={r.description}
                      onChange={(e) => setRow(i, { description: e.target.value })}
                      onPaste={handlePaste(i)}
                      placeholder="What was it for?"
                      className={inputCls}
                    />
                  </td>
                  <td className="pr-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={r.amount}
                      onChange={(e) => setRow(i, { amount: e.target.value })}
                      placeholder="0.00"
                      className={`${inputCls} font-mono-nums w-24 text-right`}
                    />
                  </td>
                  <td className="pr-2">
                    <select
                      value={r.paidBy}
                      onChange={(e) => setRow(i, { paidBy: e.target.value })}
                      className={inputCls}
                    >
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="pr-2">
                    <input
                      type="date"
                      value={r.date}
                      max={today}
                      onChange={(e) => setRow(i, { date: e.target.value })}
                      className={`${inputCls} w-36`}
                    />
                  </td>
                  <td className="pr-2">
                    <select
                      value={r.category}
                      onChange={(e) => setRow(i, { category: e.target.value })}
                      className={inputCls}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.emoji} {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label={`Remove row ${i + 1}`}
                      disabled={rows.length === 1}
                      className="text-[var(--color-ink-muted)] disabled:opacity-30"
                    >
                      <Trash2 size={15} strokeWidth={2.25} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, blankRow(currentUserId)])}
          className="mt-2 flex items-center gap-1 self-start text-sm font-medium text-[var(--color-ledger)]"
        >
          <Plus size={15} strokeWidth={2.5} /> Add row
        </button>

        {error && <p className="mt-3 text-sm text-[var(--color-receipt)]">{error}</p>}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-[var(--color-ink-muted)]">
            {valid.length} {valid.length === 1 ? 'expense' : 'expenses'} · {formatCurrency(validTotal)}
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={addExpense.isPending || valid.length === 0}
            className="rounded-xl bg-[var(--color-ledger)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {progress ? `Adding… ${progress.done + 1}/${progress.total}` : `Add ${valid.length || ''}`.trim()}
          </button>
        </div>
      </div>
    </div>
  )
}
